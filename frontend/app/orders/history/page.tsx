"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useOrders, useNotifications, useResubmitProof, useConfirmPickup, useSubmitRefundDetails } from "@/hooks/useOrders";
import { useProducts } from "@/hooks/useProducts";
import { usePaymentSystems } from "@/hooks/usePaymentSystems";
import { useLanguage } from "@/hooks/useLanguage";
import type { Order, OrderNotification } from "@/types";
import { Loading } from "@/components/common/Loading";
import EmptyState from "@/components/common/EmptyState";
import HomeNavbar from "@/components/layout/HomeNavbar";

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400",
  PREPARING: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
  READY: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
  COMPLETED: "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300",
  CANCELLED: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
  REJECTED: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
  REFUND_REQUESTED: "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400",
  REFUNDED: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400",
};

function RefundDetailsForm({ order, currency }: { order: Order; currency: string }) {
  const { data: paymentSystems } = usePaymentSystems();
  const submit = useSubmitRefundDetails();
  const [method, setMethod] = useState("");
  const [account, setAccount] = useState("");

  if (order.refund_method) {
    return (
      <div className="mb-3 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl text-sm text-orange-700 dark:text-orange-300">
        <i className="fas fa-circle-check mr-1"></i>
        Refund details received — you will receive {currency} {Number(order.total).toFixed(2)} shortly.
      </div>
    );
  }

  const options = (paymentSystems || []).filter((ps) => ps.for_refund);

  return (
    <form
      className="mb-3 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl"
      onSubmit={(e) => {
        e.preventDefault();
        submit.mutate({ id: order.id, method, account: account.trim() });
      }}
    >
      <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
        How would you like to receive your {currency} {Number(order.total).toFixed(2)} refund?
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
        Our team is returning your payment. Tell us where to send it.
      </p>

      <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Refund payment type</label>
      <select
        value={method}
        onChange={(e) => setMethod(e.target.value)}
        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-400 transition mb-3"
      >
        <option value="">Select payment type...</option>
        {options.map((opt) => (
          <option key={opt.code} value={opt.code}>{opt.name}</option>
        ))}
      </select>

      <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Your account number</label>
      <input
        type="text"
        value={account}
        onChange={(e) => setAccount(e.target.value)}
        placeholder="Phone / account number"
        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-400 transition mb-3"
      />

      {submit.isError && (
        <p className="text-sm text-red-600 mb-3">
          {(Object.values((submit.error as { response?: { data?: Record<string, string> } })?.response?.data || {})[0] as string) || "Failed to submit."}
        </p>
      )}

      <button
        type="submit"
        disabled={!method || account.trim().length < 6 || submit.isPending}
        className="inline-flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-orange-600 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <i className="fas fa-paper-plane"></i>
        {submit.isPending ? "Sending..." : "Send Details"}
      </button>
    </form>
  );
}

