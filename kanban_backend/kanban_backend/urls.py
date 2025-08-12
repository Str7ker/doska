# kanban_backend/urls.py
from django.contrib import admin
from django.urls import path, include  # 👈 обязательно include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('tasks.urls')),  # 👈 это добавь!
]