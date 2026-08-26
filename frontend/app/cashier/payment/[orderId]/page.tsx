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
    const opts = item.options?.map((o) => `  - ${o.option_name} (+ETB ${Number(o.price_adjustment).toFixed(2)})`).join("\n") || "";
    return `  ${item.quantity}x ${item.product_name}\n  ETB ${Number(item.unit_price).toFixed(2)} each = ETB ${Number(item.total_price).toFixed(2)}\n${opts}`;
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
      <div class="row"><span>Subtotal:</span><span>ETB ${Number(order.subtotal).toFixed(2)}</span></div>
      ${Number(order.discount) > 0 ? `<div class="row"><span>Discount:</span><span>-ETB ${Number(order.discount).toFixed(2)}</span></div>` : ""}
      ${Number(order.tax) > 0 ? `<div class="row"><span>Tax:</span><span>ETB ${Number(order.tax).toFixed(2)}</span></div>` : ""}
      <div class="line"></div>
      <div class="row total"><span>TOTAL:</span><span>ETB ${Number(order.total).toFixed(2)}</span></div>
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
  const [rejectReason, setRejectReason] = useState("");
  const [discarding, setDiscarding] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showAcceptConfirm, setShowAcceptConfirm] = useState(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const { data: paymentSystems } = usePaymentSystems();

  const { data: order, isLoading } = useQuery<Order>({
    queryKey: ["cashier-order", orderId],
    queryFn: async () => {
      const res = await api.get(`/orders/${orderId}/`);
      return res.data;
    },
    refetchInterval: 5000,
    staleTime: 0,
  });

  const activeSystems = paymentSystems ?? [];
  const selectedMethod =
    paymentMethod ||
    (order?.payment_method && activeSystems.some((s) => s.code === order.payment_method)
      ? order.payment_method
      : activeSystems[0]?.code) ||
    "";

  const processPayment = useMutation({
    mutationFn: async ({ action, reason }: { action: "accept" | "reject"; reason?: string }) => {
      const res = await api.post(`/orders/${orderId}/payment/`, {
        action,
        payment_method: selectedMethod,
        reason,
      });
      return res.data as { status?: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cashier-orders"] });
      queryClient.invalidateQueries({ queryKey: ["cashier-order", orderId] });
    },
  });

  if (isLoading) return <Loading />;
  if (!order) return <div className="text-center py-12 text-gray-500">Order not found</div>;

  const isPaid = order.status === "COMPLETED" || order.status === "PREPARING" || order.status === "READY";
  const paymentMethodName = (code: string | null | undefined) =>
    activeSystems.find((s) => s.code === code)?.name || code || "";

  // An unpaid walk-in order was only a draft — going back discards it so it
  // never shows up in the orders list. Online orders and paid orders are kept.
  const draft = !order.customer && order.status === "PENDING" && !order.payment_proof;

  const goBack = async () => {
    if (draft) {
      setDiscarding(true);
      try {
        await api.delete(`/orders/cashier/${orderId}/`);
        queryClient.invalidateQueries({ queryKey: ["cashier-orders"] });
        queryClient.removeQueries({ queryKey: ["cashier-order", orderId] });
      } catch {
        // If it can no longer be discarded (e.g. just paid), keep it.
      }
      setDiscarding(false);
    }
    router.push("/cashier/orders");
  };

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
            {order.payment_method && (
              <p className="text-sm text-gray-500 mt-1">
                Payment: <span className="font-semibold text-gray-700">{paymentMethodName(order.payment_method)}</span>
              </p>
            )}
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
                <div>
                  <span className="text-gray-900">
                    {item.quantity}x {item.product_name}
                  </span>
                  {item.options && item.options.length > 0 && (
                    <div className="text-xs text-gray-400">
                      {item.options.map((o) => (
                        <span key={o.id} className="mr-2">
                          + {o.option_name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <span className="text-gray-900">ETB {Number(item.total_price).toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}

        <div className="border-t pt-3 space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Subtotal</span>
            <span>ETB {Number(order.subtotal).toFixed(2)}</span>
          </div>
          {Number(order.discount) > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Discount</span>
              <span className="text-green-600">-ETB {Number(order.discount).toFixed(2)}</span>
            </div>
          )}
          {Number(order.tax) > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Tax</span>
              <span>ETB {Number(order.tax).toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-lg pt-2 border-t">
            <span>Total</span>
            <span>ETB {Number(order.total).toFixed(2)}</span>
          </div>
        </div>
      </div>

      {!isPaid && order.status !== "CANCELLED" && order.status !== "REJECTED" && (
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          {order.payment_proof ? (
            <>
              <h2 className="font-medium text-gray-900 mb-1">Verify Payment Proof</h2>
              <p className="text-sm text-gray-500 mb-4">
                The customer attached this proof of payment. Accept it to mark the order as paid, or reject it to notify the customer.
              </p>

              {order.payment_method && (
                <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-xl text-sm">
                  <span className="font-semibold text-orange-700">Payment Method: </span>
                  <span className="text-orange-700">{paymentMethodName(order.payment_method)}</span>
                </div>
              )}

              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                key={`${order.payment_proof}-${order.proof_attempts}`}
                src={order.payment_proof}
                alt="Payment proof"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 mb-4 max-h-80 object-contain"
              />

              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Reason for rejection (optional) — sent to the customer"
                className="w-full mb-4 p-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                rows={2}
              />

              <div className="flex gap-3">
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={() => setShowAcceptConfirm(true)}
                  loading={processPayment.isPending}
                >
                  <i className="fas fa-check mr-1"></i> Accept Payment
                </Button>
                <Button
                  className="flex-1 bg-red-600 hover:bg-red-700"
                  variant="secondary"
                  onClick={() => setShowRejectConfirm(true)}
                  loading={processPayment.isPending}
                >
                  <i className="fas fa-xmark mr-1"></i> Reject
                </Button>
              </div>

              {processPayment.isSuccess && (
                <p className="text-center text-green-600 text-sm mt-3">
                  {processPayment.data?.status === "rejected"
                    ? "Payment rejected — the customer has been notified."
                    : "Payment accepted — order is now being prepared!"}
                </p>
              )}
              {processPayment.isError && (
                <p className="text-center text-red-600 text-sm mt-3">
                  Something went wrong. Please try again.
                </p>
              )}
            </>
          ) : (
            <>
              <h2 className="font-medium text-gray-900 mb-4">Select Payment Method</h2>
              {!paymentSystems || paymentSystems.length === 0 ? (
                <p className="text-center text-gray-500 text-sm py-6">
                  No payment methods available. Ask a manager to add one.
                </p>
              ) : (
                <>
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
                {(() => {
                  const selected = paymentSystems.find((m) => m.code === selectedMethod);
                  return selected ? (
                    <div className="mb-6 p-3 bg-gray-50 rounded-xl text-sm">
                      <p className="font-semibold text-gray-900">
                        {selected.name} <span className="text-gray-500">({selected.code})</span>
                      </p>
                    </div>
                  ) : null;
                })()}
                </>
              )}

              <Button
                className="w-full"
                onClick={() => setShowConfirm(true)}
                loading={processPayment.isPending}
              >
                Complete Payment - ETB {Number(order.total).toFixed(2)}
              </Button>

              {processPayment.isSuccess && (
                <p className="text-center text-green-600 text-sm mt-3">Payment successful!</p>
              )}
            </>
          )}
        </div>
      )}

      {isPaid && (
        <div className="text-center space-y-4">
          <p className="text-green-600 font-medium">
            {order.status === "COMPLETED" ? "Payment already completed" : "Payment accepted"}
          </p>
          <Button variant="secondary" onClick={() => printReceipt(order, restaurant?.name)}>
            Print Receipt
          </Button>
        </div>
      )}

      {order.status === "CANCELLED" && (
        <div className="text-center space-y-4">
          <p className="text-red-600 font-medium">This order has been cancelled</p>
        </div>
      )}

      {order.status === "REJECTED" && (
        <div className="text-center space-y-4">
          <p className="text-red-600 font-medium">
            This order was rejected after too many payment proof attempts
          </p>
        </div>
      )}

      <button
        onClick={goBack}
        disabled={discarding}
        className="mt-4 text-sm text-gray-500 hover:text-gray-700 cursor-pointer disabled:opacity-50"
      >
        &larr; {draft ? "Back (order will be discarded)" : "Back to orders"}
      </button>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowConfirm(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-credit-card text-orange-600 text-xl"></i>
            </div>
            <h3 className="text-lg font-bold text-gray-900 text-center mb-2">Complete Payment?</h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              Are you sure you want to mark this order as paid? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
              >
                No, Cancel
              </button>
              <button
                onClick={() => {
                  setShowConfirm(false);
                  processPayment.mutate({ action: "accept" });
                }}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-xl transition-colors cursor-pointer"
              >
                Yes, Complete
              </button>
            </div>
          </div>
        </div>
      )}

      {showAcceptConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowAcceptConfirm(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-check text-green-600 text-xl"></i>
            </div>
            <h3 className="text-lg font-bold text-gray-900 text-center mb-2">Accept Payment?</h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              Are you sure you want to accept this payment proof? The order will be marked as paid.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowAcceptConfirm(false)}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
              >
                No, Cancel
              </button>
              <button
                onClick={() => {
                  setShowAcceptConfirm(false);
                  processPayment.mutate({ action: "accept" });
                }}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-xl transition-colors cursor-pointer"
              >
                Yes, Accept
              </button>
            </div>
          </div>
        </div>
      )}

      {showRejectConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowRejectConfirm(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-xmark text-red-600 text-xl"></i>
            </div>
            <h3 className="text-lg font-bold text-gray-900 text-center mb-2">Reject Payment?</h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              Are you sure you want to reject this payment proof? The customer will be notified.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowRejectConfirm(false)}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
              >
                No, Cancel
              </button>
              <button
                onClick={() => {
                  setShowRejectConfirm(false);
                  processPayment.mutate({ action: "reject", reason: rejectReason });
                }}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors cursor-pointer"
              >
                Yes, Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
