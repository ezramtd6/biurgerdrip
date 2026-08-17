from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    OrderListCreateView,
    OrderDetailView,
    PaymentView,
    CashierOrderListCreateView,
    CashierOrderDetailView,
    CashierPaymentView,
    CashierReportsView,
    ReportsView,
    PaymentSystemViewSet,
    NotificationListView,
    NotificationReadView,
    NotificationReadAllView,
    ResubmitProofView,
)

router = DefaultRouter()
router.register(r"payment-systems", PaymentSystemViewSet)

urlpatterns = [
    path("", OrderListCreateView.as_view(), name="order-list-create"),
    path("<int:pk>/", OrderDetailView.as_view(), name="order-detail"),
    path("<int:pk>/payment/", PaymentView.as_view(), name="order-payment"),
    path("<int:pk>/resubmit-proof/", ResubmitProofView.as_view(), name="order-resubmit-proof"),
    path("cashier/", CashierOrderListCreateView.as_view(), name="cashier-order-list-create"),
    path("cashier/<int:pk>/", CashierOrderDetailView.as_view(), name="cashier-order-detail"),
    path("cashier/<int:pk>/payment/", CashierPaymentView.as_view(), name="cashier-payment"),
    path("cashier/reports/", CashierReportsView.as_view(), name="cashier-reports"),
    path("reports/", ReportsView.as_view(), name="reports"),
    path("notifications/", NotificationListView.as_view(), name="notifications-list"),
    path("notifications/read-all/", NotificationReadAllView.as_view(), name="notifications-read-all"),
    path("notifications/<int:pk>/read/", NotificationReadView.as_view(), name="notifications-read"),
    path("", include(router.urls)),
]
