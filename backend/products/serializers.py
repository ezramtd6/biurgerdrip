from decimal import Decimal
from django.db import transaction
from rest_framework import serializers
from .models import Category, Product, OptionGroup, OptionValue, RestaurantInfo, Branch, SocialLink, Contact


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = "__all__"

    def create(self, validated_data):
        if "restaurant" not in validated_data or validated_data["restaurant"] is None:
            restaurant = RestaurantInfo.objects.first()
            if restaurant:
                validated_data["restaurant"] = restaurant
        return super().create(validated_data)


class OptionValueSerializer(serializers.ModelSerializer):
    class Meta:
        model = OptionValue
        fields = "__all__"


class OptionGroupSerializer(serializers.ModelSerializer):
    values = OptionValueSerializer(many=True, read_only=True)

    class Meta:
        model = OptionGroup
        fields = "__all__"


class ProductSerializer(serializers.ModelSerializer):
    price = serializers.DecimalField(max_digits=8, decimal_places=2, min_value=Decimal("0"), required=False)
    option_groups = OptionGroupSerializer(many=True, read_only=True)

    class Meta:
        model = Product
        fields = "__all__"

    def _ensure_size_group(self, instance):
        if not instance.has_sizes:
            return
        group, _ = OptionGroup.objects.get_or_create(
            product=instance,
            name="Size",
            defaults={"name_amharic": "መጠን", "required": True, "multiple_choice": True},
        )
        if not group.required:
            group.required = True
            group.save(update_fields=["required"])
        if not group.multiple_choice:
            group.multiple_choice = True
            group.save(update_fields=["multiple_choice"])

    def create(self, validated_data):
        with transaction.atomic():
            instance = super().create(validated_data)
            self._ensure_size_group(instance)
        return instance

    def update(self, instance, validated_data):
        with transaction.atomic():
            instance = super().update(instance, validated_data)
            if instance.has_sizes:
                self._ensure_size_group(instance)
            else:
                instance.option_groups.filter(name="Size").delete()
        return instance


class RestaurantInfoSerializer(serializers.ModelSerializer):
    class Meta:
        model = RestaurantInfo
        fields = "__all__"


class BranchSerializer(serializers.ModelSerializer):
    class Meta:
        model = Branch
        fields = "__all__"

    def create(self, validated_data):
        restaurant = validated_data.get("restaurant")
        if restaurant and not Branch.objects.filter(restaurant=restaurant).exists():
            validated_data["is_main"] = True
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if validated_data.get("is_main"):
            Branch.objects.filter(
                restaurant=instance.restaurant,
                is_main=True,
            ).exclude(pk=instance.pk).update(is_main=False)
        return super().update(instance, validated_data)


class SocialLinkSerializer(serializers.ModelSerializer):
    restaurant = serializers.PrimaryKeyRelatedField(
        queryset=RestaurantInfo.objects.all(),
        required=False,
        allow_null=True,
    )

    class Meta:
        model = SocialLink
        fields = "__all__"
        validators = []

    def validate(self, attrs):
        restaurant = attrs.get("restaurant") or (
            self.instance.restaurant if self.instance else None
        )
        if not restaurant:
            restaurant = RestaurantInfo.objects.first()
        platform = attrs.get("platform") or (
            self.instance.platform if self.instance else None
        )
        if restaurant and platform:
            qs = SocialLink.objects.filter(restaurant=restaurant, platform=platform)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError(
                    {"platform": f"This restaurant already has a {platform} link."}
                )
        return attrs


class ContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contact
        fields = "__all__"
