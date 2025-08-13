from django.contrib.auth.models import User
from rest_framework import viewsets, permissions
from .serializers import TaskSerializer, UserSerializer, TaskImageSerializer
from .models import Task, TaskImage
from django.http import JsonResponse
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework.decorators import api_view

class TaskViewSet(viewsets.ModelViewSet):
    queryset = Task.objects.all().select_related('responsible').prefetch_related('images')
    serializer_class = TaskSerializer
    permission_classes = [permissions.IsAuthenticated]  # если у тебя так

class TaskImageViewSet(viewsets.ModelViewSet):
    queryset = TaskImage.objects.all()
    serializer_class = TaskImageSerializer
    permission_classes = [permissions.IsAuthenticated]

    # Разрешим фильтровать по задаче: /api/task-images/?task=ID
    def get_queryset(self):
        qs = super().get_queryset()
        task_id = self.request.query_params.get('task')
        return qs.filter(task_id=task_id) if task_id else qs

class UserViewSet(viewsets.ReadOnlyModelViewSet):  # 👈 только для чтения
    queryset = User.objects.all()
    serializer_class = UserSerializer

@ensure_csrf_cookie
@api_view(["GET"])
def csrf(request):
    # просто возвращаем 200 и ставим csrftoken в куки
    return JsonResponse({"detail": "ok"})
