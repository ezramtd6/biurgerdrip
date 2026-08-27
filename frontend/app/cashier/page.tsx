"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import api from "@/services/api";
import { Order } from "@/types";
import Link from "next/link";
import { Button } from "@/components/ui";
import { usePaymentSystems } from "@/hooks/usePaymentSystems";

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  PREPARING: "bg-blue-100 text-blue-700",
  READY: "bg-green-100 text-green-700",
  COMPLETED: "bg-gray-100 text-gray-700",
  REJECTED: "bg-red-100 text-red-700",
};

export default function CashierDashboardPage() {
  const [fromTime, setFromTime] = useState("");
  const [toTime, setToTime] = useState("");
  const { data: orders } = useQuery<Order[]>({
    queryKey: ["cashier-orders"],
    queryFn: async () => {
      const res = await api.get("/orders/cashier/");
      return res.data.results || res.data;
    },
  });

  const { data: paymentSystems } = usePaymentSystems();

  const todayOrders = orders || [];
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;
  const router = useRouter();
  const pendingCount = todayOrders.filter((o) => o.status === "PENDING").length;
  const preparingCount = todayOrders.filter((o) => o.status === "PREPARING").length;
  const readyCount = todayOrders.filter((o) => o.status === "READY").length;
  const completedCount = todayOrders.filter((o) => o.status === "COMPLETED").length;
  const rejectedCount = todayOrders.filter((o) => o.status === "REJECTED").length;
  const refundedCount = todayOrders.filter((o) => o.status === "REFUNDED").length;
  const todayRevenue = todayOrders
    .filter((o) => o.status === "COMPLETED")
    .reduce((sum, o) => sum + Number(o.total), 0);

  const totalOrders = todayOrders.length;

  const timeFilteredOrders = useMemo(() => {
    if (!fromTime && !toTime) return todayOrders;
    const fromSec = fromTime
      ? (() => { const [h, m] = fromTime.split(":").map(Number); return h * 3600 + m * 60; })()
      : 0;
    const toSec = toTime
      ? (() => { const [h, m] = toTime.split(":").map(Number); return h * 3600 + m * 60; })()
      : 86399;
    return todayOrders.filter((o) => {
      const d = new Date(o.created_at);
      const sec = d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
      return sec >= fromSec && sec <= toSec;
    });
  }, [todayOrders, fromTime, toTime]);

  const filteredOrders = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return timeFilteredOrders;
    return timeFilteredOrders.filter(
      (o) =>
        o.order_number.toLowerCase().includes(q) ||
        o.status.toLowerCase().includes(q) ||
        Number(o.total).toFixed(2).includes(q)
    );
  }, [timeFilteredOrders, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedOrders = filteredOrders.slice((safeCurrentPage - 1) * PAGE_SIZE, safeCurrentPage * PAGE_SIZE);

  const STATUS_CONFIG: Record<string, { color: string; bar: string; icon: string }> = {
    COMPLETED: { color: "bg-gray-100 text-gray-700 border-gray-200", bar: "bg-gray-400", icon: "📦" },
    REJECTED: { color: "bg-red-100 text-red-700 border-red-200", bar: "bg-red-400", icon: "🚫" },
    REFUNDED: { color: "bg-purple-100 text-purple-700 border-purple-200", bar: "bg-purple-400", icon: "💸" },
  };

  const statusCounts: Record<string, number> = {
    COMPLETED: completedCount,
    REJECTED: rejectedCount,
    REFUNDED: refundedCount,
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Cashier Dashboard</h1>
        <Link href="/cashier/new-order">
          <Button>+ New Order</Button>
        </Link>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-2xl p-5 text-white shadow-lg shadow-yellow-200">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <i className="fas fa-clock text-lg"></i>
            </div>
            <span className="text-xs font-medium bg-white/20 px-2 py-1 rounded-full">Queue</span>
          </div>
          <p className="text-3xl font-black">{pendingCount}</p>
          <p className="text-sm text-yellow-100 mt-1">Pending</p>
        </div>
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-5 text-white shadow-lg shadow-blue-200">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <i className="fas fa-fire-burner text-lg"></i>
            </div>
            <span className="text-xs font-medium bg-white/20 px-2 py-1 rounded-full">Active</span>
          </div>
          <p className="text-3xl font-black">{preparingCount}</p>
          <p className="text-sm text-blue-100 mt-1">Preparing</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-5 text-white shadow-lg shadow-green-200">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <i className="fas fa-check-circle text-lg"></i>
            </div>
            <span className="text-xs font-medium bg-white/20 px-2 py-1 rounded-full">Ready</span>
          </div>
          <p className="text-3xl font-black">{readyCount}</p>
          <p className="text-sm text-green-100 mt-1">Ready</p>
        </div>
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-5 text-white shadow-lg shadow-orange-200">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <i className="fas fa-coins text-lg"></i>
            </div>
            <span className="text-xs font-medium bg-white/20 px-2 py-1 rounded-full">Today</span>
          </div>
          <p className="text-3xl font-black">ETB {todayRevenue.toFixed(0)}</p>
          <p className="text-sm text-orange-100 mt-1">Revenue</p>
          </div>
      </div>

      {/* Orders by Status with Progress Bars */}
      {totalOrders > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-gray-900">Orders by Status</h2>
            <span className="text-xs text-gray-400">{totalOrders} total</span>
          </div>
          <div className="space-y-3">
            {Object.entries(statusCounts).map(([status, count]) => {
              const cfg = STATUS_CONFIG[status] || { color: "bg-gray-100 text-gray-600 border-gray-200", bar: "bg-gray-400", icon: "📋" };
              const pct = totalOrders > 0 ? (count / totalOrders) * 100 : 0;
              return (
                <div key={status}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{cfg.icon}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${cfg.color}`}>{status}</span>
                    </div>
                    <span className="text-sm font-bold text-gray-700">{count}</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${cfg.bar} transition-all duration-500`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Orders as Table */}
      {todayOrders.length > 0 && (
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="font-bold text-gray-900">Recent Orders</h2>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5">
                <i className="fas fa-clock text-gray-400 text-xs"></i>
                <input
                  type="time"
                  value={fromTime}
                  onChange={(e) => { setFromTime(e.target.value); setCurrentPage(1); }}
                  className="bg-transparent text-xs font-medium text-gray-700 focus:outline-none"
                />
                <span className="text-gray-400 text-xs">to</span>
                <input
                  type="time"
                  value={toTime}
                  onChange={(e) => { setToTime(e.target.value); setCurrentPage(1); }}
                  className="bg-transparent text-xs font-medium text-gray-700 focus:outline-none"
                />
              </div>
              <div className="relative">
                <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
                <input
                  type="text"
                  placeholder="Search orders..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  className="pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all w-56"
                />
              </div>
              {totalPages > 1 && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={safeCurrentPage === 1}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    <i className="fas fa-chevron-left text-xs"></i>
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                        page === safeCurrentPage
                          ? "bg-orange-500 text-white shadow-sm"
                          : "border border-gray-200 hover:bg-gray-50 text-gray-600"
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safeCurrentPage === totalPages}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    <i className="fas fa-chevron-right text-xs"></i>
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left px-5 py-3 font-semibold text-gray-500">Order #</th>
                    <th className="text-left px-5 py-3 font-semibold text-gray-500">Date</th>
                    <th className="text-left px-5 py-3 font-semibold text-gray-500">Type</th>
                    <th className="text-left px-5 py-3 font-semibold text-gray-500">Payment</th>
                    <th className="text-left px-5 py-3 font-semibold text-gray-500">Status</th>
                    <th className="text-right px-5 py-3 font-semibold text-gray-500">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paginatedOrders.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-center text-gray-400 text-sm">
                        No orders found
                      </td>
                    </tr>
                  ) : (
                    paginatedOrders.map((order) => {
                      const cfg = STATUS_CONFIG[order.status] || { color: "bg-gray-100 text-gray-600 border-gray-200", bar: "bg-gray-400", icon: "📋" };
                      return (
                        <tr
                          key={order.id}
                          onClick={() => router.push(`/cashier/payment/${order.id}`)}
                          className="hover:bg-gray-50 transition-colors cursor-pointer"
                        >
                          <td className="px-5 py-3 font-semibold text-gray-900">#{order.order_number}</td>
                          <td className="px-5 py-3 text-gray-500">{new Date(order.created_at).toLocaleString()}</td>
                          <td className="px-5 py-3">
                            <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${order.customer ? "bg-blue-100 text-blue-700 border-blue-200" : "bg-orange-100 text-orange-700 border-orange-200"}`}>
                              {order.customer ? "🌐 Online" : "🏪 Walk-in"}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-sm text-gray-600">
                            {(paymentSystems || []).find((s) => s.code === order.payment_method)?.name || order.payment_method || "—"}
                          </td>
                          <td className="px-5 py-3">
                            <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${cfg.color}`}>
                              {cfg.icon} {order.status}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-right font-bold text-gray-900">ETB {Number(order.total).toFixed(2)}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
