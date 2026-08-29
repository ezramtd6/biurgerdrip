"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/services/api";
import { Product, Category, OptionGroup, OptionValue } from "@/types";
import { useValidateCoupon } from "@/hooks/usePromotions";
import { useRestaurant } from "@/hooks/useRestaurant";
import { Button } from "@/components/ui";
import AppModal from "@/components/ui/AppModal";
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
  const { data: restaurant } = useRestaurant();

  const restaurantUnavailable = !!restaurant && restaurant.is_available_now === false;
  const restaurantFrozen = !!restaurant && restaurant.is_active === false;
  const unavailableReason = restaurantFrozen
    ? "The restaurant is temporarily closed for business."
    : "We're currently outside working hours. Please check back during opening hours.";
  const [productOptions, setProductOptions] = useState<Record<string, Record<number, number>>>({});
  const [errorModal, setErrorModal] = useState<{ open: boolean; message: string }>({ open: false, message: "" });

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
    refetchInterval: 10000,
  });

  const { data: allProducts } = useQuery<Product[]>({
    queryKey: ["cashier-products"],
    queryFn: async () => {
      const res = await api.get("/products/");
      return res.data.results || res.data;
    },
    refetchInterval: 10000,
  });

  const visibleSelected = categories?.some((c) => c.id === selectedCategory)
    ? selectedCategory
    : null;
  const products = visibleSelected
    ? allProducts?.filter((p) => p.category === visibleSelected)
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
    } catch (err: any) {
      const data = err?.response?.data || {};
      const itemsMsg = Array.isArray(data.items) ? data.items.join(", ") : data.items;
      const msg = data.error || data.detail || itemsMsg || "Failed to create order. Please try again.";
      setErrorModal({ open: true, message: msg });
    }
  };

  return (
    <div className="flex gap-6 h-[calc(100vh-4rem)]">
      <div className="flex-1 overflow-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">New Walk-in Order</h1>

        {restaurantUnavailable ? (
          <div className="flex flex-col items-center justify-center py-24 text-center bg-white rounded-2xl border border-gray-100">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-5">
              <i className="fas fa-store-slash text-red-500 text-3xl"></i>
            </div>
            <h2 className="text-xl font-black text-gray-900 mb-2">Ordering Currently Unavailable</h2>
            <p className="text-sm text-gray-500 mb-4">The restaurant is not accepting orders right now.</p>
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-red-500 bg-red-50 rounded-full px-4 py-2">
              <i className="fas fa-circle-info"></i>
              {unavailableReason}
            </p>
          </div>
        ) : (
        <>
        <div className="flex gap-2 overflow-x-auto pb-3 mb-4">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap cursor-pointer ${
              visibleSelected === null ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-600"
            }`}
          >
            All
          </button>
          {categories?.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap cursor-pointer ${
                visibleSelected === cat.id ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-600"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
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
                className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:border-orange-200 transition-all duration-200 overflow-hidden group"
              >
                {product.image ? (
                  <div className="relative overflow-hidden">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-36 object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {product.discounted_price != null && Number(product.discounted_price) < Number(product.price) && (
                      <span className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
                        SALE
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="w-full h-36 bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center text-gray-300">
                    <i className="fas fa-image text-3xl"></i>
                  </div>
                )}
                <div className="p-4">
                  <h3 className="text-sm font-semibold text-gray-900 truncate">{product.name}</h3>
                  {!sizeGroup && (
                    <div className="mt-1.5">
                      {product.discounted_price != null && Number(product.discounted_price) < Number(product.price) ? (
                        <div className="flex items-baseline gap-2">
                          <span className="text-base font-bold text-orange-500">ETB {Number(product.discounted_price).toFixed(2)}</span>
                          <span className="text-xs text-gray-400 line-through">ETB {Number(product.price).toFixed(2)}</span>
                        </div>
                      ) : (
                        <p className="text-base font-bold text-gray-900">ETB {Number(product.price).toFixed(2)}</p>
                      )}
                    </div>
                  )}
                  <div className="flex flex-col gap-2 mt-3">
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
                            className={`w-full appearance-none rounded-lg px-3 py-2 pr-8 cursor-pointer outline-none text-xs font-medium transition-all border ${
                              hasVal
                                ? "bg-orange-50 text-orange-600 border-orange-200"
                                : "bg-gray-50 text-gray-500 border-gray-200 focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
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
                          <span className={`absolute inset-y-0 right-2.5 flex items-center pointer-events-none ${hasVal ? "text-orange-500" : "text-gray-400"}`}>
                            <i className="fas fa-chevron-down text-[10px]"></i>
                          </span>
                        </div>
                      );
                    })}
                    <button
                      onClick={() => addToCart(product)}
                      disabled={missingRequired}
                      className="w-full bg-gradient-to-r from-orange-500 to-orange-400 text-white px-4 py-2.5 rounded-xl text-xs font-bold tracking-wide hover:from-orange-600 hover:to-orange-500 transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-sm hover:shadow mt-1"
                    >
                      + Add to Order
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        </>
        )}
      </div>

      <div className="w-96 bg-white border border-gray-100 shadow-lg rounded-2xl flex flex-col">
        <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-orange-500 to-orange-400 rounded-t-2xl">
          <h2 className="font-bold text-white text-base flex items-center gap-2">
            <i className="fas fa-shopping-cart text-sm"></i>
            Current Order
          </h2>
          {cart.length > 0 && (
            <p className="text-orange-100 text-xs mt-0.5">{cart.reduce((s, i) => s + i.quantity, 0)} item(s)</p>
          )}
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-2.5">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-300">
              <i className="fas fa-shopping-basket text-4xl mb-3"></i>
              <p className="text-sm font-medium text-gray-400">No items yet</p>
              <p className="text-xs text-gray-300 mt-1">Tap products to add them</p>
            </div>
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
                <div key={`${item.product.id}-${optionKeyForItem(item)}`} className="bg-gray-50 rounded-xl p-3.5 border border-gray-100 hover:border-orange-200 transition-colors">
                  <div className="flex items-start justify-between mb-1.5">
                    <span className="text-sm font-semibold text-gray-900 flex-1 pr-2">{item.product.name}</span>
                    <span className="text-sm font-bold text-orange-500 whitespace-nowrap">
                      ETB {calculateItemTotal(item).toFixed(2)}
                    </span>
                  </div>
                  {optionNames && (
                    <p className="text-[11px] text-gray-400 mb-2.5 leading-relaxed">{optionNames}</p>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 bg-white rounded-lg border border-gray-200 p-0.5">
                      <button
                        onClick={() => updateQuantity(item.product.id, optionKeyForItem(item), -1)}
                        className="w-7 h-7 rounded-md bg-gray-100 hover:bg-red-100 hover:text-red-500 flex items-center justify-center text-xs font-bold cursor-pointer transition-colors"
                      >
                        -
                      </button>
                      <span className="text-sm font-bold w-7 text-center text-gray-900">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.product.id, optionKeyForItem(item), 1)}
                        className="w-7 h-7 rounded-md bg-gray-100 hover:bg-green-100 hover:text-green-600 flex items-center justify-center text-xs font-bold cursor-pointer transition-colors"
                      >
                        +
                      </button>
                    </div>
                    <button
                      onClick={() => updateQuantity(item.product.id, optionKeyForItem(item), -item.quantity)}
                      className="text-[11px] text-gray-400 hover:text-red-500 transition-colors cursor-pointer font-medium"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="p-5 border-t border-gray-100">
          <div className="relative mb-4">
            <i className="fas fa-tag absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
            <input
              value={couponCode}
              onChange={(e) => handleCouponChange(e.target.value)}
              placeholder="Coupon code (optional)"
              className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-300 transition-all"
            />
          </div>
          {couponStatus.state === "checking" && (
            <p className="text-xs text-gray-500 flex items-center gap-1.5 mb-3">
              <i className="fas fa-spinner fa-spin"></i> Checking coupon...
            </p>
          )}
          {couponStatus.state === "valid" && (
            <p className="text-xs text-green-600 flex items-center gap-1.5 mb-3 bg-green-50 px-3 py-2 rounded-lg">
              <i className="fas fa-circle-check"></i> {couponStatus.message}
            </p>
          )}
          {couponStatus.state === "invalid" && (
            <p className="text-xs text-red-600 flex items-center gap-1.5 mb-3 bg-red-50 px-3 py-2 rounded-lg">
              <i className="fas fa-circle-exclamation"></i> {couponStatus.message}
            </p>
          )}
          <div className="flex justify-between mb-1.5">
            <span className="text-sm text-gray-500">Subtotal</span>
            <span className="text-sm font-semibold text-gray-700">ETB {subtotal.toFixed(2)}</span>
          </div>
          {couponDiscount > 0 && (
            <div className="flex justify-between mb-1.5 text-green-600">
              <span className="text-sm">Coupon discount</span>
              <span className="text-sm font-semibold">-ETB {couponDiscount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between items-baseline pt-3 border-t border-gray-100 mt-3">
            <span className="text-sm font-semibold text-gray-700">Total</span>
            <span className="text-xl font-bold text-orange-500">ETB {grandTotal.toFixed(2)}</span>
          </div>
          <Button
            className="w-full mt-4 py-3 rounded-xl font-bold text-sm shadow-lg hover:shadow-xl transition-all"
            onClick={handleOrder}
            disabled={cart.length === 0}
          >
            Create Order
          </Button>
        </div>
      </div>
      <AppModal isOpen={errorModal.open} onClose={() => setErrorModal({ open: false, message: "" })} title="Error" maxWidth="sm">
        <p className="text-gray-700 text-sm">{errorModal.message}</p>
        <Button className="mt-4 w-full" onClick={() => setErrorModal({ open: false, message: "" })}>OK</Button>
      </AppModal>
    </div>
  );
}
