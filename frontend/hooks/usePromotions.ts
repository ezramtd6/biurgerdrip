"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/services/api";
import { Promotion } from "@/types";

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
