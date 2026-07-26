"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useProduct } from "@/hooks/useProducts";
import { Button } from "@/components/ui";
import { Loading } from "@/components/common/Loading";
import api from "@/services/api";
import { useAuth } from "@/hooks/useAuth";
import { OptionGroup, OptionValue } from "@/types";

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
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
    <div className="max-w-3xl mx-auto px-4 py-8">
      <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-700 mb-4 cursor-pointer">
        &larr; Back to menu
      </button>

      {product.image ? (
        <img src={product.image} alt={product.name} className="w-full h-64 object-cover rounded-xl mb-6" />
      ) : (
        <div className="w-full h-64 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 mb-6">
          No Image
        </div>
      )}

      <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
      <p className="text-gray-500 mt-2">{product.description}</p>

      {product.option_groups && product.option_groups.length > 0 && (
        <div className="mt-8 space-y-6">
          {product.option_groups
            .sort((a: OptionGroup, b: OptionGroup) => a.display_order - b.display_order)
            .map((group: OptionGroup) => (
              <div key={group.id}>
                <h3 className="font-medium text-gray-900 mb-1">
                  {group.name}
                  {group.required && <span className="text-red-500 ml-1">*</span>}
                </h3>
                <p className="text-xs text-gray-400 mb-3">
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
                              ? "border-orange-500 bg-orange-50 text-orange-700"
                              : "border-gray-200 text-gray-600 hover:border-gray-300"
                          }`}
                        >
                          {value.name}
                          {Number(value.price_adjustment) > 0 && (
                            <span className="ml-1 text-xs text-gray-400">
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

      <div className="mt-8 flex items-center justify-between border-t pt-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 cursor-pointer"
          >
            -
          </button>
          <span className="font-medium">{quantity}</span>
          <button
            onClick={() => setQuantity(quantity + 1)}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 cursor-pointer"
          >
            +
          </button>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Total</p>
          <p className="text-xl font-bold text-gray-900">${calculateTotal().toFixed(2)}</p>
        </div>
      </div>

      <Button onClick={handleOrder} className="w-full mt-6" loading={submitting}>
        {user ? "Place Order" : "Sign in to Order"}
      </Button>
    </div>
  );
}
