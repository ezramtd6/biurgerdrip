"use client";

import { useReports } from "@/hooks/useOrders";
import { Loading } from "@/components/common/Loading";

export default function DashboardPage() {
  const { data: stats, isLoading } = useReports();

  if (isLoading) return <Loading />;

  const cards = [
    { label: "Total Orders", value: stats?.total_orders ?? 0, icon: "📦" },
    { label: "Revenue", value: `ETB ${(stats?.total_revenue ?? 0).toFixed(2)}`, icon: "💰" },
    { label: "Today's Orders", value: stats?.today_orders_count ?? 0, icon: "📊" },
    { label: "Today's Revenue", value: `ETB ${(stats?.today_revenue ?? 0).toFixed(2)}`, icon: "💵" },
    { label: "Products", value: stats?.total_products ?? 0, icon: "🍔" },
    { label: "Categories", value: stats?.total_categories ?? 0, icon: "📁" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card) => (
          <div key={card.label} className="bg-white rounded-xl border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-2xl">{card.icon}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{card.value}</p>
            <p className="text-sm text-gray-500 mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      {stats?.orders_by_status && Object.keys(stats.orders_by_status).length > 0 && (
        <div className="mt-8 bg-white rounded-xl border border-gray-100 p-6">
          <h2 className="font-medium text-gray-900 mb-4">Orders by Status</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Object.entries(stats.orders_by_status).map(([status, count]) => (
              <div key={status} className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-lg font-bold text-gray-900">{count as number}</p>
                <p className="text-xs text-gray-500">{status}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
