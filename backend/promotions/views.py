from rest_framework import viewsets, permissions

from products.views import IsManager
from .models import Promotion, Coupon
from .serializers import PromotionSerializer, CouponSerializer


class PromotionViewSet(viewsets.ModelViewSet):
    queryset = Promotion.objects.all()
    serializer_class = PromotionSerializer

    def get_queryset(self):
        qs = Promotion.objects.all()
        if not self.request.user.is_authenticated:
            qs = qs.filter(is_active=True)
        return qs

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [permissions.AllowAny()]
        return [IsManager()]


class CouponViewSet(viewsets.ModelViewSet):
    queryset = Coupon.objects.all()
    serializer_class = CouponSerializer
    permission_classes = [IsManager]