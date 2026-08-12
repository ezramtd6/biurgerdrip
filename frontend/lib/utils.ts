import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function apiErrorMessage(error: unknown, fallback = "Something went wrong"): string {
  const data = (error as { response?: { data?: unknown } })?.response?.data;
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const first = Object.values(data as Record<string, unknown>)[0];
    if (Array.isArray(first) && first.length) return String(first[0]);
    if (typeof first === "string") return first;
  }
  return (error as Error)?.message || fallback;
}
