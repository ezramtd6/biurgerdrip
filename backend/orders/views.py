from django.utils import timezone
from django.db.models import Sum, Count
from rest_framework import generics, permissions, status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView
from products.views import IsManager
from .models import Order, PaymentSystem, OrderNotification
from .serializers import (
    OrderSerializer,
    OrderCreateSerializer,
    PaymentSystemSerializer,
    OrderNotificationSerializer,
)


class PaymentSystemViewSet(viewsets.ModelViewSet):
    queryset = PaymentSystem.objects.all()
    serializer_class = PaymentSystemSerializer

    def get_queryset(self):
        qs = PaymentSystem.objects.all()
        role = getattr(self.request.user, "role", None)
        if role not in ("MANAGER", "ADMIN"):
            qs = qs.filter(is_active=True)
            if role == "CASHIER":
                qs = qs.filter(cashier_enabled=True)
            elif role == "CUSTOMER":
                qs = qs.filter(customer_enabled=True)
        return qs

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [permissions.IsAuthenticated()]
        return [IsManager()]


class OrderListCreateView(generics.ListCreateAPIView):
    def get_serializer_class(self):
        if self.request.method == "POST":
            return OrderCreateSerializer
        return OrderSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role == "CUSTOMER":
            return Order.objects.filter(customer=user).order_by("-created_at")
        elif user.role == "CASHIER":
            return Order.objects.filter(
                created_at__date=timezone.now().date()
            ).order_by("-created_at")
        elif user.role == "MANAGER":
            return Order.objects.all().order_by("-created_at")
        return Order.objects.none()

    def perform_create(self, serializer):
        if self.request.user.role == "CASHIER":
            serializer.save(cashier=self.request.user)
        else:
            serializer.save()


class OrderDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = OrderSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role == "CUSTOMER":
            return Order.objects.filter(customer=user)
        return Order.objects.all()

    def partial_update(self, request, *args, **kwargs):
        user = request.user
        if user.role not in ("MANAGER", "CASHIER"):
            return Response(
                {"error": "You do not have permission to update orders."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().partial_update(request, *args, **kwargs)


def _handle_payment(request, order):
    if request.user.role not in ("MANAGER", "CASHIER"):
        return Response(
            {"error": "You do not have permission to process payments."},
            status=status.HTTP_403_FORBIDDEN,
        )

    if order.status == Order.Status.COMPLETED:
        return Response(
            {"error": "Order is already completed."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    action = request.data.get("action", "accept")

    if action == "reject":
        reason = (request.data.get("reason") or "").strip()
        phone = getattr(request.user, "phone", "") or ""
        message = (
            f"Your payment for order {order.order_number} was rejected."
            + (
                f" Please contact the cashier at {phone} to find out why."
                if phone
                else " Please contact the cashier for more information."
            )
        )
        if reason:
            message += f" Reason: {reason}"
        if order.customer_id:
            OrderNotification.objects.create(
                customer=order.customer,
                order=order,
                message=message,
            )
        return Response({"status": "rejected", "message": message})

    payment_method = request.data.get("payment_method") or order.payment_method
    if not payment_method:
        return Response(
            {"error": "Please select a payment method."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    qs = PaymentSystem.objects.filter(code=payment_method, is_active=True)
    if request.user.role == "CASHIER":
        ps = qs.filter(cashier_enabled=True).first()
    else:
        ps = qs.first()
    if not ps:
        return Response(
            {"error": "Invalid payment method."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    order.payment_method = payment_method
    order.status = Order.Status.COMPLETED
    order.save()

    return Response(OrderSerializer(order).data)


class PaymentView(APIView):
    def post(self, request, pk):
        try:
            order = Order.objects.get(id=pk)
        except Order.DoesNotExist:
            return Response(
                {"error": "Order not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return _handle_payment(request, order)


class CashierOrderListCreateView(generics.ListCreateAPIView):
    def get_serializer_class(self):
        if self.request.method == "POST":
            return OrderCreateSerializer
        return OrderSerializer

    def get_queryset(self):
        return Order.objects.filter(
            created_at__date=timezone.now().date()
        ).order_by("-created_at")

    def perform_create(self, serializer):
        serializer.save(cashier=self.request.user)


class CashierOrderDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = OrderSerializer

    def get_queryset(self):
        return Order.objects.filter(
            created_at__date=timezone.now().date()
        )

    def partial_update(self, request, *args, **kwargs):
        return super().partial_update(request, *args, **kwargs)


class CashierPaymentView(APIView):
    def post(self, request, pk):
        try:
            order = Order.objects.get(id=pk)
        except Order.DoesNotExist:
            return Response(
                {"error": "Order not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return _handle_payment(request, order)


class ReportsView(APIView):
    def get(self, request):
        if request.user.role not in ("MANAGER", "ADMIN"):
            return Response(
                {"error": "Permission denied."},
                status=status.HTTP_403_FORBIDDEN,
            )

        today = timezone.now().date()
        today_orders = Order.objects.filter(created_at__date=today)

        total_orders = Order.objects.count()
        total_revenue = Order.objects.filter(status=Order.Status.COMPLETED).aggregate(
            total=Sum("total")
        )["total"] or 0

        orders_by_status = dict(
            Order.objects.values_list("status").annotate(count=Count("id")).values_list("status", "count")
        )

        recent_orders = OrderSerializer(
            Order.objects.all()[:10], many=True
        ).data

        from products.models import Category, Product

        return Response({
            "total_orders": total_orders,
            "total_revenue": float(total_revenue),
            "total_categories": Category.objects.count(),
            "total_products": Product.objects.count(),
            "orders_by_status": orders_by_status,
            "today_orders_count": today_orders.count(),
            "today_revenue": float(
                today_orders.filter(status=Order.Status.COMPLETED).aggregate(
                    total=Sum("total")
                )["total"] or 0
            ),
            "recent_orders": recent_orders,
        })


class NotificationListView(generics.ListAPIView):
    serializer_class = OrderNotificationSerializer

    def get_queryset(self):
        return OrderNotification.objects.filter(
            customer=self.request.user
        ).order_by("-created_at")


class NotificationReadView(APIView):
    def post(self, request, pk):
        notification = OrderNotification.objects.filter(
            id=pk, customer=request.user
        ).first()
        if not notification:
            return Response(
                {"error": "Notification not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        notification.is_read = True
        notification.save(update_fields=["is_read"])
        return Response(OrderNotificationSerializer(notification).data)
