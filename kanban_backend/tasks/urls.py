from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TaskViewSet, TaskImageViewSet, users_list

router = DefaultRouter()
router.register(r"tasks", TaskViewSet, basename="task")
router.register(r"task-images", TaskImageViewSet, basename="task-image")

urlpatterns = [
    path("users/", users_list, name="users-list"),
    path("", include(router.urls)),
]
