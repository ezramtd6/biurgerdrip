"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/services/api";
import { PaymentSystem } from "@/types";

export function usePaymentSystems() {
  return useQuery<PaymentSystem[]>({
    queryKey: ["payment-systems"],
    queryFn: async () => {
      const res = await api.get("/orders/payment-systems/");
      return res.data.results || res.data;
    },
    staleTime: 2 * 60 * 1000,
  });
}