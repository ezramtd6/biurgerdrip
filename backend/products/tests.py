from django.core.exceptions import ValidationError
from django.test import TestCase
from products.models import Product, Category, OptionGroup, OptionValue


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
