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
        order.proof_attempts += 1
        final_rejection = order.proof_attempts >= 3
        if final_rejection:
            order.status = Order.Status.REJECTED
        order.save(update_fields=["proof_attempts", "status", "updated_at"])

        if final_rejection:
            message = (
                f"Your payment for order {order.order_number} was rejected after 3 attempts "
                "and can no longer be processed."
                + (
                    f" Please contact the cashier at {phone} for more information."
                    if phone
                    else ""
                )
            )
        else:
            remaining = 3 - order.proof_attempts
            message = (
                f"Your payment for order {order.order_number} was rejected."
                + (
                    f" Please contact the cashier at {phone} to find out why."
                    if phone
                    else ""
                )
            )
            if reason:
                message += f" Reason: {reason}"
            message += f" You have {remaining} more attempt(s) remaining."

        if order.customer_id:
            OrderNotification.objects.create(
                user=order.customer,
                order=order,
                message=message,
            )
        return Response(
            {
                "status": "rejected",
                "message": message,
                "proof_attempts": order.proof_attempts,
                "final_rejection": final_rejection,
            }
        )

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

    if order.customer_id:
        OrderNotification.objects.create(
            user=order.customer,
            order=order,
            message=f"Your payment for order {order.order_number} was accepted. Thank you!",
        )

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
        instance = self.get_object()
        old_status = instance.status
        response = super().partial_update(request, *args, **kwargs)
        instance.refresh_from_db()
        if instance.status != old_status and instance.customer_id:
            label = dict(Order.Status.choices).get(instance.status, instance.status)
            OrderNotification.objects.create(
                user=instance.customer,
                order=instance,
                message=f"Your order {instance.order_number} status is now {label}.",
            )
        return response


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


class CashierReportsView(APIView):
    def get(self, request):
        if request.user.role != "CASHIER":
            return Response(
                {"error": "Permission denied."},
                status=status.HTTP_403_FORBIDDEN,
            )

        today = timezone.now().date()
        cashier_orders = Order.objects.filter(cashier=request.user)
        today_orders = cashier_orders.filter(created_at__date=today)

        total_orders = cashier_orders.count()
        total_revenue = cashier_orders.filter(status=Order.Status.COMPLETED).aggregate(
            total=Sum("total")
        )["total"] or 0

        orders_by_status = dict(
            cashier_orders.values_list("status").annotate(count=Count("id")).values_list("status", "count")
        )

        recent_orders = OrderSerializer(
            cashier_orders.order_by("-created_at")[:10], many=True
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
            user=self.request.user
        ).order_by("-created_at")


class NotificationReadView(APIView):
    def post(self, request, pk):
        notification = OrderNotification.objects.filter(
            id=pk, user=request.user
        ).first()
        if not notification:
            return Response(
                {"error": "Notification not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        notification.is_read = True
        notification.save(update_fields=["is_read"])
        return Response(OrderNotificationSerializer(notification).data)


class NotificationReadAllView(APIView):
    def post(self, request):
        count = OrderNotification.objects.filter(
            user=request.user, is_read=False
        ).update(is_read=True)
        return Response({"marked": count})


class ResubmitProofView(APIView):
    def post(self, request, pk):
        user = request.user
        if user.role != "CUSTOMER":
            return Response(
                {"error": "Only customers can re-submit payment proof."},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            order = Order.objects.get(id=pk, customer=user)
        except Order.DoesNotExist:
            return Response(
                {"error": "Order not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if order.status == Order.Status.COMPLETED:
            return Response(
                {"error": "Order is already completed."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if order.status == Order.Status.REJECTED or order.proof_attempts >= 3:
            return Response(
                {
                    "error": "This payment was rejected after 3 attempts and can no longer be re-submitted."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        proof = request.FILES.get("payment_proof")
        if not proof:
            return Response(
                {"error": "Please attach a new payment proof image."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        order.payment_proof = proof
        order.status = Order.Status.PENDING
        order.save(update_fields=["payment_proof", "status", "updated_at"])
        order.notifications.filter(is_read=False).update(is_read=True)

        from .models import notify_cashiers

        notify_cashiers(
            order,
            f"Order {order.order_number} re-uploaded payment proof and needs re-verification.",
        )

        return Response(
            OrderSerializer(order, context={"request": request}).data
        )
