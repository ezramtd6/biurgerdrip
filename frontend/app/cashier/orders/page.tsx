"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/services/api";
import { Order, OrderNotification } from "@/types";
import { Button } from "@/components/ui";
import { Loading } from "@/components/common/Loading";
import EmptyState from "@/components/common/EmptyState";
import { usePaymentSystems } from "@/hooks/usePaymentSystems";
import Link from "next/link";
import { useLanguage } from "@/hooks/useLanguage";

function RejectionReasonSlider({ order }: { order: Order }) {
  const [index, setIndex] = useState(0);
  const touchX = useRef<number | null>(null);

  const slides = (order.proof_history || [])
    .filter((p) => p.rejection_reason)
    .map((p) => ({ n: p.attempt + 1, reason: p.rejection_reason as string }));

  if (slides.length === 0) return null;
  const safeIndex = Math.min(index, slides.length - 1);

  const go = (dir: number) =>
    setIndex((i) => Math.max(0, Math.min(slides.length - 1, i + dir)));

  return (
    <div className="mt-2 -mx-1">
      <div
        className="overflow-hidden rounded-lg"
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
          className="flex transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${safeIndex * 100}%)` }}
        >
          {slides.map((s) => (
            <div key={s.n} className="w-full shrink-0 px-1">
              <div className="bg-white/80 border border-red-100 rounded-lg px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-red-400 mb-0.5">
                  Proof attempt {s.n}
                </p>
                <p className="text-sm text-gray-600 leading-snug break-words">{s.reason}</p>
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
            className="w-6 h-6 rounded-full bg-white border border-red-200 text-red-500 text-[10px] flex items-center justify-center cursor-pointer disabled:opacity-30 hover:bg-red-50 transition-colors"
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
                  i === safeIndex ? "w-4 bg-red-500" : "w-1.5 bg-red-200 hover:bg-red-300"
                }`}
              ></button>
            ))}
          </div>
          <button
            onClick={() => go(1)}
            disabled={safeIndex === slides.length - 1}
            aria-label="Next rejection"
            className="w-6 h-6 rounded-full bg-white border border-red-200 text-red-500 text-[10px] flex items-center justify-center cursor-pointer disabled:opacity-30 hover:bg-red-50 transition-colors"
          >
            <i className="fas fa-chevron-right"></i>
          </button>
        </div>
      )}
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {  PENDING: "bg-yellow-100 text-yellow-700",
  PREPARING: "bg-blue-100 text-blue-700",
  READY: "bg-green-100 text-green-700",
  COMPLETED: "bg-gray-100 text-gray-700",
  CANCELLED: "bg-red-100 text-red-700",
  REJECTED: "bg-red-100 text-red-700",
  REFUND_REQUESTED: "bg-orange-100 text-orange-700",
  REFUNDED: "bg-purple-100 text-purple-700",
};

export default function CashierOrdersPage() {
  const queryClient = useQueryClient();
  const { lang: currentLang } = useLanguage();
  const [filter, setFilter] = useState<string>("");
  const [search, setSearch] = useState<string>("");

  const { data: orders, isLoading } = useQuery<Order[]>({
    queryKey: ["cashier-orders"],
    queryFn: async () => {
      const res = await api.get("/orders/cashier/");
      return res.data.results || res.data;
    },
    refetchInterval: 3000,
  });

  const { data: notifications } = useQuery<OrderNotification[]>({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await api.get("/orders/notifications/");
      return res.data.results || res.data;
    },
    refetchInterval: 3000,
  });

  const markRead = useMutation({
    mutationFn: async (id: number) => {
      const res = await api.post(`/orders/notifications/${id}/read/`);
      return res.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      await api.post("/orders/notifications/read-all/");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const unreadNotifications = notifications?.filter((n) => !n.is_read) ?? [];

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api.patch(`/orders/cashier/${id}/`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cashier-orders"] }),
  });

  const notifyPickup = useMutation({
    mutationFn: (id: number) => api.post(`/orders/cashier/${id}/notify-pickup/`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cashier-orders"] }),
  });

  const [refundTarget, setRefundTarget] = useState<Order | null>(null);
  const refundOrder = useMutation({
    mutationFn: (id: number) => api.post(`/orders/cashier/${id}/refund/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cashier-orders"] });
      setRefundTarget(null);
    },
  });

  const completeRefund = useMutation({
    mutationFn: (id: number) => api.post(`/orders/cashier/${id}/refund-complete/`),
    onMutate: async (id: number) => {
      await queryClient.cancelQueries({ queryKey: ["cashier-orders"] });
      const previous = queryClient.getQueryData<Order[]>(["cashier-orders"]);
      queryClient.setQueryData<Order[]>(["cashier-orders"], (old) =>
        old
          ? old.map((o) =>
              o.id === id
                ? { ...o, status: "REFUNDED" as const }
                : o
            )
          : old
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["cashier-orders"], context.previous);
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["cashier-orders"] }),
  });

  const { data: paymentSystems } = usePaymentSystems();
  const refundOptions = (paymentSystems || []).map((ps) => ({ code: ps.code, name: ps.name }));

  if (isLoading) return <Loading />;

  const searchQuery = search.trim().toLowerCase();
  const filtered = (orders || []).filter((o) => {
    if (filter === "ONLINE" && !o.customer) return false;
    if (filter === "WALKIN" && o.customer) return false;
    if (filter && filter !== "ONLINE" && filter !== "WALKIN" && o.status !== filter) return false;
    if (!searchQuery) return true;
    return (
      o.order_number.toLowerCase().includes(searchQuery) ||
      o.status.toLowerCase().includes(searchQuery) ||
      String(o.total).includes(searchQuery) ||
      (o.items || []).some((i) => i.product_name.toLowerCase().includes(searchQuery))
    );
  });

  return (
    <div className="flex gap-6 h-[calc(100vh-4rem)]">
      <div className="flex-1 overflow-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <Link href="/cashier/new-order">
            <Button>+ New Order</Button>
          </Link>
        </div>

        <div className="relative mb-4">
          <i className="fas fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by order number, product, status or amount..."
            className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-400 transition"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
              aria-label="Clear search"
            >
              <i className="fas fa-times-circle text-sm"></i>
            </button>
          )}
        </div>

        <div className="flex gap-2 mb-6 overflow-x-auto">
          {[
            { value: "", label: "All" },
            { value: "PENDING", label: "PENDING" },
            { value: "PREPARING", label: "PREPARING" },
            { value: "READY", label: "READY" },
            { value: "COMPLETED", label: "COMPLETED" },
            { value: "REFUND_REQUESTED", label: "REFUND_REQUESTED" },
            { value: "REFUNDED", label: "REFUNDED" },
            { value: "REJECTED", label: "REJECTED" },
            { value: "ONLINE", label: "🌐 Online" },
            { value: "WALKIN", label: "🏪 Walk-in" },
          ].map((item) => (
            <button
              key={item.value}
              onClick={() => setFilter(item.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap cursor-pointer ${
                filter === item.value
                  ? "bg-orange-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <EmptyState message="No orders found" />
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 divide-y">
            {filtered.map((order) => (
              <div key={order.id} className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-medium">{order.order_number}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(order.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${order.cashier ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"}`}>
                      {order.customer ? "Online" : "Walk-in"}
                    </span>
                    {order.payment_proof && order.status === "PENDING" && (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                        <i className="fas fa-paperclip mr-1"></i>Proof
                        {order.proof_attempts > 0 && ` ${order.proof_attempts}/3`}
                      </span>
                    )}
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[order.status]}`}>
                      {order.status}
                    </span>
                    {order.has_unavailable_items && !["REFUNDED", "CANCELLED", "REJECTED"].includes(order.status) && (
                      <span
                        className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700"
                        title="This order contains items that are now frozen or outside their availability window"
                      >
                        <i className="fas fa-triangle-exclamation mr-1"></i>Unavailable item
                      </span>
                    )}
                    {(order.status === "PREPARING" || order.status === "READY" || order.status === "COMPLETED") && (
                      <span className="text-xs text-green-600 font-medium">Paid</span>
                    )}
                    <span className="font-bold">ETB {Number(order.total).toFixed(2)}</span>
                  </div>
                </div>

                {order.items && order.items.length > 0 && (
                  <div className="text-sm text-gray-500 mb-3">
                    {order.items.map((item) => (
                      <span key={item.id} className="mr-3">
                        {item.quantity}x {item.product_name}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  {order.status === "PENDING" && order.customer && order.payment_proof && (
                    <Link href={`/cashier/payment/${order.id}`}>
                      <Button size="sm">Verify Payment</Button>
                    </Link>
                  )}
                  {order.status === "PENDING" && !order.customer && (
                    <Link href={`/cashier/payment/${order.id}`}>
                      <Button size="sm">Process Payment</Button>
                    </Link>
                  )}
                  {order.status === "PREPARING" && (
                    <Button size="sm" onClick={() => updateStatus.mutate({ id: order.id, status: "READY" })}>
                      Mark Ready
                    </Button>
                  )}
                  {order.status === "READY" && (
                    <Button size="sm" onClick={() => notifyPickup.mutate(order.id)} disabled={notifyPickup.isPending}>
                      {notifyPickup.isPending ? "Notifying..." : "Notify Pickup Ready"}
                    </Button>
                  )}
                  {["PREPARING", "READY"].includes(order.status) && order.customer && (
                    <Button size="sm" variant="secondary" onClick={() => setRefundTarget(order)} disabled={refundOrder.isPending || order.status === "READY"}>
                      Refund
                    </Button>
                  )}
                  {order.status === "REFUND_REQUESTED" && order.refund_method && (
                    <>
                      <Button size="sm" onClick={() => completeRefund.mutate(order.id)} disabled={completeRefund.isPending}>
                        {completeRefund.isPending ? "Completing..." : "Complete Refund"}
                      </Button>
                      {completeRefund.isError && completeRefund.variables === order.id && (
                        <span className="text-xs text-red-600 self-center">
                          {(completeRefund.error as { response?: { data?: { error?: string } } })?.response?.data?.error || "Failed to complete refund. Try again."}
                        </span>
                      )}
                    </>
                  )}
                  {order.status === "REJECTED" && (
                    <div className="mt-1 flex gap-3 p-4 bg-red-50/80 border border-red-200 rounded-xl">
                      <span className="w-9 h-9 rounded-full bg-white border border-red-100 shadow-sm flex items-center justify-center shrink-0">
                        <i className="fas fa-triangle-exclamation text-red-500"></i>
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-sm text-red-700">Payment Rejected</p>
                          <span className="text-[11px] font-medium text-red-400">
                            · Proof attempt {Math.max(order.proof_attempts, 1)}/3
                          </span>
                        </div>

                        <RejectionReasonSlider order={order} />

                        {order.proof_history && order.proof_history.length > 0 && (
                          <div className="mt-3">
                            <p className="text-[11px] font-medium text-gray-400 mb-1.5">
                              Payment proofs ({order.proof_history.length})
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {order.proof_history.map((p) => (
                                <div key={p.id} className="group relative">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={p.image}
                                    alt={`Proof attempt ${p.attempt + 1}`}
                                    className="h-20 w-20 object-cover rounded-lg border border-gray-200 cursor-pointer transition-all hover:scale-[1.04] hover:border-orange-300 group-hover:shadow-sm"
                                    onClick={() => window.open(p.image, "_blank")}
                                  />
                                  <span className="absolute -top-1.5 -left-1.5 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow">
                                    {p.attempt + 1}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {order.status === "REFUND_REQUESTED" && (
                    <div className="mt-1 p-3 bg-orange-50 rounded-lg border border-orange-200">
                      {order.refund_method ? (
                        <>
                          <p className="text-xs font-semibold text-orange-700 mb-0.5">
                            <i className="fas fa-circle-info mr-1"></i>Refund details received
                          </p>
                          <p className="text-sm text-orange-600">
                            Customer wants ETB {Number(order.total).toFixed(2)} via{" "}
                            {refundOptions.find((o) => o.code === order.refund_method)?.name || order.refund_method}
                            {order.refund_account ? ` — ${order.refund_account}` : ""}
                          </p>
                        </>
                      ) : (
                        <p className="text-sm text-orange-600">
                          <i className="fas fa-hourglass-half mr-1"></i>
                          Waiting for the customer to provide their refund payment type and account number.
                        </p>
                      )}
                    </div>
                  )}
                  {order.status === "REFUNDED" && (
                    <div className="mt-1 p-3 bg-purple-50 rounded-lg border border-purple-200">
                      <p className="text-xs font-semibold text-purple-700 mb-0.5">
                        <i className="fas fa-rotate-left mr-1"></i>Refunded — ETB {Number(order.total).toFixed(2)}
                      </p>
                      {order.refund_method && (
                        <p className="text-sm text-purple-600">
                          Sent via {refundOptions.find((o) => o.code === order.refund_method)?.name || order.refund_method}
                          {order.refund_account ? ` to ${order.refund_account}` : ""}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="w-80 shrink-0 bg-white border border-gray-200 rounded-xl flex flex-col">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-medium text-gray-900 flex items-center gap-2">
            <i className="far fa-bell text-orange-500"></i> Notifications
            {unreadNotifications.length > 0 && (
              <span className="bg-red-600 text-white text-[10px] font-black min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1">
                {unreadNotifications.length > 9 ? "9+" : unreadNotifications.length}
              </span>
            )}
          </h2>
          {unreadNotifications.length > 0 && (
            <button
              onClick={() => markAllRead.mutate()}
              className="text-xs font-semibold text-orange-500 hover:text-orange-600 cursor-pointer"
            >
              Mark all read
            </button>
          )}
        </div>

        <div className="flex-1 overflow-auto">
          {(notifications ?? []).length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No notifications</p>
          ) : (
            (notifications ?? []).slice(0, 30).map((n) => (
              <div
                key={n.id}
                className={`px-4 py-3 border-b border-gray-100 last:border-b-0 ${
                  n.is_read ? "" : "bg-orange-50/40"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  {!n.is_read && (
                    <span className="mt-1.5 w-2 h-2 rounded-full bg-orange-500 shrink-0"></span>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700 leading-snug">{currentLang === "am" && n.message_amharic ? n.message_amharic : n.message}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(n.created_at).toLocaleString()}
                    </p>
                  </div>
                  {!n.is_read && (
                    <button
                      onClick={() => markRead.mutate(n.id)}
                      className="text-xs font-semibold text-orange-500 hover:text-orange-600 hover:underline shrink-0 cursor-pointer"
                    >
                      Dismiss
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {refundTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="font-bold text-lg text-gray-900 mb-2">Request refund details?</h3>
            <p className="text-sm text-gray-600 mb-4">
              The customer will be asked to provide their preferred payment type and account number
              to receive ETB {Number(refundTarget.total).toFixed(2)}. Once they respond, you can complete the refund here.
            </p>
            {refundOrder.isError && (
              <p className="text-sm text-red-600 mb-3">
                {(refundOrder.error as { response?: { data?: { error?: string } } })?.response?.data?.error || "Failed to request refund."}
              </p>
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" size="sm" onClick={() => setRefundTarget(null)} disabled={refundOrder.isPending}>
                Cancel
              </Button>
              <Button variant="danger" size="sm" loading={refundOrder.isPending} onClick={() => refundOrder.mutate(refundTarget.id)}>
                Ask Customer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
