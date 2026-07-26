"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/dashboard/categories", label: "Categories", icon: "📁" },
  { href: "/dashboard/products", label: "Products", icon: "🍔" },
  { href: "/dashboard/option-groups", label: "Option Groups", icon: "⚙️" },
  { href: "/dashboard/restaurant", label: "Restaurant", icon: "🏪" },
  { href: "/dashboard/cashiers", label: "Cashiers", icon: "👨‍💼" },
  { href: "/dashboard/reports", label: "Reports", icon: "📈" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && (!user || (user.role !== "MANAGER" && user.role !== "ADMIN"))) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" /></div>;
  if (!user) return null;

  return (
    <div className="min-h-screen flex bg-gray-50">
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b">
          <Link href="/dashboard" className="text-lg font-bold text-orange-500">
            Burger House
          </Link>
          <p className="text-xs text-gray-400 mt-1">Manager Dashboard</p>
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
          <div className="text-sm text-gray-600 mb-2">{user.first_name} {user.last_name}</div>
          <button
            onClick={() => logout.mutate()}
            className="text-sm text-red-500 hover:text-red-600 cursor-pointer"
          >
            Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  );
}
