from django.db import models

# Create your models here.
class Category(models.Model):
    name=models.CharField(max_length=100)
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
    description = models.TextField()
    price = models.DecimalField(max_digits=8, decimal_places=2, default=0)
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

    def __str__(self):
        return self.name