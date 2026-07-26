"use client";

import { useOrders } from "@/hooks/useOrders";
import { Loading } from "@/components/common/Loading";
import EmptyState from "@/components/common/EmptyState";

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  PREPARING: "bg-blue-100 text-blue-700",
  READY: "bg-green-100 text-green-700",
  COMPLETED: "bg-gray-100 text-gray-700",
  CANCELLED: "bg-red-100 text-red-700",
};

export default function OrdersPage() {
  const { data: orders, isLoading } = useOrders();

  if (isLoading) return <Loading />;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Orders</h1>

      {!orders || orders.length === 0 ? (
        <EmptyState message="You haven't placed any orders yet" />
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-medium text-gray-900">{order.order_number}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(order.created_at).toLocaleString()}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[order.status]}`}
                >
                  {order.status}
                </span>
              </div>

              {order.items && order.items.length > 0 && (
                <div className="border-t pt-3 space-y-2">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-gray-600">
                        {item.quantity}x Product #{item.product}
                      </span>
                      <span className="text-gray-900">${Number(item.total_price).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="border-t mt-3 pt-3 flex justify-between">
                <span className="text-sm font-medium text-gray-900">Total</span>
                <span className="font-bold text-gray-900">${Number(order.total).toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
