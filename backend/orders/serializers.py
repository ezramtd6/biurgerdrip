from rest_framework import serializers
from .models import Order, OrderItem, OrderItemOption


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
            "discount", "tax", "total", "payment_method", "status",
            "created_at", "updated_at", "items",
        ]
        read_only_fields = ["id", "order_number", "customer", "cashier", "created_at", "updated_at"]


class OrderCreateSerializer(serializers.Serializer):
    discount = serializers.DecimalField(max_digits=10, decimal_places=2, default=0)
    tax = serializers.DecimalField(max_digits=10, decimal_places=2, default=0)
    payment_method = serializers.ChoiceField(
        choices=Order.PaymentMethod.choices, required=False, allow_blank=True
    )
    items = serializers.ListField(child=serializers.DictField(), write_only=True)

    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError("At least one item is required.")
        for item in value:
            if "product" not in item:
                raise serializers.ValidationError("Each item must have a 'product' field.")
            if "quantity" not in item or int(item["quantity"]) < 1:
                raise serializers.ValidationError("Each item must have a 'quantity' >= 1.")
        return value

    def create(self, validated_data):
        items_data = validated_data.pop("items")
        user = self.context["request"].user

        order = Order.objects.create(
            customer=user if user.role == "CUSTOMER" else None,
            cashier=user if user.role == "CASHIER" else None,
            discount=validated_data.get("discount", 0),
            tax=validated_data.get("tax", 0),
            payment_method=validated_data.get("payment_method") or None,
        )

        subtotal = 0
        for item_data in items_data:
            from products.models import Product, OptionValue

            product = Product.objects.get(id=item_data["product"])
            quantity = item_data["quantity"]

            option_values = item_data.get("option_values", [])
            unit_price = 0
            for ov_id in option_values:
                ov = OptionValue.objects.get(id=ov_id)
                unit_price += ov.price_adjustment

            total_price = unit_price * quantity
            subtotal += total_price

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
