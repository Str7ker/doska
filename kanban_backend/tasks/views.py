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
    POST /api/task-images/        -> загрузить новое изображение (всегда в конец)
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

    # закрываем лишнее
    def list(self, request, *args, **kwargs):
        return Response(status=status.HTTP_405_METHOD_NOT_ALLOWED)

    def retrieve(self, request, *args, **kwargs):
        return Response(status=status.HTTP_405_METHOD_NOT_ALLOWED)

    def update(self, request, *args, **kwargs):
        return Response(status=status.HTTP_405_METHOD_NOT_ALLOWED)

    def create(self, request, *args, **kwargs):
        """
        Ожидает: multipart form-data с полями:
          - task: int (обяз.)
          - image: file (обяз.)
          - position: int (игнорируем для уникальности; ставим в конец)
        """
        task_id = request.data.get("task")
        image = request.data.get("image")
        if not task_id or not image:
            return Response({"detail": "task and image are required"}, status=400)

        try:
            task = Task.objects.get(pk=task_id)
        except Task.DoesNotExist:
            return Response({"detail": "Task not found"}, status=404)

        # позицию вычисляем сами — следующий индекс
        last = TaskImage.objects.filter(task=task).aggregate(m=Max("position"))["m"]
        next_pos = 0 if last is None else last + 1

        obj = TaskImage(task=task, image=image, position=next_pos)
        obj.save()

        ser = self.get_serializer(obj)
        return Response(ser.data, status=status.HTTP_201_CREATED)

    @transaction.atomic
    def partial_update(self, request, *args, **kwargs):
        """
        Безопасный реордер:
        - если пришёл `task` — можно перенести картинку в другую задачу (ставим в конец новой)
        - если пришёл `position` — переставляем внутри задачи с переиндексацией, избегая UniqueConstraint
        """
        instance: TaskImage = self.get_object()
        new_task_id = request.data.get("task", None)
        new_pos_raw = request.data.get("position", None)

        # перенос в другую задачу
        if new_task_id is not None and int(new_task_id) != instance.task_id:
            try:
                new_task = Task.objects.get(pk=new_task_id)
            except Task.DoesNotExist:
                return Response({"detail": "Task not found"}, status=404)

            # освободим "дыру" в старой задаче: сдвинем элементы после старой позиции вверх
            TaskImage.objects.filter(task_id=instance.task_id, position__gt=instance.position) \
                .update(position=F('position') - 1)

            # ставим в конец новой
            last = TaskImage.objects.filter(task=new_task).aggregate(m=Max("position"))["m"]
            instance.task = new_task
            instance.position = 0 if last is None else last + 1
            instance.save()

            ser = self.get_serializer(instance)
            return Response(ser.data)

        # реордер внутри той же задачи
        if new_pos_raw is not None:
            try:
                new_pos = int(new_pos_raw)
            except (TypeError, ValueError):
                return Response({"detail": "position must be int"}, status=400)

            if new_pos < 0:
                new_pos = 0

            task_id = instance.task_id
            # актуальный список
            imgs = list(TaskImage.objects.filter(task_id=task_id).order_by("position", "id"))

            # ограничим целевой индекс
            new_pos = min(new_pos, len(imgs) - 1)

            # пересоберём порядок в памяти
            imgs.remove(instance)
            imgs.insert(new_pos, instance)

            # переиндексация без конфликтов
            for i, img in enumerate(imgs):
                if img.position != i:
                    TaskImage.objects.filter(pk=img.pk).update(position=i)

            instance.refresh_from_db()
            ser = self.get_serializer(instance)
            return Response(ser.data)

        # ничего менять не просили — просто вернём текущее
        ser = self.get_serializer(instance)
        return Response(ser.data)
