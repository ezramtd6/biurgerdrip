"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/services/api";
import { Order, CreateOrderPayload } from "@/types";

export function useOrders() {
  return useQuery<Order[]>({
    queryKey: ["orders"],
    queryFn: async () => {
      const res = await api.get("/orders/");
      return res.data.results || res.data;
    },
  });
}

export function useCashierOrders() {
  return useQuery<Order[]>({
    queryKey: ["cashier-orders"],
    queryFn: async () => {
      const res = await api.get("/orders/cashier/");
      return res.data.results || res.data;
    },
  });
}

export function useCashierOrder(id: number) {
  return useQuery<Order>({
    queryKey: ["cashier-order", id],
    queryFn: async () => {
      const res = await api.get(`/orders/cashier/${id}/`);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useCashierCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateOrderPayload) => {
      const res = await api.post("/orders/cashier/", data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cashier-orders"] });
    },
  });
}

export function useCashierUpdateOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await api.patch(`/orders/cashier/${id}/`, { status });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cashier-orders"] });
    },
  });
}

export function useCashierProcessPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payment_method }: { id: number; payment_method: string }) => {
      const res = await api.post(`/orders/cashier/${id}/payment/`, { payment_method });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cashier-orders"] });
    },
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateOrderPayload) => {
      const res = await api.post("/orders/", data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await api.patch(`/orders/${id}/`, { status });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

export function useProcessPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payment_method }: { id: number; payment_method: string }) => {
      const res = await api.post(`/orders/${id}/payment/`, { payment_method });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

export interface ReportsData {
  total_orders: number;
  total_revenue: number;
  total_categories: number;
  total_products: number;
  orders_by_status: Record<string, number>;
  today_orders_count: number;
  today_revenue: number;
  recent_orders: Order[];
}

export function useReports() {
  return useQuery<ReportsData>({
    queryKey: ["reports"],
    queryFn: async () => {
      const res = await api.get("/orders/reports/");
      return res.data;
    },
  });
}
