from django.utils import timezone
from django.db.models import Sum, Count
from django.db import models
from rest_framework import generics, permissions, status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView
from products.views import IsManager
from .models import Order, PaymentSystem, OrderNotification, notify_user
from .serializers import (
    OrderSerializer,
    OrderCreateSerializer,
    PaymentSystemSerializer,
    OrderNotificationSerializer,
)


class IsCashier(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == "CASHIER"


class IsCashierOrManager(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ("CASHIER", "MANAGER", "ADMIN")


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
            qs = Order.objects.filter(customer=user)
        elif user.role == "CASHIER":
            qs = Order.objects.filter(created_at__date=timezone.now().date())
        elif user.role == "MANAGER":
            qs = Order.objects.all()
        else:
            return Order.objects.none()
        if self.request.query_params.get("today") and user.role in ("CASHIER", "MANAGER"):
            qs = qs.filter(created_at__date=timezone.now().date())
        return qs.order_by("-created_at")

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

    def delete(self, request, *args, **kwargs):
        if request.user.role not in ("MANAGER", "ADMIN"):
            return Response(
                {"error": "You do not have permission to delete orders."},
                status=status.HTTP_403_FORBIDDEN,
            )
        order = self.get_object()
        order.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


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

    if order.status == Order.Status.REJECTED:
        return Response(
            {"error": "Order is rejected. Wait for the customer to re-upload payment proof."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    action = request.data.get("action", "accept")

    if action == "reject":
        reason = (request.data.get("reason") or "").strip()
        phone = getattr(request.user, "phone", "") or ""
        order.proof_attempts += 1
        order.rejection_reason = reason
        final_rejection = order.proof_attempts >= 3
        order.status = Order.Status.REJECTED
        if not order.cashier:
            order.cashier = request.user
        order.save(update_fields=["proof_attempts", "rejection_reason", "status", "cashier", "updated_at"])

        from .models import PaymentProofAttempt
        latest_proof = order.proof_history.order_by("-attempt").first()
        if latest_proof and not latest_proof.rejection_reason:
            latest_proof.rejection_reason = reason
            latest_proof.save(update_fields=["rejection_reason"])

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
            message_amharic = (
                f"የእርስዎ ክፍያ ለትዕዛዝ {order.order_number} በ3 ጥረቶች ተቃይሞ በቀጥታ ሊከናወን አይችልም።"
                + (
                    f" እባክዎን ለተጨማሪ መረጃ በቂashing {phone} ያግኙ።"
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
            message_amharic = (
                f"የእርስዎ ክፍያ ለትዕዛዝ {order.order_number} ተቃይሞ ነው።"
                + (
                    f" እባክዎን ለምንድነው ለማወቅ በቂashing {phone} ያግኙ።"
                    if phone
                    else ""
                )
            )
            if reason:
                message += f" Reason: {reason}"
                message_amharic += f" ምክንያት: {reason}"
            message += f" You have {remaining} more attempt(s) remaining."
            message_amharic += f" {remaining} ተጨማሪ ጥረቶች ቀርተዋል።"

        if order.customer_id:
            notify_user(
                order.customer,
                order,
                message=message,
                message_amharic=message_amharic,
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
    if order.customer_id:
        order.status = Order.Status.PREPARING
    else:
        order.status = Order.Status.COMPLETED
    if not order.cashier:
        order.cashier = request.user
    order.save()

    if order.customer_id:
        notify_user(
            order.customer,
            order,
            message=f"Your payment for order {order.order_number} was accepted. Your order is now being prepared!",
            message_amharic=f"የእርስዎ ክፍያ ለትዕዛዝ {order.order_number} ተቀብሏል። ትዕዛዝዎ አሁን በማዘጋጀት ላይ ነው!",
        )

    order.notifications.filter(is_read=False).exclude(user=request.user).update(is_read=True)

    return Response(OrderSerializer(order).data)


class PaymentView(APIView):
    permission_classes = [IsCashierOrManager]
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
    permission_classes = [IsCashier]
    def get_serializer_class(self):
        if self.request.method == "POST":
            return OrderCreateSerializer
        return OrderSerializer

    def get_queryset(self):
        return Order.objects.filter(
            models.Q(cashier=self.request.user) | models.Q(customer__isnull=False, cashier__isnull=True),
            created_at__date=timezone.now().date()
        ).order_by("-created_at")

    def perform_create(self, serializer):
        serializer.save(cashier=self.request.user)


class CashierOrderDetailView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsCashier]
    serializer_class = OrderSerializer

    def get_queryset(self):
        return Order.objects.filter(
            models.Q(cashier=self.request.user) | models.Q(customer__isnull=False, cashier__isnull=True),
            created_at__date=timezone.now().date()
        )

    def delete(self, request, *args, **kwargs):
        """Discard an abandoned unpaid walk-in order (Back without paying)."""
        order = self.get_object()
        if order.customer_id or order.payment_proof or order.status != Order.Status.PENDING:
            return Response(
                {"error": "Only unpaid walk-in orders can be discarded."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        order.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        old_status = instance.status
        response = super().partial_update(request, *args, **kwargs)
        instance.refresh_from_db()
        if instance.status != old_status and instance.customer_id:
            label = dict(Order.Status.choices).get(instance.status, instance.status)
            label_amharic = {
                "PENDING": "በመጠበቅ ላይ",
                "PREPARING": "በማዘጋጀት ላይ",
                "READY": "ዝግጁ ነው",
                "COMPLETED": "ተጠናቅቋል",
                "CANCELLED": "ተሰርቷል",
                "REJECTED": "ተቃይሏል",
                "REFUNDED": "ተመልሷል",
            }.get(instance.status, label)
            notify_user(
                instance.customer,
                instance,
                message=f"Your order {instance.order_number} status is now {label}.",
                message_amharic=f"የትዕዛዝዎ {instance.order_number} ሁኔታ አሁን {label_amharic} ነው።",
            )
        return response


class CashierPaymentView(APIView):
    permission_classes = [IsCashier]
    def post(self, request, pk):
        try:
            order = Order.objects.filter(
                models.Q(cashier=request.user) | models.Q(customer__isnull=False),
            ).get(pk=pk)
        except Order.DoesNotExist:
            return Response(
                {"error": "Order not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return _handle_payment(request, order)


class CashierOrderRefundView(APIView):
    """Step 1 — cashier asks the customer for their refund details."""
    permission_classes = [IsCashier]

    def post(self, request, pk):
        try:
            order = Order.objects.filter(
                models.Q(cashier=request.user) | models.Q(customer__isnull=False),
            ).get(pk=pk)
        except Order.DoesNotExist:
            return Response(
                {"error": "Order not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        paid_statuses = (
            Order.Status.PREPARING,
            Order.Status.READY,
        )
        if order.status not in paid_statuses:
            if order.status == Order.Status.COMPLETED:
                return Response(
                    {"error": "Order was picked up by the customer and can no longer be refunded."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            return Response(
                {"error": "Only paid orders can be refunded."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not order.customer_id:
            return Response(
                {"error": "Walk-in orders are refunded directly, no customer details needed."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        order.status = Order.Status.REFUND_REQUESTED
        order.refund_method = ""
        order.refund_account = ""
        order.save(update_fields=["status", "refund_method", "refund_account", "updated_at"])

        phone = getattr(request.user, "phone", "") or ""
        message = (
            f"Your order {order.order_number} is being refunded. "
            f"Please open your order history and tell us how you would like to receive ETB {order.total:.2f} "
            f"(payment type and account number)."
            + (f" Questions? Call the cashier at {phone}." if phone else "")
        )
        message_amharic = (
            f"ትዕዛዝዎ {order.order_number} እየተመለሰ ነው። "
            f"እባክዎ የትዕዛዝ ታሪክዎን በመክፈት ETB {order.total:.2f} "
            f"እንዴት (በየትኛው የመክፈያ ዓይነት እና የሂሳብ ቁጥር) እንደሚመለስ ያሳውቁ።"
            + (f" ጥያቄ ካለ ካሽየሩን በ {phone} ይደውሉ።" if phone else "")
        )
        notify_user(order.customer, order, message=message, message_amharic=message_amharic)

        return Response(
            {
                "detail": f"Refund requested for order {order.order_number}. The customer has been asked for their payment details.",
                "status": Order.Status.REFUND_REQUESTED,
            }
        )


class CustomerRefundDetailsView(APIView):
    """Step 2 — customer provides how they want to receive the refund."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            order = Order.objects.get(id=pk, customer=request.user)
        except Order.DoesNotExist:
            return Response(
                {"error": "Order not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        if order.status != Order.Status.REFUND_REQUESTED or order.refund_method:
            return Response(
                {"error": "This order is not waiting for refund details."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        refund_method = (request.data.get("refund_method") or "").strip()
        refund_account = (request.data.get("refund_account") or "").strip()

        errors = {}
        if not refund_method:
            errors["refund_method"] = "Select how you want to receive your refund."
        elif not PaymentSystem.objects.filter(
            code=refund_method, is_active=True, for_refund=True
        ).exists():
            errors["refund_method"] = "Unknown payment type."
        elif len(refund_account) < 6:
            errors["refund_account"] = "Enter your account or phone number."
        if errors:
            return Response(errors, status=status.HTTP_400_BAD_REQUEST)

        order.refund_method = refund_method
        order.refund_account = refund_account
        order.save(update_fields=["refund_method", "refund_account", "updated_at"])

        from .models import notify_cashiers

        method_name = (
            PaymentSystem.objects.filter(code=refund_method).values_list("name", flat=True).first()
            or refund_method
        )
        notify_cashiers(
            order,
            f"Refund details received for {order.order_number}: {method_name}"
            + (f" — {refund_account}" if refund_account else " (in person)")
            + f". Send ETB {order.total:.2f}, then complete the refund.",
        )

        return Response(
            {
                "detail": "Thank you! Your refund will be sent shortly.",
                "refund_method": order.refund_method,
                "refund_account": order.refund_account,
            }
        )


class CashierOrderRefundCompleteView(APIView):
    """Step 3 — cashier confirms the money was sent; refund completed."""
    permission_classes = [IsCashier]

    def post(self, request, pk):
        try:
            order = Order.objects.filter(
                models.Q(cashier=request.user) | models.Q(customer__isnull=False),
            ).get(pk=pk)
        except Order.DoesNotExist:
            return Response(
                {"error": "Order not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        if order.status != Order.Status.REFUND_REQUESTED:
            return Response(
                {"error": "Only orders with a requested refund can be completed."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not order.refund_method:
            return Response(
                {"error": "The customer has not provided their refund details yet."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        order.status = Order.Status.REFUNDED
        order.save(update_fields=["status", "updated_at"])

        method_name = (
            PaymentSystem.objects.filter(code=order.refund_method)
            .values_list("name", flat=True).first()
            or order.refund_method
        )
        destination = f" via {method_name}" + (
            f" to {order.refund_account}" if order.refund_account else " in person"
        )
        phone = getattr(request.user, "phone", "") or ""
        message = (
            f"Your refund for order {order.order_number} is complete — "
            f"ETB {order.total:.2f} has been returned to you{destination}."
            + (f" For more information call the cashier at {phone}." if phone else "")
        )
        message_amharic = (
            f"የትዕዛዝዎ {order.order_number} ትርፍ መመለስ ተጠናቋል — "
            f"ETB {order.total:.2f} በ{method_name} ወደ {order.refund_account or 'እርስዎ'} ተልኳል።"
            + (f" ለበለጠ መረጃ ካሽየሩን በ {phone} ይደውሉ።" if phone else "")
        )
        notify_user(order.customer, order, message=message, message_amharic=message_amharic)

        return Response(
            {
                "detail": f"Order {order.order_number} refunded.",
                "status": Order.Status.REFUNDED,
                "refund_method": order.refund_method,
                "refund_account": order.refund_account,
            }
        )


class CashierReportsView(APIView):
    permission_classes = [IsCashier]
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
            cashier_orders.order_by("-created_at"), many=True,
            context={"request": request},
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
    permission_classes = [IsManager]
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
            Order.objects.order_by("-created_at"), many=True,
            context={"request": request},
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
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = OrderNotificationSerializer

    def get_queryset(self):
        return OrderNotification.objects.filter(
            user=self.request.user
        ).order_by("-created_at")


class NotificationReadView(APIView):
    permission_classes = [permissions.IsAuthenticated]
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
    permission_classes = [permissions.IsAuthenticated]
    def post(self, request):
        count = OrderNotification.objects.filter(
            user=request.user, is_read=False
        ).update(is_read=True)
        return Response({"marked": count})


class ConfirmPickupView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            order = Order.objects.get(id=pk, customer=request.user)
        except Order.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        if order.status != Order.Status.READY:
            return Response(
                {"error": "Order is not ready for pickup."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        order.status = Order.Status.COMPLETED
        order.save()

        if order.cashier_id:
            notify_user(
                order.cashier,
                order,
                message=f"Customer confirmed pickup for order {order.order_number}.",
                message_amharic=f"ደንበኛው ለትዕዛዝ {order.order_number} ማጠናቀቂያ ተረድቧል።",
            )

        return Response(OrderSerializer(order).data)


class NotifyPickupReadyView(APIView):
    permission_classes = [IsCashier]

    def post(self, request, pk):
        try:
            order = Order.objects.get(id=pk, cashier=request.user)
        except Order.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        if order.status != Order.Status.READY:
            return Response(
                {"error": "Order must be READY before notifying pickup."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if order.customer_id:
            notify_user(
                order.customer,
                order,
                message=f"Your order {order.order_number} is ready for pickup! Please confirm when you've picked it up.",
                message_amharic=f"ትዕዛዝዎ {order.order_number} ለማጠናቀቅ ዝግጁ ነው! እባክዎን ሲጠናቅቁ ያረጋግጡ።",
            )

        return Response({"detail": "Customer notified."})


class ResubmitProofView(APIView):
    permission_classes = [permissions.IsAuthenticated]
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

        if order.proof_attempts >= 3:
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

        payment_method = (request.data.get("payment_method") or "").strip()
        if payment_method:
            if not PaymentSystem.objects.filter(
                code=payment_method, is_active=True, customer_enabled=True
            ).exists():
                return Response(
                    {"error": "Invalid payment method."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            order.payment_method = payment_method

        order.payment_proof = proof
        order.status = Order.Status.PENDING
        order.save(update_fields=["payment_proof", "status", "payment_method", "updated_at"])
        order.notifications.filter(is_read=False).update(is_read=True)

        from .models import PaymentProofAttempt
        PaymentProofAttempt.objects.create(
            order=order,
            image=proof,
            attempt=order.proof_attempts,
        )

        if order.cashier:
            notify_user(
                order.cashier,
                order,
                message=f"Order {order.order_number} re-uploaded payment proof and needs re-verification.",
                message_amharic=f"ትዕዛዝ {order.order_number} የክፍያ ማስረጃ በድጋሚ ተጭኛል እና እንደገና ማረጋገጥ ያስፈልጋል።",
            )

        return Response(
            OrderSerializer(order, context={"request": request}).data
        )
