"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useProduct } from "@/hooks/useProducts";
import { Button } from "@/components/ui";
import { Loading } from "@/components/common/Loading";
import api from "@/services/api";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { OptionGroup, OptionValue } from "@/types";

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { isDark, toggleDarkMode } = useTheme();
  const productId = Number(params.productId);
  const { data: product, isLoading } = useProduct(productId);

  const [selectedOptions, setSelectedOptions] = useState<Record<number, number[]>>({});
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  if (isLoading) return <Loading />;
  if (!product) return <div className="text-center py-12 text-gray-500">Product not found</div>;

  const handleOptionSelect = (groupId: number, valueId: number, multiple: boolean) => {
    setSelectedOptions((prev) => {
      if (multiple) {
        const current = prev[groupId] || [];
        const exists = current.includes(valueId);
        return {
          ...prev,
          [groupId]: exists ? current.filter((id) => id !== valueId) : [...current, valueId],
        };
      }
      return { ...prev, [groupId]: [valueId] };
    });
  };

  const calculateTotal = () => {
    let total = 0;
    if (product.option_groups) {
      for (const group of product.option_groups) {
        const selected = selectedOptions[group.id] || [];
        for (const valueId of selected) {
          const value = group.values?.find((v: OptionValue) => v.id === valueId);
          if (value) total += Number(value.price_adjustment);
        }
      }
    }
    return total * quantity;
  };

  const handleOrder = async () => {
    if (!user) {
      router.push("/login");
      return;
    }

    const optionValues = Object.values(selectedOptions).flat();
    setSubmitting(true);
    try {
      await api.post("/orders/", {
        discount: 0,
        tax: 0,
        payment_method: "",
        items: [
          {
            product: product.id,
            quantity,
            option_values: optionValues,
          },
        ],
      });
      router.push("/orders");
    } catch {
      alert("Failed to place order");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 dark:bg-gray-900 min-h-screen">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 cursor-pointer">
          &larr; Back to menu
        </button>
        <button onClick={toggleDarkMode} className="dark-toggle w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-yellow-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition shadow-sm">
          {isDark ? (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" /></svg>
          ) : (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" /></svg>
          )}
        </button>
      </div>

      {product.image ? (
        <img src={product.image} alt={product.name} className="w-full h-64 object-cover rounded-xl mb-6" />
      ) : (
        <div className="w-full h-64 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center text-gray-400 dark:text-gray-500 mb-6">
          No Image
        </div>
      )}

      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{product.name}</h1>
      <p className="text-gray-500 dark:text-gray-400 mt-2">{product.description}</p>

      {product.option_groups && product.option_groups.length > 0 && (
        <div className="mt-8 space-y-6">
          {product.option_groups
            .sort((a: OptionGroup, b: OptionGroup) => a.display_order - b.display_order)
            .map((group: OptionGroup) => (
              <div key={group.id}>
                <h3 className="font-medium text-gray-900 dark:text-white mb-1">
                  {group.name}
                  {group.required && <span className="text-red-500 ml-1">*</span>}
                </h3>
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
                  {group.multiple_choice ? "Select one or more" : "Select one"}
                </p>
                <div className="flex flex-wrap gap-2">
                  {group.values
                    ?.filter((v: OptionValue) => v.available)
                    .sort((a: OptionValue, b: OptionValue) => a.display_order - b.display_order)
                    .map((value: OptionValue) => {
                      const isSelected = (selectedOptions[group.id] || []).includes(value.id);
                      return (
                        <button
                          key={value.id}
                          onClick={() => handleOptionSelect(group.id, value.id, group.multiple_choice)}
                          className={`px-4 py-2 rounded-lg text-sm border transition-colors cursor-pointer ${
                            isSelected
                              ? "border-orange-500 bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300"
                              : "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500"
                          }`}
                        >
                          {value.name}
                          {Number(value.price_adjustment) > 0 && (
                            <span className="ml-1 text-xs text-gray-400 dark:text-gray-500">
                              +${Number(value.price_adjustment).toFixed(2)}
                            </span>
                          )}
                        </button>
                      );
                    })}
                </div>
              </div>
            ))}
        </div>
      )}

      <div className="mt-8 flex items-center justify-between border-t dark:border-gray-700 pt-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer"
          >
            -
          </button>
          <span className="font-medium text-gray-900 dark:text-white">{quantity}</span>
          <button
            onClick={() => setQuantity(quantity + 1)}
            className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer"
          >
            +
          </button>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">${calculateTotal().toFixed(2)}</p>
        </div>
      </div>

      <Button onClick={handleOrder} className="w-full mt-6" loading={submitting}>
        {user ? "Place Order" : "Sign in to Order"}
      </Button>
    </div>
  );
}
