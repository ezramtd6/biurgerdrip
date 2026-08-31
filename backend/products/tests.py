from datetime import date, timedelta
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.test import TestCase
from promotions.models import Promotion
from products.models import (
    Product,
    Category,
    OptionGroup,
    OptionValue,
    RestaurantInfo,
    SocialLink,
    Contact,
)


def assert_constraint_message(instance, message):
    try:
        instance.full_clean()
        raise AssertionError("Expected ValidationError")
    except ValidationError as exc:
        assert message in exc.messages, exc.messages


class NameUniquenessTests(TestCase):
    def setUp(self):
        self.cat = Category.objects.create(name="Burgers")
        self.p1 = Product.objects.create(category=self.cat, name="Cheese", description="x")
        self.p2 = Product.objects.create(category=self.cat, name="Pizza", description="x")
        self.g1 = OptionGroup.objects.create(product=self.p1, name="Sauce")
        self.g2 = OptionGroup.objects.create(product=self.p2, name="Dip")

    def test_product_same_name_other_category_allowed(self):
        other = Category.objects.create(name="Pizza")
        Product.objects.create(category=other, name="Cheese", description="x")

    def test_product_duplicate_name_same_category_raises(self):
        assert_constraint_message(
            Product(category=self.cat, name="Cheese", description="x"),
            "A product with this name already exists in this category.",
        )

    def test_option_group_same_name_other_product_allowed(self):
        OptionGroup.objects.create(product=self.p2, name="Sauce")

    def test_option_group_duplicate_name_same_product_raises(self):
        assert_constraint_message(
            OptionGroup(product=self.p1, name="Sauce"),
            "An option group with this name already exists for this product.",
        )

    def test_option_value_same_name_other_group_allowed(self):
        OptionValue.objects.create(option_group=self.g1, name="BBQ", price_adjustment=0)
        OptionValue.objects.create(option_group=self.g2, name="BBQ", price_adjustment=0)

    def test_option_value_duplicate_name_same_group_raises(self):
        OptionValue.objects.create(option_group=self.g1, name="BBQ", price_adjustment=0)
        assert_constraint_message(
            OptionValue(option_group=self.g1, name="BBQ", price_adjustment=0),
            "An option value with this name already exists in this group.",
        )


class ProductPricingTests(TestCase):
    def setUp(self):
        self.category = Category.objects.create(name="Burgers")
        self.product = Product.objects.create(
            category=self.category,
            name="Classic Burger",
            description="x",
            price=Decimal("100.00"),
        )

    def _promo(self, percent=None, amount=None, **kw):
        promo = Promotion.objects.create(
            type=Promotion.Type.DISCOUNT,
            title="Promo",
            discount_percent=percent,
            discount_amount=amount,
            **kw,
        )
        promo.products.add(self.product)
        return promo

    def test_no_running_promo_returns_none(self):
        self.assertIsNone(self.product.get_discounted_price())

    def test_cheapest_promo_wins(self):
        self._promo(percent=Decimal("20.00"))
        self._promo(amount=Decimal("25.00"))
        self.assertEqual(self.product.get_discounted_price(), Decimal("75.00"))

    def test_percent_and_amount_combined(self):
        self._promo(percent=Decimal("20.00"), amount=Decimal("5.00"))
        self.assertEqual(self.product.get_discounted_price(), Decimal("75.00"))

    def test_discount_clamped_to_zero(self):
        self._promo(amount=Decimal("500.00"))
        self.assertEqual(self.product.get_discounted_price(), Decimal("0.00"))

    def test_expired_promo_ignored(self):
        self._promo(percent=Decimal("90.00"), end_date=date.today() - timedelta(days=1))
        self._promo(percent=Decimal("10.00"))
        self.assertEqual(self.product.get_discounted_price(), Decimal("90.00"))


class SocialLinkConstraintTests(TestCase):
    def setUp(self):
        self.restaurant = RestaurantInfo.objects.create(
            name="Test Restaurant",
            address="Addis Ababa",
            phone="0911 234 567",
            opening_hours="9-5",
        )

    def test_duplicate_platform_raises(self):
        SocialLink.objects.create(
            restaurant=self.restaurant,
            platform=SocialLink.Platform.FACEBOOK,
            url="https://facebook.com/one",
        )
        with self.assertRaises(ValidationError):
            SocialLink(
                restaurant=self.restaurant,
                platform=SocialLink.Platform.FACEBOOK,
                url="https://facebook.com/two",
            ).full_clean()

    def test_same_url_different_platforms_allowed(self):
        SocialLink.objects.create(
            restaurant=self.restaurant,
            platform=SocialLink.Platform.FACEBOOK,
            url="https://facebook.com/one",
        )
        SocialLink.objects.create(
            restaurant=self.restaurant,
            platform=SocialLink.Platform.INSTAGRAM,
            url="https://instagram.com/one",
        )
        self.assertEqual(self.restaurant.social_links.count(), 2)


class ContactPhoneValidationTests(TestCase):
    def _contact(self, phone):
        return Contact(phone=phone, email="a@example.com", location="Addis Ababa")

    def test_local_ethiopian_phone_with_spaces(self):
        self._contact("0911 234 567").full_clean()

    def test_international_phone_with_spaces(self):
        self._contact("+251 911 234 567").full_clean()

    def test_compact_local_phone(self):
        self._contact("0911234567").full_clean()

    def test_invalid_phone_raises(self):
        with self.assertRaises(ValidationError):
            self._contact("12345").full_clean()
