from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    OrderListCreateView,
    OrderDetailView,
    PaymentView,
    CashierOrderListCreateView,
    CashierOrderDetailView,
    CashierPaymentView,
    ReportsView,
    PaymentSystemViewSet,
)

router = DefaultRouter()
router.register(r"payment-systems", PaymentSystemViewSet)

urlpatterns = [
    path("", OrderListCreateView.as_view(), name="order-list-create"),
    path("<int:pk>/", OrderDetailView.as_view(), name="order-detail"),
    path("<int:pk>/payment/", PaymentView.as_view(), name="order-payment"),
    path("cashier/", CashierOrderListCreateView.as_view(), name="cashier-order-list-create"),
    path("cashier/<int:pk>/", CashierOrderDetailView.as_view(), name="cashier-order-detail"),
    path("cashier/<int:pk>/payment/", CashierPaymentView.as_view(), name="cashier-payment"),
    path("reports/", ReportsView.as_view(), name="reports"),
    path("", include(router.urls)),
]
