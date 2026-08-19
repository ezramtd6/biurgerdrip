import uuid
from django.db import models
from django.conf import settings
from products.models import Product, OptionValue


class Order(models.Model):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        PREPARING = "PREPARING", "Preparing"
        READY = "READY", "Ready"
        COMPLETED = "COMPLETED", "Completed"
        CANCELLED = "CANCELLED", "Cancelled"
        REJECTED = "REJECTED", "Payment Rejected"

    class PaymentMethod(models.TextChoices):
        CASH = "CASH", "Cash"
        CARD = "CARD", "Card"
        MOBILE = "MOBILE", "Mobile Payment"

    order_number = models.CharField(max_length=20, unique=True, editable=False)
    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="orders"
    )
    cashier = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="cashier_orders"
    )
    subtotal = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    discount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    tax = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    coupon = models.ForeignKey(
        "promotions.Coupon",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="orders",
    )
    payment_method = models.CharField(
        max_length=20,
        choices=PaymentMethod.choices,
        blank=True,
        null=True
    )
    payment_proof = models.ImageField(
        upload_to="payment_proofs/",
        blank=True,
        null=True,
        help_text="Picture the customer attaches as proof of payment",
    )
    proof_attempts = models.PositiveIntegerField(
        default=0,
        help_text="How many times the cashier has rejected this payment proof",
    )
    rejection_reason = models.TextField(
        blank=True,
        default="",
        help_text="Reason provided by the cashier when rejecting payment proof",
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.order_number:
            self.order_number = f"ORD-{uuid.uuid4().hex[:8].upper()}"
        super().save(*args, **kwargs)

    def __str__(self):
        return self.order_number


class PaymentProofAttempt(models.Model):
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name="proof_history",
    )
    image = models.ImageField(upload_to="payment_proofs/")
    attempt = models.PositiveIntegerField()
    rejection_reason = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["attempt"]

    def __str__(self):
        return f"{self.order.order_number} attempt {self.attempt}"


class OrderNotification(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="order_notifications",
        help_text="Recipient of the notification (customer or cashier)",
    )
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name="notifications"
    )
    message = models.TextField()
    message_amharic = models.TextField(blank=True, default="")
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Notification for {self.order.order_number}"


def notify_cashiers(order, message, message_amharic=""):
    from accounts.models import User

    for cashier in User.objects.filter(role=User.Role.CASHIER, is_active=True):
        OrderNotification.objects.create(user=cashier, order=order, message=message, message_amharic=message_amharic)


def notify_user(user, order, message, message_amharic=""):
    OrderNotification.objects.create(user=user, order=order, message=message, message_amharic=message_amharic)


class OrderItem(models.Model):
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name="items"
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="order_items"
    )
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    total_price = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f"{self.quantity}x {self.product.name if self.product else 'Deleted product'}"


class OrderItemOption(models.Model):
    order_item = models.ForeignKey(
        OrderItem,
        on_delete=models.CASCADE,
        related_name="options"
    )
    option_value = models.ForeignKey(
        OptionValue,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="order_item_options"
    )
    price_adjustment = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    def __str__(self):
        return f"{self.option_value.name if self.option_value else 'Deleted option'} (+{self.price_adjustment})"


class PaymentSystem(models.Model):
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=20, unique=True)
    icon = models.ImageField(upload_to="payment_systems/", blank=True, null=True)
    details = models.TextField(blank=True, help_text="Instructions shown to the customer, e.g. account number")
    is_active = models.BooleanField(default=True)
    cashier_enabled = models.BooleanField(default=True, help_text="Available to cashiers")
    customer_enabled = models.BooleanField(default=True, help_text="Available to customers")
    display_order = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["display_order", "name"]

    def __str__(self):
        return self.name
