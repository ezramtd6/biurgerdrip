"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export default function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (path: string) => pathname === path;

  const handleLogout = () => {
    logout.mutate();
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/menu" className="text-xl font-bold text-orange-500">
            Burger House
          </Link>

          <div className="hidden md:flex items-center gap-6">
            <Link
              href="/menu"
              className={`text-sm font-medium transition-colors ${
                isActive("/menu") ? "text-orange-500" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Menu
            </Link>
            {user && (
              <>
                <Link
                  href="/orders"
                  className={`text-sm font-medium transition-colors ${
                    isActive("/orders") ? "text-orange-500" : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  My Orders
                </Link>
                <Link
                  href="/profile"
                  className={`text-sm font-medium transition-colors ${
                    isActive("/profile") ? "text-orange-500" : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Profile
                </Link>
              </>
            )}
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <>
                <span className="text-sm text-gray-500 hidden sm:block">
                  {user.first_name}
                </span>
                <button
                  onClick={handleLogout}
                  className="text-sm text-gray-600 hover:text-red-500 transition-colors cursor-pointer"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="text-sm bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
