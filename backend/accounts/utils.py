import logging
from django.core.mail import send_mail
from django.conf import settings

logger = logging.getLogger(__name__)


def _restaurant_name():
    from products.models import RestaurantInfo

    restaurant = RestaurantInfo.objects.first()
    return restaurant.name if restaurant else "Burger House"


def _noreply_sender(restaurant_name, context=""):
    from_email = settings.EMAIL_HOST_USER or "admin@localhost"
    label = f"No-Reply {context}" if context else "No-Reply"
    return f"{label} <{from_email}>"


def send_set_password_email(email, first_name, role, token, context=""):
    restaurant_name = _restaurant_name()
    link = f"{settings.FRONTEND_URL}/set-password/{token}"
    subject = f"Welcome to {restaurant_name} - Set Your Password"
    message = (
        f"Hi {first_name},\n\n"
        f"Your {role} account has been created on {restaurant_name}.\n\n"
        f"Please click the link below to set your password:\n\n"
        f"{link}\n\n"
        f"This link will expire in 48 hours.\n\n"
        f"If you did not expect this email, please ignore it.\n\n"
        f"Regards,\n{restaurant_name} Team"
    )
    try:
        send_mail(subject, message, _noreply_sender(restaurant_name, context), [email])
    except Exception:
        logger.exception("Failed to send set-password email to %s", email)


def send_password_reset_email(email, first_name, token, context=""):
    restaurant_name = _restaurant_name()
    link = f"{settings.FRONTEND_URL}/reset-password/{token}"
    subject = f"{restaurant_name} - Password Reset"
    message = (
        f"Hi {first_name},\n\n"
        f"You requested a password reset for your {restaurant_name} account.\n\n"
        f"Please click the link below to reset your password:\n\n"
        f"{link}\n\n"
        f"This link will expire in 24 hours.\n\n"
        f"If you did not request this, please ignore this email.\n\n"
        f"Regards,\n{restaurant_name} Team"
    )
    try:
        send_mail(subject, message, _noreply_sender(restaurant_name, context), [email])
    except Exception:
        logger.exception("Failed to send password-reset email to %s", email)
