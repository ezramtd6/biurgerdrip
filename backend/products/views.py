from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from .models import Category, Product, OptionGroup, OptionValue, RestaurantInfo
from .serializers import (
    CategorySerializer,
    ProductSerializer,
    OptionGroupSerializer,
    OptionValueSerializer,
    RestaurantInfoSerializer,
)


class IsManager(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ("MANAGER", "ADMIN")


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [permissions.AllowAny()]
        return [IsManager()]


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [permissions.AllowAny()]
        return [IsManager()]


class OptionGroupViewSet(viewsets.ModelViewSet):
    queryset = OptionGroup.objects.all()
    serializer_class = OptionGroupSerializer
    permission_classes = [IsManager]


class OptionValueViewSet(viewsets.ModelViewSet):
    queryset = OptionValue.objects.all()
    serializer_class = OptionValueSerializer
    permission_classes = [IsManager]


class RestaurantInfoViewSet(viewsets.ModelViewSet):
    queryset = RestaurantInfo.objects.all()
    serializer_class = RestaurantInfoSerializer

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [permissions.AllowAny()]
        return [IsManager()]

    def create(self, request, *args, **kwargs):
        if RestaurantInfo.objects.exists():
            return Response(
                {"detail": "A restaurant already exists. Update or delete it instead."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().create(request, *args, **kwargs)
