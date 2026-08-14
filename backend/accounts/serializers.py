from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework.exceptions import AuthenticationFailed
from rest_framework import serializers
from django.utils import timezone
from datetime import timedelta
from .models import User, PasswordResetToken


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "email", "first_name", "last_name", "phone", "role"]
        read_only_fields = ["id", "role"]

    def validate_phone(self, value):
        value = (value or "").strip()
        if value and User.objects.filter(phone=value).exclude(pk=self.instance.pk if self.instance else None).exists():
            raise serializers.ValidationError("Phone number is already in use.")
        return value


class RegisterSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["email", "first_name", "last_name", "phone"]

    def validate_phone(self, value):
        value = (value or "").strip()
        if User.objects.filter(phone=value).exists():
            raise serializers.ValidationError("Phone number is already in use.")
        return value

    def create(self, validated_data):
        user = User.objects.create_user(
            email=validated_data["email"],
            first_name=validated_data["first_name"],
            last_name=validated_data["last_name"],
            phone=validated_data.get("phone", ""),
            password=None,
            role=User.Role.CUSTOMER,
            is_active=False,
        )
        user.set_unusable_password()
        user.save()
        return user


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["user_id"] = user.id
        token["email"] = user.email
        token["role"] = user.role
        return token

    def validate(self, attrs):
        email = attrs.get(self.username_field)
        user = User.objects.filter(email=email).first()
        if not user:
            raise AuthenticationFailed("We can't find this email. Please create an account or check the email you entered.")
        if user and not user.is_active:
            if user.has_usable_password():
                from products.models import Contact
                contact = Contact.objects.first()
                manager_phone = contact.phone if contact else ""
                raise AuthenticationFailed(
                    f"Your account is blocked. Please contact the manager at {manager_phone}."
                    if manager_phone else
                    "Your account is blocked. Please contact the manager."
                )
            activation_token = (
                PasswordResetToken.objects.filter(user=user, is_used=False)
                .order_by("-created_at")
                .first()
            )
            expired = not activation_token or (
                timezone.now() - activation_token.created_at > timedelta(hours=48)
            )
            if expired:
                raise AuthenticationFailed(
                    "Please activate your account using the activation link sent to your email."
                )
            raise AuthenticationFailed(
                "Your activation link is still valid. Please check your email to activate your account."
            )
        return super().validate(attrs)


class CashierSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "email", "first_name", "last_name", "phone", "role", "is_active", "branch"]
        read_only_fields = ["id", "role"]

    def validate_phone(self, value):
        value = (value or "").strip()
        if value and User.objects.filter(phone=value).exclude(pk=self.instance.pk if self.instance else None).exists():
            raise serializers.ValidationError("Phone number is already in use.")
        return value


class CashierCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["email", "first_name", "last_name", "phone", "branch"]

    def validate_phone(self, value):
        value = (value or "").strip()
        if value and User.objects.filter(phone=value).exists():
            raise serializers.ValidationError("Phone number is already in use.")
        return value

    def create(self, validated_data):
        user = User.objects.create_user(
            email=validated_data["email"],
            first_name=validated_data["first_name"],
            last_name=validated_data["last_name"],
            phone=validated_data.get("phone", ""),
            branch=validated_data.get("branch"),
            password=None,
            role=User.Role.CASHIER,
            is_active=False,
        )
        user.set_unusable_password()
        user.save()
        return user


class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "email", "first_name", "last_name", "phone", "role", "is_active", "date_joined"]
        read_only_fields = ["id", "role", "date_joined"]

    def validate_phone(self, value):
        value = (value or "").strip()
        if value and User.objects.filter(phone=value).exclude(pk=self.instance.pk if self.instance else None).exists():
            raise serializers.ValidationError("Phone number is already in use.")
        return value