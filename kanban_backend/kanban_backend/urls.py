# kanban_backend/urls.py
from django.contrib import admin
from django.urls import path, include
from tasks.views import csrf  # важно: теперь эта функция точно есть
from django.conf import settings

from django.conf.urls.static import static

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/csrf/", csrf, name="csrf"),
    path("api/", include("tasks.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)