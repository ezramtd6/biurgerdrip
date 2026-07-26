from django.core.mail import send_mail
from django.conf import settings


def send_set_password_email(email, first_name, role, token):
    link = f"{settings.FRONTEND_URL}/set-password/{token}"
    subject = f"Welcome to Burger House - Set Your Password"
    message = (
        f"Hi {first_name},\n\n"
        f"Your {role} account has been created on Burger House.\n\n"
        f"Please click the link below to set your password:\n\n"
        f"{link}\n\n"
        f"This link will expire in 48 hours.\n\n"
        f"If you did not expect this email, please ignore it.\n\n"
        f"Regards,\nBurger House Team"
    )
    send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [email])


def send_password_reset_email(email, first_name, token):
    link = f"{settings.FRONTEND_URL}/reset-password/{token}"
    subject = "Burger House - Password Reset"
    message = (
        f"Hi {first_name},\n\n"
        f"You requested a password reset.\n\n"
        f"Please click the link below to reset your password:\n\n"
        f"{link}\n\n"
        f"This link will expire in 24 hours.\n\n"
        f"If you did not request this, please ignore this email.\n\n"
        f"Regards,\nBurger House Team"
    )
    send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [email])
