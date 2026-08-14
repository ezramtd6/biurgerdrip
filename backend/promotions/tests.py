import datetime
import json
from decimal import Decimal

from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import User
from orders.models import Order
from products.models import Category, Product
from .models import Promotion, Coupon

TINY_PNG = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
    b"\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01"
    b"\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
)


class PromotionModelTests(APITestCase):
    def setUp(self):
        self.category = Category.objects.create(name="Burgers")
        self.product = Product.objects.create(
            name="Classic Burger",
            category=self.category,
            description="A classic",
            price=Decimal("100.00"),
        )

    def _make_discount(self, type=Promotion.Type.DISCOUNT, percent=None, amount=None, end=None, start=None):
        promo = Promotion.objects.create(
            type=type,
            title="Test promo",
            discount_percent=percent,
            discount_amount=amount,
            start_date=start,
            end_date=end,
        )
        promo.products.add(self.product)
        return promo

    def test_percent_discount_price(self):
        self._make_discount(percent=Decimal("20.00"))
        self.assertEqual(self.product.get_discounted_price(), Decimal("80.00"))

    def test_fixed_discount_price(self):
        self._make_discount(amount=Decimal("25.00"))
        self.assertEqual(self.product.get_discounted_price(), Decimal("75.00"))

    def test_frozen_promotion_does_not_discount(self):
        promo = self._make_discount(percent=Decimal("20.00"))
        promo.is_active = False
        promo.save()
        self.assertIsNone(self.product.get_discounted_price())

    def test_expired_promotion_does_not_discount(self):
        self._make_discount(percent=Decimal("20.00"), end=datetime.date.today() - datetime.timedelta(days=1))
        self.assertIsNone(self.product.get_discounted_price())

    def test_banner_promotion_does_not_discount(self):
        self._make_discount(type=Promotion.Type.BANNER, percent=Decimal("20.00"))
        self.assertIsNone(self.product.get_discounted_price())

    def test_anonymous_list_only_active_promotions(self):
        self._make_discount(percent=Decimal("20.00"))
        Promotion.objects.create(type=Promotion.Type.BANNER, title="Hidden", is_active=False)
        response = self.client.get("/api/promotions/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        titles = [p["title"] for p in response.data]
        self.assertEqual(titles, ["Test promo"])

    def test_product_serializer_includes_discounted_price(self):
        self._make_discount(percent=Decimal("20.00"))
        response = self.client.get(f"/api/products/{self.product.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["discounted_price"], "80.00")


class CouponOrderTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="customer@test.com",
            password="Password@123",
            role=User.Role.CUSTOMER,
        )
        self.category = Category.objects.create(name="Burgers")
        self.product = Product.objects.create(
            name="Classic Burger",
            category=self.category,
            description="A classic",
            price=Decimal("100.00"),
        )

    def _create_order(self, coupon_code=None):
        payload = {
            "discount": 0,
            "tax": 0,
            "payment_method": "CASH",
            "payment_proof": SimpleUploadedFile(
                "proof.png", TINY_PNG, content_type="image/png"
            ),
            "items": json.dumps(
                [{"product": self.product.id, "quantity": 2, "option_values": []}]
            ),
        }
        if coupon_code:
            payload["coupon_code"] = coupon_code
        return self.client.post("/api/orders/", payload, format="multipart")

    def _latest_order(self):
        return Order.objects.latest("id")

    def test_coupon_percent_discount(self):
        Coupon.objects.create(code="SAVE20", discount_percent=Decimal("20.00"))
        self.client.force_authenticate(self.user)
        response = self._create_order("save20")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        order = self._latest_order()
        self.assertEqual(order.subtotal, Decimal("200.00"))
        self.assertEqual(order.discount, Decimal("40.00"))
        self.assertEqual(order.total, Decimal("160.00"))
        self.assertEqual(order.coupon.code, "SAVE20")

    def test_coupon_min_subtotal_required(self):
        Coupon.objects.create(code="MIN100", discount_amount=Decimal("10.00"), min_subtotal=Decimal("300.00"))
        self.client.force_authenticate(self.user)
        response = self._create_order("MIN100")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invalid_coupon_rejected(self):
        self.client.force_authenticate(self.user)
        response = self._create_order("NOPE")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_coupon_increments_times_used(self):
        coupon = Coupon.objects.create(code="ONCE", discount_amount=Decimal("5.00"), usage_limit=1)
        self.client.force_authenticate(self.user)
        response = self._create_order("ONCE")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        coupon.refresh_from_db()
        self.assertEqual(coupon.times_used, 1)

    def test_discounted_product_price_in_order(self):
        promo = Promotion.objects.create(
            type=Promotion.Type.DISCOUNT,
            title="20% off",
            discount_percent=Decimal("20.00"),
        )
        promo.products.add(self.product)
        self.client.force_authenticate(self.user)
        response = self._create_order()
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        order = self._latest_order()
        self.assertEqual(order.subtotal, Decimal("160.00"))