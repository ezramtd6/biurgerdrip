import json
from decimal import Decimal

from rest_framework import serializers
from .models import Order, OrderItem, OrderItemOption, PaymentSystem, OrderNotification, PaymentProofAttempt

class OrderItemOptionSerializer(serializers.ModelSerializer):
    option_name = serializers.SerializerMethodField()

    class Meta:
        model = OrderItemOption
        fields = ["id", "option_value", "option_name", "price_adjustment"]

    def get_option_name(self, obj):
        return obj.option_value.name if obj.option_value else "Deleted option"


class OrderItemSerializer(serializers.ModelSerializer):
    options = OrderItemOptionSerializer(many=True, read_only=True)
    product_name = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = ["id", "product", "product_name", "quantity", "unit_price", "total_price", "options"]

    def get_product_name(self, obj):
        return obj.product.name if obj.product else "Deleted product"


class OrderNotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderNotification
        fields = ["id", "order", "message", "is_read", "created_at"]


class PaymentProofAttemptSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()

    class Meta:
        model = PaymentProofAttempt
        fields = ["id", "image", "attempt", "rejection_reason", "created_at"]

    def get_image(self, obj):
        if obj.image:
            url = obj.image.url
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(url)
            return url
        return None


def unavailable_item_names(order):
    """Names of ordered items whose product or category is currently frozen
    or outside the category's working hours."""
    names = []
    for item in order.items.select_related("product__category"):
        product = item.product
        if not product:
            continue
        category = product.category
        if (
            not product.is_active
            or not category.is_active
            or not category.is_within_working_hours()
        ):
            names.append(product.name)
    return names


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    notifications = OrderNotificationSerializer(many=True, read_only=True)
    payment_proof = serializers.SerializerMethodField()
    proof_history = PaymentProofAttemptSerializer(many=True, read_only=True)
    has_unavailable_items = serializers.SerializerMethodField(read_only=True)
    support_phone = serializers.SerializerMethodField(read_only=True)
    customer_details = serializers.SerializerMethodField(read_only=True)
    cashier_details = serializers.SerializerMethodField(read_only=True)
    coupon_code = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Order
        fields = [
            "id", "order_number", "customer", "cashier", "subtotal",
            "discount", "tax", "total", "coupon", "coupon_code", "payment_method", "status",
            "payment_proof", "proof_attempts", "rejection_reason", "notifications", "proof_history",
            "has_unavailable_items", "support_phone", "customer_details", "cashier_details",
            "refund_method", "refund_account",
            "created_at", "updated_at", "items",
        ]
        read_only_fields = ["id", "order_number", "customer", "cashier", "created_at", "updated_at"]

    def get_coupon_code(self, obj):
        return obj.coupon.code if obj.coupon_id else None

    def get_payment_proof(self, obj):
        if obj.payment_proof:
            url = obj.payment_proof.url
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(url)
            return url
        return None

    def get_has_unavailable_items(self, obj):
        return bool(unavailable_item_names(obj))

    def get_support_phone(self, obj):
        if not self.get_has_unavailable_items(obj):
            return None
        from accounts.models import User

        cashier = (
            User.objects.filter(role=User.Role.CASHIER, is_active=True)
            .exclude(phone="")
            .first()
        )
        return cashier.phone if cashier else None

    def get_customer_details(self, obj):
        if not obj.customer_id:
            return None
        customer = obj.customer
        return {
            "first_name": customer.first_name,
            "last_name": customer.last_name,
            "phone": customer.phone,
            "email": customer.email,
        }

    def get_cashier_details(self, obj):
        if not obj.cashier_id:
            return None
        cashier = obj.cashier
        return {
            "first_name": cashier.first_name,
            "last_name": cashier.last_name,
        }


class OrderCreateSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    discount = serializers.DecimalField(max_digits=10, decimal_places=2, default=0)
    tax = serializers.DecimalField(max_digits=10, decimal_places=2, default=0)
    total = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    payment_method = serializers.CharField(required=False, allow_blank=True, max_length=20)
    coupon_code = serializers.CharField(required=False, allow_blank=True, max_length=50)
    payment_proof = serializers.ImageField(required=False, allow_null=True)
    items = serializers.JSONField(write_only=True)

    def to_representation(self, instance):
        return OrderSerializer(instance, context=self.context).data

    def validate_payment_method(self, value):
        if not value:
            return value
        user = self.context["request"].user
        role = getattr(user, "role", None)
        qs = PaymentSystem.objects.filter(code=value, is_active=True)
        if role == "CASHIER":
            allowed = qs.filter(cashier_enabled=True).exists()
        elif role == "CUSTOMER":
            allowed = qs.filter(customer_enabled=True).exists()
        else:
            allowed = qs.exists()
        if not allowed:
            raise serializers.ValidationError("Invalid payment method.")
        return value

    def validate_items(self, value):
        if isinstance(value, str):
            try:
                value = json.loads(value)
            except (json.JSONDecodeError, TypeError):
                raise serializers.ValidationError("Invalid items format.")
        if not value:
            raise serializers.ValidationError("At least one item is required.")
        for item in value:
            if "product" not in item:
                raise serializers.ValidationError("Each item must have a 'product' field.")
            if "quantity" not in item or int(item["quantity"]) < 1:
                raise serializers.ValidationError("Each item must have a 'quantity' >= 1.")

        user = self.context["request"].user

        from products.models import Product, RestaurantInfo

        # Online customers additionally cannot order while the restaurant
        # itself is outside its availability window.
        if getattr(user, "role", None) == "CUSTOMER":
            restaurant = RestaurantInfo.objects.first()
            if restaurant and not restaurant.is_within_working_hours():
                window = (
                    f"{restaurant.available_from.strftime('%H:%M')}"
                    f"-{restaurant.available_to.strftime('%H:%M')}"
                )
                raise serializers.ValidationError(
                    {"items": f"The restaurant is currently closed. "
                              f"We are open daily between {window}. Please try again later."}
                )

        # Frozen or out-of-hours categories block walk-in checkout. Online
        # customers may still place such orders — the order is flagged and
        # cashiers are notified so they can refund it.
        if getattr(user, "role", None) != "CUSTOMER":
            products = Product.objects.select_related("category").filter(
                id__in={int(item["product"]) for item in value}
            )
            by_id = {p.id: p for p in products}
            for item in value:
                product = by_id.get(int(item["product"]))
                if not product:
                    continue
                category = product.category
                if not product.is_active or not category.is_active:
                    raise serializers.ValidationError(
                        {"items": f"'{product.name}' is currently unavailable."}
                    )
                if not category.is_within_working_hours():
                    window = (
                        f"{category.available_from.strftime('%H:%M')}"
                        f"-{category.available_to.strftime('%H:%M')}"
                    )
                    raise serializers.ValidationError(
                        {
                            "items": f"'{product.name}' is only available daily between {window}. "
                                     "Please remove it from your cart and try again."
                        }
                    )
        return value

    def validate(self, attrs):
        user = self.context["request"].user
        if getattr(user, "role", None) == "CUSTOMER" and not attrs.get("payment_proof"):
            raise serializers.ValidationError(
                {"payment_proof": "Please attach proof of payment before placing your order."}
            )
        return attrs

    def _resolve_coupon(self, code, subtotal, user=None):
        from promotions.models import Coupon

        coupon = Coupon.resolve(code) if code else None
        if not coupon:
            raise serializers.ValidationError({"coupon_code": "Invalid coupon code."})
        reason = coupon.validate_for(subtotal, user=user)
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

            try:
                product = Product.objects.get(id=item_data["product"])
            except Product.DoesNotExist:
                raise serializers.ValidationError(
                    {"items": f"Product with id {item_data['product']} does not exist."}
                )
            quantity = int(item_data["quantity"])

            option_values = item_data.get("option_values", [])
            unit_price = product.get_discounted_price() or product.price
            for ov_id in option_values:
                try:
                    ov = OptionValue.objects.get(id=ov_id)
                except OptionValue.DoesNotExist:
                    raise serializers.ValidationError(
                        {"items": f"Option value with id {ov_id} does not exist."}
                    )
                unit_price += ov.price_adjustment

            total_price = unit_price * quantity
            subtotal += total_price
            lines.append((product, quantity, unit_price, total_price, option_values))

        coupon = None
        coupon_discount = 0
        if coupon_code:
            coupon = self._resolve_coupon(coupon_code, subtotal, user=user)
            coupon_discount = coupon.calculate_discount(subtotal)
            coupon.times_used += 1
            coupon.save(update_fields=["times_used"])
            # Per-person redemption only counts against the real customer
            # account; cashier walk-in orders are not tied to a person.
            from accounts.models import User

            if (
                coupon.per_person_limit is not None
                and getattr(user, "is_authenticated", False)
                and user.role == User.Role.CUSTOMER
            ):
                from promotions.models import CouponRedemption

                redemption, _ = CouponRedemption.objects.get_or_create(
                    coupon=coupon,
                    user=user,
                    defaults={"count": 0},
                )
                redemption.count += 1
                redemption.save()

        customer_total = validated_data.get("total")
        if customer_total is not None:
            if customer_total < 0:
                raise serializers.ValidationError({"total": "Total cannot be negative."})
            coupon_discount = max(Decimal("0"), subtotal - customer_total)

        order = Order.objects.create(
            customer=user if user.role == "CUSTOMER" else None,
            cashier=user if user.role == "CASHIER" else None,
            discount=coupon_discount if coupon else validated_data.get("discount", 0),
            coupon=coupon,
            tax=validated_data.get("tax", 0),
            payment_method=validated_data.get("payment_method") or None,
            payment_proof=validated_data.get("payment_proof"),
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
                try:
                    ov = OptionValue.objects.get(id=ov_id)
                except OptionValue.DoesNotExist:
                    raise serializers.ValidationError(
                        {"items": f"Option value with id {ov_id} does not exist."}
                    )
                OrderItemOption.objects.create(
                    order_item=order_item,
                    option_value=ov,
                    price_adjustment=ov.price_adjustment,
                )

        order.subtotal = subtotal
        order.total = (
            customer_total
            if customer_total is not None
            else subtotal - order.discount + order.tax
        )
        order.save()

        if order.payment_proof:
            from .models import PaymentProofAttempt
            PaymentProofAttempt.objects.create(
                order=order,
                image=order.payment_proof,
                attempt=0,
            )

        if user.role == "CUSTOMER":
            from .models import notify_cashiers

            unavailable = unavailable_item_names(order)
            if unavailable:
                names = ", ".join(unavailable)
                notify_cashiers(
                    order,
                    f"Order {order.order_number} was placed with currently unavailable items "
                    f"({names}). Contact the customer or refund ETB {order.total:.2f}.",
                )
            else:
                notify_cashiers(order, f"New order {order.order_number} placed — total ETB {order.total:.2f}.")

        return order


class PaymentSystemSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentSystem
        fields = "__all__"
