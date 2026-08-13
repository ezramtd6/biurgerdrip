from django.contrib import admin
from .models import Promotion, Coupon


class PromotionAdmin(admin.ModelAdmin):
    list_display = ["title", "type", "is_active", "display_order", "start_date", "end_date"]
    list_filter = ["type", "is_active"]
    search_fields = ["title"]
    filter_horizontal = ["products"]


admin.site.register(Promotion, PromotionAdmin)


class CouponAdmin(admin.ModelAdmin):
    list_display = ["code", "discount_percent", "discount_amount", "is_active", "times_used", "usage_limit"]
    search_fields = ["code"]


admin.site.register(Coupon, CouponAdmin)