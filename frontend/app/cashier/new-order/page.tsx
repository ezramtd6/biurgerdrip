"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/services/api";
import { Product, Category, OptionGroup, OptionValue } from "@/types";
import { useValidateCoupon } from "@/hooks/usePromotions";
import { Button } from "@/components/ui";
import { useRouter } from "next/navigation";

interface CartItem {
  product: Product;
  quantity: number;
  selectedOptions: Record<number, number[]>;
}

interface CouponStatus {
  state: "idle" | "checking" | "valid" | "invalid";
  message?: string;
  discount?: number;
}

export default function NewOrderPage() {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [couponStatus, setCouponStatus] = useState<CouponStatus>({ state: "idle" });
  const couponDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const validateCoupon = useValidateCoupon();
  const [productOptions, setProductOptions] = useState<Record<string, Record<number, number>>>({});

  useEffect(() => {
    return () => {
      if (couponDebounceRef.current) clearTimeout(couponDebounceRef.current);
    };
  }, []);

  const { data: categories } = useQuery<Category[]>({
    queryKey: ["cashier-categories"],
    queryFn: async () => {
      const res = await api.get("/categories/");
      return res.data.results || res.data;
    },
  });

  const { data: allProducts } = useQuery<Product[]>({
    queryKey: ["cashier-products"],
    queryFn: async () => {
      const res = await api.get("/products/");
      return res.data.results || res.data;
    },
  });

  const products = selectedCategory
    ? allProducts?.filter((p) => p.category === selectedCategory)
    : allProducts;

  const setProductOption = (productId: number, groupId: number, value: string) => {
    setProductOptions((prev) => {
      const productOpts = { ...(prev[String(productId)] || {}) };
      if (value === "") {
        delete productOpts[groupId];
      } else {
        productOpts[groupId] = Number(value);
      }
      return { ...prev, [String(productId)]: productOpts };
    });
  };

  const addToCart = (product: Product) => {
    const rawOpts = productOptions[String(product.id)] || {};
    const selectedOptions: Record<number, number[]> = {};
    for (const [groupId, valueId] of Object.entries(rawOpts)) {
      selectedOptions[Number(groupId)] = [valueId];
    }
    const optionKey = Object.values(selectedOptions)
      .flat()
      .sort((a, b) => a - b)
      .join("-");
    setCart((prev) => {
      const existing = prev.find(
        (item) => item.product.id === product.id && optionKeyForItem(item) === optionKey
      );
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id && optionKeyForItem(item) === optionKey
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1, selectedOptions }];
    });
    setProductOptions((prev) => {
      const next = { ...prev };
      delete next[String(product.id)];
      return next;
    });
  };

  const optionKeyForItem = (item: CartItem) =>
    Object.values(item.selectedOptions)
      .flat()
      .sort((a, b) => a - b)
      .join("-");

  const updateQuantity = (productId: number, optionKey: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.product.id === productId && optionKeyForItem(item) === optionKey
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const calculateItemUnitPrice = (item: CartItem) => {
    let price =
      item.product.discounted_price != null
        ? Number(item.product.discounted_price)
        : Number(item.product.price);
    if (item.product.option_groups) {
      for (const group of item.product.option_groups) {
        const selected = item.selectedOptions[group.id] || [];
        for (const valueId of selected) {
          const value = group.values?.find((v: OptionValue) => v.id === valueId);
          if (value) price += Number(value.price_adjustment);
        }
      }
    }
    return price;
  };

  const calculateItemTotal = (item: CartItem) => calculateItemUnitPrice(item) * item.quantity;

  const subtotal = cart.reduce((sum, item) => sum + calculateItemTotal(item), 0);
  const couponDiscount = couponStatus.state === "valid" ? couponStatus.discount ?? 0 : 0;
  const grandTotal = subtotal - couponDiscount;

  const handleCouponChange = (value: string) => {
    setCouponCode(value);
    if (couponDebounceRef.current) clearTimeout(couponDebounceRef.current);
    const code = value.trim();
    if (!code) {
      setCouponStatus({ state: "idle" });
      return;
    }
    if (subtotal <= 0) {
      setCouponStatus({ state: "idle" });
      return;
    }
    setCouponStatus({ state: "checking" });
    couponDebounceRef.current = setTimeout(() => {
      validateCoupon.mutate(
        { code, subtotal },
        {
          onSuccess: (data) => {
            if (data.valid) {
              setCouponStatus({
                state: "valid",
                message: `Coupon ${data.code} applied`,
                discount: Number(data.discount ?? 0),
              });
            } else {
              setCouponStatus({ state: "invalid", message: data.error || "Invalid coupon code." });
            }
          },
          onError: () => {
            setCouponStatus({ state: "idle" });
          },
        }
      );
    }, 400);
  };

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
          {products?.map((product) => {
            const groups = (product.option_groups ?? [])
              .filter((g: OptionGroup) => g.is_active && (g.values ?? []).some((v: OptionValue) => v.available))
              .sort((a: OptionGroup, b: OptionGroup) => (a.name === "Size" ? -1 : b.name === "Size" ? 1 : a.display_order - b.display_order));
            const sizeGroup = groups.find((g: OptionGroup) => g.name === "Size");
            const opts = productOptions[String(product.id)] || {};
            const missingRequired = !!sizeGroup && opts[sizeGroup.id] == null;
            return (
              <div
                key={product.id}
                className="bg-white rounded-lg border border-gray-100 p-3 hover:border-orange-300 transition-colors"
              >
                {product.image ? (
                  <img src={product.image} alt={product.name} className="w-full h-24 object-cover rounded mb-2" />
                ) : (
                  <div className="w-full h-24 bg-gray-100 rounded mb-2 flex items-center justify-center text-gray-400 text-xs">
                    No Image
                  </div>
                )}
                <p className="text-sm font-medium">{product.name}</p>
                {!sizeGroup && (
                  <>
                    {product.discounted_price != null && Number(product.discounted_price) < Number(product.price) ? (
                      <div className="mt-1">
                        <span className="text-sm font-bold text-orange-500">ETB {Number(product.discounted_price).toFixed(2)}</span>
                        <span className="ml-2 text-xs text-gray-400 line-through">ETB {Number(product.price).toFixed(2)}</span>
                      </div>
                    ) : (
                      <p className="text-sm font-semibold text-gray-600 mt-1">ETB {Number(product.price).toFixed(2)}</p>
                    )}
                  </>
                )}
                <div className="flex flex-col gap-1.5 mt-2">
                  {groups.map((group: OptionGroup) => {
                    const values = (group.values ?? [])
                      .filter((v: OptionValue) => v.available)
                      .sort((a: OptionValue, b: OptionValue) => a.display_order - b.display_order);
                    const hasVal = opts[group.id] != null;
                    return (
                      <div key={group.id} className="relative">
                        <select
                          value={opts[group.id] ?? ""}
                          onChange={(e) => setProductOption(product.id, group.id, e.target.value)}
                          className={`w-full appearance-none bg-transparent pr-6 py-0.5 cursor-pointer outline-none text-xs transition-colors ${
                            hasVal ? "text-orange-600 font-bold" : "text-gray-400 font-medium"
                          }`}
                        >
                          <option value="" disabled={group.name === "Size"}>
                            {group.name === "Size"
                              ? `Select ${group.name} *`
                              : hasVal
                                ? "Unselect"
                                : `Select ${group.name}`}
                          </option>
                          {values.map((v: OptionValue) => (
                            <option key={v.id} value={v.id}>
                              {v.name} ETB {Number(v.price_adjustment).toFixed(2)}
                            </option>
                          ))}
                        </select>
                        <span className={`absolute inset-y-0 right-2 flex items-center pointer-events-none transition-colors ${hasVal ? "text-orange-600" : "text-gray-400"}`}>
                          <i className="fas fa-chevron-down text-[10px]"></i>
                        </span>
                      </div>
                    );
                  })}
                  <button
                    onClick={() => addToCart(product)}
                    disabled={missingRequired}
                    className="w-full bg-orange-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-orange-600 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-orange-500 mt-1"
                  >
                    + Add
                  </button>
                </div>
              </div>
            );
          })}
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
            cart.map((item) => {
              const optionNames = item.product.option_groups
                ?.filter((g: OptionGroup) => g.is_active)
                .flatMap((g: OptionGroup) =>
                  (item.selectedOptions[g.id] || [])
                    .map((vid) => g.values?.find((v: OptionValue) => v.id === vid))
                    .filter(Boolean)
                    .map((v) => `${g.name}: ${v!.name}`)
                )
                .join(", ");
              return (
                <div key={`${item.product.id}-${optionKeyForItem(item)}`} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{item.product.name}</span>
                    <span className="text-sm font-medium">
                      ETB {calculateItemTotal(item).toFixed(2)}
                    </span>
                  </div>
                  {optionNames && (
                    <p className="text-xs text-gray-400 mb-2">{optionNames}</p>
                  )}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.product.id, optionKeyForItem(item), -1)}
                      className="w-6 h-6 rounded bg-gray-200 flex items-center justify-center text-xs cursor-pointer"
                    >
                      -
                    </button>
                    <span className="text-sm w-6 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.product.id, optionKeyForItem(item), 1)}
                      className="w-6 h-6 rounded bg-gray-200 flex items-center justify-center text-xs cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="p-4 border-t">
          <input
            value={couponCode}
            onChange={(e) => handleCouponChange(e.target.value)}
            placeholder="Coupon code (optional)"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
          {couponStatus.state === "checking" && (
            <p className="text-sm text-gray-500 flex items-center gap-1.5 mb-3">
              <i className="fas fa-spinner fa-spin"></i> Checking coupon...
            </p>
          )}
          {couponStatus.state === "valid" && (
            <p className="text-sm text-green-600 flex items-center gap-1.5 mb-3">
              <i className="fas fa-circle-check"></i> {couponStatus.message}
            </p>
          )}
          {couponStatus.state === "invalid" && (
            <p className="text-sm text-red-600 flex items-center gap-1.5 mb-3">
              <i className="fas fa-circle-exclamation"></i> {couponStatus.message}
            </p>
          )}
          <div className="flex justify-between mb-1">
            <span className="font-medium">Subtotal</span>
            <span className="font-bold">ETB {subtotal.toFixed(2)}</span>
          </div>
          {couponDiscount > 0 && (
            <div className="flex justify-between mb-1 text-green-600">
              <span className="font-medium">Coupon discount</span>
              <span className="font-bold">-ETB {couponDiscount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between mb-4">
            <span className="font-bold">Total</span>
            <span className="font-bold text-lg">ETB {grandTotal.toFixed(2)}</span>
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
