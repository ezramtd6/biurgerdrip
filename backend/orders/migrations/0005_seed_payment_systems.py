from django.db import migrations


def seed_payment_systems(apps, schema_editor):
    PaymentSystem = apps.get_model("orders", "PaymentSystem")
    defaults = [
        ("Cash", "CASH", 0),
        ("Card", "CARD", 1),
        ("Mobile Payment", "MOBILE", 2),
    ]
    for name, code, order in defaults:
        PaymentSystem.objects.get_or_create(
            code=code,
            defaults={"name": name, "display_order": order},
        )


class Migration(migrations.Migration):

    dependencies = [
        ("orders", "0004_payment_system"),
    ]

    operations = [
        migrations.RunPython(seed_payment_systems, migrations.RunPython.noop),
    ]