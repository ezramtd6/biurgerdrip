import { User } from "@/types";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
}

export function setAccessToken(token: string): void {
  localStorage.setItem("access_token", token);
}

export function removeAccessToken(): void {
  localStorage.removeItem("access_token");
}

export function isTokenExpired(token: string | null): boolean {
  if (!token) return true;
  try {
    const part = token.split(".")[1];
    if (!part) return true;
    const payload = JSON.parse(atob(part));
    return typeof payload.exp !== "number" || payload.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}

export function getValidAccessToken(): string | null {
  const token = getAccessToken();
  if (!token || isTokenExpired(token)) return null;
  return token;
}

export function getUser(): User | null {
  if (typeof window === "undefined") return null;
  const data = localStorage.getItem("user");
  if (!data) return null;
  try {
    return JSON.parse(data) as User;
  } catch {
    return null;
  }
}

export function setUser(user: User): void {
  localStorage.setItem("user", JSON.stringify(user));
}

export function removeUser(): void {
  localStorage.removeItem("user");
}

export function isAuthenticated(): boolean {
  return !!getAccessToken();
}

export function getUserRole(): User["role"] | null {
  return getUser()?.role ?? null;
}
