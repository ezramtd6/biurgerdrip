"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/services/api";
import { Order, OrderNotification } from "@/types";
import { Button } from "@/components/ui";
import { Loading } from "@/components/common/Loading";
import EmptyState from "@/components/common/EmptyState";
import Link from "next/link";
import { useLanguage } from "@/hooks/useLanguage";

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  PREPARING: "bg-blue-100 text-blue-700",
  READY: "bg-green-100 text-green-700",
  COMPLETED: "bg-gray-100 text-gray-700",
  CANCELLED: "bg-red-100 text-red-700",
  REJECTED: "bg-red-100 text-red-700",
};

export default function CashierOrdersPage() {
  const queryClient = useQueryClient();
  const { lang: currentLang } = useLanguage();
  const [filter, setFilter] = useState<string>("");

  const { data: orders, isLoading } = useQuery<Order[]>({
    queryKey: ["cashier-orders"],
    queryFn: async () => {
      const res = await api.get("/orders/cashier/");
      return res.data.results || res.data;
    },
    refetchInterval: 10000,
  });

  const { data: notifications } = useQuery<OrderNotification[]>({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await api.get("/orders/notifications/");
      return res.data.results || res.data;
    },
    refetchInterval: 15000,
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

  if (isLoading) return <Loading />;

  const filtered = filter
    ? (orders || []).filter((o) => o.status === filter)
    : orders || [];

  return (
    <div className="flex gap-6 h-[calc(100vh-4rem)]">
      <div className="flex-1 overflow-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <Link href="/cashier/new-order">
            <Button>+ New Order</Button>
          </Link>
        </div>

        <div className="flex gap-2 mb-6 overflow-x-auto">
          {["", "PENDING", "PREPARING", "READY", "COMPLETED", "REJECTED"].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap cursor-pointer ${
                filter === status
                  ? "bg-orange-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {status || "All"}
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
                    {order.payment_proof && order.status !== "COMPLETED" && (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                        <i className="fas fa-paperclip mr-1"></i>Proof
                        {order.proof_attempts > 0 && ` ${order.proof_attempts}/3`}
                      </span>
                    )}
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[order.status]}`}>
                      {order.status}
                    </span>
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
                  {order.status === "PREPARING" && (
                    <Button size="sm" onClick={() => updateStatus.mutate({ id: order.id, status: "READY" })}>
                      Mark Ready
                    </Button>
                  )}
                  {order.status === "READY" && (
                    <Link href={`/cashier/payment/${order.id}`}>
                      <Button size="sm">Process Payment</Button>
                    </Link>
                  )}
                  {order.status === "COMPLETED" && (
                    <span className="text-xs text-green-600">Paid</span>
                  )}
                  {order.status === "REJECTED" && (
                    <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
                      <p className="text-xs font-semibold text-red-700 mb-1">
                        <i className="fas fa-ban mr-1"></i>Payment Rejected
                      </p>
                      {order.rejection_reason && (
                        <p className="text-sm text-red-600 mb-2">
                          Reason: {order.rejection_reason}
                        </p>
                      )}
                      {order.proof_history && order.proof_history.length > 0 && (
                        <div>
                          <p className="text-xs text-gray-500 mb-1">All Payment Proofs:</p>
                          <div className="flex flex-wrap gap-2">
                            {order.proof_history.map((p) => (
                              <div key={p.id} className="relative">
                                <img
                                  src={p.image}
                                  alt={`Proof attempt ${p.attempt}`}
                                  className="h-24 w-24 object-cover rounded-lg border border-gray-200 cursor-pointer hover:scale-105 transition-transform"
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
    </div>
  );
}
