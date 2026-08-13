from rest_framework import serializers
from .models import Order, OrderItem, OrderItemOption, PaymentSystem

class OrderItemOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItemOption
        fields = ["id", "option_value", "price_adjustment"]


class OrderItemSerializer(serializers.ModelSerializer):
    options = OrderItemOptionSerializer(many=True, read_only=True)

    class Meta:
        model = OrderItem
        fields = ["id", "product", "quantity", "unit_price", "total_price", "options"]


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = [
            "id", "order_number", "customer", "cashier", "subtotal",
            "discount", "tax", "total", "coupon", "payment_method", "status",
            "created_at", "updated_at", "items",
        ]
        read_only_fields = ["id", "order_number", "customer", "cashier", "created_at", "updated_at"]


class OrderCreateSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    discount = serializers.DecimalField(max_digits=10, decimal_places=2, default=0)
    tax = serializers.DecimalField(max_digits=10, decimal_places=2, default=0)
    payment_method = serializers.CharField(required=False, allow_blank=True, max_length=20)
    coupon_code = serializers.CharField(required=False, allow_blank=True, max_length=50)
    items = serializers.ListField(child=serializers.DictField(), write_only=True)

    def validate_payment_method(self, value):
        if value and not PaymentSystem.objects.filter(code=value).exists():
            raise serializers.ValidationError("Invalid payment method.")
        return value

    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError("At least one item is required.")
        for item in value:
            if "product" not in item:
                raise serializers.ValidationError("Each item must have a 'product' field.")
            if "quantity" not in item or int(item["quantity"]) < 1:
                raise serializers.ValidationError("Each item must have a 'quantity' >= 1.")
        return value

    def _resolve_coupon(self, code, subtotal):
        from promotions.models import Coupon

        coupon = Coupon.resolve(code) if code else None
        if not coupon:
            raise serializers.ValidationError({"coupon_code": "Invalid coupon code."})
        if subtotal < coupon.min_subtotal:
            raise serializers.ValidationError(
                {"coupon_code": f"This coupon requires a minimum subtotal of ETB {coupon.min_subtotal:.2f}."}
            )
        reason = coupon.error_message()
        if reason:
            raise serializers.ValidationError({"coupon_code": reason})
        return coupon

    def create(self, validated_data):
        items_data = validated_data.pop("items")
        coupon_code = (validated_data.pop("coupon_code", "") or "").strip() or None
        user = self.context["request"].user

        subtotal = 0
        lines = []
        for item_data in items_data:
            from products.models import Product, OptionValue

            product = Product.objects.get(id=item_data["product"])
            quantity = int(item_data["quantity"])

            option_values = item_data.get("option_values", [])
            unit_price = product.get_discounted_price() or product.price
            for ov_id in option_values:
                ov = OptionValue.objects.get(id=ov_id)
                unit_price += ov.price_adjustment

            total_price = unit_price * quantity
            subtotal += total_price
            lines.append((product, quantity, unit_price, total_price, option_values))

        coupon = None
        coupon_discount = 0
        if coupon_code:
            coupon = self._resolve_coupon(coupon_code, subtotal)
            coupon_discount = coupon.calculate_discount(subtotal)
            coupon.times_used += 1
            coupon.save(update_fields=["times_used"])

        order = Order.objects.create(
            customer=user if user.role == "CUSTOMER" else None,
            cashier=user if user.role == "CASHIER" else None,
            discount=coupon_discount if coupon else validated_data.get("discount", 0),
            coupon=coupon,
            tax=validated_data.get("tax", 0),
            payment_method=validated_data.get("payment_method") or None,
        )

        for product, quantity, unit_price, total_price, option_values in lines:
            order_item = OrderItem.objects.create(
                order=order,
                product=product,
                quantity=quantity,
                unit_price=unit_price,
                total_price=total_price,
            )

            for ov_id in option_values:
                ov = OptionValue.objects.get(id=ov_id)
                OrderItemOption.objects.create(
                    order_item=order_item,
                    option_value=ov,
                    price_adjustment=ov.price_adjustment,
                )

        order.subtotal = subtotal
        order.total = subtotal - order.discount + order.tax
        order.save()

        return order


class PaymentSystemSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentSystem
        fields = "__all__"
