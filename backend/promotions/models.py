import uuid
from decimal import Decimal

from django.db import models
from django.utils import timezone

from products.models import Product


class Promotion(models.Model):
    class Type(models.TextChoices):
        DISCOUNT = "DISCOUNT", "Discount"
        BANNER = "BANNER", "Banner"

    type = models.CharField(max_length=20, choices=Type.choices)

    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)

    discount_percent = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        blank=True,
        null=True,
    )
    discount_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        blank=True,
        null=True,
    )
    products = models.ManyToManyField(Product, blank=True, related_name="promotions")

    image = models.ImageField(upload_to="promotions/", blank=True, null=True)
    link = models.URLField(blank=True)

    start_date = models.DateField(blank=True, null=True)
    end_date = models.DateField(blank=True, null=True)

    is_active = models.BooleanField(default=True)
    display_order = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["display_order", "-id"]

    def __str__(self):
        return self.title

    def is_running(self, when=None):
        when = when or timezone.localdate()
        if not self.is_active:
            return False
        if self.start_date and when < self.start_date:
            return False
        if self.end_date and when > self.end_date:
            return False
        return True

    def discount_for(self, price):
        """Return the discounted price for a given base price, or None if no discount applies."""
        if not self.is_running() or self.type != self.Type.DISCOUNT:
            return None
        effective = price
        if self.discount_percent:
            effective = effective * (Decimal("100") - self.discount_percent) / Decimal("100")
        if self.discount_amount:
            effective = effective - self.discount_amount
        if effective < Decimal("0"):
            effective = Decimal("0.00")
        return effective


class Coupon(models.Model):
    code = models.CharField(max_length=50, unique=True)

    discount_percent = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        blank=True,
        null=True,
    )
    discount_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        blank=True,
        null=True,
    )
    min_subtotal = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("0"),
    )
    max_discount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        blank=True,
        null=True,
    )

    valid_from = models.DateField(blank=True, null=True)
    valid_until = models.DateField(blank=True, null=True)

    usage_limit = models.PositiveIntegerField(blank=True, null=True)
    times_used = models.PositiveIntegerField(default=0)

    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.code

    @classmethod
    def resolve(cls, code):
        return cls.objects.filter(code__iexact=code).first()

    def error_message(self):
        today = timezone.localdate()
        if not self.is_active:
            return "This coupon is not active."
        if self.valid_from and today < self.valid_from:
            return "This coupon is not valid yet."
        if self.valid_until and today > self.valid_until:
            return "This coupon has expired."
        if self.usage_limit is not None and self.times_used >= self.usage_limit:
            return "This coupon has reached its usage limit."
        return None

    def validate_for(self, subtotal):
        """Return an error message if this coupon cannot be used for the subtotal, else None."""
        if subtotal < self.min_subtotal:
            return f"This coupon requires a minimum subtotal of ETB {self.min_subtotal:.2f}."
        return self.error_message()

    def calculate_discount(self, subtotal):
        if self.discount_percent:
            discount = subtotal * self.discount_percent / Decimal("100")
            if self.max_discount:
                discount = min(discount, self.max_discount)
        elif self.discount_amount:
            discount = self.discount_amount
        else:
            discount = Decimal("0.00")
        return min(discount, subtotal)