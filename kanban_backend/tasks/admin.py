from django.contrib import admin
from .models import Task

@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'column', 'priority', 'responsible', 'due_date')
    list_filter = ('column', 'priority', 'responsible', 'due_date')
    search_fields = ('title', 'description')