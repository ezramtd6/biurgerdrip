"use client";

import { useState, useMemo } from "react";
import { useTodayOrders } from "@/hooks/useOrders";
import { usePaymentSystems } from "@/hooks/usePaymentSystems";
import { Loading } from "@/components/common/Loading";
import AppModal from "@/components/ui/AppModal";
import type { Order, ProofAttempt } from "@/types";

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

export default function DashboardPage() {
  const { data: orders, isLoading } = useTodayOrders();
  const { data: paymentSystems } = usePaymentSystems();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [fromTime, setFromTime] = useState("");
  const [toTime, setToTime] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const PAGE_SIZE = 10;

  const todayOrders = orders || [];

  const statusCounts = useMemo(() => {
    return todayOrders.reduce((acc, o) => {
      acc[o.status] = (acc[o.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [todayOrders]);

  const pendingCount = statusCounts.PENDING || 0;
  const preparingCount = statusCounts.PREPARING || 0;
  const readyCount = statusCounts.READY || 0;
  const todayRevenue = todayOrders
    .filter((o) => o.status === "COMPLETED")
    .reduce((sum, o) => sum + Number(o.total), 0);

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

  const visibleStatuses = Object.entries(statusCounts).filter(([status]) => status !== "PENDING");
  const totalOrdersCount = todayOrders.length;

  if (isLoading) return <Loading />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
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
      {visibleStatuses.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-gray-900">Orders by Status</h2>
            <span className="text-xs text-gray-400">{totalOrdersCount} total</span>
          </div>
          <div className="space-y-3">
            {visibleStatuses.map(([status, count]) => {
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
      {todayOrders.length > 0 && (
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="font-bold text-gray-900">Recent Orders</h2>
            <div className="flex flex-wrap items-center gap-3">
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
                    <th className="text-left px-5 py-3 font-semibold text-gray-500">Cashier</th>
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
                          onClick={() => setSelectedOrder(order)}
                          className="hover:bg-gray-50 transition-colors cursor-pointer"
                        >
                          <td className="px-5 py-3 font-semibold text-gray-900">#{order.order_number}</td>
                          <td className="px-5 py-3 text-gray-500">{new Date(order.created_at).toLocaleString()}</td>
                          <td className="px-5 py-3 font-medium text-gray-800">
                            {order.cashier_details
                              ? `${order.cashier_details.first_name} ${order.cashier_details.last_name}`
                              : "—"}
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

      <AppModal
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        title="Order Details"
        maxWidth="2xl"
      >
        {selectedOrder && (
          <div>
            {(() => {
              const cfg = STATUS_CONFIG[selectedOrder.status] || { color: "bg-gray-100 text-gray-600 border-gray-200", bar: "bg-gray-400", icon: "📋" };
              const customer = selectedOrder.customer_details;
              const cashier = selectedOrder.cashier_details;
              const paymentName = (paymentSystems || []).find((s) => s.code === selectedOrder.payment_method)?.name || selectedOrder.payment_method || "—";
              const refundName = (paymentSystems || []).find((s) => s.code === selectedOrder.refund_method)?.name || selectedOrder.refund_method || "—";

              return (
                <div className="space-y-5">
                  <div className="flex items-center justify-between rounded-xl px-5 py-4 bg-gray-900 text-white">
                    <div>
                      <p className="text-lg font-bold">#{selectedOrder.order_number}</p>
                      <p className="text-sm text-gray-400 flex items-center gap-1.5 mt-0.5">
                        <i className="fas fa-calendar-alt text-xs"></i>
                        {new Date(selectedOrder.created_at).toLocaleString()}
                      </p>
                    </div>
                    <span className={`text-[11px] font-semibold px-3 py-1.5 rounded-full border ${cfg.color}`}>
                      {cfg.icon} {selectedOrder.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <div className="space-y-4">
                      {customer ? (
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                          <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                            <i className="fas fa-user text-[11px]"></i> Customer
                          </p>
                          <p className="font-bold text-gray-900">
                            {customer.first_name} {customer.last_name}
                          </p>
                          <p className="text-sm text-blue-700">
                            <i className="fas fa-phone mr-1"></i> {customer.phone || "—"}
                          </p>
                          {customer.email && (
                            <p className="text-sm text-blue-700">
                              <i className="fas fa-envelope mr-1"></i> {customer.email}
                            </p>
                          )}
                          <span className="inline-block mt-2 text-[11px] font-semibold px-2.5 py-1 rounded-full border bg-blue-100 text-blue-700 border-blue-200">
                            🌐 Online
                          </span>
                        </div>
                      ) : (
                        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-center gap-2">
                          <span className="text-xl">🏪</span>
                          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full border bg-orange-100 text-orange-700 border-orange-200">
                            Walk-in customer
                          </span>
                        </div>
                      )}

                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-gray-50 rounded-xl p-3">
                          <p className="text-xs text-gray-400">Cashier</p>
                          <p className="text-sm font-semibold text-gray-800 mt-0.5">
                            {cashier ? `${cashier.first_name} ${cashier.last_name}` : "—"}
                          </p>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-3">
                          <p className="text-xs text-gray-400">Payment Method</p>
                          <p className="text-sm font-semibold text-gray-800 mt-0.5">{paymentName}</p>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-3">
                          <p className="text-xs text-gray-400">Type</p>
                          <p className="text-sm font-semibold text-gray-800 mt-0.5">{customer ? "Online" : "Walk-in"}</p>
                        </div>
                      </div>

                      {customer &&
                        (selectedOrder.status === "COMPLETED" ||
                          selectedOrder.status === "PREPARING" ||
                          selectedOrder.status === "READY") &&
                        selectedOrder.payment_proof && (
                          <div className="p-3 bg-green-50 rounded-xl border border-green-200">
                            <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-2">Accepted Payment Proof</p>
                            <p className="text-xs text-gray-500 mb-2">
                              The payment proof attached by the customer was accepted for this order.
                            </p>
                            <>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={selectedOrder.payment_proof}
                                alt="Accepted payment proof"
                                className="w-full max-h-40 object-contain rounded border border-green-200 bg-white cursor-pointer hover:scale-[1.02] transition-transform"
                                onClick={() => window.open(selectedOrder.payment_proof!, "_blank")}
                              />
                            </>
                          </div>
                        )}

                      {selectedOrder.status === "REJECTED" && (
                        <div className="p-3 bg-red-50 rounded-xl border border-red-200">
                          <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-2">Rejection Information</p>
                          <div className="space-y-3">
                            {(
                              (selectedOrder.proof_history && selectedOrder.proof_history.length > 0
                                ? selectedOrder.proof_history
                                : [
                                    {
                                      id: 0,
                                      image: selectedOrder.payment_proof,
                                      attempt: selectedOrder.proof_attempts,
                                      rejection_reason: selectedOrder.rejection_reason,
                                      created_at: selectedOrder.updated_at,
                                    } as ProofAttempt,
                                  ].filter((p) => p.image || p.rejection_reason))
                            ).map((attempt) => (
                              <div key={attempt.id} className="flex items-start gap-3">
                                {attempt.image && (
                                  <>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={attempt.image}
                                      alt="Payment proof"
                                      className="h-16 w-16 object-cover rounded border border-gray-200 cursor-pointer hover:scale-105 transition-transform shrink-0"
                                      onClick={() => window.open(attempt.image!, "_blank")}
                                    />
                                  </>
                                )}
                                <div>
                                  {attempt.rejection_reason && (
                                    <p className="text-xs text-red-600">
                                      <span className="font-semibold">Reason:</span> {attempt.rejection_reason}
                                    </p>
                                  )}
                                  <p className="text-xs text-gray-500 mt-0.5">
                                    {attempt.attempt > 0 ? `Attempt ${attempt.attempt}` : "Proof"}
                                    {attempt.created_at ? ` — ${new Date(attempt.created_at).toLocaleString()}` : ""}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {(selectedOrder.status === "REFUNDED" || selectedOrder.status === "REFUND_REQUESTED") && (
                        <div className="p-3 bg-purple-50 rounded-xl border border-purple-200">
                          <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-2">
                            Refund Information
                          </p>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-purple-700/70">Refund Method</span>
                              <span className="font-semibold text-purple-900">{refundName}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-purple-700/70">Refund Account</span>
                              <span className="font-semibold text-purple-900">{selectedOrder.refund_account || "—"}</span>
                            </div>
                            <div className="flex justify-between pt-1 border-t border-purple-200">
                              <span className="text-purple-700/70">Refund Amount</span>
                              <span className="font-bold text-purple-900">ETB {Number(selectedOrder.total).toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="lg:border-l lg:border-gray-200 lg:pl-5 space-y-4">
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Items</p>
                        <div className="space-y-2">
                          {selectedOrder.items?.map((item) => (
                            <div key={item.id} className="flex justify-between text-sm bg-gray-50 rounded-lg px-3 py-2">
                              <div>
                                <span className="text-gray-900">
                                  {item.quantity}x {item.product_name}
                                </span>
                                {item.options && item.options.length > 0 && (
                                  <div className="text-xs text-gray-400">
                                    {item.options.map((o) => (
                                      <span key={o.id} className="mr-2">
                                        + {o.option_name} (ETB {Number(o.price_adjustment).toFixed(2)})
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <span className="text-gray-900">ETB {Number(item.total_price).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="bg-gray-50 rounded-xl p-4 space-y-1.5">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Subtotal</span>
                          <span>ETB {Number(selectedOrder.subtotal).toFixed(2)}</span>
                        </div>
                        {Number(selectedOrder.discount) > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Discount</span>
                            <span className="text-green-600">-ETB {Number(selectedOrder.discount).toFixed(2)}</span>
                          </div>
                        )}
                        {Number(selectedOrder.tax) > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Tax</span>
                            <span>ETB {Number(selectedOrder.tax).toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-200">
                          <span>Total</span>
                          <span>ETB {Number(selectedOrder.total).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </AppModal>
    </div>
  );
}