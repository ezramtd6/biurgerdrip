from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CategoryViewSet,
    ProductViewSet,
    OptionGroupViewSet,
    OptionValueViewSet,
    RestaurantInfoViewSet,
    BranchViewSet,
    SocialLinkViewSet,
    ContactViewSet,
)

router = DefaultRouter()
router.register(r"categories", CategoryViewSet)
router.register(r"products", ProductViewSet)
router.register(r"option-groups", OptionGroupViewSet)
router.register(r"option-values", OptionValueViewSet)
router.register(r"restaurant", RestaurantInfoViewSet)
router.register(r"branches", BranchViewSet)
router.register(r"social-links", SocialLinkViewSet)
router.register(r"contacts", ContactViewSet)

urlpatterns = [
    path("", include(router.urls)),
]