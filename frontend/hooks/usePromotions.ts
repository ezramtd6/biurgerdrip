"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import api from "@/services/api";
import { Promotion, CouponValidationResult } from "@/types";

export function usePromotions() {
  return useQuery<Promotion[]>({
    queryKey: ["promotions"],
    queryFn: async () => {
      const res = await api.get("/promotions/");
      return res.data.results || res.data;
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function useValidateCoupon() {
  return useMutation<CouponValidationResult, unknown, { code: string; subtotal: number }>({
    mutationFn: async ({ code, subtotal }) => {
      const res = await api.post("/coupons/validate/", { code, subtotal });
      return res.data;
    },
  });
}
