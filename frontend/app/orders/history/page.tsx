"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useOrders, useNotifications, useResubmitProof } from "@/hooks/useOrders";
import { useProducts } from "@/hooks/useProducts";
import { usePaymentSystems } from "@/hooks/usePaymentSystems";
import type { OrderNotification } from "@/types";
import { Loading } from "@/components/common/Loading";
import EmptyState from "@/components/common/EmptyState";
import HomeNavbar from "@/components/layout/HomeNavbar";

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  PREPARING: "bg-blue-100 text-blue-700",
  READY: "bg-green-100 text-green-700",
  COMPLETED: "bg-gray-100 text-gray-700",
  CANCELLED: "bg-red-100 text-red-700",
  REJECTED: "bg-red-100 text-red-700",
};

export default function OrderHistoryPage() {
  const { data: orders, isLoading } = useOrders();
  const { data: notifications } = useNotifications();
  const { data: products } = useProducts();
  const { data: paymentSystems } = usePaymentSystems();
  const resubmit = useResubmitProof();
  const [pickingFor, setPickingFor] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const productMap = new Map((products ?? []).map((p) => [p.id, p]));
  const paymentMethodName = (code: string | null | undefined) =>
    paymentSystems?.find((s) => s.code === code)?.name || code || "";

  const notificationsByOrder = new Map<number, OrderNotification[]>();
  for (const n of notifications ?? []) {
    const list = notificationsByOrder.get(n.order) ?? [];
    list.push(n);
    notificationsByOrder.set(n.order, list);
  }

  const handleProofPick = (orderId: number, file: File | undefined | null) => {
    setPickingFor(null);
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    resubmit.mutate({ id: orderId, file });
  };

  if (isLoading) {
    return (
      <>
        <HomeNavbar />
        <Loading />
      </>
    );
  }

  return (
    <>
      <HomeNavbar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Order History</h1>
          <Link
            href="/orders"
            className="inline-flex items-center gap-2 bg-red-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-red-700 transition-all duration-300 shadow-lg hover:shadow-red-600/30"
          >
            Place New Order <i className="fas fa-shopping-bag"></i>
          </Link>
        </div>

        {!orders || orders.length === 0 ? (
          <EmptyState message="You haven't placed any orders yet" />
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const orderNotifications = notificationsByOrder.get(order.id) ?? [];
              return (
              <div key={order.id} className="bg-white rounded-xl border border-gray-100 p-5">
                {orderNotifications.length > 0 && (
                  <div className="mb-4 space-y-2">
                    {orderNotifications.map((n) => {
                      const isRejection = n.message.toLowerCase().includes("reject");
                      return (
                        <div key={n.id} className={`p-4 rounded-xl flex items-start gap-3 border ${
                          isRejection
                            ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                            : order.status === "COMPLETED"
                              ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                              : "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                        }`}>
                          <span className={`w-9 h-9 rounded-full flex items-center justify-center text-lg shrink-0 ${
                            isRejection
                              ? "bg-red-100 dark:bg-red-900/40 text-red-500"
                              : order.status === "COMPLETED"
                                ? "bg-green-100 dark:bg-green-900/40 text-green-600"
                                : "bg-blue-100 dark:bg-blue-900/40 text-blue-500"
                          }`}>
                            {isRejection ? <i className="fas fa-circle-xmark"></i> : <i className="fas fa-circle-check"></i>}
                          </span>
                          <div className="flex-1">
                            <p className="text-sm text-gray-700 dark:text-gray-200">{n.message}</p>
                            <p className="text-xs text-gray-400 mt-1">
                              {new Date(n.created_at).toLocaleString()}
                            </p>
                            {order.status === "REJECTED" && isRejection && (
                              <p className="font-bold text-red-700 dark:text-red-400 text-sm mt-2">
                                Payment Rejected After 3 Attempts
                              </p>
                            )}
                            {isRejection && order.status !== "COMPLETED" && order.status !== "REJECTED" && (
                              <button
                                onClick={() => {
                                  setPickingFor(order.id);
                                  setTimeout(() => fileInputRef.current?.click(), 0);
                                }}
                                disabled={resubmit.isPending}
                                className="mt-3 inline-flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-red-700 transition-all cursor-pointer disabled:opacity-50"
                              >
                                <i className="fas fa-camera"></i>
                                {resubmit.isPending && pickingFor === order.id ? "Uploading..." : "Re-upload payment proof"}
                              </button>
                            )}
                            {resubmit.isSuccess && pickingFor === null && (
                              <p className="mt-2 text-xs text-green-600 font-semibold">
                                New proof uploaded — the cashier will verify it again.
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-medium text-gray-900">{order.order_number}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(order.created_at).toLocaleString()}
                    </p>
                    {order.payment_method && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        Payment: {paymentMethodName(order.payment_method)}
                      </p>
                    )}
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[order.status]}`}
                  >
                    {order.status}
                  </span>
                </div>

                {order.payment_proof && (
                  <div className="mb-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={order.payment_proof}
                      alt="Payment proof"
                      className="h-24 w-24 object-cover rounded-xl border border-gray-200"
                    />
                  </div>
                )}

                {order.items && order.items.length > 0 && (
                  <div className="border-t pt-3 space-y-2">
                    {order.items.map((item) => {
                      const product = productMap.get(item.product);
                      return (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span className="text-gray-600">
                            {item.quantity}x {item.product_name || product?.name || `Product #${item.product}`}
                            {item.options && item.options.length > 0 && (
                              <span className="text-gray-400">
                                {" "}(+{item.options.length} option{item.options.length > 1 ? "s" : ""})
                              </span>
                            )}
                          </span>
                          <span className="text-gray-900">ETB {Number(item.total_price).toFixed(2)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="border-t mt-3 pt-3 flex justify-between">
                  <span className="text-sm font-medium text-gray-900">Total</span>
                  <span className="font-bold text-gray-900">ETB {Number(order.total).toFixed(2)}</span>
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleProofPick(pickingFor ?? 0, e.target.files?.[0])}
      />
    </>
  );
}
