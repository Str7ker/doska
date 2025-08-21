# tasks/serializers.py
from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Task, TaskImage, UserProfile

class UserSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()
    display_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'display_name', 'role']

    def get_role(self, obj):
        prof = getattr(obj, 'profile', None)
        if prof and prof.role:
            return prof.role
        if obj.is_superuser:
            return "Администратор"
        if obj.is_staff:
            return "Сотрудник"
        return "Пользователь"

    def get_display_name(self, obj):
        prof = getattr(obj, 'profile', None)
        return prof.display_name if (prof and prof.display_name) else obj.username


class TaskImageSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()
    image = serializers.ImageField(write_only=True, required=False)

    class Meta:
        model = TaskImage
        fields = ['id', 'task', 'position', 'image', 'url']
        read_only_fields = ['id', 'url']

    def get_url(self, obj):
        if not obj.image:
            return ""
        rel = obj.image.url
        if rel.startswith('http://') or rel.startswith('https://'):
            return rel
        request = self.context.get('request')
        return request.build_absolute_uri(rel) if request else rel


class TaskSerializer(serializers.ModelSerializer):
    responsible = UserSerializer(read_only=True)
    responsible_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source='responsible',
        write_only=True,
        required=False,
        allow_null=True,
    )
    images = TaskImageSerializer(many=True, read_only=True)

    class Meta:
        model = Task
        fields = [
            'id', 'title', 'description', 'column', 'position',
            'priority', 'due_date',
            'responsible', 'responsible_id',
            'images',
            # 'completed_at',  # если используете
        ]
