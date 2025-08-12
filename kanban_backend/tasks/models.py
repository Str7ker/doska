# tasks/models.py
from django.db import models
from django.contrib.auth.models import User

class Task(models.Model):
    COLUMN_CHOICES = [
        ('new', 'Новые'),
        ('in_progress', 'Выполняются'),
        ('testing', 'Тестирование'),
        ('review', 'Правки'),
        ('done', 'Выполнено'),
    ]

    PRIORITY_CHOICES = [
        ('low', 'Низкий'),
        ('medium', 'Средний'),
        ('high', 'Высокий'),
        ('critical', 'Критичный'),
    ]

    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    column = models.CharField(max_length=20, choices=COLUMN_CHOICES, default='new')
    position = models.PositiveIntegerField(default=0)

    # если у тебя поле называется иначе — оставь своё
    responsible = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='tasks')

    # 👉 новое поле приоритета
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='medium')
    due_date = models.DateField(null=True, blank=True)  # дедлайн (дата)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['position']
