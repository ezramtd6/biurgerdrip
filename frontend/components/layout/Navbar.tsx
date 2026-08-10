"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { useRestaurant } from "@/hooks/useRestaurant";
import { useAuthModal } from "@/components/auth/auth-modal-context";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { openAuth } = useAuthModal();
  const { isDark, toggleDarkMode } = useTheme();
  const { data: restaurant } = useRestaurant();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isActive = (path: string) => pathname === path;

  const handleLogout = () => {
    logout.mutate();
  };

  return (
    <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl shadow-sm sticky top-0 z-50 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-18 py-3">
          <Link href="/menu" className="flex items-center gap-3 group">
            <div className="w-11 h-11 bg-orange-500 rounded-full flex items-center justify-center shadow-lg group-hover:shadow-orange-500/30 group-hover:scale-110 transition-all duration-300 overflow-hidden">
              {restaurant?.logo ? (
                <img src={restaurant.logo} alt={restaurant.name || "Restaurant"} className="w-full h-full object-cover" />
              ) : (
                <svg viewBox="0 0 100 100" className="w-7 h-7" fill="white">
                  <path d="M50 15 C30 15 15 30 15 50 C15 70 30 85 50 85 C70 85 85 70 85 50 C85 30 70 15 50 15 Z" />
                  <circle cx="35" cy="45" r="5" fill="#C2410C" />
                  <circle cx="55" cy="35" r="4" fill="#C2410C" />
                  <circle cx="65" cy="55" r="5" fill="#C2410C" />
                  <circle cx="45" cy="60" r="4" fill="#C2410C" />
                  <circle cx="30" cy="60" r="3" fill="#FDE68A" />
                  <circle cx="60" cy="45" r="3" fill="#FDE68A" />
                </svg>
              )}
            </div>
            <span className="text-2xl font-black text-orange-500 tracking-tight group-hover:tracking-wide transition-all duration-300">
              {restaurant?.name || "Burger House"}
            </span>
          </Link>

          <nav className="hidden lg:flex items-center gap-8">
            <Link href="/menu" className="nav-link text-sm font-bold text-gray-700 dark:text-gray-200 hover:text-orange-500 transition-colors py-2">
              Menu
            </Link>
            {user && mounted && (
              <>
                <Link href="/orders" className="nav-link text-sm font-bold text-gray-700 dark:text-gray-200 hover:text-orange-500 transition-colors py-2">
                  My Orders
                </Link>
                <Link href="/profile" className="nav-link text-sm font-bold text-gray-700 dark:text-gray-200 hover:text-orange-500 transition-colors py-2">
                  Profile
                </Link>
              </>
            )}
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleDarkMode}
              className="dark-toggle w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-yellow-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition shadow-sm"
            >
              {isDark ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              )}
            </button>

            {user && mounted ? (
              <div className="hidden md:flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  {user.first_name}
                </span>
                <button
                  onClick={handleLogout}
                  className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-orange-500 transition-colors cursor-pointer"
                >
                  Logout
                </button>
              </div>
            ) : (
              <button
                onClick={() => openAuth("login")}
                className="hidden md:flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-200 hover:text-orange-500 transition px-3 py-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
                Sign In
              </button>
            )}

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden text-gray-700 dark:text-gray-200 text-xl p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={mobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="lg:hidden bg-white dark:bg-gray-800 border-t dark:border-gray-700 shadow-lg">
          <div className="px-4 py-4 space-y-1">
            <Link href="/menu" onClick={() => setMobileMenuOpen(false)} className="block py-3 px-4 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-orange-50 dark:hover:bg-gray-700 hover:text-orange-500 rounded-xl transition-all">
              Menu
            </Link>
            {user && mounted && (
              <>
                <Link href="/orders" onClick={() => setMobileMenuOpen(false)} className="block py-3 px-4 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-orange-50 dark:hover:bg-gray-700 hover:text-orange-500 rounded-xl transition-all">
                  My Orders
                </Link>
                <Link href="/profile" onClick={() => setMobileMenuOpen(false)} className="block py-3 px-4 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-orange-50 dark:hover:bg-gray-700 hover:text-orange-500 rounded-xl transition-all">
                  Profile
                </Link>
              </>
            )}
            {user && mounted ? (
              <button onClick={() => { handleLogout(); setMobileMenuOpen(false); }} className="block w-full text-left py-3 px-4 text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-gray-700 hover:text-red-600 rounded-xl transition-all">
                Logout
              </button>
            ) : (
              <button onClick={() => { setMobileMenuOpen(false); openAuth("login"); }} className="block w-full text-center py-3 px-4 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-orange-50 dark:hover:bg-gray-700 hover:text-orange-500 rounded-xl transition-all cursor-pointer">
                Sign In
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
