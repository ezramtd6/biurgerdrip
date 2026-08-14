from django.db import models
from django.core.validators import RegexValidator

# Create your models here.
class Category(models.Model):
    restaurant = models.ForeignKey(
        "RestaurantInfo",
        on_delete=models.CASCADE,
        related_name="categories",
        null=True,
        blank=True,
    )

    name=models.CharField(max_length=100, unique=True, error_messages={"unique": "A category with this name already exists."})
    name_amharic = models.CharField(max_length=100, blank=True)
    image = models.ImageField(upload_to="categories/", blank=True, null=True)
    description = models.TextField(blank=True)
    display_order = models.PositiveIntegerField(default=0)

    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["display_order", "id"]

    def __str__(self):
        return self.name
    
class Product(models.Model):
    category = models.ForeignKey(
        Category,
        on_delete=models.CASCADE,
        related_name="products"
    )

    name = models.CharField(max_length=100)
    name_amharic = models.CharField(max_length=100, blank=True)
    description = models.TextField()
    description_amharic = models.TextField(blank=True)
    price = models.DecimalField(max_digits=8, decimal_places=2, default=0)

    has_sizes = models.BooleanField(default=False)

    is_active = models.BooleanField(default=True)

    image = models.ImageField(upload_to="products/", blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["category", "name"],
                name="unique_product_name_per_category",
                violation_error_message="A product with this name already exists in this category.",
            )
        ]

    def __str__(self):
        return self.name

    def get_discounted_price(self):
        """Best discounted price from running discount promotions, or None."""
        from decimal import Decimal
        from promotions.models import Promotion

        best = None
        for promo in self.promotions.filter(type=Promotion.Type.DISCOUNT):
            discounted = promo.discount_for(self.price)
            if discounted is not None and (best is None or discounted < best):
                best = discounted
        if best is not None:
            return best.quantize(Decimal("0.01"))
        return None

class OptionGroup(models.Model):
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="option_groups"
    )

    name = models.CharField(max_length=100)

    name_amharic = models.CharField(max_length=100, blank=True)

    is_active = models.BooleanField(default=True)

    required = models.BooleanField(default=False)

    multiple_choice = models.BooleanField(default=False)

    display_order = models.PositiveIntegerField(default=0)

    def __str__(self):
        return f"{self.product.name} - {self.name}"

    class Meta:
        ordering = ["display_order", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["product", "name"],
                name="unique_option_group_name_per_product",
                violation_error_message="An option group with this name already exists for this product.",
            )
        ]

class OptionValue(models.Model):
    option_group = models.ForeignKey(
        OptionGroup,
        on_delete=models.CASCADE,
        related_name="values"
    )

    name = models.CharField(max_length=100)

    name_amharic = models.CharField(max_length=100, blank=True)

    price_adjustment = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        default=0
    )

    available = models.BooleanField(default=True)

    display_order = models.PositiveIntegerField(default=0)

    def __str__(self):
        return self.name

    class Meta:
        ordering = ["display_order", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["option_group", "name"],
                name="unique_option_value_name_per_group",
                violation_error_message="An option value with this name already exists in this group.",
            )
        ]

class RestaurantInfo(models.Model):
    name = models.CharField(max_length=100)

    logo = models.ImageField(upload_to="restaurant/", blank=True, null=True)

    address = models.CharField(max_length=255)

    phone = models.CharField(max_length=20)

    opening_hours = models.CharField(max_length=100)

    about = models.TextField(blank=True)

    about_amharic = models.TextField(blank=True)

    is_active = models.BooleanField(default=True)

    latitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        blank=True,
        null=True
    )

    longitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        blank=True,
        null=True
    )

    def __str__(self):
        return self.name


class Branch(models.Model):
    restaurant = models.ForeignKey(
        RestaurantInfo,
        on_delete=models.CASCADE,
        related_name="branches"
    )

    name = models.CharField(max_length=100, blank=True, default="")

    is_main = models.BooleanField(default=False)

    latitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        blank=True,
        null=True
    )

    longitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        blank=True,
        null=True
    )

    def __str__(self):
        return f"{self.restaurant.name} - {self.name or self.pk}"


class SocialLink(models.Model):
    class Platform(models.TextChoices):
        FACEBOOK = "facebook", "Facebook"
        INSTAGRAM = "instagram", "Instagram"
        TWITTER = "twitter", "Twitter / X"
        TIKTOK = "tiktok", "TikTok"
        YOUTUBE = "youtube", "YouTube"
        TELEGRAM = "telegram", "Telegram"

    restaurant = models.ForeignKey(
        RestaurantInfo,
        on_delete=models.CASCADE,
        related_name="social_links"
    )

    platform = models.CharField(
        max_length=20,
        choices=Platform.choices
    )

    url = models.URLField()

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["restaurant", "platform"],
                name="unique_social_platform_per_restaurant",
            )
        ]

    def __str__(self):
        return f"{self.platform}: {self.url}"


class Contact(models.Model):
    phone_regex = RegexValidator(
        regex=r"^(\+251|0)(?:\s?\d{3}\s?\d{3}\s?\d{3})$",
        message="Phone must start with +251 or 0 followed by 9 digits, e.g. +251 911 234 567 or 0911 234 567",
    )
    phone = models.CharField(max_length=20, validators=[phone_regex])

    email = models.EmailField()

    location = models.CharField(max_length=200)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.phone} - {self.email}"