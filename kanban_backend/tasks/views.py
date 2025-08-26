# tasks/views.py
from django.db import transaction
from django.db.models import Max, F
from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.contrib.auth.models import User
from django.contrib.auth import authenticate, login as dj_login, logout as dj_logout

from rest_framework import viewsets, permissions, status, parsers
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes, action
from django.utils import timezone

from rest_framework.exceptions import PermissionDenied, ValidationError


from .models import Task, TaskImage, Project   # <- ВАЖНО: Project из models
from .serializers import (                     # <- ВАЖНО: ProjectSerializer из serializers
    TaskSerializer,
    TaskImageSerializer,
    UserSerializer,
    ProjectSerializer,
)

# === Pillow-based compression ===
from io import BytesIO
from django.core.files.uploadedfile import InMemoryUploadedFile
from PIL import Image
import os
import uuid

MAX_SIDE = 2560
WEBP_QUALITY = 82
PNG_COMPRESS_LEVEL = 6

def _has_alpha(pil: Image.Image) -> bool:
    return pil.mode in ("RGBA", "LA") or (pil.mode == "P" and "transparency" in pil.info)

def _resize_down(pil: Image.Image) -> Image.Image:
    w, h = pil.size
    long_side = max(w, h)
    if long_side <= MAX_SIDE:
        return pil
    scale = MAX_SIDE / float(long_side)
    new_size = (int(w * scale), int(h * scale))
    return pil.resize(new_size, Image.Resampling.LANCZOS)

def compress_image_to_best(file_obj, prefer_webp=True):
    file_obj.seek(0)
    with Image.open(file_obj) as im:
        im.load()
        im.info.pop("icc_profile", None)
        im.info.pop("exif", None)

        has_alpha = _has_alpha(im)
        im = _resize_down(im)

        buffer = BytesIO()
        orig_name = getattr(file_obj, "name", f"upload_{uuid.uuid4().hex}")
        base, _ext = os.path.splitext(orig_name)

        if has_alpha:
            if im.mode not in ("RGBA", "LA"):
                im = im.convert("RGBA")
            im.save(buffer, format="PNG", optimize=True, compress_level=PNG_COMPRESS_LEVEL)
            new_ext = ".png"
        else:
            if im.mode != "RGB":
                im = im.convert("RGB")
            if prefer_webp:
                im.save(buffer, format="WEBP", quality=WEBP_QUALITY, method=6)
                new_ext = ".webp"
            else:
                im.save(buffer, format="JPEG", quality=86, optimize=True, progressive=True)
                new_ext = ".jpg"

        buffer.seek(0)
        new_name = f"{base}{new_ext}"
        content_type = "image/png" if new_ext == ".png" else ("image/webp" if new_ext == ".webp" else "image/jpeg")

        return InMemoryUploadedFile(
            file=buffer,
            field_name="image",
            name=new_name,
            content_type=content_type,
            size=buffer.getbuffer().nbytes,
            charset=None,
        ), new_name


# ---- Auth / CSRF / Me ----
@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def csrf(request):
    return JsonResponse({"detail": "CSRF cookie set", "csrftoken": get_token(request)})

@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def me(request):
    if not request.user.is_authenticated:
        return Response({"detail": "unauthenticated"}, status=401)
    data = UserSerializer(request.user, context={"request": request}).data
    return Response(data)

@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def login(request):
    username = (request.data.get("username") or "").strip()
    password = (request.data.get("password") or "")
    if not username or not password:
        return Response({"detail": "Введите логин и пароль"}, status=400)
    user = authenticate(request, username=username, password=password)
    if user is None:
        return Response({"detail": "Неверный логин или пароль"}, status=400)
    dj_login(request, user)
    data = UserSerializer(user, context={"request": request}).data
    return Response(data, status=200)

@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def logout(request):
    dj_logout(request)
    return Response({"detail": "ok"}, status=200)

@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def users_list(request):
    project_id = request.query_params.get("project")
    if project_id:
        try:
            project = Project.objects.get(pk=project_id)
        except Project.DoesNotExist:
            return Response({"detail":"Проект не найден"}, status=404)
        qs = project.participants.all().order_by("id")
    else:
        # если нужно — ограничьте по участию в ЛЮБЫХ проектах пользователя
        qs = User.objects.all().order_by("id")
    data = UserSerializer(qs, many=True, context={"request": request}).data
    return Response(data)


class ProjectViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser or user.is_staff:
            return Project.objects.all().order_by("-id")
        return Project.objects.filter(participants=user).order_by("-id")

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx

    @action(detail=True, methods=["get"], permission_classes=[permissions.IsAuthenticated])
    def participants(self, request, pk=None):
        project = self.get_object()
        data = UserSerializer(project.participants.all().order_by("id"),
                              many=True, context={"request": request}).data
        return Response(data)

