from decimal import Decimal

from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status

from accounts.models import User
from orders.models import PaymentSystem, Order
from products.models import Category, Product, RestaurantInfo


class PaymentSystemTests(TestCase):
    def setUp(self):
        self.manager = User.objects.create_user(
            email="manager@test.com", password="pass12345", role="MANAGER"
        )
        self.cashier = User.objects.create_user(
            email="cashier@test.com", password="pass12345", role="CASHIER"
        )
        self.customer = User.objects.create_user(
            email="customer@test.com", password="pass12345", role="CUSTOMER"
        )
        PaymentSystem.objects.get_or_create(code="CASH", defaults={"name": "Cash", "display_order": 0})
        PaymentSystem.objects.create(name="Telebirr", code="TELEBIRR", display_order=1)
        PaymentSystem.objects.create(name="Hidden", code="HIDDEN", display_order=2, is_active=False)

        restaurant = RestaurantInfo.objects.create(name="Test Restaurant")
        category = Category.objects.create(name="Main", restaurant=restaurant)
        self.product = Product.objects.create(
            name="Burger", price=Decimal("100.00"), category=category
        )

    def client_for(self, user):
        client = APIClient()
        client.force_authenticate(user=user)
        return client

    def test_customer_only_sees_active_systems(self):
        res = self.client_for(self.customer).get("/api/orders/payment-systems/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        codes = {item["code"] for item in res.data}
        self.assertEqual(codes, {"CASH", "CARD", "MOBILE", "TELEBIRR"})

    def test_anonymous_cannot_list(self):
        res = APIClient().get("/api/orders/payment-systems/")
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_manager_sees_inactive_systems(self):
        res = self.client_for(self.manager).get("/api/orders/payment-systems/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        codes = {item["code"] for item in res.data}
        self.assertEqual(codes, {"CASH", "CARD", "MOBILE", "TELEBIRR", "HIDDEN"})

    def test_customer_cannot_create(self):
        res = self.client_for(self.customer).post(
            "/api/orders/payment-systems/", {"name": "X", "code": "X"}
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_manager_can_create(self):
        res = self.client_for(self.manager).post(
            "/api/orders/payment-systems/",
            {"name": "CBE Birr", "code": "CBE_BIRR", "details": "Pay to 1000"},
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(PaymentSystem.objects.filter(code="CBE_BIRR").exists())

    def test_customer_can_create_order_with_valid_payment_method(self):
        res = self.client_for(self.customer).post(
            "/api/orders/",
            {
                "discount": 0,
                "tax": 0,
                "payment_method": "TELEBIRR",
                "items": [{"product": self.product.id, "quantity": 1, "option_values": []}],
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Order.objects.get(id=res.data["id"]).payment_method, "TELEBIRR")

    def test_customer_cannot_create_order_with_unknown_payment_method(self):
        res = self.client_for(self.customer).post(
            "/api/orders/",
            {
                "discount": 0,
                "tax": 0,
                "payment_method": "BITCOIN",
                "items": [{"product": self.product.id, "quantity": 1, "option_values": []}],
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cashier_can_complete_payment_with_manager_added_system(self):
        order = Order.objects.create(
            customer=self.customer,
            subtotal=Decimal("100.00"),
            total=Decimal("100.00"),
        )
        res = self.client_for(self.cashier).post(
            f"/api/orders/{order.id}/payment/", {"payment_method": "TELEBIRR"}
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        order.refresh_from_db()
        self.assertEqual(order.status, Order.Status.COMPLETED)
        self.assertEqual(order.payment_method, "TELEBIRR")

    def test_payment_with_unknown_method_rejected(self):
        order = Order.objects.create(
            customer=self.customer,
            subtotal=Decimal("100.00"),
            total=Decimal("100.00"),
        )
        res = self.client_for(self.cashier).post(
            f"/api/orders/{order.id}/payment/", {"payment_method": "BITCOIN"}
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
