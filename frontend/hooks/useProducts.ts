"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/services/api";
import { Category, Product, RestaurantInfo } from "@/types";

export function useCategories() {
  return useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await api.get("/categories/");
      return res.data.results || res.data;
    },
  });
}

export function useProducts(categoryId?: number | null) {
  return useQuery<Product[]>({
    queryKey: ["products", categoryId],
    queryFn: async () => {
      const url = categoryId ? `/products/?category=${categoryId}` : "/products/";
      const res = await api.get(url);
      return res.data.results || res.data;
    },
  });
}

export function useProduct(id: number) {
  return useQuery<Product>({
    queryKey: ["product", id],
    queryFn: async () => {
      const res = await api.get(`/products/${id}/`);
      return res.data;
    },
  });
}

export function useRestaurant() {
  return useQuery<RestaurantInfo[]>({
    queryKey: ["restaurant"],
    queryFn: async () => {
      const res = await api.get("/restaurant/");
      return res.data.results || res.data;
    },
  });
}
