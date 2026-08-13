"use client";

import { useState, useEffect } from "react";
import { useOrders, useCreateOrder } from "@/hooks/useOrders";
import { useProducts } from "@/hooks/useProducts";
import { usePaymentSystems } from "@/hooks/usePaymentSystems";
import { Loading } from "@/components/common/Loading";
import EmptyState from "@/components/common/EmptyState";
import HomeNavbar from "@/components/layout/HomeNavbar";

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  PREPARING: "bg-blue-100 text-blue-700",
  READY: "bg-green-100 text-green-700",
  COMPLETED: "bg-gray-100 text-gray-700",
  CANCELLED: "bg-red-100 text-red-700",
};

interface CartItem {
  id: number;
  name: string;
  nameAm: string;
  price: number;
  image: string;
  qty: number;
  optionKey?: string;
  optionNames?: string;
}

export default function OrdersPage() {
  const { data: orders, isLoading } = useOrders();
  const { data: products } = useProducts();
  const { data: paymentSystems } = usePaymentSystems();
  const createOrder = useCreateOrder();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [placed, setPlaced] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [couponError, setCouponError] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("cart");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setCart(parsed);
      }
    } catch {
      // ignore malformed storage
    }
  }, []);

  const cartTotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  const productMap = new Map((products ?? []).map((p) => [p.id, p]));
  const selectedMethod = paymentMethod || paymentSystems?.[0]?.code || "";

  const placeOrder = () => {
    if (cart.length === 0) return;
    const items = cart.map((i) => ({
      product: i.id,
      quantity: i.qty,
      option_values: i.optionKey ? i.optionKey.split("-").map(Number) : [],
    }));
    createOrder.mutate(
      { discount: 0, tax: 0, payment_method: selectedMethod, coupon_code: couponCode.trim() || undefined, items },
      {
        onSuccess: () => {
          localStorage.setItem("cart", JSON.stringify([]));
          setCart([]);
          setPlaced(true);
          setCouponError("");
          window.dispatchEvent(new Event("cart-updated"));
        },
        onError: (err) => {
          const data = (err as { response?: { data?: Record<string, unknown> } })?.response?.data;
          const msg = data?.coupon_code;
          setCouponError(typeof msg === "string" ? msg : Array.isArray(msg) ? String(msg[0]) : "");
        },
      }
    );
  };

  if (isLoading) {
    return (
      <>
        <HomeNavbar />
        <Loading />
      </>
    );
  }

  return (
    <>
      <HomeNavbar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        {placed && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-xl text-green-700 dark:text-green-400 text-sm font-semibold">
            Your order has been placed successfully!
          </div>
        )}

        {cart.length > 0 && (
          <div className="mb-10">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Your Cart</h2>
            <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-100">
              {cart.map((item, index) => (
                <div key={`${item.id}-${item.optionKey || index}`} className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3 min-w-0">
                    {item.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.image} alt={item.name} className="w-12 h-12 rounded-lg object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                        <i className="fas fa-utensils text-gray-300"></i>
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{item.name}</p>
                      {item.optionNames && (
                        <p className="text-xs text-gray-500 truncate">{item.optionNames}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-500">{item.qty}x</span>
                    <span className="font-bold text-gray-900 w-20 text-right">
                      ETB {Number(item.price * item.qty).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-b-xl">
                <span className="text-sm font-semibold text-gray-700">Total</span>
                <span className="text-lg font-black text-gray-900">ETB {cartTotal.toFixed(2)}</span>
              </div>
            </div>
            <input
              value={couponCode}
              onChange={(e) => {
                setCouponCode(e.target.value);
                setCouponError("");
              }}
              placeholder="Coupon code (optional)"
              className="mt-4 w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
            {couponError && (
              <p className="mt-2 text-sm text-red-600">{couponError}</p>
            )}
            {paymentSystems && paymentSystems.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-semibold text-gray-700 mb-2">Payment Method</p>
                <div className="grid grid-cols-3 gap-2">
                  {paymentSystems.map((method) => (
                    <button
                      key={method.code}
                      type="button"
                      onClick={() => setPaymentMethod(method.code)}
                      className={`p-3 rounded-xl border-2 text-center transition-colors cursor-pointer ${
                        selectedMethod === method.code
                          ? "border-red-500 bg-red-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      {method.icon ? (
                        <img src={method.icon} alt={method.name} className="w-8 h-8 object-contain mx-auto mb-1" />
                      ) : (
                        <span className="text-xl block mb-1">💳</span>
                      )}
                      <span className="text-xs font-medium">{method.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <button
              onClick={placeOrder}
              disabled={createOrder.isPending}
              className="mt-4 w-full bg-red-600 text-white py-4 rounded-2xl font-black text-lg hover:bg-red-700 transition-all duration-300 shadow-lg hover:shadow-red-600/30 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {createOrder.isPending ? (
                "Placing Order..."
              ) : (
                <>
                  Place Order <i className="fas fa-arrow-right"></i>
                </>
              )}
            </button>
          </div>
        )}

        <h1 className="text-2xl font-bold text-gray-900 mb-6">My Orders</h1>

        {!orders || orders.length === 0 ? (
          <EmptyState message={cart.length === 0 ? "You haven't placed any orders yet" : "Your cart items will appear here once you place the order"} />
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
                    {order.items.map((item) => {
                      const product = productMap.get(item.product);
                      return (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span className="text-gray-600">
                            {item.quantity}x {product?.name || `Product #${item.product}`}
                            {item.options && item.options.length > 0 && (
                              <span className="text-gray-400">
                                {" "}(+{item.options.length} option{item.options.length > 1 ? "s" : ""})
                              </span>
                            )}
                          </span>
                          <span className="text-gray-900">ETB {Number(item.total_price).toFixed(2)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="border-t mt-3 pt-3 flex justify-between">
                  <span className="text-sm font-medium text-gray-900">Total</span>
                  <span className="font-bold text-gray-900">ETB {Number(order.total).toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
