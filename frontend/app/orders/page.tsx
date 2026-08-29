"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useCreateOrder } from "@/hooks/useOrders";
import type { Order } from "@/types";
import { usePaymentSystems } from "@/hooks/usePaymentSystems";
import { useRestaurant } from "@/hooks/useRestaurant";
import { useValidateCoupon } from "@/hooks/usePromotions";
import { useLanguage } from "@/hooks/useLanguage";
import { Loading } from "@/components/common/Loading";
import EmptyState from "@/components/common/EmptyState";
import HomeNavbar from "@/components/layout/HomeNavbar";

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

interface CouponStatus {
  state: "idle" | "checking" | "valid" | "invalid";
  message?: string;
  discount?: number;
}

const readCart = (): CartItem[] => {
  try {
    const saved = localStorage.getItem("cart");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore malformed storage
  }
  return [];
};

export default function OrdersPage() {
  const { lang: currentLang, t } = useLanguage();
  const { data: paymentSystems } = usePaymentSystems();
  const { data: restaurant } = useRestaurant();
  const createOrder = useCreateOrder();
  const validateCoupon = useValidateCoupon();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartReady, setCartReady] = useState(false);
  const [placed, setPlaced] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [couponStatus, setCouponStatus] = useState<CouponStatus>({ state: "idle" });
  const couponDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [proofError, setProofError] = useState("");
  const [orderError, setOrderError] = useState("");
  const [unavailableNotice, setUnavailableNotice] = useState<string | null>(null);
  const proofInputRef = useRef<HTMLInputElement>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [unavailableOpen, setUnavailableOpen] = useState(false);
  const unavailableShownRef = useRef(false);

  const restaurantUnavailable = !!restaurant && restaurant.is_available_now === false;
  const restaurantFrozen = !!restaurant && restaurant.is_active === false;
  const unavailableReason = restaurantFrozen ? t("frozen_notice") : t("closed_notice");

  useEffect(() => {
    setCart(readCart());
    setCartReady(true);
    return () => {
      if (couponDebounceRef.current) clearTimeout(couponDebounceRef.current);
    };
  }, []);

  useEffect(() => {
    if (cartReady && restaurantUnavailable && cart.length > 0 && !unavailableShownRef.current) {
      unavailableShownRef.current = true;
      setUnavailableOpen(true);
    }
  }, [cartReady, restaurantUnavailable, cart.length]);

  const handleProofChange = (file: File | undefined | null) => {
    setProofError("");
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setProofError("Please attach an image file (screenshot or photo).");
      setProofFile(null);
      setProofPreview(null);
      return;
    }
    setProofFile(file);
    setProofPreview(URL.createObjectURL(file));
  };

  const cartTotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  const couponDiscount = couponStatus.state === "valid" ? couponStatus.discount ?? 0 : 0;
  const grandTotal = cartTotal - couponDiscount;
  const selectedMethod = paymentMethod || paymentSystems?.[0]?.code || "";

  const handleCouponChange = (value: string) => {
    setCouponCode(value);
    if (couponDebounceRef.current) clearTimeout(couponDebounceRef.current);
    const code = value.trim();
    if (!code) {
      setCouponStatus({ state: "idle" });
      return;
    }
    setCouponStatus({ state: "checking" });
    couponDebounceRef.current = setTimeout(() => {
      validateCoupon.mutate(
        { code, subtotal: cartTotal },
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

  const placeOrder = () => {
    if (cart.length === 0) return;
    if (!proofFile) {
      setProofError("Please attach your payment proof before placing the order.");
      return;
    }
    setOrderError("");
    setUnavailableNotice(null);
    const items = cart.map((i) => ({
      product: i.id,
      quantity: i.qty,
      option_values: i.optionKey ? i.optionKey.split("-").map(Number) : [],
    }));
    const formData = new FormData();
    formData.append("discount", "0");
    formData.append("tax", "0");
    formData.append("payment_method", selectedMethod);
    if (couponCode.trim()) formData.append("coupon_code", couponCode.trim());
    formData.append("items", JSON.stringify(items));
    formData.append("payment_proof", proofFile);
    createOrder.mutate(formData, {
      onSuccess: (data: Order) => {
        localStorage.setItem("cart", JSON.stringify([]));
        setCart([]);
        setPlaced(true);
        setCouponCode("");
        setCouponStatus({ state: "idle" });
        setProofFile(null);
        setProofPreview(null);
        if (data?.has_unavailable_items) {
          const contact = data.support_phone
            ? ` You can reach our cashier at ${data.support_phone}.`
            : " Our team will contact you shortly.";
          setUnavailableNotice(
            `Some items in your order are currently unavailable.${contact} Your order may be refunded.`
          );
        }
        window.dispatchEvent(new Event("cart-updated"));
      },
      onError: (err) => {
        const data = (err as { response?: { data?: Record<string, unknown> } })?.response?.data || {};
        const first = (v: unknown): string | null => {
          if (Array.isArray(v)) return v.length ? first(v[0]) : null;
          if (v && typeof v === "object") {
            for (const val of Object.values(v as Record<string, unknown>)) {
              const found = first(val);
              if (found) return found;
            }
            return null;
          }
          return typeof v === "string" && v ? v : null;
        };

        const couponMsg = first(data.coupon_code);
        if (couponMsg) {
          setCouponStatus({ state: "invalid", message: couponMsg });
        }
        const proofMsg = first(data.payment_proof);
        if (proofMsg) {
          setProofError(proofMsg);
        }
        const itemsMsg = first(data.items);
        setOrderError(itemsMsg || first(data.detail) || (!couponMsg && !proofMsg ? "Failed to place your order. Please try again." : ""));
      },
    });
  };

  if (!cartReady) {
    return (
      <>
        <HomeNavbar />
        <Loading />
      </>
    );
  }

  if (cart.length === 0 && createOrder.isIdle) {
    return (
      <>
        <HomeNavbar />
        <div className="max-w-4xl mx-auto px-4 py-16 flex flex-col items-center text-center">
          <EmptyState message={t("your_cart_empty")} />
          <Link
            href="/orders/history"
            className="mt-4 inline-flex items-center gap-2 bg-red-600 text-white px-5 py-3 rounded-2xl text-sm font-bold hover:bg-red-700 transition-all duration-300 shadow-lg hover:shadow-red-600/30"
          >
            {t("view_order_history_btn")} <i className="fas fa-clock-rotate-left"></i>
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <HomeNavbar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("your_cart_checkout")}</h1>
          <Link
            href="/orders/history"
            className="inline-flex items-center gap-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-300"
          >
            {t("order_history")} <i className="fas fa-clock-rotate-left"></i>
          </Link>
        </div>
        {placed && (
          <div className="mb-6 space-y-3">
            <div className="p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-xl text-green-700 dark:text-green-400 text-sm font-semibold">
              {t("order_placed")}
              <Link href="/orders/history" className="underline ml-2">{t("view_order_history")}</Link>
            </div>
            {unavailableNotice && (
              <div className="p-4 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-700 dark:text-amber-300 text-sm flex items-start gap-2">
                <i className="fas fa-triangle-exclamation mt-0.5"></i>
                <span>{unavailableNotice}</span>
              </div>
            )}
          </div>
        )}

        {cart.length > 0 && (
          <div className="mb-10">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{t("your_cart_label")}</h2>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
              {cart.map((item, index) => (
                <div key={`${item.id}-${item.optionKey || index}`} className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3 min-w-0">
                    {item.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.image} alt={currentLang === "am" ? item.nameAm : item.name} className="w-12 h-12 rounded-lg object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                        <i className="fas fa-utensils text-gray-300 dark:text-gray-500"></i>
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-white truncate">{currentLang === "am" ? item.nameAm : item.name}</p>
                      {item.optionNames && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{item.optionNames}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-500 dark:text-gray-400">{item.qty}x</span>
                    <span className="font-bold text-gray-900 dark:text-white w-20 text-right">
                      {t("currency")} {Number(item.price * item.qty).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-b-xl">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t("subtotal_label")}</span>
                <span className="text-lg font-black text-gray-900 dark:text-white">{t("currency")} {cartTotal.toFixed(2)}</span>
              </div>
              {couponDiscount > 0 && (
                <div className="flex items-center justify-between px-4 py-2 bg-green-50 dark:bg-green-900/20 border-t border-green-100 dark:border-green-800">
                  <span className="text-sm font-semibold text-green-700 dark:text-green-400">{t("coupon_discount")}</span>
                  <span className="text-sm font-bold text-green-600 dark:text-green-400">-{t("currency")} {couponDiscount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/20 border-t border-red-100 dark:border-red-800 rounded-b-xl">
                <span className="text-sm font-bold text-gray-900 dark:text-white">{t("total_label")}</span>
                <span className="text-xl font-black text-gray-900 dark:text-white">{t("currency")} {grandTotal.toFixed(2)}</span>
              </div>
            </div>
            <input
              value={couponCode}
              onChange={(e) => handleCouponChange(e.target.value)}
              placeholder={t("coupon_placeholder")}
              className="mt-4 w-full px-3 py-2 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent placeholder-gray-400 dark:placeholder-gray-500"
            />
            {couponStatus.state === "checking" && (
              <p className="mt-2 text-sm text-gray-500 flex items-center gap-1.5">
                <i className="fas fa-spinner fa-spin"></i> {t("checking_coupon")}
              </p>
            )}
            {couponStatus.state === "valid" && (
              <p className="mt-2 text-sm text-green-600 flex items-center gap-1.5">
                <i className="fas fa-circle-check"></i> {couponStatus.message}
              </p>
            )}
            {couponStatus.state === "invalid" && (
              <p className="mt-2 text-sm text-red-600 flex items-center gap-1.5">
                <i className="fas fa-circle-exclamation"></i> {couponStatus.message}
              </p>
            )}
            {!restaurantUnavailable && paymentSystems && paymentSystems.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t("payment_method")}</p>
                <div className="grid grid-cols-3 gap-2">
                  {paymentSystems.map((method) => (
                    <button
                      key={method.code}
                      type="button"
                      onClick={() => setPaymentMethod(method.code)}
                      className={`p-3 rounded-xl border-2 text-center transition-colors cursor-pointer ${
                        selectedMethod === method.code
                          ? "border-red-500 bg-red-50 dark:bg-red-900/30"
                          : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
                      }`}
                    >
                      {method.icon ? (
                        <img src={method.icon} alt={method.name} className="w-8 h-8 object-contain mx-auto mb-1" />
                      ) : (
                        <span className="text-xl block mb-1">💳</span>
                      )}
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{method.name}</span>
                    </button>
                  ))}
                </div>
                {(() => {
                  const selected = paymentSystems.find((m) => m.code === selectedMethod);
                  return selected ? (
                    <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl text-sm">
                      <p className="font-semibold text-gray-900 dark:text-gray-100">
                        {selected.name} <span className="text-gray-500">({selected.code})</span>
                      </p>
                      {selected.details && (
                        <p className="mt-1 text-gray-600 dark:text-gray-400 whitespace-pre-line">{selected.details}</p>
                      )}
                    </div>
                  ) : null;
                })()}
              </div>
            )}

            {!restaurantUnavailable && (
            <div className="mt-5">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <i className="fas fa-camera-retro text-red-500"></i> {t("payment_proof")}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                {t("payment_proof_desc")}
              </p>
              <input
                ref={proofInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleProofChange(e.target.files?.[0])}
              />
              {!proofPreview ? (
                <button
                  type="button"
                  onClick={() => proofInputRef.current?.click()}
                  className="w-full p-6 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-red-400 hover:bg-red-50/50 dark:hover:bg-red-900/10 transition-all cursor-pointer flex flex-col items-center gap-2"
                >
                  <span className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center text-red-500 text-xl">
                    <i className="fas fa-cloud-arrow-up"></i>
                  </span>
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t("tap_upload")}</span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">{t("png_jpg")}</span>
                </button>
              ) : (
                <div className="relative rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={proofPreview} alt="Payment proof preview" className="w-full max-h-64 object-contain" />
                  <button
                    type="button"
                    onClick={() => {
                      setProofFile(null);
                      setProofPreview(null);
                      if (proofInputRef.current) proofInputRef.current.value = "";
                    }}
                    className="absolute top-2 right-2 bg-black/60 text-white text-xs font-semibold px-3 py-1.5 rounded-full hover:bg-black/80 transition-all cursor-pointer"
                  >
                    <i className="fas fa-xmark mr-1"></i> {t("remove")}
                  </button>
                </div>
              )}
              {proofError && (
                <p className="mt-2 text-sm text-red-600 flex items-center gap-1.5">
                  <i className="fas fa-circle-exclamation"></i> {proofError}
                </p>
              )}
            </div>
            )}

            {orderError && (
              <div className="mt-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-sm text-red-600 flex items-start gap-2">
                <i className="fas fa-circle-exclamation mt-0.5"></i>
                <span>{orderError}</span>
              </div>
            )}

            {!restaurantUnavailable && (
            <button
              onClick={() => setConfirmOpen(true)}
              disabled={createOrder.isPending || !proofFile}
              className="mt-4 w-full bg-red-600 text-white py-4 rounded-2xl font-black text-lg hover:bg-red-700 transition-all duration-300 shadow-lg hover:shadow-red-600/30 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {createOrder.isPending ? (
                t("placing_order")
              ) : (
                <>
                  {t("place_order")} <i className="fas fa-arrow-right"></i>
                </>
              )}
            </button>
            )}
          </div>
        )}
      </div>

      {confirmOpen && (
        <>
          <div onClick={() => setConfirmOpen(false)} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 text-center">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-exclamation-triangle text-red-600 dark:text-red-400 text-2xl"></i>
              </div>
              <h2 className="text-xl font-black text-gray-900 dark:text-white mb-2">{t("final_confirmation")}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                {t("final_choice")}
              </p>
              <p className="text-sm font-semibold text-red-600 mb-6">
                <i className="fas fa-ban mr-1"></i>
                {t("no_refunds")}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmOpen(false)}
                  className="flex-1 px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-bold text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition cursor-pointer"
                >
                  {t("go_back")}
                </button>
                <button
                  onClick={() => { setConfirmOpen(false); placeOrder(); }}
                  disabled={createOrder.isPending}
                  className="flex-1 px-4 py-3 rounded-xl bg-red-600 text-white font-bold text-sm hover:bg-red-700 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {createOrder.isPending ? t("placing") : t("yes_place_order")}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {unavailableOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div onClick={() => setUnavailableOpen(false)} className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-md w-full p-8 text-center">
            <div className="w-20 h-20 bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center mx-auto mb-5">
              <i className="fas fa-store-slash text-red-600 dark:text-red-400 text-3xl"></i>
            </div>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-3">{t("not_available_title")}</h2>
            <div className="w-12 h-1 bg-red-600 rounded-full mx-auto mb-4" />
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              {t("not_available_desc")}
            </p>
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 rounded-full px-4 py-2 mb-6">
              <i className="fas fa-circle-info"></i>
              {unavailableReason}
            </p>
            <button
              onClick={() => setUnavailableOpen(false)}
              className="w-full px-4 py-3 rounded-xl bg-red-600 text-white font-bold text-sm hover:bg-red-700 transition cursor-pointer"
            >
              {t("understand")}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
