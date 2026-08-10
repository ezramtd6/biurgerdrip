"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/services/api";
import { RestaurantInfo } from "@/types";

export function useRestaurant() {
  return useQuery<RestaurantInfo | null>({
    queryKey: ["restaurant-info"],
    queryFn: async () => {
      const res = await api.get("/restaurant/");
      const data = res.data.results || res.data;
      const first = Array.isArray(data) ? data[0] : null;
      return first ?? null;
    },
    staleTime: 5 * 60 * 1000,
  });
}
