"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/services/api";
import { Order } from "@/types";
import Link from "next/link";
import { Button } from "@/components/ui";

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  PREPARING: "bg-blue-100 text-blue-700",
  READY: "bg-green-100 text-green-700",
  COMPLETED: "bg-gray-100 text-gray-700",
  CANCELLED: "bg-red-100 text-red-700",
};

export default function CashierDashboardPage() {
  const { data: orders } = useQuery<Order[]>({
    queryKey: ["cashier-orders"],
    queryFn: async () => {
      const res = await api.get("/orders/cashier/");
      return res.data.results || res.data;
    },
  });

  const todayOrders = orders || [];
  const pendingCount = todayOrders.filter((o) => o.status === "PENDING").length;
  const preparingCount = todayOrders.filter((o) => o.status === "PREPARING").length;
  const readyCount = todayOrders.filter((o) => o.status === "READY").length;
  const todayRevenue = todayOrders
    .filter((o) => o.status === "COMPLETED")
    .reduce((sum, o) => sum + Number(o.total), 0);

  const stats = [
    { label: "Pending", value: pendingCount, color: "bg-yellow-500" },
    { label: "Preparing", value: preparingCount, color: "bg-blue-500" },
    { label: "Ready", value: readyCount, color: "bg-green-500" },
    { label: "Today's Revenue", value: `ETB ${todayRevenue.toFixed(2)}`, color: "bg-orange-500" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Cashier Dashboard</h1>
        <Link href="/cashier/new-order">
          <Button>+ New Order</Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-100 p-5">
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      {todayOrders.length > 0 && (
        <div>
          <h2 className="font-medium text-gray-900 mb-3">Recent Orders</h2>
          <div className="bg-white rounded-xl border border-gray-100 divide-y">
            {todayOrders.slice(0, 5).map((order) => (
              <Link
                key={order.id}
                href={`/cashier/payment/${order.id}`}
                className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              >
                <div>
                  <p className="font-medium text-sm">{order.order_number}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(order.created_at).toLocaleTimeString()}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[order.status]}`}>
                    {order.status}
                  </span>
                  <span className="font-medium text-sm">ETB {Number(order.total).toFixed(2)}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
