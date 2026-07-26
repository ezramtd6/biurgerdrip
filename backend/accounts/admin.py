import secrets
from django import forms
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html
from .models import User, PasswordResetToken
from .utils import send_set_password_email


class CustomUserCreationForm(forms.ModelForm):
    class Meta:
        model = User
        fields = ("email", "first_name", "last_name", "phone", "role")
        widgets = {
            "role": admin.widgets.AdminRadioSelect,
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["role"].choices = [
            (User.Role.MANAGER, "Manager"),
            (User.Role.CASHIER, "Cashier"),
        ]


class CustomUserChangeForm(forms.ModelForm):
    password = forms.CharField(widget=forms.PasswordInput, required=False, help_text="Leave blank to keep current password.")

    class Meta:
        model = User
        fields = ("email", "first_name", "last_name", "phone", "is_active", "is_staff", "is_superuser", "groups", "user_permissions")


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    model = User
    form = CustomUserChangeForm
    add_form = CustomUserCreationForm
    list_display = ["email", "first_name", "last_name", "role", "is_active"]
    list_filter = ["role", "is_active"]
    search_fields = ["email", "first_name", "last_name"]
    ordering = ["email"]

    fieldsets = (
        (None, {"fields": ("email",)}),
        ("Personal Info", {"fields": ("first_name", "last_name", "phone")}),
        ("Permissions", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
    )

    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": ("email", "first_name", "last_name", "phone", "role"),
        }),
    )

    def save_model(self, request, obj, form, change):
        if not change:
            obj.is_active = False
            obj.set_unusable_password()
            obj.save()
            token = secrets.token_urlsafe(64)
            PasswordResetToken.objects.create(user=obj, token=token)
            send_set_password_email(obj.email, obj.first_name, obj.role, token)
            self.message_user(
                request,
                f"Account created for {obj.email}. A set-password email has been sent.",
            )
        else:
            obj.save()
