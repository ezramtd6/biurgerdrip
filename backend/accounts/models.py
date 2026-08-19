from django.db import models
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.core.validators import RegexValidator


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Email is required")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        return self.create_user(email, password, **extra_fields)


class User(AbstractUser):
    class Role(models.TextChoices):
        ADMIN = "ADMIN", "Admin"
        MANAGER = "MANAGER", "Manager"
        CASHIER = "CASHIER", "Cashier"
        CUSTOMER = "CUSTOMER", "Customer"

    username = None  # Remove username field
    email = models.EmailField(unique=True)
    phone_regex = RegexValidator(
        regex=r"^(\+251|0)(?:\s?\d{3}\s?\d{3}\s?\d{3,4})$",
        message="Phone must start with +251 or 0 followed by 9-10 digits, e.g. +251 911 234 567 or 0911 234 567",
    )
    phone = models.CharField(max_length=20, blank=True, validators=[phone_regex])
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.CUSTOMER)
    branch = models.ForeignKey(
        "products.Branch",
        on_delete=models.SET_NULL,
        related_name="staff",
        null=True,
        blank=True,
    )
    
    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["first_name", "last_name"]

    objects = UserManager()

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["phone"],
                condition=~models.Q(phone=""),
                name="unique_phone_nonempty",
            )
        ]


class PasswordResetToken(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="reset_tokens")
    token = models.CharField(max_length=255, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    is_used = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.user.email} - {self.token[:20]}"