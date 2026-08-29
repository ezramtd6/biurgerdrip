from datetime import time as time_of_day

from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
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


def is_staff_user(request):
    u = request.user
    return u.is_authenticated and u.role in ("MANAGER", "ADMIN", "CASHIER")


def is_manager_user(user):
    u = user
    return u.is_authenticated and u.role in ("MANAGER", "ADMIN")


def public_menu_open():
    """False when the restaurant's manager-assigned availability window says
    it is currently closed."""
    restaurant = RestaurantInfo.objects.first()
    return restaurant is None or restaurant.is_within_working_hours()


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
        if not is_manager_user(self.request.user):
            # Cashiers and customers only see unfrozen categories; working
            # hours and restaurant availability apply to customers only.
            qs = qs.filter(is_active=True)
            if not is_staff_user(self.request):
                if not public_menu_open():
                    return []
                qs = [c for c in qs if c.is_within_working_hours()]
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

    @action(detail=False, methods=["post"], url_path="freeze-all")
    def freeze_all(self, request):
        for category in Category.objects.filter(is_active=True):
            self.cascade_freeze(category)
            category.is_active = False
            category.save(update_fields=["is_active"])
        return Response({"detail": "All categories frozen."})

    @action(detail=False, methods=["post"], url_path="unfreeze-all")
    def unfreeze_all(self, request):
        restaurant = RestaurantInfo.objects.first()
        if restaurant and not restaurant.is_active:
            raise ValidationError(
                {"detail": "Cannot unfreeze categories because the restaurant is frozen. Unfreeze the restaurant first."}
            )
        for category in Category.objects.filter(is_active=False):
            category.is_active = True
            category.save(update_fields=["is_active"])
            self.cascade_unfreeze(category)
        return Response({"detail": "All categories unfrozen."})

    @action(detail=False, methods=["post"], url_path="set-hours")
    def set_hours(self, request):
        """Assign one shared working-hours window to every category at once."""
        raw_start = request.data.get("available_from") or None
        raw_end = request.data.get("available_to") or None

        if (raw_start is None) != (raw_end is None):
            raise ValidationError(
                {"detail": "Set both 'Available From' and 'Available To', or leave both empty for always available."}
            )

        def parse(value):
            try:
                return time_of_day.fromisoformat(value)
            except (TypeError, ValueError):
                raise ValidationError({"detail": f"Invalid time value: '{value}'."})

        start = parse(raw_start) if raw_start else None
        end = parse(raw_end) if raw_end else None
        if start is not None and start == end:
            raise ValidationError(
                {"detail": "'Available From' and 'Available To' cannot be the same time."}
            )

        count = Category.objects.count()
        Category.objects.update(available_from=start, available_to=end)
        if start is None:
            return Response({"detail": f"All {count} categories are now always available."})
        return Response({"detail": f"Working hours {start.strftime('%H:%M')}–{end.strftime('%H:%M')} applied to all {count} categories."})


class ProductViewSet(ActiveStateMixin, viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer

    def get_queryset(self):
        qs = Product.objects.all()
        if not is_manager_user(self.request.user):
            # Cashiers and customers only see unfrozen products/categories;
            # working hours and restaurant availability apply to customers only.
            qs = qs.filter(is_active=True, category__is_active=True)
            if not is_staff_user(self.request):
                if not public_menu_open():
                    return []
                hidden = {
                    c.id for c in Category.objects.filter(is_active=True)
                    if not c.is_within_working_hours()
                }
                if hidden:
                    qs = [p for p in qs if p.category_id not in hidden]
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

    def check_unfreeze(self, instance):
        pass

    def perform_destroy(self, instance):
        from promotions.models import Promotion
        from orders.models import PaymentSystem
        from accounts.models import User
        Promotion.objects.filter(products__category__restaurant=instance).distinct().delete()
        PaymentSystem.objects.all().delete()
        User.objects.filter(role=User.Role.CASHIER, branch__restaurant=instance).delete()
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
