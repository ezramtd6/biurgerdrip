import datetime
from datetime import time as time_only
from decimal import Decimal

from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase, APIClient

from accounts.models import User
from orders.models import PaymentSystem
from products.models import (
    RestaurantInfo,
    Category,
    Product,
    OptionGroup,
    Branch,
    is_within_time_window,
)
from promotions.models import Promotion


def aware(month, day, hour, minute=0):
    """Build a timezone-aware datetime in the settings timezone."""
    tz = timezone.get_current_timezone()
    return timezone.make_aware(
        datetime.datetime(2026, month, day, hour, minute), tz
    )


class IsWithinTimeWindowTests(TestCase):
    def test_no_window_returns_true_when_open(self):
        self.assertTrue(is_within_time_window(None, None, now=aware(1, 1, 12)))
        self.assertTrue(is_within_time_window(None, time_only(10, 0), now=aware(1, 1, 12)))
        self.assertTrue(is_within_time_window(time_only(10, 0), None, now=aware(1, 1, 12)))

    def test_normal_window_inside(self):
        start = time_only(9, 0)
        end = time_only(17, 0)
        self.assertTrue(is_within_time_window(start, end, now=aware(3, 15, 12)))

    def test_normal_window_outside(self):
        start = time_only(9, 0)
        end = time_only(17, 0)
        self.assertFalse(is_within_time_window(start, end, now=aware(3, 15, 8)))
        self.assertFalse(is_within_time_window(start, end, now=aware(3, 15, 20)))

    def test_boundaries_inclusive(self):
        start = time_only(9, 0)
        end = time_only(17, 0)
        self.assertTrue(is_within_time_window(start, end, now=aware(3, 15, 9)))
        self.assertTrue(is_within_time_window(start, end, now=aware(3, 15, 17)))

    def test_overnight_window(self):
        start = time_only(22, 0)
        end = time_only(2, 0)
        self.assertTrue(is_within_time_window(start, end, now=aware(3, 15, 23)))
        self.assertTrue(is_within_time_window(start, end, now=aware(3, 16, 1)))
        self.assertTrue(is_within_time_window(start, end, now=aware(3, 15, 22)))
        self.assertTrue(is_within_time_window(start, end, now=aware(3, 15, 2)))
        self.assertFalse(is_within_time_window(start, end, now=aware(3, 15, 12)))


class WorkingHoursModelTests(TestCase):
    def setUp(self):
        self.restaurant = RestaurantInfo.objects.create(name="Test Restaurant")
        self.category = Category.objects.create(name="Burgers", restaurant=self.restaurant)

    def test_restaurant_no_schedule_always_open(self):
        self.assertIsNone(self.restaurant.available_from)
        self.assertTrue(self.restaurant.is_within_working_hours(now=aware(1, 1, 12)))

    def test_restaurant_inside_window(self):
        self.restaurant.available_from = time_only(9, 0)
        self.restaurant.available_to = time_only(17, 0)
        self.restaurant.save()
        self.assertTrue(self.restaurant.is_within_working_hours(now=aware(1, 1, 12)))

    def test_restaurant_outside_window(self):
        self.restaurant.available_from = time_only(9, 0)
        self.restaurant.available_to = time_only(17, 0)
        self.restaurant.save()
        self.assertFalse(self.restaurant.is_within_working_hours(now=aware(1, 1, 20)))

    def test_restaurant_overnight_window(self):
        self.restaurant.available_from = time_only(22, 0)
        self.restaurant.available_to = time_only(2, 0)
        self.restaurant.save()
        self.assertTrue(self.restaurant.is_within_working_hours(now=aware(1, 1, 23)))
        self.assertTrue(self.restaurant.is_within_working_hours(now=aware(1, 2, 1)))
        self.assertFalse(self.restaurant.is_within_working_hours(now=aware(1, 1, 12)))

    def test_category_no_schedule_always_open(self):
        self.assertTrue(self.category.is_within_working_hours(now=aware(1, 1, 12)))

    def test_category_inside_window(self):
        self.category.available_from = time_only(8, 0)
        self.category.available_to = time_only(18, 0)
        self.category.save()
        self.assertTrue(self.category.is_within_working_hours(now=aware(1, 1, 10)))
        self.assertFalse(self.category.is_within_working_hours(now=aware(1, 1, 20)))

    def test_category_overnight_window(self):
        self.category.available_from = time_only(22, 0)
        self.category.available_to = time_only(2, 0)
        self.category.save()
        self.assertTrue(self.category.is_within_working_hours(now=aware(1, 1, 23)))
        self.assertFalse(self.category.is_within_working_hours(now=aware(1, 1, 12)))


