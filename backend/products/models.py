from django.db import models

# Create your models here.
class Category(models.Model):
    restaurant = models.ForeignKey(
        "RestaurantInfo",
        on_delete=models.CASCADE,
        related_name="categories",
        null=True,
        blank=True,
    )

    name=models.CharField(max_length=100)
    name_amharic = models.CharField(max_length=100, blank=True)
    image = models.ImageField(upload_to="categories/", blank=True, null=True)
    description = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

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

    image = models.ImageField(upload_to="products/", blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

class OptionGroup(models.Model):
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="option_groups"
    )

    name = models.CharField(max_length=100)

    name_amharic = models.CharField(max_length=100, blank=True)

    price = models.DecimalField(max_digits=8, decimal_places=2, default=0)

    required = models.BooleanField(default=False)

    multiple_choice = models.BooleanField(default=False)

    display_order = models.PositiveIntegerField(default=0)

    def __str__(self):
        return f"{self.product.name} - {self.name}"

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

class RestaurantInfo(models.Model):
    name = models.CharField(max_length=100)

    logo = models.ImageField(upload_to="restaurant/", blank=True, null=True)

    address = models.CharField(max_length=255)

    phone = models.CharField(max_length=20)

    opening_hours = models.CharField(max_length=100)

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