from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Task, TaskImage

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username']

class TaskImageSerializer(serializers.ModelSerializer):
    # файл принимаем только на запись
    image = serializers.ImageField(write_only=True, required=False)
    url = serializers.SerializerMethodField()

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
        ]