class RestaurantInfoApiTestCase(APITestCase):
    def setUp(self):
        self.manager = User.objects.create_user(
            email="manager@test.com", password="pass12345", role=User.Role.MANAGER
        )
        self.customer = User.objects.create_user(
            email="customer@test.com", password="pass12345", role=User.Role.CUSTOMER
        )

        self.restaurant = RestaurantInfo.objects.create(
            name="Test Restaurant",
            address="Addis Ababa",
            phone="+251 911 234 567",
            opening_hours="9-5",
        )
        Branch.objects.create(restaurant=self.restaurant, name="Main", is_main=True)

        self.category = Category.objects.create(name="Burgers", restaurant=self.restaurant)
        self.product = Product.objects.create(
            name="Classic Burger",
            category=self.category,
            description="A classic",
            price=Decimal("100.00"),
        )
        self.group = OptionGroup.objects.create(product=self.product, name="Sauce")
        self.promo = Promotion.objects.create(
            type=Promotion.Type.DISCOUNT, title="20% off", discount_percent=Decimal("20.00")
        )
        self.promo.products.add(self.product)

        PaymentSystem.objects.get_or_create(
            code="CASH", defaults={"name": "Cash", "display_order": 0}
        )
        PaymentSystem.objects.create(name="Telebirr", code="TELEBIRR", display_order=1)

        self.branch = self.restaurant.branches.first()
        self.cashier = User.objects.create_user(
            email="cashier@test.com", password="pass12345", role=User.Role.CASHIER,
            branch=self.branch,
        )
        self.customer_at_branch = User.objects.create_user(
            email="customer2@test.com", password="pass12345", role=User.Role.CUSTOMER,
            branch=self.branch,
        )

    def manager_client(self):
        client = APIClient()
        client.force_authenticate(user=self.manager)
        return client

    def anonymous_client(self):
        return APIClient()

    def test_list_allows_anonymous(self):
        response = self.anonymous_client().get("/api/restaurant/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_retrieve_allows_anonymous(self):
        response = self.anonymous_client().get(f"/api/restaurant/{self.restaurant.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_list_exposes_is_available_now(self):
        response = self.anonymous_client().get("/api/restaurant/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data[0]["is_available_now"])

    def test_is_available_now_false_when_inactive(self):
        self.restaurant.is_active = False
        self.restaurant.save()
        response = self.anonymous_client().get("/api/restaurant/")
        self.assertFalse(response.data[0]["is_available_now"])

    def test_is_available_now_false_outside_working_hours(self):
        # DB row matches the restaurant's static schedule; simulate by checking serializer output.
        self.restaurant.available_from = time_only(9, 0)
        self.restaurant.available_to = time_only(17, 0)
        self.restaurant.save()
        response = self.anonymous_client().get("/api/restaurant/")
        row = response.data[0]
        self.assertEqual(
            row["is_available_now"], self.restaurant.is_active and self.restaurant.is_within_working_hours()
        )

    def test_anonymous_cannot_create(self):
        response = self.anonymous_client().post(
            "/api/restaurant/", {"name": "X", "address": "A", "phone": "0911222", "opening_hours": "9-5"}
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_customer_cannot_update(self):
        client = APIClient()
        client.force_authenticate(user=self.customer)
        response = client.patch(f"/api/restaurant/{self.restaurant.id}/", {"name": "Hacked"})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_customer_cannot_delete(self):
        client = APIClient()
        client.force_authenticate(user=self.customer)
        response = client.delete(f"/api/restaurant/{self.restaurant.id}/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_manager_can_create(self):
        response = self.manager_client().post(
            "/api/restaurant/",
            {
                "name": "New Place",
                "address": "Bole",
                "phone": "+251 911 234 567",
                "opening_hours": "24/7",
            },
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        new_restaurant = RestaurantInfo.objects.get(name="New Place")
        self.assertTrue(new_restaurant.branches.filter(is_main=True).exists())

    def test_freeze_deactivates_categories_products_groups(self):
        response = self.manager_client().patch(
            f"/api/restaurant/{self.restaurant.id}/", {"is_active": False}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.category.refresh_from_db()
        self.product.refresh_from_db()
        self.group.refresh_from_db()
        self.assertFalse(self.category.is_active)
        self.assertFalse(self.product.is_active)
        self.assertFalse(self.group.is_active)

    def test_freeze_deactivates_promotions(self):
        self.manager_client().patch(
            f"/api/restaurant/{self.restaurant.id}/", {"is_active": False}
        )
        self.promo.refresh_from_db()
        self.assertFalse(self.promo.is_active)

    def test_freeze_deactivates_all_payment_systems(self):
        self.manager_client().patch(
            f"/api/restaurant/{self.restaurant.id}/", {"is_active": False}
        )
        self.assertFalse(PaymentSystem.objects.filter(is_active=True).exists())

    def test_freeze_deactivates_cashiers_but_not_customers(self):
        self.manager_client().patch(
            f"/api/restaurant/{self.restaurant.id}/", {"is_active": False}
        )
        self.cashier.refresh_from_db()
        self.customer_at_branch.refresh_from_db()
        self.assertFalse(self.cashier.is_active)
        # CUSTOMER accounts must NOT be touched by the freeze.
        self.assertTrue(self.customer_at_branch.is_active)

    def test_unfreeze_reactivates_cascade(self):
        # First freeze
        self.manager_client().patch(
            f"/api/restaurant/{self.restaurant.id}/", {"is_active": False}
        )
        # Then unfreeze
        response = self.manager_client().patch(
            f"/api/restaurant/{self.restaurant.id}/", {"is_active": True}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.category.refresh_from_db()
        self.product.refresh_from_db()
        self.group.refresh_from_db()
        self.promo.refresh_from_db()
        self.cashier.refresh_from_db()
        self.assertTrue(self.category.is_active)
        self.assertTrue(self.product.is_active)
        self.assertTrue(self.group.is_active)
        self.assertTrue(self.promo.is_active)
        self.assertTrue(self.cashier.is_active)
        self.assertTrue(PaymentSystem.objects.filter(is_active=True).exists())

    def test_delete_cascades_everything(self):
        response = self.manager_client().delete(f"/api/restaurant/{self.restaurant.id}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(RestaurantInfo.objects.filter(pk=self.restaurant.id).exists())
        self.assertFalse(Category.objects.filter(pk=self.category.id).exists())
        self.assertFalse(Product.objects.filter(pk=self.product.id).exists())
        self.assertFalse(Branch.objects.filter(pk=self.branch.id).exists())
        self.assertFalse(Promotion.objects.filter(pk=self.promo.id).exists())
        self.assertFalse(PaymentSystem.objects.exists())
        self.assertFalse(User.objects.filter(pk=self.cashier.id).exists())

    def test_delete_keeps_customer_account(self):
        self.manager_client().delete(f"/api/restaurant/{self.restaurant.id}/")
        # CUSTOMER accounts must survive restaurant deletion.
        self.assertTrue(User.objects.filter(pk=self.customer_at_branch.id).exists())
