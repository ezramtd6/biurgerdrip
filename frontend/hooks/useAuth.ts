"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/services/api";
import {
  getUser,
  setUser,
  removeUser,
  setAccessToken,
  removeAccessToken,
} from "@/lib/auth";
import { User } from "@/types";

export function useAuth() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const user = useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      const stored = getUser();
      if (!stored) return null;
      try {
        const res = await api.get<User>("/auth/profile/");
        setUser(res.data);
        return res.data;
      } catch {
        removeUser();
        removeAccessToken();
        return null;
      }
    },
    initialData: () => getUser(),
    staleTime: 5 * 60 * 1000,
  });

  const login = useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      const res = await api.post("/auth/login/", data);
      return res.data;
    },
    onSuccess: (data) => {
      if (data.access) setAccessToken(data.access);
      if (data.user) setUser(data.user);
      queryClient.setQueryData(["user"], data.user);
      const role = data.user?.role;
      if (role === "MANAGER" || role === "ADMIN") router.push("/dashboard");
      else if (role === "CASHIER") router.push("/cashier");
      else router.push("/menu");
    },
  });

  const register = useMutation({
    mutationFn: async (data: {
      email: string;
      first_name: string;
      last_name: string;
      phone: string;
      password: string;
    }) => {
      const res = await api.post("/auth/register/", data);
      return res.data;
    },
    onSuccess: () => {
      router.push("/login");
    },
  });

  const logout = useMutation({
    mutationFn: async () => {
      await api.post("/auth/logout/");
    },
    onSettled: () => {
      removeAccessToken();
      removeUser();
      queryClient.clear();
      router.push("/login");
    },
  });

  return {
    user: user.data,
    isLoading: user.isLoading,
    login,
    register,
    logout,
  };
}
