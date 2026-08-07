"use client";

import { createContext, useContext } from "react";

export type AuthView = "login" | "register" | "forgot";

export interface AuthModalContextValue {
  openAuth: (view?: AuthView) => void;
  closeAuth: () => void;
}

export const AuthModalContext = createContext<AuthModalContextValue | null>(null);

export function useAuthModal() {
  const ctx = useContext(AuthModalContext);
  if (!ctx) throw new Error("useAuthModal must be used within AuthModalProvider");
  return ctx;
}
