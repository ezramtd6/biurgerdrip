"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/services/api";
import { Product, Category, OptionGroup, OptionValue } from "@/types";
import { Button } from "@/components/ui";
import { useRouter } from "next/navigation";

interface CartItem {
  product: Product;
  quantity: number;
  selectedOptions: Record<number, number[]>;
}

export default function NewOrderPage() {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [couponCode, setCouponCode] = useState("");

  const { data: categories } = useQuery<Category[]>({
    queryKey: ["cashier-categories"],
    queryFn: async () => {
      const res = await api.get("/categories/");
      return res.data.results || res.data;
    },
  });

  const { data: products } = useQuery<Product[]>({
    queryKey: ["cashier-products", selectedCategory],
    queryFn: async () => {
      const url = selectedCategory ? `/products/?category=${selectedCategory}` : "/products/";
      const res = await api.get(url);
      return res.data.results || res.data;
    },
  });

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1, selectedOptions: {} }];
    });
  };

  const updateQuantity = (productId: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.product.id === productId
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const toggleOption = (productId: number, groupId: number, valueId: number, multiple: boolean) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.product.id !== productId) return item;
        const current = item.selectedOptions[groupId] || [];
        let updated: number[];
        if (multiple) {
          updated = current.includes(valueId)
            ? current.filter((id) => id !== valueId)
            : [...current, valueId];
        } else {
          updated = [valueId];
        }
        return { ...item, selectedOptions: { ...item.selectedOptions, [groupId]: updated } };
      })
    );
  };

  const calculateItemTotal = (item: CartItem) => {
    let price = 0;
    if (item.product.option_groups) {
      for (const group of item.product.option_groups) {
        const selected = item.selectedOptions[group.id] || [];
        for (const valueId of selected) {
          const value = group.values?.find((v: OptionValue) => v.id === valueId);
          if (value) price += Number(value.price_adjustment);
        }
      }
    }
    return price * item.quantity;
  };

  const subtotal = cart.reduce((sum, item) => sum + calculateItemTotal(item), 0);

  const handleOrder = async () => {
    if (cart.length === 0) return;

    const items = cart.map((item) => ({
      product: item.product.id,
      quantity: item.quantity,
      option_values: Object.values(item.selectedOptions).flat(),
    }));

    try {
      const res = await api.post("/orders/cashier/", {
        discount: 0,
        tax: 0,
        payment_method: "",
        coupon_code: couponCode.trim() || undefined,
        items,
      });
      router.push(`/cashier/payment/${res.data.id}`);
    } catch {
      alert("Failed to create order. Check that the coupon code is valid.");
    }
  };

  return (
    <div className="flex gap-6 h-[calc(100vh-4rem)]">
      <div className="flex-1 overflow-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">New Walk-in Order</h1>

        <div className="flex gap-2 overflow-x-auto pb-3 mb-4">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap cursor-pointer ${
              selectedCategory === null ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-600"
            }`}
          >
            All
          </button>
          {categories?.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap cursor-pointer ${
                selectedCategory === cat.id ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-600"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {products?.map((product) => (
            <button
              key={product.id}
              onClick={() => addToCart(product)}
              className="bg-white rounded-lg border border-gray-100 p-3 text-left hover:border-orange-300 transition-colors cursor-pointer"
            >
              {product.image ? (
                <img src={product.image} alt={product.name} className="w-full h-24 object-cover rounded mb-2" />
              ) : (
                <div className="w-full h-24 bg-gray-100 rounded mb-2 flex items-center justify-center text-gray-400 text-xs">
                  No Image
                </div>
              )}
              <p className="text-sm font-medium">{product.name}</p>
              {product.discounted_price != null && Number(product.discounted_price) < Number(product.price) ? (
                <div className="mt-1">
                  <span className="text-sm font-bold text-orange-500">ETB {Number(product.discounted_price).toFixed(2)}</span>
                  <span className="ml-2 text-xs text-gray-400 line-through">ETB {Number(product.price).toFixed(2)}</span>
                </div>
              ) : (
                <p className="text-sm font-semibold text-gray-600 mt-1">ETB {Number(product.price).toFixed(2)}</p>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="w-96 bg-white border border-gray-200 rounded-xl flex flex-col">
        <div className="p-4 border-b">
          <h2 className="font-medium text-gray-900">Current Order</h2>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Click products to add them</p>
          ) : (
            cart.map((item) => (
              <div key={item.product.id} className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{item.product.name}</span>
                  <span className="text-sm font-medium">
                    ${calculateItemTotal(item).toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateQuantity(item.product.id, -1)}
                    className="w-6 h-6 rounded bg-gray-200 flex items-center justify-center text-xs cursor-pointer"
                  >
                    -
                  </button>
                  <span className="text-sm w-6 text-center">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.product.id, 1)}
                    className="w-6 h-6 rounded bg-gray-200 flex items-center justify-center text-xs cursor-pointer"
                  >
                    +
                  </button>
                </div>

                {item.product.option_groups && (
                  <div className="mt-2 space-y-1">
                    {item.product.option_groups.map((group: OptionGroup) => (
                      <div key={group.id} className="flex flex-wrap gap-1">
                        <span className="text-xs text-gray-400 mr-1">{group.name}:</span>
                        {group.values
                          ?.filter((v: OptionValue) => v.available)
                          .map((value: OptionValue) => {
                            const selected = (item.selectedOptions[group.id] || []).includes(value.id);
                            return (
                              <button
                                key={value.id}
                                onClick={() => toggleOption(item.product.id, group.id, value.id, group.multiple_choice)}
                                className={`px-2 py-0.5 rounded text-xs cursor-pointer ${
                                  selected ? "bg-orange-500 text-white" : "bg-gray-200 text-gray-600"
                                }`}
                              >
                                {value.name}
                              </button>
                            );
                          })}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t">
          <input
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value)}
            placeholder="Coupon code (optional)"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
          <div className="flex justify-between mb-4">
            <span className="font-medium">Total</span>
            <span className="font-bold text-lg">${subtotal.toFixed(2)}</span>
          </div>
          <Button
            className="w-full"
            onClick={handleOrder}
            disabled={cart.length === 0}
          >
            Create Order
          </Button>
        </div>
      </div>
    </div>
  );
}
