"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useAuthModal } from "@/components/auth/auth-modal-context";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import ChangePasswordDialog from "@/components/ChangePasswordDialog";
import SiteBrand from "@/components/layout/SiteBrand";
import ConfirmDialog from "@/components/common/ConfirmDialog";

const links = [
  { href: "/cashier", label: "Dashboard", icon: "📊" },
  { href: "/cashier/orders", label: "Orders", icon: "📋" },
  { href: "/cashier/new-order", label: "New Order", icon: "➕" },
  { href: "/cashier/reports", label: "Reports", icon: "📈" },
];

export default function CashierLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const { openAuth } = useAuthModal();
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [mounted, setMounted] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    const id = setInterval(() => {
      queryClient.invalidateQueries();
    }, 5000);
    return () => clearInterval(id);
  }, [queryClient]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    const wasDark = html.classList.contains("dark");
    html.classList.remove("dark");
    return () => {
      if (wasDark || localStorage.getItem("darkMode") === "true") {
        html.classList.add("dark");
      }
    };
  }, []);

  useEffect(() => {
    if (mounted && !isLoading && (!user || user.role !== "CASHIER")) {
      if (sessionStorage.getItem("auth_logged_out") !== "1") openAuth("login");
      router.replace("/");
    }
  }, [mounted, user, isLoading, router, openAuth]);

  if (!mounted || isLoading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
      </div>
    );
  if (!user) return null;

  return (
    <div className="min-h-screen flex bg-gray-50 force-light">
      <aside className="w-64 fixed inset-y-0 left-0 bg-white border-r border-gray-200 flex flex-col z-40">
        <div className="p-6 border-b">
          <Link href="/cashier" className="text-lg font-bold text-orange-500">
            <SiteBrand />
          </Link>
          <p className="text-xs text-gray-400 mt-1">Cashier Terminal</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {links.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-orange-50 text-orange-600"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <span>{link.icon}</span>
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-gray-600">{user.first_name} {user.last_name}</div>
          </div>
          <div className="flex flex-col items-start gap-2">
            <ChangePasswordDialog />
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="text-sm text-red-500 hover:text-red-600 cursor-pointer"
            >
              Logout
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 p-8 overflow-auto ml-64">{children}</main>
      <ConfirmDialog
        open={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={() => { setShowLogoutConfirm(false); logout.mutate(); }}
        title="Logout"
        description="Are you sure you want to logout?"
        confirmLabel="Logout"
        destructive
      />
    </div>
  );
}
