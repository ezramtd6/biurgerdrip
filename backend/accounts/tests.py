from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User


from django.utils import timezone
from datetime import timedelta

from .models import PasswordResetToken, User


class AuthRefreshTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="test@example.com",
            password="Password1!",
            first_name="Test",
            last_name="User",
            role=User.Role.CASHIER,
        )
        self.client = APIClient()

    def test_login_sets_cookies(self):
        res = self.client.post(
            reverse("login"),
            {"email": "test@example.com", "password": "Password1!"},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertIn("access_token", self.client.cookies)
        self.assertIn("refresh_token", self.client.cookies)

    def test_refresh_rotates_and_blacklists(self):
        res = self.client.post(
            reverse("login"),
            {"email": "test@example.com", "password": "Password1!"},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        old_refresh = self.client.cookies["refresh_token"].value

        res = self.client.post(reverse("token_refresh"), {}, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["access"], self.client.cookies["access_token"].value)

        new_refresh = self.client.cookies["refresh_token"].value
        self.assertNotEqual(old_refresh, new_refresh)

        with self.assertRaises(Exception):
            RefreshToken(old_refresh).access_token

        res = self.client.post(reverse("token_refresh"), {}, format="json")
        self.assertEqual(res.status_code, 200)

    def test_refresh_without_cookie_returns_401(self):
        res = self.client.post(reverse("token_refresh"), {}, format="json")
        self.assertEqual(res.status_code, 401)

    def test_refresh_with_blacklisted_token_returns_401(self):
        res = self.client.post(
            reverse("login"),
            {"email": "test@example.com", "password": "Password1!"},
            format="json",
        )
        old_refresh = self.client.cookies["refresh_token"].value

        self.client.post(reverse("token_refresh"), {}, format="json")
        self.client.cookies["refresh_token"] = old_refresh

        res = self.client.post(reverse("token_refresh"), {}, format="json")
        self.assertEqual(res.status_code, 401)


class ResetPasswordTokenTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="reset@example.com",
            password="Password1!",
            first_name="Reset",
            last_name="User",
            role=User.Role.CUSTOMER,
        )
        self.client = APIClient()

    def test_invalid_reset_token_returns_generic_error(self):
        response = self.client.post(
            reverse("reset_password"),
            {"token": "bad-token", "new_password": "NewPassword1!"},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["error"], "Invalid or expired token.")

    def test_expired_reset_token_returns_generic_error(self):
        expired_token = PasswordResetToken.objects.create(
            user=self.user,
            token="expired-token",
        )
        PasswordResetToken.objects.filter(pk=expired_token.pk).update(
            created_at=timezone.now() - timedelta(days=2)
        )

        response = self.client.post(
            reverse("reset_password"),
            {"token": expired_token.token, "new_password": "NewPassword1!"},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["error"], "Invalid or expired token.")
