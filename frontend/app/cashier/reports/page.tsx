"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCashierReports } from "@/hooks/useOrders";
import { usePaymentSystems } from "@/hooks/usePaymentSystems";
import { Loading } from "@/components/common/Loading";
import { Button } from "@/components/ui";

const STATUS_CONFIG: Record<string, { color: string; bar: string; icon: string }> = {
  PENDING: { color: "bg-yellow-100 text-yellow-700 border-yellow-200", bar: "bg-yellow-400", icon: "⏳" },
  PREPARING: { color: "bg-blue-100 text-blue-700 border-yellow-200", bar: "bg-blue-400", icon: "🔥" },
  READY: { color: "bg-green-100 text-green-700 border-green-200", bar: "bg-green-400", icon: "✅" },
  COMPLETED: { color: "bg-gray-100 text-gray-700 border-gray-200", bar: "bg-gray-400", icon: "📦" },
  REJECTED: { color: "bg-red-100 text-red-700 border-red-200", bar: "bg-red-400", icon: "🚫" },
  REFUNDED: { color: "bg-purple-100 text-purple-700 border-purple-200", bar: "bg-purple-400", icon: "💸" },
  CANCELLED: { color: "bg-red-100 text-red-700 border-red-200", bar: "bg-red-400", icon: "❌" },
  REFUND_REQUESTED: { color: "bg-orange-100 text-orange-700 border-orange-200", bar: "bg-orange-400", icon: "🔄" },
};

export default function CashierReportsPage() {
  const { data: report, isLoading } = useCashierReports();
  const { data: paymentSystems } = usePaymentSystems();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [fromTime, setFromTime] = useState("");
  const [toTime, setToTime] = useState("");
  const PAGE_SIZE = 10;
  const router = useRouter();

  const recentOrders = report?.recent_orders || [];

  const dtFilteredOrders = useMemo(() => {
    const hasFilter = fromDate || toDate || fromTime || toTime;
    if (!hasFilter) return recentOrders;

    const fromSec = fromTime
      ? (() => { const [h, m] = fromTime.split(":").map(Number); return h * 3600 + m * 60; })()
      : 0;
    const toSec = toTime
      ? (() => { const [h, m] = toTime.split(":").map(Number); return h * 3600 + m * 60; })()
      : 86399;
    const fromDateNum = fromDate ? new Date(fromDate + "T00:00:00").getTime() : null;
    const toDateNum = toDate ? new Date(toDate + "T23:59:59").getTime() : null;

    return recentOrders.filter((o) => {
      const d = new Date(o.created_at);
      const dNum = d.getTime();
      if (fromDateNum !== null && dNum < fromDateNum) return false;
      if (toDateNum !== null && dNum > toDateNum) return false;
      if (fromTime || toTime) {
        const sec = d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
        if (fromTime && sec < fromSec) return false;
        if (toTime && sec > toSec) return false;
      }
      return true;
    });
  }, [recentOrders, fromDate, toDate, fromTime, toTime]);

  const filteredOrders = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return dtFilteredOrders;
    return dtFilteredOrders.filter(
      (o) =>
        o.order_number.toLowerCase().includes(q) ||
        o.status.toLowerCase().includes(q) ||
        Number(o.total).toFixed(2).includes(q)
    );
  }, [dtFilteredOrders, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedOrders = filteredOrders.slice((safeCurrentPage - 1) * PAGE_SIZE, safeCurrentPage * PAGE_SIZE);
  const totalOrdersCount = Object.values(report?.orders_by_status || {}).reduce((a, b) => a + b, 0) || report?.total_orders || 0;

  if (isLoading) return <Loading />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Cashier Reports</h1>
        <Link href="/cashier/new-order">
          <Button>+ New Order</Button>
        </Link>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-5 text-white shadow-lg shadow-blue-200">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <i className="fas fa-shopping-bag text-lg"></i>
            </div>
            <span className="text-xs font-medium bg-white/20 px-2 py-1 rounded-full">All Time</span>
          </div>
          <p className="text-3xl font-black">{report?.total_orders ?? 0}</p>
          <p className="text-sm text-blue-100 mt-1">Total Orders</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-5 text-white shadow-lg shadow-green-200">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <i className="fas fa-coins text-lg"></i>
            </div>
            <span className="text-xs font-medium bg-white/20 px-2 py-1 rounded-full">All Time</span>
          </div>
          <p className="text-3xl font-black">ETB {(report?.total_revenue ?? 0).toFixed(0)}</p>
          <p className="text-sm text-green-100 mt-1">Total Revenue</p>
        </div>
        <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-2xl p-5 text-white shadow-lg shadow-yellow-200">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <i className="fas fa-calendar-day text-lg"></i>
            </div>
            <span className="text-xs font-medium bg-white/20 px-2 py-1 rounded-full">Today</span>
          </div>
          <p className="text-3xl font-black">{report?.today_orders_count ?? 0}</p>
          <p className="text-sm text-yellow-100 mt-1">Today&apos;s Orders</p>
        </div>
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-5 text-white shadow-lg shadow-orange-200">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <i className="fas fa-chart-line text-lg"></i>
            </div>
            <span className="text-xs font-medium bg-white/20 px-2 py-1 rounded-full">Today</span>
          </div>
          <p className="text-3xl font-black">ETB {(report?.today_revenue ?? 0).toFixed(0)}</p>
          <p className="text-sm text-orange-100 mt-1">Today&apos;s Revenue</p>
        </div>
      </div>

      {/* Orders by Status with Progress Bars */}
      {report?.orders_by_status && Object.keys(report.orders_by_status).length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-gray-900">Orders by Status</h2>
            <span className="text-xs text-gray-400">{totalOrdersCount} total</span>
          </div>
          <div className="space-y-3">
            {Object.entries(report.orders_by_status).map(([status, count]) => {
              const cfg = STATUS_CONFIG[status] || { color: "bg-gray-100 text-gray-600 border-gray-200", bar: "bg-gray-400", icon: "📋" };
              const countNum = Number(count) || 0;
              const pct = totalOrdersCount > 0 ? (countNum / totalOrdersCount) * 100 : 0;
              return (
                <div key={status}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{cfg.icon}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${cfg.color}`}>{status}</span>
                    </div>
                    <span className="text-sm font-bold text-gray-700">{countNum}</span>
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
      {recentOrders.length > 0 && (
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="font-bold text-gray-900">Recent Orders</h2>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex flex-wrap items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5">
                <i className="fas fa-calendar text-gray-400 text-xs"></i>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => { setFromDate(e.target.value); setCurrentPage(1); }}
                  className="bg-transparent text-xs font-medium text-gray-700 focus:outline-none"
                />
                <span className="text-gray-400 text-xs">to</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => { setToDate(e.target.value); setCurrentPage(1); }}
                  className="bg-transparent text-xs font-medium text-gray-700 focus:outline-none"
                />
                <span className="text-gray-300 mx-1">|</span>
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
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safeCurrentPage === 1}
                  aria-label="Previous page"
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors cursor-pointer"
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
                  aria-label="Next page"
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors cursor-pointer"
                >
                  <i className="fas fa-chevron-right text-xs"></i>
                </button>
              </div>
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
