"use client";

import { useReports } from "@/hooks/useOrders";
import { Loading } from "@/components/common/Loading";

export default function ReportsPage() {
  const { data: report, isLoading } = useReports();

  if (isLoading) return <Loading />;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Reports</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <p className="text-sm text-gray-500">Total Orders</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{report?.total_orders ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <p className="text-sm text-gray-500">Total Revenue</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">${(report?.total_revenue ?? 0).toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <p className="text-sm text-gray-500">Today's Orders</p>
          <p className="text-3xl font-bold text-orange-600 mt-1">{report?.today_orders_count ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <p className="text-sm text-gray-500">Today's Revenue</p>
          <p className="text-3xl font-bold text-orange-600 mt-1">${(report?.today_revenue ?? 0).toFixed(2)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <p className="text-sm text-gray-500">Total Categories</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{report?.total_categories ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <p className="text-sm text-gray-500">Total Products</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{report?.total_products ?? 0}</p>
        </div>
      </div>

      {report?.orders_by_status && Object.keys(report.orders_by_status).length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-6 mb-8">
          <h2 className="font-medium text-gray-900 mb-4">Orders by Status</h2>
          <div className="space-y-2">
            {Object.entries(report.orders_by_status).map(([status, count]) => (
              <div key={status} className="flex justify-between text-sm">
                <span className="text-gray-600">{status}</span>
                <span className="font-medium">{count as number}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {report?.recent_orders && report.recent_orders.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h2 className="font-medium text-gray-900 mb-4">Recent Orders</h2>
          <div className="space-y-3">
            {report.recent_orders.map((order) => (
              <div key={order.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium">{order.order_number}</p>
                  <p className="text-xs text-gray-400">{new Date(order.created_at).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">${Number(order.total).toFixed(2)}</p>
                  <p className="text-xs text-gray-400">{order.status}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
