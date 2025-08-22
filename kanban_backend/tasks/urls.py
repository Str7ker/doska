# tasks/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TaskViewSet, TaskImageViewSet, users_list, me, login, logout, ProjectViewSet

router = DefaultRouter()
router.register(r"projects", ProjectViewSet, basename="project")
router.register(r"tasks", TaskViewSet, basename="task")
router.register(r"task-images", TaskImageViewSet, basename="task-image")

urlpatterns = [
    path("users/", users_list, name="users-list"),
    path("me/", me, name="me"),
    path("login/", login, name="login"),
    path("logout/", logout, name="logout"),
    path("", include(router.urls)),
]
