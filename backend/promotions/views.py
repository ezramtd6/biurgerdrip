from decimal import Decimal, InvalidOperation

from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response

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

    def get_permissions(self):
        if self.action == "validate":
            return [permissions.IsAuthenticated()]
        return [IsManager()]

    @action(detail=False, methods=["post"])
    def validate(self, request):
        code = (request.data.get("code") or "").strip()
        try:
            subtotal = Decimal(str(request.data.get("subtotal") or "0"))
        except (InvalidOperation, TypeError, ValueError):
            subtotal = Decimal("0")

        coupon = Coupon.resolve(code) if code else None
        if not coupon:
            return Response({"valid": False, "error": "Invalid coupon code."})
        reason = coupon.validate_for(subtotal, user=request.user)
        if reason:
            return Response({"valid": False, "error": reason})
        return Response(
            {
                "valid": True,
                "code": coupon.code,
                "discount": str(coupon.calculate_discount(subtotal)),
            }
        )