# tasks/serializers.py
from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Task, TaskImage

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username']

class TaskImageSerializer(serializers.ModelSerializer):
    url = serializers.ImageField(source='image', read_only=True)

    class Meta:
        model = TaskImage
        fields = ['id', 'url', 'position', 'task']
        read_only_fields = ['id', 'url']

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
