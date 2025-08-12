from django.contrib.auth.models import User
from rest_framework import viewsets
from .serializers import TaskSerializer, UserSerializer
from .models import Task

class TaskViewSet(viewsets.ModelViewSet):
    queryset = Task.objects.all()
    serializer_class = TaskSerializer

class UserViewSet(viewsets.ReadOnlyModelViewSet):  # 👈 только для чтения
    queryset = User.objects.all()
    serializer_class = UserSerializer
