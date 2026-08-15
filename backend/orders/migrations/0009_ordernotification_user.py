from django.conf import settings
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("orders", "0008_order_proof_attempts_alter_order_status"),
    ]

    operations = [
        migrations.RenameField(
            model_name="ordernotification",
            old_name="customer",
            new_name="user",
        ),
        migrations.AlterField(
            model_name="ordernotification",
            name="user",
            field=models.ForeignKey(
                help_text="Recipient of the notification (customer or cashier)",
                on_delete=django.db.models.deletion.CASCADE,
                related_name="order_notifications",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
    ]
