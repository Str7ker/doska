# tasks/serializers.py
from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Task, TaskImage, UserProfile, Project

class UserSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()
    display_name = serializers.SerializerMethodField()
    class Meta:
        model = User
        fields = ['id', 'username', 'display_name', 'role']
    def get_role(self, obj):
        prof = getattr(obj, 'profile', None)
        if prof and prof.role: return prof.role
        if obj.is_superuser: return "Администратор"
        if obj.is_staff: return "Сотрудник"
        return "Пользователь"
    def get_display_name(self, obj):
        prof = getattr(obj, 'profile', None)
        return prof.display_name if (prof and prof.display_name) else obj.username

class ProjectSerializer(serializers.ModelSerializer):
    participants = UserSerializer(many=True, read_only=True)
    participants_ids = serializers.PrimaryKeyRelatedField(
        many=True, queryset=User.objects.all(), source="participants", write_only=True, required=False
    )
    class Meta:
        model = Project
        fields = ['id', 'title', 'description', 'due_date',
                  'participants', 'participants_ids',
                  'created_at', 'updated_at']

class TaskImageSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()
    image = serializers.ImageField(write_only=True, required=False)
    class Meta:
        model = TaskImage
        fields = ['id', 'task', 'position', 'image', 'url']
        read_only_fields = ['id', 'url']
    def get_url(self, obj):
        if not obj.image: return ""
        rel = obj.image.url
        if rel.startswith("http://") or rel.startswith("https://"): return rel
        request = self.context.get("request")
        return request.build_absolute_uri(rel) if request else rel

class TaskSerializer(serializers.ModelSerializer):
    project = ProjectSerializer(read_only=True)
    project_id = serializers.PrimaryKeyRelatedField(
        queryset=Project.objects.all(), source='project', write_only=True, required=False, allow_null=True
    )
    responsible = UserSerializer(read_only=True)
    responsible_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), source='responsible', write_only=True, required=False, allow_null=True
    )
    images = TaskImageSerializer(many=True, read_only=True)

    class Meta:
        model = Task
        fields = [
            'id','title','description','column','position',
            'priority','due_date',
            'project','project_id',
            'responsible','responsible_id',
            'images',
        ]

    def validate(self, attrs):
        # проект задачи (при создании берём из attrs, при обновлении — из instance)
        project = attrs.get('project') or getattr(self.instance, 'project', None)
        responsible = attrs.get('responsible', getattr(self.instance, 'responsible', None))
        if responsible and project:
            if not project.participants.filter(id=responsible.id).exists():
                raise serializers.ValidationError({
                    'responsible_id': 'Этот пользователь не состоит в проекте и не может быть ответственным.'
                })
        return attrs