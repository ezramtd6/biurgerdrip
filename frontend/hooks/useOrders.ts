"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/services/api";
import { Order, CreateOrderPayload, OrderNotification } from "@/types";

export function useOrders() {
  return useQuery<Order[]>({
    queryKey: ["orders"],
    queryFn: async () => {
      const res = await api.get("/orders/");
      return res.data.results || res.data;
    },
    refetchInterval: 10000,
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
    mutationFn: async ({
      id,
      action = "accept",
      payment_method,
      reason,
    }: {
      id: number;
      action?: "accept" | "reject";
      payment_method?: string;
      reason?: string;
    }) => {
      const res = await api.post(`/orders/cashier/${id}/payment/`, {
        action,
        payment_method,
        reason,
      });
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
    mutationFn: async (formData: FormData) => {
      const res = await api.post("/orders/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
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
    mutationFn: async ({
      id,
      action = "accept",
      payment_method,
      reason,
    }: {
      id: number;
      action?: "accept" | "reject";
      payment_method?: string;
      reason?: string;
    }) => {
      const res = await api.post(`/orders/${id}/payment/`, {
        action,
        payment_method,
        reason,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

export function useNotifications() {
  return useQuery<OrderNotification[]>({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await api.get("/orders/notifications/");
      return res.data.results || res.data;
    },
    refetchInterval: 15000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await api.post(`/orders/notifications/${id}/read/`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useResubmitProof() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, file }: { id: number; file: File }) => {
      const formData = new FormData();
      formData.append("payment_proof", file);
      const res = await api.post(`/orders/${id}/resubmit-proof/`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
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

export function useCashierReports() {
  return useQuery<ReportsData>({
    queryKey: ["cashier-reports"],
    queryFn: async () => {
      const res = await api.get("/orders/cashier/reports/");
      return res.data;
    },
  });
}