export default function OrderHistoryPage() {
  const { lang: currentLang, t } = useLanguage();
  const { data: orders, isLoading } = useOrders();
  const { data: notifications } = useNotifications();
  const { data: products } = useProducts();
  const { data: paymentSystems } = usePaymentSystems();
  const resubmit = useResubmitProof();
  const confirmPickup = useConfirmPickup();
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("order_history_title")}</h1>
          <Link
            href="/orders"
            className="inline-flex items-center gap-2 bg-red-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-red-700 transition-all duration-300 shadow-lg hover:shadow-red-600/30"
          >
            {t("place_new_order")} <i className="fas fa-shopping-bag"></i>
          </Link>
        </div>

        {!orders || orders.length === 0 ? (
          <EmptyState message={t("no_orders_yet")} />
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const orderNotifications = notificationsByOrder.get(order.id) ?? [];
              return (
              <div key={order.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5">
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
                            <p className="text-sm text-gray-700 dark:text-gray-200">{currentLang === "am" && n.message_amharic ? n.message_amharic : n.message}</p>
                            <p className="text-xs text-gray-400 mt-1">
                              {new Date(n.created_at).toLocaleString()}
                            </p>
                            {order.status === "REJECTED" && isRejection && (
                              <p className="font-bold text-red-700 dark:text-red-400 text-sm mt-2">
                                {t("payment_rejected_3")}
                              </p>
                            )}
                            {order.status === "REJECTED" && isRejection && order.proof_attempts < 3 && (
                              <button
                                onClick={() => {
                                  setPickingFor(order.id);
                                  setTimeout(() => fileInputRef.current?.click(), 0);
                                }}
                                disabled={resubmit.isPending}
                                className="mt-3 inline-flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-red-700 transition-all cursor-pointer disabled:opacity-50"
                              >
                                <i className="fas fa-camera"></i>
                                {resubmit.isPending && pickingFor === order.id ? t("uploading") : t("re_upload_proof")}
                              </button>
                            )}
                            {resubmit.isSuccess && pickingFor === null && (
                              <p className="mt-2 text-xs text-green-600 font-semibold">
                                {t("new_proof_uploaded")}
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
                    <p className="font-medium text-gray-900 dark:text-white">{order.order_number}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {new Date(order.created_at).toLocaleString()}
                    </p>
                    {order.payment_method && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                        {t("payment")} {paymentMethodName(order.payment_method)}
                      </p>
                    )}
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[order.status]}`}
                  >
                    {order.status}
                  </span>
                </div>

                {order.status === "READY" && (
                  <div className="mb-3">
                    <button
                      onClick={() => confirmPickup.mutate(order.id)}
                      disabled={confirmPickup.isPending}
                      className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-green-700 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <i className="fas fa-check-circle"></i>
                      {confirmPickup.isPending ? t("uploading") : t("confirm_pickup")}
                    </button>
                  </div>
                )}

                {order.status === "REFUND_REQUESTED" && (
                  <div className="mb-3">
                    <p className="text-xs font-semibold text-orange-700 dark:text-orange-400 mb-2">
                      <i className="fas fa-rotate-left mr-1"></i>Refund requested — action needed
                    </p>
                    <RefundDetailsForm order={order} currency={t("currency")} />
                  </div>
                )}

                {order.status === "REFUNDED" && order.refund_method && (
                  <div className="mb-3 p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl text-sm text-purple-700 dark:text-purple-300">
                    <i className="fas fa-rotate-left mr-1"></i>
                    {t("currency")} {Number(order.total).toFixed(2)} refunded via{" "}
                    {paymentMethodName(order.refund_method) || order.refund_method}
                    {order.refund_account ? ` to ${order.refund_account}` : " (in person)"}
                  </div>
                )}

                {order.proof_history && order.proof_history.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t("payment")} Proof:</p>
                    <div className="flex flex-wrap gap-2">
                      {order.proof_history.map((p) => (
                        <div key={p.id} className="relative">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={p.image}
                            alt={`Proof attempt ${p.attempt + 1}`}
                            className="h-24 w-24 object-cover rounded-xl border border-gray-200 dark:border-gray-600 cursor-pointer hover:scale-105 transition-transform"
                            onClick={() => window.open(p.image, "_blank")}
                          />
                          <span className="absolute top-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
                            #{p.attempt + 1}
                          </span>
                          {p.rejection_reason && (
                            <p className="text-[10px] text-red-500 mt-0.5 max-w-[96px] truncate" title={p.rejection_reason}>
                              {p.rejection_reason}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {order.items && order.items.length > 0 && (
                  <div className="border-t dark:border-gray-700 pt-3 space-y-2">
                    {order.items.map((item) => {
                      const product = productMap.get(item.product);
                      return (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">
                            {item.quantity}x {item.product_name || (currentLang === "am" ? product?.name_amharic || product?.name : product?.name) || `Product #${item.product}`}
                            {item.options && item.options.length > 0 && (
                              <span className="text-gray-400 dark:text-gray-500">
                                {" "}(+{item.options.length} option{item.options.length > 1 ? "s" : ""})
                              </span>
                            )}
                          </span>
                          <span className="text-gray-900 dark:text-white">{t("currency")} {Number(item.total_price).toFixed(2)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="border-t dark:border-gray-700 mt-3 pt-3 flex justify-between">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{t("total")}</span>
                  <span className="font-bold text-gray-900 dark:text-white">{t("currency")} {Number(order.total).toFixed(2)}</span>
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
