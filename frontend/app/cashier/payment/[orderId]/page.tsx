"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/services/api";
import { Order } from "@/types";
import { Button } from "@/components/ui";
import { Loading } from "@/components/common/Loading";
import { useState } from "react";
import { useRestaurant } from "@/hooks/useRestaurant";
import { usePaymentSystems } from "@/hooks/usePaymentSystems";

function printReceipt(order: Order, restaurantName?: string | null) {
  const w = window.open("", "_blank", "width=400,height=600");
  if (!w) return;

  const items = order.items?.map((item) => {
    const opts = item.options?.map((o) => `  ${o.option_value} ($${Number(o.price_adjustment).toFixed(2)})`).join("\n") || "";
    return `  ${item.quantity}x $${Number(item.unit_price).toFixed(2)} = $${Number(item.total_price).toFixed(2)}\n${opts}`;
  }).join("\n") || "";

  w.document.write(`
    <html><head><title>Receipt - ${order.order_number}</title>
    <style>
      body { font-family: monospace; padding: 20px; width: 280px; }
      h2 { text-align: center; margin: 0; }
      .line { border-top: 1px dashed #000; margin: 10px 0; }
      .row { display: flex; justify-content: space-between; }
      .total { font-weight: bold; font-size: 1.1em; }
    </style></head><body>
      <h2>🍔 {restaurantName || "Burger House"}</h2>
      <p style="text-align:center;font-size:0.8em">${order.order_number}</p>
      <p style="text-align:center;font-size:0.8em">${new Date(order.created_at).toLocaleString()}</p>
      <div class="line"></div>
      <pre style="font-size:0.85em;white-space:pre-wrap">${items}</pre>
      <div class="line"></div>
      <div class="row"><span>Subtotal:</span><span>$${Number(order.subtotal).toFixed(2)}</span></div>
      ${Number(order.discount) > 0 ? `<div class="row"><span>Discount:</span><span>-$${Number(order.discount).toFixed(2)}</span></div>` : ""}
      ${Number(order.tax) > 0 ? `<div class="row"><span>Tax:</span><span>$${Number(order.tax).toFixed(2)}</span></div>` : ""}
      <div class="line"></div>
      <div class="row total"><span>TOTAL:</span><span>$${Number(order.total).toFixed(2)}</span></div>
      <div class="line"></div>
      <p style="text-align:center;font-size:0.8em">Payment: ${order.payment_method || "—"}</p>
      <p style="text-align:center;font-size:0.8em">Thank you!</p>
    </body></html>
  `);
  w.document.close();
  w.print();
}

export default function PaymentPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: restaurant } = useRestaurant();
  const orderId = Number(params.orderId);
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const { data: paymentSystems } = usePaymentSystems();

  const { data: order, isLoading } = useQuery<Order>({
    queryKey: ["cashier-order", orderId],
    queryFn: async () => {
      const res = await api.get(`/orders/${orderId}/`);
      return res.data;
    },
  });

  const activeSystems = paymentSystems ?? [];
  const selectedMethod =
    paymentMethod ||
    (order?.payment_method && activeSystems.some((s) => s.code === order.payment_method)
      ? order.payment_method
      : activeSystems[0]?.code) ||
    "";

  const processPayment = useMutation({
    mutationFn: () =>
      api.post(`/orders/${orderId}/payment/`, { payment_method: selectedMethod }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cashier-orders"] });
      queryClient.invalidateQueries({ queryKey: ["cashier-order", orderId] });
    },
  });

  if (isLoading) return <Loading />;
  if (!order) return <div className="text-center py-12 text-gray-500">Order not found</div>;

  const isPaid = order.status === "COMPLETED";

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Payment</h1>

      <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
        <div className="flex items-center justify-between mb-4 pb-4 border-b">
          <div>
            <p className="font-medium text-lg">{order.order_number}</p>
            <p className="text-sm text-gray-400">
              {new Date(order.created_at).toLocaleString()}
            </p>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              isPaid ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
            }`}
          >
            {isPaid ? "PAID" : "UNPAID"}
          </span>
        </div>

        {order.items && order.items.length > 0 && (
          <div className="space-y-2 mb-4">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-gray-600">
                  {item.quantity}x Product #{item.product}
                </span>
                <span className="text-gray-900">${Number(item.total_price).toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}

        <div className="border-t pt-3 space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Subtotal</span>
            <span>${Number(order.subtotal).toFixed(2)}</span>
          </div>
          {Number(order.discount) > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Discount</span>
              <span className="text-green-600">-${Number(order.discount).toFixed(2)}</span>
            </div>
          )}
          {Number(order.tax) > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Tax</span>
              <span>${Number(order.tax).toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-lg pt-2 border-t">
            <span>Total</span>
            <span>${Number(order.total).toFixed(2)}</span>
          </div>
        </div>
      </div>

      {!isPaid && (
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h2 className="font-medium text-gray-900 mb-4">Select Payment Method</h2>
          {!paymentSystems || paymentSystems.length === 0 ? (
            <p className="text-center text-gray-500 text-sm py-6">
              No payment methods available. Ask a manager to add one.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-3 mb-6">
              {paymentSystems.map((method) => (
                <button
                  key={method.code}
                  onClick={() => setPaymentMethod(method.code)}
                  className={`p-4 rounded-xl border-2 text-center transition-colors cursor-pointer ${
                    selectedMethod === method.code
                      ? "border-orange-500 bg-orange-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {method.icon ? (
                    <img src={method.icon} alt={method.name} className="w-10 h-10 object-contain mx-auto mb-1" />
                  ) : (
                    <span className="text-2xl block mb-1">💳</span>
                  )}
                  <span className="text-sm font-medium">{method.name}</span>
                </button>
              ))}
            </div>
          )}

          <Button
            className="w-full"
            onClick={() => processPayment.mutate()}
            loading={processPayment.isPending}
          >
            Complete Payment - ${Number(order.total).toFixed(2)}
          </Button>

          {processPayment.isSuccess && (
            <p className="text-center text-green-600 text-sm mt-3">Payment successful!</p>
          )}
        </div>
      )}

      {isPaid && (
        <div className="text-center space-y-4">
          <p className="text-green-600 font-medium">Payment already completed</p>
          <Button variant="secondary" onClick={() => printReceipt(order, restaurant?.name)}>
            Print Receipt
          </Button>
        </div>
      )}

      <button
        onClick={() => router.push("/cashier/orders")}
        className="mt-4 text-sm text-gray-500 hover:text-gray-700 cursor-pointer"
      >
        &larr; Back to orders
      </button>
    </div>
  );
}
