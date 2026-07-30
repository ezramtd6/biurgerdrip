from rest_framework import status, generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.exceptions import TokenError
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
import secrets
from .models import User, PasswordResetToken
from products.views import IsManager
from .serializers import (
    UserSerializer,
    RegisterSerializer,
    CustomTokenObtainPairSerializer,
    CashierSerializer,
    CashierCreateSerializer,
    CustomerSerializer,
)
from .utils import send_set_password_email, send_password_reset_email


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        email = request.data.get("email")
        try:
            user = User.objects.get(email=email)
            if not user.is_active:
                return Response(
                    {"error": "Your account is not active. Please set your password first via the link sent to your email."},
                    status=status.HTTP_403_FORBIDDEN,
                )
        except User.DoesNotExist:
            pass

        response = super().post(request, *args, **kwargs)
        
        if response.status_code == 200:
            access_token = response.data["access"]
            refresh_token = response.data["refresh"]
            
            is_secure = not settings.DEBUG
            response.set_cookie(
                "access_token",
                access_token,
                max_age=15 * 60,
                httponly=True,
                secure=is_secure,
                samesite="Lax",
            )
            response.set_cookie(
                "refresh_token",
                refresh_token,
                max_age=7 * 24 * 60 * 60,
                httponly=True,
                secure=is_secure,
                samesite="Lax",
            )
            
            del response.data["access"]
            del response.data["refresh"]
            
            user = User.objects.get(email=request.data["email"])
            response.data["user"] = UserSerializer(user).data
        
        return response


class CustomTokenRefreshView(APIView):
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        refresh_token = request.COOKIES.get("refresh_token")
        
        if not refresh_token:
            return Response(
                {"error": "Refresh token not found"},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        
        try:
            refresh = RefreshToken(refresh_token)
            access_token = str(refresh.access_token)
            
            response = Response({"access": access_token})
            response.set_cookie(
                "access_token",
                access_token,
                max_age=15 * 60,
                httponly=True,
                secure=not settings.DEBUG,
                samesite="Lax",
            )
            
            return response
        except TokenError:
            return Response(
                {"error": "Invalid refresh token"},
                status=status.HTTP_401_UNAUTHORIZED,
            )


class LogoutView(APIView):
    def post(self, request):
        refresh_token = request.COOKIES.get("refresh_token")
        
        if refresh_token:
            try:
                refresh = RefreshToken(refresh_token)
                refresh.blacklist()
            except TokenError:
                pass
        
        response = Response({"message": "Logged out successfully"})
        response.delete_cookie("access_token")
        response.delete_cookie("refresh_token")
        return response


class ProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    
    def get_object(self):
        return self.request.user


class ForgotPasswordView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get("email")
        if not email:
            return Response(
                {"error": "Email is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response(
                {"message": "If an account exists with this email, you will receive a password reset link."},
                status=status.HTTP_200_OK,
            )

        PasswordResetToken.objects.filter(user=user, is_used=False).update(is_used=True)

        token = secrets.token_urlsafe(64)
        PasswordResetToken.objects.create(user=user, token=token)

        send_password_reset_email(user.email, user.first_name, token)

        return Response(
            {
                "message": "If an account exists with this email, you will receive a password reset link.",
            },
            status=status.HTTP_200_OK,
        )


class ResetPasswordView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        token = request.data.get("token")
        new_password = request.data.get("new_password")

        if not token or not new_password:
            return Response(
                {"error": "Token and new_password are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if len(new_password) < 8:
            return Response(
                {"error": "Password must be at least 8 characters."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        import re
        if not re.match(r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,20}$", new_password):
            return Response(
                {"error": "Password must be 8-20 characters with uppercase, lowercase, number, and special character (@$!%*?&)."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            reset_token = PasswordResetToken.objects.get(token=token, is_used=False)
        except PasswordResetToken.DoesNotExist:
            return Response(
                {"error": "Invalid or expired token."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        token_age = timezone.now() - reset_token.created_at
        if token_age > timedelta(hours=24):
            reset_token.is_used = True
            reset_token.save()
            return Response(
                {"error": "Token has expired. Please request a new one."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = reset_token.user
        user.set_password(new_password)
        user.save()

        reset_token.is_used = True
        reset_token.save()

        return Response(
            {"message": "Password reset successful. You can now log in."},
            status=status.HTTP_200_OK,
        )


class SetPasswordTokenView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, token):
        try:
            reset_token = PasswordResetToken.objects.get(token=token, is_used=False)
        except PasswordResetToken.DoesNotExist:
            return Response(
                {"error": "Invalid or expired token."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        token_age = timezone.now() - reset_token.created_at
        if token_age > timedelta(hours=48):
            reset_token.is_used = True
            reset_token.save()
            return Response(
                {"error": "Token has expired. Please contact your administrator."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = reset_token.user
        return Response({
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "role": user.role,
        })


class SetPasswordView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, token):
        password = request.data.get("password")
        confirm_password = request.data.get("confirm_password")

        if not password or not confirm_password:
            return Response(
                {"error": "Password and confirm_password are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if password != confirm_password:
            return Response(
                {"error": "Passwords do not match."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if len(password) < 8:
            return Response(
                {"error": "Password must be at least 8 characters."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        import re
        if not re.match(r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,20}$", password):
            return Response(
                {"error": "Password must be 8-20 characters with uppercase, lowercase, number, and special character (@$!%*?&)."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            reset_token = PasswordResetToken.objects.get(token=token, is_used=False)
        except PasswordResetToken.DoesNotExist:
            return Response(
                {"error": "Invalid or expired token."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        token_age = timezone.now() - reset_token.created_at
        if token_age > timedelta(hours=48):
            reset_token.is_used = True
            reset_token.save()
            return Response(
                {"error": "Token has expired. Please contact your administrator."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = reset_token.user
        user.set_password(password)
        user.is_active = True
        user.save()

        reset_token.is_used = True
        reset_token.save()

        return Response(
            {"message": "Password set successfully. You can now log in."},
            status=status.HTTP_200_OK,
        )


class CashierListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsManager]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return CashierCreateSerializer
        return CashierSerializer

    def get_queryset(self):
        return User.objects.filter(role="CASHIER").order_by("-date_joined")

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        token = secrets.token_urlsafe(64)
        PasswordResetToken.objects.create(user=user, token=token)

        send_set_password_email(user.email, user.first_name, user.role, token)

        return Response(
            {
                "user": CashierSerializer(user).data,
                "message": "Cashier created. A set-password email has been sent.",
            },
            status=status.HTTP_201_CREATED,
        )


class CashierDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsManager]
    serializer_class = CashierSerializer
    queryset = User.objects.filter(role="CASHIER")


class CustomerListView(generics.ListAPIView):
    permission_classes = [IsManager]
    serializer_class = CustomerSerializer

    def get_queryset(self):
        return User.objects.filter(role="CUSTOMER").order_by("-date_joined")


class CustomerDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsManager]
    serializer_class = CustomerSerializer
    queryset = User.objects.filter(role="CUSTOMER")