"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { useAuthModal } from "@/components/auth/auth-modal-context";
import { useRestaurant } from "@/hooks/useRestaurant";
import ChangePasswordDialog from "@/components/ChangePasswordDialog";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import NotificationBell from "@/components/NotificationBell";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const translations: Record<string, Record<string, string>> = {
  en: {
    menu: "Menu",
    store_locations: "Store Locations",
    about_us: "About Us",
    my_account: "My Account",
    cart: "Cart",
    orders: "Orders",
    my_orders: "My Orders",
    profile: "Profile",
  },
  am: {
    menu: "ምናሌ",
    store_locations: "ቅርንጫፎች",
    about_us: "ስለ እኛ",
    my_account: "መለያዬ",
    cart: "ቅርጫት",
    orders: "ትዕዛዞች",
    my_orders: "የእኔ ትዕዛዞች",
    profile: "መገለጫ",
  },
};

export default function HomeNavbar() {
  const { user, logout } = useAuth();
  const { openAuth } = useAuthModal();
  const { isDark, toggleDarkMode } = useTheme();
  const { data: restaurant } = useRestaurant();
  const router = useRouter();
  const [currentLang, setCurrentLang] = useState("en");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [pwdOpen, setPwdOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [totalQty, setTotalQty] = useState(0);

  const t = (key: string) => translations[currentLang]?.[key] ?? translations.en[key] ?? key;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const readCart = () => {
      try {
        const saved = localStorage.getItem("cart");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setTotalQty(parsed.reduce((sum: number, i: { qty: number }) => sum + (i.qty || 0), 0));
            return;
          }
        }
      } catch {
        // ignore malformed storage
      }
      setTotalQty(0);
    };
    readCart();
    window.addEventListener("cart-updated", readCart);
    return () => window.removeEventListener("cart-updated", readCart);
  }, []);

  return (
    <>
    <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl shadow-sm sticky top-0 z-50 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-18 py-3">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-11 h-11 bg-red-600 rounded-full flex items-center justify-center shadow-lg group-hover:shadow-red-600/30 group-hover:scale-110 transition-all duration-300 overflow-hidden">
              {restaurant?.logo ? (
                <img src={restaurant.logo} alt={restaurant.name || "Restaurant"} className="w-full h-full object-cover" />
              ) : (
                <i className="fas fa-utensils text-white text-xl"></i>
              )}
            </div>
            <span className="text-2xl font-black text-red-600 tracking-tight group-hover:tracking-wide transition-all duration-300">
              {restaurant?.name || "Burger House"}
            </span>
          </Link>

          <nav className="hidden lg:flex items-center gap-8">
            {user && mounted && (
              <>
                <Link href="/orders" className="nav-link text-sm font-bold text-gray-700 dark:text-gray-200 hover:text-red-600 transition-colors py-2">
                  {t("orders")}
                </Link>
                <Link href="/orders/history" className="nav-link text-sm font-bold text-gray-700 dark:text-gray-200 hover:text-red-600 transition-colors py-2">
                  {t("my_orders")}
                </Link>
              </>
            )}
          </nav>

          <div className="flex items-center gap-3">
            <button onClick={toggleDarkMode} className="dark-toggle w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-yellow-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition shadow-sm">
              {isDark ? <i className="fas fa-sun text-lg"></i> : <i className="fas fa-moon text-lg"></i>}
            </button>

            {user && mounted && (
              <NotificationBell triggerClassName="w-10 h-10 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition shadow-sm" />
            )}

            <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-full p-1 shadow-inner">
              <button onClick={() => setCurrentLang("en")} className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${currentLang === "en" ? "bg-red-600 text-white shadow" : "text-gray-600 dark:text-gray-300"}`}>EN</button>
              <button onClick={() => setCurrentLang("am")} className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${currentLang === "am" ? "bg-red-600 text-white shadow" : "text-gray-600 dark:text-gray-300"}`}>AM</button>
            </div>

            {user && mounted ? (
              <div className="hidden md:flex items-center gap-3">
                <DropdownMenu>
                  <DropdownMenuTrigger className="flex items-center gap-1.5 px-3 py-2 text-sm font-bold text-gray-700 dark:text-gray-200 hover:text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors cursor-pointer outline-none">
                    {user.first_name} {user.last_name}
                    <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuGroup>
                      <DropdownMenuLabel className="truncate">{user.email}</DropdownMenuLabel>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setPwdOpen(true)}>
                      Change Password
                    </DropdownMenuItem>
                    <DropdownMenuItem variant="destructive" onClick={() => setLogoutOpen(true)}>
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <ChangePasswordDialog open={pwdOpen} onOpenChange={setPwdOpen} />
              </div>
            ) : (
              <button onClick={() => openAuth("login")} className="hidden md:flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-200 hover:text-red-600 transition px-3 py-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
                <i className="far fa-user"></i> {t("my_account")}
              </button>
            )}

            <button
              onClick={() => router.push("/")}
              className="relative bg-red-600 text-white px-5 py-2.5 rounded-full text-sm font-bold hover:bg-red-700 transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-red-600/30 hover:scale-105 active:scale-95"
            >
              <i className="fas fa-shopping-bag"></i>
              <span className="hidden sm:inline">{t("cart")}</span>
              <span className={`absolute -top-1.5 -right-1.5 bg-yellow-400 text-red-600 text-xs font-black w-5 h-5 rounded-full flex items-center justify-center badge-pulse ${totalQty === 0 ? "hidden" : ""}`}>{totalQty}</span>
            </button>

            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="lg:hidden text-gray-700 dark:text-gray-200 text-xl p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition">
              <i className="fas fa-bars"></i>
            </button>
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="lg:hidden bg-white dark:bg-gray-800 border-t dark:border-gray-700 shadow-lg">
          <div className="px-4 py-4 space-y-1">
            {user && mounted && (
              <>
                <Link href="/orders" onClick={() => setMobileMenuOpen(false)} className="block text-center py-3 px-4 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-red-50 dark:hover:bg-gray-700 hover:text-red-600 rounded-xl transition-all">{t("orders")}</Link>
                <Link href="/orders/history" onClick={() => setMobileMenuOpen(false)} className="block text-center py-3 px-4 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-red-50 dark:hover:bg-gray-700 hover:text-red-600 rounded-xl transition-all">{t("my_orders")}</Link>
              </>
            )}
            {user && mounted ? (
              <button onClick={() => { setLogoutOpen(true); setMobileMenuOpen(false); }} className="block w-full text-center py-3 px-4 text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-gray-700 hover:text-red-600 rounded-xl transition-all">Logout</button>
            ) : (
              <button onClick={() => { setMobileMenuOpen(false); openAuth("login"); }} className="block w-full text-center py-3 px-4 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-red-50 dark:hover:bg-gray-700 hover:text-red-600 rounded-xl transition-all cursor-pointer">{t("my_account")}</button>
            )}
          </div>
        </div>
      )}
    </header>

    <ConfirmDialog
      open={logoutOpen}
      onClose={() => setLogoutOpen(false)}
      onConfirm={() => { setLogoutOpen(false); logout.mutate(); }}
      title="Logout"
      description="Are you sure you want to logout?"
      confirmLabel="Logout"
      destructive
    />
    </>
  );
}
