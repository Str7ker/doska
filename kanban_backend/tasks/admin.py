# tasks/admin.py
from django import forms
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin
from django.contrib.auth.models import User
from django.contrib.auth.forms import UserChangeForm, UserCreationForm

from .models import UserProfile, Task, TaskImage, Project

@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "short_desc", "tasks_total", "created_at")
    search_fields = ("title", "description")
    readonly_fields = ("created_at", "updated_at")

    def short_desc(self, obj):
        return (obj.description or "")[:60]
    short_desc.short_description = "Описание"

    def tasks_total(self, obj):
        return obj.tasks.count()
    tasks_total.short_description = "Задач"



# --- Формы пользователя с доп. полями профиля ---
class CustomUserChangeForm(UserChangeForm):
    display_name = forms.CharField(label="Отображаемое имя", required=False)
    role = forms.CharField(label="Роль", required=False)

    class Meta(UserChangeForm.Meta):
        model = User
        fields = "__all__"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        prof = getattr(self.instance, 'profile', None)
        if prof:
            self.fields['display_name'].initial = prof.display_name
            self.fields['role'].initial = prof.role


class CustomUserCreationForm(UserCreationForm):
    display_name = forms.CharField(label="Отображаемое имя", required=False)
    role = forms.CharField(label="Роль", required=False)

    class Meta(UserCreationForm.Meta):
        model = User
        fields = ("username",)


class UserAdmin(DjangoUserAdmin):
    form = CustomUserChangeForm
    add_form = CustomUserCreationForm

    fieldsets = (
        (None, {'fields': ('username', 'password')}),
        ('Personal info', {
            'fields': ('first_name', 'last_name', 'email', 'display_name', 'role')
        }),
        ('Permissions', {
            'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')
        }),
        ('Important dates', {'fields': ('last_login', 'date_joined')}),
    )

    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': (
                'username', 'password1', 'password2',
                'first_name', 'last_name', 'email',
                'display_name', 'role',
            ),
        }),
    )

    def save_model(self, request, obj, form, change):
        """
        Сохраняем пользователя стандартно, а затем вручную обновляем профиль
        из полей формы, чтобы значения НЕ «откатывались» после перезагрузки.
        """
        super().save_model(request, obj, form, change)
        display_name = (form.cleaned_data.get('display_name') or '').strip()
        role = (form.cleaned_data.get('role') or '').strip()
        prof, _ = UserProfile.objects.get_or_create(user=obj)
        need_save = False
        if display_name != prof.display_name:
            prof.display_name = display_name
            need_save = True
        if role != prof.role:
            prof.role = role
            need_save = True
        if need_save:
            prof.save()

    def save_form(self, request, form, change):
        """
        Ничего особенного не делаем, просто отдаём стандартную логику.
        (Оставлено для явности: сохранение профиля делаем в save_model.)
        """
        return super().save_form(request, form, change)

    def save_related(self, request, form, formsets, change):
        """
        Тоже стандартно, профиль уже сохранён в save_model.
        """
        super().save_related(request, form, formsets, change)


# Пере-регистрируем User c нашим админом
try:
    admin.site.unregister(User)
except admin.sites.NotRegistered:
    pass
admin.site.register(User, UserAdmin)


# Остальные модели — без изменений
@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "column", "priority", "responsible", "due_date")
    list_filter = ("column", "priority")
    search_fields = ("title", "description")


@admin.register(TaskImage)
class TaskImageAdmin(admin.ModelAdmin):
    list_display = ("id", "task", "position")
    list_filter = ("task",)