# --- Задачи ---
class TaskViewSet(viewsets.ModelViewSet):
    serializer_class = TaskSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = (Task.objects.select_related("responsible","project")
              .prefetch_related("images"))
        if user.is_superuser or user.is_staff:
            pass
        else:
            qs = qs.filter(project__participants=user)
        project_id = self.request.query_params.get("project")
        if project_id:
            qs = qs.filter(project_id=project_id)
        return qs.order_by("position","id")

    def perform_create(self, serializer):
        project = serializer.validated_data.get("project")
        user = self.request.user
        if not project:
            raise ValidationError({"project_id": "project_id обязателен"})
        if not (user.is_superuser or user.is_staff or project.participants.filter(id=user.id).exists()):
            raise PermissionDenied("Вы не участник проекта")

        col = serializer.validated_data.get("column", "new")
        if col == 'done' and not serializer.validated_data.get("completed_at"):
            serializer.save(completed_at=timezone.now().date())
        else:
            serializer.save()

    def perform_update(self, serializer):
        instance: Task = self.get_object()
        project = serializer.validated_data.get("project") or instance.project
        user = self.request.user
        if project and not (user.is_superuser or user.is_staff or project.participants.filter(id=user.id).exists()):
            raise PermissionDenied("Вы не участник проекта")

        new_col = serializer.validated_data.get("column", instance.column)

        if instance.column != 'done' and new_col == 'done' and not instance.completed_at:
            serializer.save(completed_at=timezone.now().date())
        elif instance.column == 'done' and new_col != 'done':
            serializer.save(completed_at=None)
        else:
            serializer.save()


# ---- Task Images ----
class TaskImageViewSet(viewsets.ModelViewSet):
    """
    POST   /api/task-images/        -> загрузить новое изображение (с компрессией; кладём в конец)
    PATCH  /api/task-images/<id>/   -> безопасный реордер (position / task)
    DELETE /api/task-images/<id>/   -> удалить
    """
    queryset = TaskImage.objects.select_related("task").all()
    serializer_class = TaskImageSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx

    def list(self, request, *args, **kwargs):
        return Response(status=status.HTTP_405_METHOD_NOT_ALLOWED)

    def retrieve(self, request, *args, **kwargs):
        return Response(status=status.HTTP_405_METHOD_NOT_ALLOWED)

    def update(self, request, *args, **kwargs):
        return Response(status=status.HTTP_405_METHOD_NOT_ALLOWED)

    def create(self, request, *args, **kwargs):
        task_id = request.data.get("task")
        file_in = request.data.get("image")
        if not task_id or not file_in:
            return Response({"detail": "task and image are required"}, status=400)

        try:
            task = Task.objects.get(pk=task_id)
        except Task.DoesNotExist:
            return Response({"detail": "Task not found"}, status=404)

        try:
            compressed_file, _name = compress_image_to_best(file_in, prefer_webp=True)
        except Exception:
            compressed_file = file_in

        last = TaskImage.objects.filter(task=task).aggregate(m=Max("position"))["m"]
        next_pos = 0 if last is None else last + 1

        obj = TaskImage(task=task, image=compressed_file, position=next_pos)
        obj.save()

        ser = self.get_serializer(obj)
        return Response(ser.data, status=status.HTTP_201_CREATED)

    @transaction.atomic
    def partial_update(self, request, *args, **kwargs):
        instance: TaskImage = self.get_object()
        new_task_id = request.data.get("task", None)
        new_pos_raw = request.data.get("position", None)

        # Перенос в другую задачу
        if new_task_id is not None and int(new_task_id) != instance.task_id:
            try:
                new_task = Task.objects.get(pk=new_task_id)
            except Task.DoesNotExist:
                return Response({"detail": "Task not found"}, status=404)

            TaskImage.objects.filter(task_id=instance.task_id, position__gt=instance.position) \
                .update(position=F('position') - 1)

            last = TaskImage.objects.filter(task=new_task).aggregate(m=Max("position"))["m"]
            instance.task = new_task
            instance.position = 0 if last is None else last + 1
            instance.save()

            ser = self.get_serializer(instance)
            return Response(ser.data)

        # Реордер в пределах задачи
        if new_pos_raw is not None:
            try:
                new_pos = int(new_pos_raw)
            except (TypeError, ValueError):
                return Response({"detail": "position must be int"}, status=400)

            if new_pos < 0:
                new_pos = 0

            task_id = instance.task_id
            imgs = list(TaskImage.objects.filter(task_id=task_id).order_by("position", "id"))
            new_pos = min(new_pos, len(imgs) - 1)

            imgs.remove(instance)
            imgs.insert(new_pos, instance)

            for i, img in enumerate(imgs):
                if img.position != i:
                    TaskImage.objects.filter(pk=img.pk).update(position=i)

            instance.refresh_from_db()
            ser = self.get_serializer(instance)
            return Response(ser.data)

        ser = self.get_serializer(instance)
        return Response(ser.data)
