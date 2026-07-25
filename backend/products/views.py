from rest_framework import viewsets
from .models import Category, Product, OptionGroup, OptionValue, RestaurantInfo
from .serializers import (
    CategorySerializer,
    ProductSerializer,
    OptionGroupSerializer,
    OptionValueSerializer,
    RestaurantInfoSerializer,
)

class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer

class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer

class OptionGroupViewSet(viewsets.ModelViewSet):
    queryset = OptionGroup.objects.all()
    serializer_class = OptionGroupSerializer

class OptionValueViewSet(viewsets.ModelViewSet):
    queryset = OptionValue.objects.all()
    serializer_class = OptionValueSerializer

class RestaurantInfoViewSet(viewsets.ModelViewSet):
    queryset = RestaurantInfo.objects.all()
    serializer_class = RestaurantInfoSerializer