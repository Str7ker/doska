# tasks/views.py
from django.db import transaction
from django.db.models import Max, F
from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.contrib.auth.models import User

from rest_framework import viewsets, permissions, status, parsers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from .models import Task, TaskImage
from .serializers import TaskSerializer, TaskImageSerializer, UserSerializer

# === NEW: Pillow-based compression ===
from io import BytesIO
from django.core.files.uploadedfile import InMemoryUploadedFile
from PIL import Image
import os
import uuid

MAX_SIDE = 2560            # max длинная сторона
WEBP_QUALITY = 82          # баланс “не видно артефактов” / “вес заметно меньше”
PNG_COMPRESS_LEVEL = 6     # компрессия PNG (0-9)

def _has_alpha(pil: Image.Image) -> bool:
    # RGBA/LA — точно есть альфа; P может содержать прозрачность через palette
    return pil.mode in ("RGBA", "LA") or (pil.mode == "P" and "transparency" in pil.info)

def _resize_down(pil: Image.Image) -> Image.Image:
    w, h = pil.size
    long_side = max(w, h)
    if long_side <= MAX_SIDE:
        return pil
    scale = MAX_SIDE / float(long_side)
    new_size = (int(w * scale), int(h * scale))
    # LANCZOS — максимально качественный ресемплинг
    return pil.resize(new_size, Image.Resampling.LANCZOS)

def compress_image_to_best(file_obj, prefer_webp=True):
    """
    Принимает загруженный файл (UploadedFile), возвращает (InMemoryUploadedFile, new_filename).
    - Если есть прозрачность — сохраняем PNG.
    - Иначе сохраняем WebP (если prefer_webp=True), либо JPEG.
    - Всегда уменьшаем до MAX_SIDE по длинной стороне.
    """
    file_obj.seek(0)
    with Image.open(file_obj) as im:
        # Некоторые форматы требуют load() перед конвертацией
        im.load()

        # Удаляем профили/EXIF, понизим вес
        im.info.pop("icc_profile", None)
        im.info.pop("exif", None)

        # Приведём к правильному цветовому пространству
        # (для JPEG/WebP нужен 3‑канальный RGB)
        has_alpha = _has_alpha(im)

        # Ресайз вниз при необходимости
        im = _resize_down(im)

        buffer = BytesIO()
        orig_name = getattr(file_obj, "name", f"upload_{uuid.uuid4().hex}")
        base, _ext = os.path.splitext(orig_name)

        if has_alpha:
            # сохраняем PNG, чтобы не потерять прозрачность
            if im.mode not in ("RGBA", "LA"):
                im = im.convert("RGBA")
            im.save(buffer, format="PNG", optimize=True, compress_level=PNG_COMPRESS_LEVEL)
            new_ext = ".png"
        else:
            # фото без прозрачности: WebP или JPEG
            if im.mode not in ("RGB",):
                im = im.convert("RGB")
            if prefer_webp:
                im.save(buffer, format="WEBP", quality=WEBP_QUALITY, method=6)
                new_ext = ".webp"
            else:
                # альтернатива — JPEG (если вдруг нужно)
                im.save(buffer, format="JPEG", quality=86, optimize=True, progressive=True)
                new_ext = ".jpg"

        buffer.seek(0)
        new_name = f"{base}{new_ext}"
        # content_type подставляем по расширению
        content_type = (
            "image/png" if new_ext == ".png"
            else ("image/webp" if new_ext == ".webp" else "image/jpeg")
        )

        out = InMemoryUploadedFile(
            file=buffer,
            field_name="image",
            name=new_name,
            content_type=content_type,
            size=buffer.getbuffer().nbytes,
            charset=None,
        )
        return out, new_name


@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def csrf(request):
    return JsonResponse({"detail": "CSRF cookie set", "csrftoken": get_token(request)})


@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def users_list(request):
    qs = User.objects.all().only("id", "username").order_by("id")
    data = UserSerializer(qs, many=True, context={"request": request}).data
    return Response(data)


class TaskViewSet(viewsets.ModelViewSet):
    queryset = (
        Task.objects
        .select_related("responsible")
        .prefetch_related("images")
        .all()
        .order_by("position", "id")
    )
    serializer_class = TaskSerializer
    permission_classes = [permissions.AllowAny]

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx


class TaskImageViewSet(viewsets.ModelViewSet):
    """
    POST /api/task-images/        -> загрузить новое изображение (с компрессией; кладём в конец)
    PATCH /api/task-images/<id>/  -> безопасный реордер (position / task)
    DELETE /api/task-images/<id>/ -> удалить
    """
    queryset = TaskImage.objects.select_related("task").all()
    serializer_class = TaskImageSerializer
    permission_classes = [permissions.AllowAny]
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
        """
        Ожидает: multipart form-data
          - task: int (обяз.)
          - image: file (обяз.)
          - position: int (игнорируем — ставим в конец, чтобы не ловить UniqueConstraint)
        """
        task_id = request.data.get("task")
        file_in = request.data.get("image")
        if not task_id or not file_in:
            return Response({"detail": "task and image are required"}, status=400)

        try:
            task = Task.objects.get(pk=task_id)
        except Task.DoesNotExist:
            return Response({"detail": "Task not found"}, status=404)

        # === ВАЖНО: компрессия перед сохранением ===
        try:
            compressed_file, _name = compress_image_to_best(file_in, prefer_webp=True)
        except Exception as e:
            # Если вдруг Pillow не смог обработать — сохраняем как есть, чтобы не блокировать
            # но лучше посмотреть логи и исправить
            compressed_file = file_in

        # Позицию вычисляем сами: в конец
        last = TaskImage.objects.filter(task=task).aggregate(m=Max("position"))["m"]
        next_pos = 0 if last is None else last + 1

        obj = TaskImage(task=task, image=compressed_file, position=next_pos)
        obj.save()

        ser = self.get_serializer(obj)
        return Response(ser.data, status=status.HTTP_201_CREATED)

    @transaction.atomic
    def partial_update(self, request, *args, **kwargs):
        """
        Безопасный реордер:
        - если пришёл `task` — переносим в другую задачу (ставим в конец новой)
        - если пришёл `position` — переставляем внутри задачи с полной переиндексацией
        """
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
