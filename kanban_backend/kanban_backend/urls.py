from django.contrib import admin
from django.urls import path, include
from tasks.views import csrf  # <- импортируем то, что добавили

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/csrf/', csrf),            # <- ЭТО ДЛЯ CSRF КУКИ
    path('api/', include('tasks.urls')),  # <- твои API-роуты, если уже есть
]