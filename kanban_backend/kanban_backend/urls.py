from django.contrib import admin
from django.urls import path, include
from tasks.views import csrf  # <- импортируем то, что добавили
from django.conf import settings

from django.conf.urls.static import static


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/csrf/', csrf),            # <- ЭТО ДЛЯ CSRF КУКИ
    path('api/', include('tasks.urls')),  # <- твои API-роуты, если уже есть
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)