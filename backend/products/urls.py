from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CategoryViewSet,
    ProductViewSet,
    OptionGroupViewSet,
    OptionValueViewSet,
    RestaurantInfoViewSet,
)

router = DefaultRouter()
router.register(r"categories", CategoryViewSet)
router.register(r"products", ProductViewSet)
router.register(r"option-groups", OptionGroupViewSet)
router.register(r"option-values", OptionValueViewSet)
router.register(r"restaurant", RestaurantInfoViewSet)

urlpatterns = [
    path("", include(router.urls)),
]