from rest_framework import viewsets, permissions
from rest_framework.exceptions import ValidationError
from .models import Category, Product, OptionGroup, OptionValue, RestaurantInfo, Branch, SocialLink, Contact
from .serializers import (
    CategorySerializer,
    ProductSerializer,
    OptionGroupSerializer,
    OptionValueSerializer,
    RestaurantInfoSerializer,
    BranchSerializer,
    SocialLinkSerializer,
    ContactSerializer,
)


class IsManager(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ("MANAGER", "ADMIN")


class ActiveStateMixin:
    """Enforces the Restaurant -> Category -> Product -> OptionGroup freeze hierarchy.

    Freezing or unfreezing a parent cascades to every descendant. A child cannot
    be unfrozen while any of its ancestors is frozen.
    """

    def cascade_freeze(self, instance):
        raise NotImplementedError

    def cascade_unfreeze(self, instance):
        raise NotImplementedError

    def check_unfreeze(self, instance):
        raise NotImplementedError

    def perform_update(self, serializer):
        instance = serializer.instance
        old_active = instance.is_active
        new_active = serializer.validated_data.get("is_active", old_active)
        if old_active and not new_active:
            self.cascade_freeze(instance)
        elif not old_active and new_active:
            self.check_unfreeze(instance)
            self.cascade_unfreeze(instance)
        serializer.save()


class CategoryViewSet(ActiveStateMixin, viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer

    def get_queryset(self):
        qs = Category.objects.all()
        if not self.request.user.is_authenticated:
            qs = qs.filter(is_active=True)
        return qs

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [permissions.AllowAny()]
        return [IsManager()]

    def cascade_freeze(self, instance):
        instance.products.all().update(is_active=False)
        OptionGroup.objects.filter(product__category=instance).update(is_active=False)

    def cascade_unfreeze(self, instance):
        instance.products.all().update(is_active=True)
        OptionGroup.objects.filter(product__category=instance).update(is_active=True)

    def check_unfreeze(self, instance):
        if instance.restaurant_id and not instance.restaurant.is_active:
            raise ValidationError(
                {"detail": "Cannot unfreeze this category because the restaurant is frozen. Unfreeze the restaurant first."}
            )


class ProductViewSet(ActiveStateMixin, viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer

    def get_queryset(self):
        qs = Product.objects.all()
        if not self.request.user.is_authenticated:
            qs = qs.filter(is_active=True, category__is_active=True)
        return qs

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [permissions.AllowAny()]
        return [IsManager()]

    def cascade_freeze(self, instance):
        instance.option_groups.all().update(is_active=False)

    def cascade_unfreeze(self, instance):
        instance.option_groups.all().update(is_active=True)

    def check_unfreeze(self, instance):
        category = instance.category
        if category.restaurant_id and not category.restaurant.is_active:
            raise ValidationError(
                {"detail": "Cannot unfreeze this product because the restaurant is frozen. Unfreeze the restaurant first."}
            )
        if not category.is_active:
            raise ValidationError(
                {"detail": "Cannot unfreeze this product because its category is frozen. Unfreeze the category first."}
            )


class OptionGroupViewSet(ActiveStateMixin, viewsets.ModelViewSet):
    queryset = OptionGroup.objects.all()
    serializer_class = OptionGroupSerializer
    permission_classes = [IsManager]

    def cascade_freeze(self, instance):
        pass

    def cascade_unfreeze(self, instance):
        pass

    def check_unfreeze(self, instance):
        product = instance.product
        category = product.category
        if category.restaurant_id and not category.restaurant.is_active:
            raise ValidationError(
                {"detail": "Cannot unfreeze this option group because the restaurant is frozen. Unfreeze the restaurant first."}
            )
        if not category.is_active:
            raise ValidationError(
                {"detail": "Cannot unfreeze this option group because its category is frozen. Unfreeze the category first."}
            )
        if not product.is_active:
            raise ValidationError(
                {"detail": "Cannot unfreeze this option group because its product is frozen. Unfreeze the product first."}
            )


class OptionValueViewSet(viewsets.ModelViewSet):
    queryset = OptionValue.objects.all()
    serializer_class = OptionValueSerializer
    permission_classes = [IsManager]

    def get_queryset(self):
        qs = OptionValue.objects.all()
        group_id = self.request.query_params.get("option_group")
        if group_id:
            qs = qs.filter(option_group_id=group_id)
        return qs

    def perform_update(self, serializer):
        instance = serializer.instance
        old_available = instance.available
        new_available = serializer.validated_data.get("available", old_available)
        if not old_available and new_available and not instance.option_group.is_active:
            raise ValidationError(
                {"detail": "Cannot unfreeze this option value because its option group is frozen. Unfreeze the option group first."}
            )
        serializer.save()


class RestaurantInfoViewSet(ActiveStateMixin, viewsets.ModelViewSet):
    queryset = RestaurantInfo.objects.all()
    serializer_class = RestaurantInfoSerializer

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [permissions.AllowAny()]
        return [IsManager()]

    def perform_create(self, serializer):
        restaurant = serializer.save()
        Branch.objects.create(
            restaurant=restaurant,
            name="Main",
            is_main=True,
        )

    def cascade_freeze(self, instance):
        instance.categories.all().update(is_active=False)
        Product.objects.filter(category__restaurant=instance).update(is_active=False)
        OptionGroup.objects.filter(product__category__restaurant=instance).update(is_active=False)
        from promotions.models import Promotion
        from orders.models import PaymentSystem
        from accounts.models import User
        Promotion.objects.filter(products__category__restaurant=instance).update(is_active=False)
        PaymentSystem.objects.all().update(is_active=False)
        User.objects.filter(role=User.Role.CASHIER, branch__restaurant=instance).update(is_active=False)
        User.objects.filter(role=User.Role.CUSTOMER, orders__isnull=False).update(is_active=False)

    def cascade_unfreeze(self, instance):
        instance.categories.all().update(is_active=True)
        Product.objects.filter(category__restaurant=instance).update(is_active=True)
        OptionGroup.objects.filter(product__category__restaurant=instance).update(is_active=True)
        from promotions.models import Promotion
        from orders.models import PaymentSystem
        from accounts.models import User
        Promotion.objects.filter(products__category__restaurant=instance).update(is_active=True)
        PaymentSystem.objects.all().update(is_active=True)
        User.objects.filter(role=User.Role.CASHIER, branch__restaurant=instance).update(is_active=True)
        User.objects.filter(role=User.Role.CUSTOMER, orders__isnull=False).update(is_active=True)

    def check_unfreeze(self, instance):
        pass

    def perform_destroy(self, instance):
        from promotions.models import Promotion
        from orders.models import PaymentSystem
        from accounts.models import User
        Promotion.objects.filter(products__category__restaurant=instance).distinct().delete()
        PaymentSystem.objects.all().delete()
        User.objects.filter(role=User.Role.CASHIER, branch__restaurant=instance).delete()
        User.objects.filter(role=User.Role.CUSTOMER, orders__isnull=False).delete()
        super().perform_destroy(instance)


class BranchViewSet(viewsets.ModelViewSet):
    queryset = Branch.objects.all()
    serializer_class = BranchSerializer

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [permissions.AllowAny()]
        return [IsManager()]

    def perform_destroy(self, instance):
        restaurant = instance.restaurant
        was_main = instance.is_main
        super().perform_destroy(instance)
        if was_main:
            replacement = Branch.objects.filter(restaurant=restaurant).order_by("pk").first()
            if replacement:
                Branch.objects.filter(pk=replacement.pk).update(is_main=True)


class SocialLinkViewSet(viewsets.ModelViewSet):
    queryset = SocialLink.objects.all().order_by("platform")
    serializer_class = SocialLinkSerializer

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [permissions.AllowAny()]
        return [IsManager()]

    def perform_create(self, serializer):
        if "restaurant" not in serializer.validated_data or serializer.validated_data["restaurant"] is None:
            restaurant = RestaurantInfo.objects.first()
            if restaurant:
                serializer.save(restaurant=restaurant)
            else:
                serializer.save()


class ContactViewSet(viewsets.ModelViewSet):
    queryset = Contact.objects.all().order_by("id")
    serializer_class = ContactSerializer

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [permissions.AllowAny()]
        return [IsManager()]

    def create(self, request, *args, **kwargs):
        if Contact.objects.exists():
            raise ValidationError({"detail": "A contact already exists. Edit the existing contact instead."})
        return super().create(request, *args, **kwargs)
