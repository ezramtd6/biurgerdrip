from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework import serializers
from .models import User


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "email", "first_name", "last_name", "phone", "role"]
        read_only_fields = ["id", "role"]


class RegisterSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["email", "first_name", "last_name", "phone"]
    
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


class CustomTokenRefreshSerializer(serializers.Serializer):
    refresh = serializers.CharField()
    
    def validate(self, attrs):
        refresh = RefreshToken(attrs["refresh"])
        data = {"access": str(refresh.access_token)}
        return data


class CashierSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "email", "first_name", "last_name", "phone", "role", "is_active", "branch"]
        read_only_fields = ["id", "role"]


class CashierCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["email", "first_name", "last_name", "phone", "branch"]

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