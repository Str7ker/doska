# kanban_backend/urls.py
from django.contrib import admin
from django.urls import path, include
from tasks.views import csrf  # важно: теперь эта функция точно есть

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/csrf/", csrf, name="csrf"),
    path("api/", include("tasks.urls")),
]
