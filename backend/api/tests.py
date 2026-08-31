from django.test import TestCase, override_settings
from rest_framework.exceptions import NotFound
from rest_framework.test import APIRequestFactory, APIClient, APITestCase, force_authenticate

from accounts.models import User
from api.exceptions import custom_exception_handler
from .views import hello


class ApiHelloTests(APITestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.user = User.objects.create_user(
            email="customer@test.com", password="pass12345", role=User.Role.CUSTOMER
        )

    def test_hello_returns_expected_message_for_authenticated_user(self):
        request = self.factory.get("/api/hello/")
        force_authenticate(request, user=self.user)
        response = hello(request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, {"message": "Hello from Ezraa!"})

    def test_hello_requires_authentication(self):
        request = self.factory.get("/api/hello/")
        response = hello(request)
        self.assertEqual(response.status_code, 401)


class CustomExceptionHandlerTests(APITestCase):
    def setUp(self):
        self.factory = APIRequestFactory()

    def test_handler_is_wired_in_settings(self):
        from django.conf import settings

        self.assertEqual(
            settings.REST_FRAMEWORK["EXCEPTION_HANDLER"],
            "api.exceptions.custom_exception_handler",
        )

    def test_handled_exception_passes_through(self):
        request = self.factory.get("/api/hello/")
        response = custom_exception_handler(
            NotFound(), {"request": request}
        )
        self.assertEqual(response.status_code, 404)

    @override_settings(DEBUG=False)
    def test_unhandled_exception_returns_generic_500(self):
        request = self.factory.get("/api/hello/")
        response = custom_exception_handler(
            RuntimeError("secret detail"), {"request": request}
        )
        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.data["detail"], "An unexpected error occurred. Please try again later.")
        self.assertNotIn("secret detail", str(response.data))
