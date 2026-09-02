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
      className="mb-3 p-3 sm:p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl"
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
        className="inline-flex items-center justify-center gap-2 w-full sm:w-auto bg-orange-500 text-white px-4 py-3 sm:py-2 rounded-xl text-sm font-bold hover:bg-orange-600 active:bg-orange-700 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <i className="fas fa-paper-plane"></i>
        {submit.isPending ? "Sending..." : "Send Details"}
      </button>
    </form>
  );
}

function RejectionReasonSlider({ order }: { order: Order }) {
  const [index, setIndex] = useState(0);
  const touchX = useRef<number | null>(null);
  const { t } = useLanguage();

  const slides = (order.proof_history || [])
    .filter((p) => p.rejection_reason)
    .map((p) => ({ n: p.attempt + 1, reason: p.rejection_reason as string }));

  if (slides.length === 0) return null;
  const safeIndex = Math.min(index, slides.length - 1);

  const go = (dir: number) =>
    setIndex((i) => Math.max(0, Math.min(slides.length - 1, i + dir)));

  return (
    <div className="mt-2 -mx-1 min-w-0">
      <div
        className="overflow-hidden rounded-lg w-full min-w-0"
        onTouchStart={(e) => {
          touchX.current = e.touches[0].clientX;
        }}
        onTouchEnd={(e) => {
          if (touchX.current === null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
          touchX.current = null;
        }}
      >
        <div
          className="flex w-full min-w-0 transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${safeIndex * 100}%)` }}
        >
          {slides.map((s) => (
            <div key={s.n} className="w-full min-w-full max-w-full shrink-0 grow-0 basis-full px-1">
              <div className="bg-white/80 dark:bg-red-900/20 border border-red-100 dark:border-red-900/40 rounded-lg px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-red-400 mb-0.5">
                  {t("proof_attempt")} {s.n}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-snug break-words [overflow-wrap:anywhere]">{s.reason}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {slides.length > 1 && (
        <div className="flex items-center justify-center gap-3 mt-2">
          <button
            onClick={() => go(-1)}
            disabled={safeIndex === 0}
            aria-label="Previous rejection"
            className="w-8 h-8 rounded-full bg-white dark:bg-gray-700 border border-red-200 dark:border-red-900/50 text-red-500 text-xs flex items-center justify-center cursor-pointer disabled:opacity-30 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
          >
            <i className="fas fa-chevron-left"></i>
          </button>
          <div className="flex items-center gap-1.5">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                aria-label={`Rejection ${i + 1}`}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  i === safeIndex ? "w-4 bg-red-500" : "w-1.5 bg-red-200 dark:bg-red-900/60 hover:bg-red-300"
                }`}
              ></button>
            ))}
          </div>
          <button
            onClick={() => go(1)}
            disabled={safeIndex === slides.length - 1}
            aria-label="Next rejection"
            className="w-8 h-8 rounded-full bg-white dark:bg-gray-700 border border-red-200 dark:border-red-900/50 text-red-500 text-xs flex items-center justify-center cursor-pointer disabled:opacity-30 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
          >
            <i className="fas fa-chevron-right"></i>
          </button>
        </div>
      )}
    </div>
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
  const [uploadedId, setUploadedId] = useState<number | null>(null);
  const [paymentMethodByOrder, setPaymentMethodByOrder] = useState<Record<number, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const productMap = new Map((products ?? []).map((p) => [p.id, p]));
  const paymentMethodName = (code: string | null | undefined) =>
    paymentSystems?.find((s) => s.code === code)?.name || code || "";
  const customerMethods = (paymentSystems ?? []).filter((ps) => ps.is_active && ps.customer_enabled);

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
    resubmit.mutate(
      { id: orderId, file, paymentMethod: paymentMethodByOrder[orderId] || undefined },
      { onSuccess: () => setUploadedId(orderId) }
    );
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
      <div className="max-w-4xl w-full min-w-0 mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{t("order_history_title")}</h1>
          <Link
            href="/orders"
            className="inline-flex items-center justify-center gap-2 w-full sm:w-auto bg-red-600 text-white px-4 py-3 sm:py-2.5 rounded-xl text-sm font-bold hover:bg-red-700 active:bg-red-800 transition-all duration-300 shadow-lg hover:shadow-red-600/30"
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
              <div key={order.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 sm:p-5 min-w-0 overflow-hidden">
                {orderNotifications.length > 0 && (
                  <div className="mb-4 space-y-2">
                    {orderNotifications.map((n) => {
                      const isRejection = n.message.toLowerCase().includes("reject");
                      return (
                        <div key={n.id} className={`p-3 sm:p-4 rounded-xl flex items-start gap-2.5 sm:gap-3 border ${
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
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-700 dark:text-gray-200 break-words [overflow-wrap:anywhere]">{currentLang === "am" && n.message_amharic ? n.message_amharic : n.message}</p>
                            <p className="text-xs text-gray-400 mt-1">
                              {new Date(n.created_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {order.status === "REJECTED" && (
                  <div className="mb-4 flex gap-2.5 sm:gap-3 p-3 sm:p-4 bg-red-50/80 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-xl">
                    <span className="w-9 h-9 rounded-full bg-white dark:bg-red-900/40 border border-red-100 dark:border-red-900/60 shadow-sm flex items-center justify-center shrink-0">
                      <i className="fas fa-triangle-exclamation text-red-500"></i>
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm text-red-700 dark:text-red-300">{t("payment_rejected")}</p>
                        <span className="text-[11px] font-medium text-red-400 dark:text-red-400/80">
                          · {t("proof_attempt")} {order.proof_attempts}/3
                        </span>
                      </div>

                      <RejectionReasonSlider order={order} />

                      {order.proof_attempts >= 3 ? (
                        <p className="mt-2 text-xs font-semibold text-red-500">
                          {t("payment_rejected_3")}
                        </p>
                      ) : (
                        <div className="mt-3 flex items-center gap-3 flex-wrap">
                          {customerMethods.length > 0 && (
                            <label className="block min-w-full">
                              <span className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
                                {t("payment_method")}
                              </span>
                              <select
                                value={paymentMethodByOrder[order.id] ?? order.payment_method ?? ""}
                                onChange={(e) =>
                                  setPaymentMethodByOrder((prev) => ({ ...prev, [order.id]: e.target.value }))
                                }
                                className="w-full px-3 py-2.5 rounded-lg border border-red-200 dark:border-red-900/60 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:border-red-400 transition"
                              >
                                <option value="" disabled>
                                  {t("select")}...
                                </option>
                                {customerMethods.map((m) => (
                                  <option key={m.code} value={m.code}>
                                    {m.name} ({m.code})
                                  </option>
                                ))}
                              </select>
                            </label>
                          )}
                          <button
                            onClick={() => {
                              setPickingFor(order.id);
                              setTimeout(() => fileInputRef.current?.click(), 0);
                            }}
                            disabled={resubmit.isPending}
                            className="inline-flex items-center justify-center gap-1.5 w-full sm:w-auto px-3 py-2.5 sm:py-1.5 rounded-lg border border-red-300 dark:border-red-800 bg-white dark:bg-transparent text-xs font-bold text-red-600 dark:text-red-300 hover:bg-red-50 active:bg-red-100 dark:hover:bg-red-900/30 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            <i className="fas fa-camera"></i>
                            {resubmit.isPending && pickingFor === order.id ? t("uploading") : t("re_upload_proof")}
                          </button>
                          {uploadedId === order.id && (
                            <span className="text-xs text-green-600 font-medium">
                              <i className="fas fa-check mr-1"></i>
                              {t("new_proof_uploaded")}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white break-words">{order.order_number}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {new Date(order.created_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                    </p>
                    {order.payment_method && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                        {t("payment")} {paymentMethodName(order.payment_method)}
                      </p>
                    )}
                  </div>
                  <span
                    className={`shrink-0 px-2.5 sm:px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[order.status]}`}
                  >
                    {order.status}
                  </span>
                </div>

                {order.status === "READY" && (
                  <div className="mb-3">
                    <button
                      onClick={() => confirmPickup.mutate(order.id)}
                      disabled={confirmPickup.isPending}
                      className="inline-flex items-center justify-center gap-2 w-full sm:w-auto bg-green-600 text-white px-4 py-3 sm:py-2 rounded-xl text-sm font-bold hover:bg-green-700 active:bg-green-800 transition-all cursor-pointer disabled:opacity-50"
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
                  <div className="mb-3 p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl text-sm text-purple-700 dark:text-purple-300 break-words [overflow-wrap:anywhere]">
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
                            className="h-20 w-20 sm:h-24 sm:w-24 object-cover rounded-xl border border-gray-200 dark:border-gray-600 cursor-pointer active:scale-95 sm:hover:scale-105 transition-transform"
                            onClick={() => window.open(p.image, "_blank")}
                          />
                          <span className="absolute top-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
                            #{p.attempt + 1}
                          </span>
                          {p.rejection_reason && (
                            <p className="text-[10px] text-red-500 mt-0.5 max-w-20 sm:max-w-24 truncate" title={p.rejection_reason}>
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
                        <div key={item.id} className="flex justify-between items-start gap-3 text-sm">
                          <span className="min-w-0 text-gray-600 dark:text-gray-400 break-words">
                            {item.quantity}x {item.product_name || (currentLang === "am" ? product?.name_amharic || product?.name : product?.name) || `Product #${item.product}`}
                            {item.options && item.options.length > 0 && (
                              <span className="text-gray-400 dark:text-gray-500">
                                {" "}(+{item.options.length} option{item.options.length > 1 ? "s" : ""})
                              </span>
                            )}
                          </span>
                          <span className="shrink-0 text-right text-gray-900 dark:text-white">{t("currency")} {Number(item.total_price).toFixed(2)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {order.coupon_code && Number(order.discount) > 0 && (
                  <div className="border-t dark:border-gray-700 mt-3 pt-3 flex justify-between items-center gap-3">
                    <span className="text-sm font-medium text-green-700 dark:text-green-400">
                      {t("coupon_discount")} <span className="font-bold">({order.coupon_code})</span>
                    </span>
                    <span className="font-bold text-base sm:text-sm text-green-600 dark:text-green-400 text-right">
                      -{t("currency")} {Number(order.discount).toFixed(2)}
                    </span>
                  </div>
                )}

                <div className="border-t dark:border-gray-700 mt-3 pt-3 flex justify-between items-center gap-3">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{t("total")}</span>
                  <span className="font-bold text-base sm:text-sm text-gray-900 dark:text-white text-right">{t("currency")} {Number(order.total).toFixed(2)}</span>
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
