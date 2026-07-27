from django.utils import timezone
from django.db.models import Sum, Count
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Order
from .serializers import OrderSerializer, OrderCreateSerializer


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


class PaymentView(APIView):
    def post(self, request, pk):
        if request.user.role not in ("MANAGER", "CASHIER"):
            return Response(
                {"error": "You do not have permission to process payments."},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            order = Order.objects.get(id=pk)
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

        payment_method = request.data.get("payment_method")
        if payment_method not in dict(Order.PaymentMethod.choices):
            return Response(
                {"error": "Invalid payment method."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        order.payment_method = payment_method
        order.status = Order.Status.COMPLETED
        order.save()

        return Response(OrderSerializer(order).data)


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
        if request.user.role not in ("MANAGER", "CASHIER"):
            return Response(
                {"error": "You do not have permission to process payments."},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            order = Order.objects.get(id=pk)
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

        payment_method = request.data.get("payment_method")
        if payment_method not in dict(Order.PaymentMethod.choices):
            return Response(
                {"error": "Invalid payment method."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        order.payment_method = payment_method
        order.status = Order.Status.COMPLETED
        order.save()

        return Response(OrderSerializer(order).data)


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
