from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TaskViewSet, UserViewSet, TaskImageViewSet

router = DefaultRouter()
router.register(r'tasks', TaskViewSet)
router.register(r'task-images', TaskImageViewSet, basename='task-images')

router.register(r'users', UserViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
urlpatterns = router.urls
