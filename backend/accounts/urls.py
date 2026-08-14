from django.urls import path
from . import views

urlpatterns = [
    path("register/", views.RegisterView.as_view(), name="register"),
    path("login/", views.CustomTokenObtainPairView.as_view(), name="login"),
    path("resend-activation/", views.ResendActivationView.as_view(), name="resend-activation"),
    path("logout/", views.LogoutView.as_view(), name="logout"),
    path("token/refresh/", views.CustomTokenRefreshView.as_view(), name="token_refresh"),
    path("profile/", views.ProfileView.as_view(), name="profile"),
    path("change-password/", views.ChangePasswordView.as_view(), name="change-password"),
    path("forgot-password/", views.ForgotPasswordView.as_view(), name="forgot_password"),
    path("reset-password/", views.ResetPasswordView.as_view(), name="reset_password"),
    path("reset-password/<str:token>/", views.ResetPasswordTokenView.as_view(), name="reset-password-token"),
    path("set-password/<str:token>/", views.SetPasswordTokenView.as_view(), name="set-password-token"),
    path("set-password/<str:token>/confirm/", views.SetPasswordView.as_view(), name="set-password-confirm"),
    path("cashiers/", views.CashierListCreateView.as_view(), name="cashier-list-create"),
    path("cashiers/<int:pk>/", views.CashierDetailView.as_view(), name="cashier-detail"),
    path("customers/", views.CustomerListView.as_view(), name="customer-list"),
    path("customers/<int:pk>/", views.CustomerDetailView.as_view(), name="customer-detail"),
]
