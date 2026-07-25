from django.contrib import admin


from .models import (
    Category,
    Product,
    OptionGroup,
    OptionValue,
    RestaurantInfo,
)

admin.site.register(Category)
admin.site.register(Product)
admin.site.register(OptionGroup)
admin.site.register(OptionValue)
admin.site.register(RestaurantInfo)