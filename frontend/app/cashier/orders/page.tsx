"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/services/api";
import { Order } from "@/types";
import { Button } from "@/components/ui";
import { Loading } from "@/components/common/Loading";
import EmptyState from "@/components/common/EmptyState";
import Link from "next/link";

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  PREPARING: "bg-blue-100 text-blue-700",
  READY: "bg-green-100 text-green-700",
  COMPLETED: "bg-gray-100 text-gray-700",
  CANCELLED: "bg-red-100 text-red-700",
};

export default function CashierOrdersPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<string>("");

  const { data: orders, isLoading } = useQuery<Order[]>({
    queryKey: ["cashier-orders"],
    queryFn: async () => {
      const res = await api.get("/orders/cashier/");
      return res.data.results || res.data;
    },
  });

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
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
        <Link href="/cashier/new-order">
          <Button>+ New Order</Button>
        </Link>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto">
        {["", "PENDING", "PREPARING", "READY", "COMPLETED"].map((status) => (
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
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[order.status]}`}>
                    {order.status}
                  </span>
                  <span className="font-bold">${Number(order.total).toFixed(2)}</span>
                </div>
              </div>

              {order.items && order.items.length > 0 && (
                <div className="text-sm text-gray-500 mb-3">
                  {order.items.map((item) => (
                    <span key={item.id} className="mr-3">
                      {item.quantity}x Product #{item.product}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                {order.status === "PENDING" && (
                  <>
                    <Button size="sm" onClick={() => updateStatus.mutate({ id: order.id, status: "PREPARING" })}>
                      Start Preparing
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => updateStatus.mutate({ id: order.id, status: "CANCELLED" })}>
                      Cancel
                    </Button>
                  </>
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
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
