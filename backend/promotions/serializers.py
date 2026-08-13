from rest_framework import serializers

from products.models import Product
from .models import Promotion, Coupon


class PromotionSerializer(serializers.ModelSerializer):
    products = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.all(),
        many=True,
        required=False,
    )

    class Meta:
        model = Promotion
        fields = "__all__"

    def validate(self, attrs):
        promo_type = attrs.get("type") or (self.instance.type if self.instance else None)
        percent = attrs.get("discount_percent")
        amount = attrs.get("discount_amount")

        if promo_type == Promotion.Type.DISCOUNT:
            if not percent and not amount:
                raise serializers.ValidationError(
                    "A discount promotion requires discount_percent or discount_amount."
                )
            if percent is not None and not (0 < percent <= 100):
                raise serializers.ValidationError("discount_percent must be between 1 and 100.")
            if percent is not None and amount is not None:
                raise serializers.ValidationError(
                    "Set either discount_percent or discount_amount, not both."
                )
        elif promo_type in (None, Promotion.Type.BANNER):
            attrs["discount_percent"] = None
            attrs["discount_amount"] = None

        start_date = attrs.get("start_date")
        end_date = attrs.get("end_date")
        if start_date and end_date and end_date < start_date:
            raise serializers.ValidationError("end_date cannot be before start_date.")

        return attrs


class CouponSerializer(serializers.ModelSerializer):
    class Meta:
        model = Coupon
        fields = "__all__"
        read_only_fields = ["times_used"]

    def validate(self, attrs):
        code = attrs.get("code", (self.instance.code if self.instance else None) or "").strip().upper()
        attrs["code"] = code
        percent = attrs.get("discount_percent")
        amount = attrs.get("discount_amount")
        if not percent and not amount:
            raise serializers.ValidationError(
                "A coupon requires discount_percent or discount_amount."
            )
        if percent is not None and amount is not None:
            raise serializers.ValidationError(
                "Set either discount_percent or discount_amount, not both."
            )
        if percent is not None and not (0 < percent <= 100):
            raise serializers.ValidationError("discount_percent must be between 1 and 100.")
        return attrs