# tasks/models.py
from django.db import models
from django.contrib.auth.models import User

# ---- Профиль пользователя ----
class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    display_name = models.CharField("Отображаемое имя", max_length=255, blank=True, default="")
    role = models.CharField("Роль", max_length=64, blank=True, default="")

    def __str__(self):
        return self.display_name or self.user.username

# авто-создание профиля при создании пользователя
from django.db.models.signals import post_save
from django.dispatch import receiver

@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.create(user=instance)

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

class TaskImage(models.Model):
    task = models.ForeignKey(Task, related_name="images", on_delete=models.CASCADE)
    image = models.ImageField(upload_to="tasks/")
    position = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["position"]
        constraints = [
            models.UniqueConstraint(fields=["task", "position"], name="unique_task_position"),
        ]