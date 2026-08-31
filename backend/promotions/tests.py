import datetime
import json
from decimal import Decimal

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
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


class CouponValidateEndpointTests(APITestCase):
    def setUp(self):
        self.customer = User.objects.create_user(
            email="customer@test.com",
            password="Password@123",
            role=User.Role.CUSTOMER,
        )
        self.coupon = Coupon.objects.create(
            code="SAVE20",
            discount_percent=Decimal("20.00"),
            min_subtotal=Decimal("100.00"),
        )

    def _validate(self, code, subtotal):
        return self.client.post(
            "/api/coupons/validate/",
            {"code": code, "subtotal": subtotal},
            format="json",
        )

    def test_requires_authentication(self):
        response = self._validate("SAVE20", 200)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_valid_coupon(self):
        self.client.force_authenticate(self.customer)
        response = self._validate("save20", 200)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["valid"])
        self.assertEqual(response.data["code"], "SAVE20")
        self.assertEqual(response.data["discount"], "40.00")

    def test_invalid_coupon(self):
        self.client.force_authenticate(self.customer)
        response = self._validate("NOPE", 200)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["valid"])
        self.assertEqual(response.data["error"], "Invalid coupon code.")

    def test_min_subtotal_not_met(self):
        self.client.force_authenticate(self.customer)
        response = self._validate("SAVE20", 50)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["valid"])
        self.assertIn("minimum subtotal", response.data["error"])

    def test_validation_does_not_increment_usage(self):
        self.client.force_authenticate(self.customer)
        self._validate("SAVE20", 200)
        self.coupon.refresh_from_db()
        self.assertEqual(self.coupon.times_used, 0)


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


class PromotionDiscountLogicTests(TestCase):
    def _promo(self, type=Promotion.Type.DISCOUNT, percent=None, amount=None, **kw):
        return Promotion.objects.create(
            type=type, title="Promo", discount_percent=percent, discount_amount=amount, **kw
        )

    def test_percent_only(self):
        promo = self._promo(percent=Decimal("20.00"))
        result = promo.discount_for(Decimal("100.00"))
        self.assertEqual(result.quantize(Decimal("0.01")), Decimal("80.00"))

    def test_amount_only(self):
        promo = self._promo(amount=Decimal("25.00"))
        result = promo.discount_for(Decimal("100.00"))
        self.assertEqual(result.quantize(Decimal("0.01")), Decimal("75.00"))

    def test_percent_then_amount(self):
        promo = self._promo(percent=Decimal("20.00"), amount=Decimal("5.00"))
        result = promo.discount_for(Decimal("100.00"))
        self.assertEqual(result.quantize(Decimal("0.01")), Decimal("75.00"))

    def test_discount_never_below_zero(self):
        promo = self._promo(amount=Decimal("500.00"))
        self.assertEqual(promo.discount_for(Decimal("100.00")), Decimal("0.00"))

    def test_inactive_promotion_returns_none(self):
        promo = self._promo(percent=Decimal("20.00"), is_active=False)
        self.assertIsNone(promo.discount_for(Decimal("100.00")))

    def test_banner_promotion_returns_none(self):
        promo = self._promo(type=Promotion.Type.BANNER, percent=Decimal("20.00"))
        self.assertIsNone(promo.discount_for(Decimal("100.00")))

    def test_not_started_returns_none(self):
        promo = self._promo(
            percent=Decimal("20.00"),
            start_date=datetime.date.today() + datetime.timedelta(days=1),
        )
        self.assertIsNone(promo.discount_for(Decimal("100.00")))

    def test_expired_returns_none(self):
        promo = self._promo(
            percent=Decimal("20.00"),
            end_date=datetime.date.today() - datetime.timedelta(days=1),
        )
        self.assertIsNone(promo.discount_for(Decimal("100.00")))


class CouponModelUnitTests(TestCase):
    def _coupon(self, **kw):
        kw.setdefault("code", "SAVE10")
        return Coupon.objects.create(**kw)

    def test_resolve_is_case_insensitive(self):
        coupon = self._coupon()
        self.assertEqual(Coupon.resolve("save10").pk, coupon.pk)

    def test_resolve_missing_returns_none(self):
        self.assertIsNone(Coupon.resolve("NOPE"))

    def test_validate_for_below_min_subtotal(self):
        coupon = self._coupon(min_subtotal=Decimal("100.00"))
        message = coupon.validate_for(Decimal("50.00"))
        self.assertIsNotNone(message)
        self.assertIn("minimum subtotal", message)

    def test_validate_for_meets_min_and_valid(self):
        coupon = self._coupon(min_subtotal=Decimal("100.00"))
        self.assertIsNone(coupon.validate_for(Decimal("150.00")))

    def test_error_inactive(self):
        self.assertEqual(
            self._coupon(is_active=False).error_message(),
            "This coupon is not active.",
        )

    def test_error_not_valid_yet(self):
        coupon = self._coupon(
            valid_from=datetime.date.today() + datetime.timedelta(days=1)
        )
        self.assertEqual(coupon.error_message(), "This coupon is not valid yet.")

    def test_error_expired(self):
        coupon = self._coupon(
            valid_until=datetime.date.today() - datetime.timedelta(days=1)
        )
        self.assertEqual(coupon.error_message(), "This coupon has expired.")

    def test_error_usage_limit_reached(self):
        coupon = self._coupon(usage_limit=1, times_used=1)
        self.assertEqual(
            coupon.error_message(), "This coupon has reached its usage limit."
        )

    def test_percent_discount_with_max_cap(self):
        coupon = self._coupon(
            discount_percent=Decimal("20.00"), max_discount=Decimal("30.00")
        )
        self.assertEqual(coupon.calculate_discount(Decimal("200.00")), Decimal("30.00"))

    def test_percent_discount_without_max_cap(self):
        coupon = self._coupon(discount_percent=Decimal("20.00"))
        self.assertEqual(coupon.calculate_discount(Decimal("200.00")), Decimal("40.00"))

    def test_amount_discount_capped_by_subtotal(self):
        coupon = self._coupon(discount_amount=Decimal("10.00"))
        self.assertEqual(coupon.calculate_discount(Decimal("5.00")), Decimal("5.00"))

    def test_no_discount_fields(self):
        coupon = self._coupon()
        self.assertEqual(coupon.calculate_discount(Decimal("100.00")), Decimal("0.00"))