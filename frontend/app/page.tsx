"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import api from "@/services/api";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { useAuthModal } from "@/components/auth/auth-modal-context";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { RestaurantInfo, Category, Product, Branch, SocialLink, Contact, OptionValue, OptionGroup } from "@/types";
import ChangePasswordDialog from "@/components/ChangePasswordDialog";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import dynamic from "next/dynamic";
import { useLanguage } from "@/hooks/useLanguage";

const BranchMap = dynamic(() => import("@/components/BranchMap"), { ssr: false });

const socialIconMap: Record<string, string> = {
  facebook: "fab fa-facebook-f",
  instagram: "fab fa-instagram",
  twitter: "fab fa-twitter",
  tiktok: "fab fa-tiktok",
  youtube: "fab fa-youtube",
  telegram: "fab fa-telegram-plane",
};

interface CartItem {
  id: number;
  name: string;
  nameAm: string;
  price: number;
  image: string;
  qty: number;
  optionKey?: string;
  optionNames?: string;
}

export default function Home() {
  const { user, logout } = useAuth();
  const { openAuth } = useAuthModal();
  const router = useRouter();
  const { isDark, toggleDarkMode } = useTheme();
  const [restaurantReady, setRestaurantReady] = useState(true);
  const [checkingRestaurant, setCheckingRestaurant] = useState(true);
  const [restaurant, setRestaurant] = useState<RestaurantInfo | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoaded, setProductsLoaded] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const { lang: currentLang, setLang: setCurrentLang, t } = useLanguage();
  const [cartOpen, setCartOpen] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<string | number>("all");
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: "", visible: false });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [pwdOpen, setPwdOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [headerScrolled, setHeaderScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 8;
  const [selectedOptions, setSelectedOptions] = useState<Record<string, number>>({});
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!openDropdown) return;
    const close = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(`[data-dropdown="${openDropdown}"]`)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [openDropdown]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("cart");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setCart(parsed);
      }
    } catch {
      // ignore malformed storage
    }
  }, []);

  const firstCartWrite = useRef(true);
  useEffect(() => {
    if (firstCartWrite.current) {
      firstCartWrite.current = false;
      return;
    }
    try {
      localStorage.setItem("cart", JSON.stringify(cart));
    } catch {
      // ignore storage errors
    }
  }, [cart]);

  useEffect(() => {
    if (user) {
      if (user.role === "CASHIER") router.replace("/cashier");
      else if (user.role === "MANAGER" || user.role === "ADMIN") router.replace("/dashboard");
    }
  }, [user, router]);

  useEffect(() => {
    api.get("/restaurant/")
      .then((res) => {
        const data = res.data.results || res.data;
        const first = data && data.length > 0 ? data[0] : null;
        setRestaurant(first);
        setRestaurantReady(!!first && first.is_active !== false);
      })
      .catch(() => setRestaurantReady(false))
      .finally(() => setCheckingRestaurant(false));
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      api.get("/categories/")
        .then((res) => {
          if (cancelled) return;
          const data = res.data.results || res.data;
          setCategories(Array.isArray(data) ? data : []);
        })
        .catch(() => {});
    };
    load();
    const id = setInterval(load, 10000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      api.get("/products/")
        .then((res) => {
          if (cancelled) return;
          const data = res.data.results || res.data;
          setProducts(Array.isArray(data) ? data : []);
          setProductsLoaded(true);
        })
        .catch(() => {});
    };
    load();
    const id = setInterval(load, 10000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  useEffect(() => {
    api.get("/branches/")
      .then((res) => {
        const data = res.data.results || res.data;
        setBranches(Array.isArray(data) ? data : []);
      })
      .catch(() => setBranches([]));
  }, []);

  useEffect(() => {
    api.get("/social-links/")
      .then((res) => {
        const data = res.data.results || res.data;
        setSocialLinks(Array.isArray(data) ? data : []);
      })
      .catch(() => setSocialLinks([]));
  }, []);

  useEffect(() => {
    api.get("/contacts/")
      .then((res) => {
        const data = res.data.results || res.data;
        setContacts(Array.isArray(data) ? data : []);
      })
      .catch(() => setContacts([]));
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 500);
      setHeaderScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    let timer: number | undefined;
    const scrollToHash = () => {
      const hash = window.location.hash;
      if (!hash) return;
      const el = document.querySelector(hash);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      timer = window.setTimeout(scrollToHash, 150);
    };
    scrollToHash();
    window.addEventListener("hashchange", scrollToHash);
    window.addEventListener("popstate", scrollToHash);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("hashchange", scrollToHash);
      window.removeEventListener("popstate", scrollToHash);
    };
  }, [checkingRestaurant]);

  const addToCart = (item: Product) => {
    const groups = (item.option_groups ?? []).filter((g) => g.is_active && (g.values ?? []).some((v) => v.available));
    const selected = groups
      .map((g) => ({ group: g, value: g.values?.find((v) => v.id === selectedOptions[`${item.id}:${g.id}`]) }))
      .filter((x) => x.value) as { group: OptionGroup; value: OptionValue }[];
    const price = Number(item.price) + selected.reduce((sum, x) => sum + Number(x.value.price_adjustment), 0);
    const optionKey = selected.map((x) => x.value.id).sort((a, b) => a - b).join("-");
    const optionNames = selected.map((x) => `${x.group.name}: ${x.value.name}`).join(", ");
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id && i.optionKey === optionKey);
      if (existing) return prev.map((i) => (i.id === item.id && i.optionKey === optionKey ? { ...i, qty: i.qty + 1 } : i));
      return [{ id: item.id, name: item.name, nameAm: item.name_amharic || item.name, price, image: item.image || "", qty: 1, optionKey, optionNames }, ...prev];
    });
    showToast(`${currentLang === "am" ? item.name_amharic || item.name : item.name} ${t("added_to_cart")}`);
  };

  const removeFromCart = (id: number, optionKey?: string) => setCart((prev) => prev.filter((i) => !(i.id === id && i.optionKey === optionKey)));

  const updateQty = (id: number, optionKey: string | undefined, delta: number) => {
    setCart((prev) => prev.map((i) => (i.id === id && i.optionKey === optionKey ? { ...i, qty: i.qty + delta } : i)).filter((i) => i.qty > 0));
  };

  const showToast = (message: string) => {
    setToast({ message, visible: true });
    setTimeout(() => setToast({ message: "", visible: false }), 2500);
  };

  useEffect(() => {
    if (sessionStorage.getItem("password_reset_success") === "1") {
      sessionStorage.removeItem("password_reset_success");
      showToast("Password reset successfully");
    }
    if (sessionStorage.getItem("password_set_success") === "1") {
      sessionStorage.removeItem("password_set_success");
      showToast("Password set successfully");
    }
  }, []);

  const filteredItems = currentCategory === "all" ? products : products.filter((i) => i.category === currentCategory);
  const pageItems = filteredItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);
  const totalQty = cart.reduce((sum, i) => sum + i.qty, 0);
  const totalCartPrice = cart.reduce((sum, i) => sum + i.price * i.qty, 0);

  const goToPage = (p: number) => {
    setPage(Math.min(Math.max(1, p), totalPages));
    document.getElementById("menu")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const restaurantClosed =
    !!restaurant &&
    restaurant.is_active !== false &&
    !!restaurant.available_from &&
    !!restaurant.available_to &&
    restaurant.is_available_now === false;

  const menuAvailable = !checkingRestaurant && restaurantReady && !restaurantClosed;

  const unavailableItems = productsLoaded
    ? cart.filter((ci) => !products.some((p) => p.id === ci.id))
    : [];

  const removeUnavailable = () => {
    setCart(cart.filter((ci) => products.some((p) => p.id === ci.id)));
    window.dispatchEvent(new Event("cart-updated"));
  };

  if (mounted && user && (user.role === "CASHIER" || user.role === "MANAGER" || user.role === "ADMIN")) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" />
      </div>
    );
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-900 transition-colors duration-500">
      <header className={`bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl sticky top-0 z-50 transition-all duration-300 ${headerScrolled ? "shadow-md" : "shadow-sm"}`}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between gap-2 sm:gap-3 h-18 py-3">
            <Link href="/" className="flex items-center gap-2 sm:gap-3 group min-w-0 shrink">
              {restaurant?.logo ? (
                <img src={restaurant.logo} alt={restaurant.name || "Restaurant"} className="w-9 h-9 sm:w-11 sm:h-11 rounded-full object-cover shadow-lg group-hover:scale-110 transition-all duration-300 shrink-0" />
              ) : (
                <div className="w-9 h-9 sm:w-11 sm:h-11 bg-red-600 rounded-full flex items-center justify-center shadow-lg group-hover:shadow-red-600/30 group-hover:scale-110 transition-all duration-300 shrink-0">
                  <svg viewBox="0 0 100 100" className="w-7 h-7" fill="white">
                    <path d="M50 5 L85 25 L85 35 L50 20 L15 35 L15 25 Z" />
                    <path d="M20 35 L20 75 Q20 85 30 85 L40 85 L40 45 L35 45 L35 35 Z" />
                    <path d="M45 35 L45 85 L55 85 L55 35 Z" />
                    <path d="M60 35 L60 45 L65 45 L65 85 L70 85 Q80 85 80 75 L80 35 Z" />
                  </svg>
                </div>
              )}
              <span className="truncate text-lg sm:text-2xl font-black text-red-600 tracking-tight group-hover:tracking-wide transition-all duration-300">{restaurant?.name || "Pizza Hut"}</span>
            </Link>
            <nav className="hidden lg:flex items-center gap-8">
              <a href="#menu" className="nav-link text-sm font-bold text-gray-700 dark:text-gray-200 hover:text-red-600 transition-colors py-2">{t("menu")}</a>
              <a href="#store-locations" className="nav-link text-sm font-bold text-gray-700 dark:text-gray-200 hover:text-red-600 transition-colors py-2">{t("store_locations")}</a>
              <a href="#about-us" className="nav-link text-sm font-bold text-gray-700 dark:text-gray-200 hover:text-red-600 transition-colors py-2">{t("about_us")}</a>
              {user && mounted && (
                <Link href="/orders" className="nav-link text-sm font-bold text-gray-700 dark:text-gray-200 hover:text-red-600 transition-colors py-2">{t("orders")}</Link>
              )}
            </nav>
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <button onClick={toggleDarkMode} className="dark-toggle w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-yellow-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition shadow-sm">
                {isDark ? <i className="fas fa-sun text-lg"></i> : <i className="fas fa-moon text-lg"></i>}
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-1.5 px-2.5 py-2 sm:px-3 rounded-full bg-gray-100 dark:bg-gray-700 text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition shadow-sm cursor-pointer outline-none">
                  <i className="fas fa-globe text-base"></i>
                  {currentLang === "am" ? "አማ" : "EN"}
                  <ChevronDown className="w-3 h-3 text-gray-400" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-32">
                  <DropdownMenuItem onClick={() => setCurrentLang("en")} className={currentLang === "en" ? "font-bold text-red-600" : ""}>
                    English
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setCurrentLang("am")} className={currentLang === "am" ? "font-bold text-red-600" : ""}>
                    አማርኛ
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
              <button onClick={() => setCartOpen(true)} className="relative bg-red-600 text-white px-4 py-2 sm:px-5 sm:py-2.5 rounded-full text-sm font-bold hover:bg-red-700 transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-red-600/30 hover:scale-105 active:scale-95 shrink-0">
                <i className="fas fa-shopping-bag"></i>
                <span className="hidden sm:inline">{t("cart")}</span>
                <span className={`absolute -top-1.5 -right-1.5 bg-yellow-400 text-red-600 text-xs font-black w-5 h-5 rounded-full flex items-center justify-center badge-pulse ${!mounted || totalQty === 0 ? "hidden" : ""}`}>{mounted ? totalQty : 0}</span>
              </button>
              <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="lg:hidden text-gray-700 dark:text-gray-200 text-xl p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition shrink-0">
                <i className="fas fa-bars"></i>
              </button>
            </div>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white dark:bg-gray-800 border-t dark:border-gray-700 shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="px-5 py-5 space-y-1">
              {user && mounted && (
                <div className="px-4 py-3 mb-2 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  <p className="text-sm font-bold text-gray-800 dark:text-gray-100 truncate">{user.first_name} {user.last_name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{user.email}</p>
                </div>
              )}

              <a href="#menu" onClick={() => setMobileMenuOpen(false)} className="flex items-center justify-center gap-2 py-3 px-4 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-red-50 dark:hover:bg-gray-700 hover:text-red-600 rounded-xl transition-all">
                <i className="fas fa-utensils"></i> {t("menu")}
              </a>
              <a href="#store-locations" onClick={() => setMobileMenuOpen(false)} className="flex items-center justify-center gap-2 py-3 px-4 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-red-50 dark:hover:bg-gray-700 hover:text-red-600 rounded-xl transition-all">
                <i className="fas fa-location-dot"></i> {t("store_locations")}
              </a>
              <a href="#about-us" onClick={() => setMobileMenuOpen(false)} className="flex items-center justify-center gap-2 py-3 px-4 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-red-50 dark:hover:bg-gray-700 hover:text-red-600 rounded-xl transition-all">
                <i className="fas fa-circle-info"></i> {t("about_us")}
              </a>

              {user && mounted && (
                <>
                  <div className="h-px bg-gray-200 dark:bg-gray-700 mx-2 my-1"></div>
                  <Link href="/orders" onClick={() => setMobileMenuOpen(false)} className="flex items-center justify-center gap-2 py-3 px-4 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-red-50 dark:hover:bg-gray-700 hover:text-red-600 rounded-xl transition-all">
                    <i className="fas fa-receipt"></i> {t("orders")}
                  </Link>
                  <Link href="/orders/history" onClick={() => setMobileMenuOpen(false)} className="flex items-center justify-center gap-2 py-3 px-4 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-red-50 dark:hover:bg-gray-700 hover:text-red-600 rounded-xl transition-all">
                    <i className="fas fa-clock-rotate-left"></i> {t("my_orders")}
                  </Link>
                  <button onClick={() => { setPwdOpen(true); setMobileMenuOpen(false); }} className="flex items-center justify-center gap-2 w-full py-3 px-4 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-red-50 dark:hover:bg-gray-700 hover:text-red-600 rounded-xl transition-all cursor-pointer">
                    <i className="fas fa-lock"></i> {t("change_password")}
                  </button>
                </>
              )}

              <div className="h-px bg-gray-200 dark:bg-gray-700 mx-2 my-1"></div>

              {user && mounted ? (
                <button onClick={() => { setLogoutOpen(true); setMobileMenuOpen(false); }} className="flex items-center justify-center gap-2 w-full py-3 px-4 text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-gray-700 hover:text-red-600 rounded-xl transition-all">
                  <i className="fas fa-right-from-bracket"></i> {t("logout")}
                </button>
              ) : (
                <button onClick={() => { setMobileMenuOpen(false); openAuth("login"); }} className="flex items-center justify-center gap-2 w-full py-3 px-4 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-red-50 dark:hover:bg-gray-700 hover:text-red-600 rounded-xl transition-all cursor-pointer">
                  <i className="far fa-user"></i> {t("my_account")}
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      <section className="relative overflow-hidden min-h-[600px] flex items-center" style={{ background: "linear-gradient(135deg, #C8102E 0%, #8B0A1E 50%, #C8102E 100%)", backgroundSize: "200% 200%" }}>
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="particle w-4 h-4 top-full left-[10%]" style={{ animationDelay: "0s", animationDuration: "12s" }} />
          <div className="particle w-3 h-3 top-full left-[30%]" style={{ animationDelay: "2s", animationDuration: "15s" }} />
          <div className="particle w-5 h-5 top-full left-[50%]" style={{ animationDelay: "4s", animationDuration: "10s" }} />
          <div className="particle w-2 h-2 top-full left-[70%]" style={{ animationDelay: "1s", animationDuration: "14s" }} />
          <div className="particle w-4 h-4 top-full left-[90%]" style={{ animationDelay: "3s", animationDuration: "11s" }} />
        </div>
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-10 w-64 h-64 bg-white rounded-full blur-[100px] animate-pulse" />
          <div className="absolute bottom-20 right-20 w-80 h-80 bg-yellow-300 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: "1s" }} />
          <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-red-400 rounded-full blur-[120px] opacity-30 animate-pulse" style={{ animationDelay: "2s" }} />
        </div>
        <div className="max-w-7xl mx-auto px-4 py-20 md:py-28 relative z-10">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="text-white text-center md:text-left">
              <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight tracking-tight">
                <span className="block">No One OutPizzas</span>
                <span className="block text-yellow-300">the Hut!</span>
              </h1>
              <p className="text-lg md:text-xl text-red-100 mb-10 max-w-lg leading-relaxed mx-auto md:mx-0">{t("hero_desc")}</p>
              <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                <a href="#menu" className="group bg-white text-red-600 px-8 py-4 rounded-full font-black text-lg hover:bg-gray-100 transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 flex items-center gap-2">
                  {t("order_now")} <i className="fas fa-arrow-right group-hover:translate-x-1 transition-transform"></i>
                </a>
                <a href="#deals" className="group border-2 border-white text-white px-8 py-4 rounded-full font-black text-lg hover:bg-white hover:text-red-600 transition-all duration-300 flex items-center gap-2 backdrop-blur-sm">{t("view_deals")}</a>
              </div>
            </div>
            <div className="relative hidden md:block">
              <div className="animate-bounce" style={{ animationDuration: "6s" }}>
                {restaurant?.logo ? (
                  <img src={restaurant.logo} alt={restaurant.name || "Restaurant"} className="w-full max-w-lg mx-auto drop-shadow-2xl rounded-full" />
                ) : (
                  <img src="https://www.pizzahut.et/95e49adae4d362a79e4d4df4c7c1c62d04bf9250" alt="Pizza" className="w-full max-w-lg mx-auto drop-shadow-2xl rounded-full" />
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="deals" className="py-16 checkered transition-colors duration-500">
        <div className="max-w-7xl mx-auto px-4">
          <div className="bg-gradient-to-r from-red-600 to-red-800 rounded-3xl p-10 md:p-14 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-yellow-400 rounded-full -translate-y-1/2 translate-x-1/4 opacity-20 animate-pulse" />
            <div className="absolute bottom-0 left-0 w-60 h-60 bg-yellow-300 rounded-full translate-y-1/2 -translate-x-1/4 opacity-10" />
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-center md:justify-between gap-6 text-center md:text-left">
              <div>
                <span className="bg-yellow-400 text-red-800 text-xs font-black px-4 py-1.5 rounded-full inline-block mb-4">{t("hot_deal")}</span>
                <h3 className="text-4xl md:text-5xl font-black mb-2">{t("deal_title")}</h3>
                <p className="text-red-200 text-lg">{t("deal_desc")}</p>
              </div>
              <a href="#menu" className="bg-white text-red-600 px-8 py-4 rounded-full font-black text-lg hover:bg-gray-100 transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 whitespace-nowrap flex items-center gap-2">
                {t("grab_deal")} <i className="fas fa-fire text-red-500"></i>
              </a>
            </div>
          </div>
        </div>
      </section>

      <section id="menu" className="py-16 bg-white dark:bg-gray-800 transition-colors duration-500">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-10">
            <div>
              <h2 className="text-3xl md:text-4xl font-black text-gray-800 dark:text-white mb-2">{t("our_menu")}</h2>
              <div className="w-16 h-1 bg-red-600 rounded-full mb-2 mx-auto" />
              <p className="text-gray-500 dark:text-gray-400">{t("menu_subtitle")}</p>
            </div>
            {menuAvailable && (
              <div className="flex gap-2 overflow-x-auto scrollbar-thin pb-2 mt-6">
                <button onClick={() => { setCurrentCategory("all"); setPage(1); }} className={`filter-btn flex-shrink-0 px-6 py-2.5 rounded-full text-sm font-bold transition whitespace-nowrap ${currentCategory === "all" ? "active brand-selected" : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200"}`}>{t("all")}</button>
                {categories.map((cat) => (
                  <button key={cat.id} onClick={() => { setCurrentCategory(cat.id); setPage(1); }} className={`filter-btn flex-shrink-0 px-6 py-2.5 rounded-full text-sm font-bold transition whitespace-nowrap ${currentCategory === cat.id ? "active brand-selected" : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200"}`}>{currentLang === "am" ? cat.name_amharic || cat.name : cat.name}</button>
                ))}
              </div>
            )}
          </div>
          {!menuAvailable && checkingRestaurant && (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" />
            </div>
          )}
          {!checkingRestaurant && !restaurantReady && (
            <div className="text-center py-20">
              <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className="text-xl font-black text-gray-800 dark:text-white mb-2">Menu Not Available</h3>
              <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                {restaurant && restaurant.is_active === false
                  ? "The restaurant is currently frozen. Please check back later."
                  : "The restaurant has not been configured yet. Please check back later."}
              </p>
            </div>
          )}
          {!checkingRestaurant && restaurantReady && restaurantClosed && (
            <div className="text-center py-20">
              <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-black text-gray-800 dark:text-white mb-2">We Are Currently Closed</h3>
              <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                We are open daily between{" "}
                <span className="font-semibold text-gray-700 dark:text-gray-200">
                  {restaurant?.available_from?.slice(0, 5)} – {restaurant?.available_to?.slice(0, 5)}
                </span>
                . Please check back during our availability hours.
              </p>
            </div>
          )}
          {menuAvailable && unavailableItems.length > 0 && (
            <div className="mb-8 max-w-3xl mx-auto flex flex-col sm:flex-row sm:items-center gap-3 justify-between bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-2xl px-5 py-4">
              <p className="text-sm text-amber-700 dark:text-amber-300 text-left">
                <i className="fas fa-triangle-exclamation mr-2"></i>
                No longer available: {unavailableItems.map((i) => i.name).join(", ")}. Please remove {unavailableItems.length > 1 ? "them" : "it"} from your cart.
              </p>
              <button
                onClick={removeUnavailable}
                className="text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-full transition cursor-pointer whitespace-nowrap"
              >
                Remove
              </button>
            </div>
          )}
          {menuAvailable && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-7">
                {pageItems.map((item, index) => {
                  const itemName = currentLang === "am" ? item.name_amharic || item.name : item.name;
                  const itemDesc = currentLang === "am" ? item.description_amharic || item.description : item.description;
                  const groups = [...(item.option_groups ?? [])]
                    .filter((g) => g.is_active && (g.values ?? []).some((v) => v.available))
                    .sort((a, b) => (a.name === "Size" ? -1 : b.name === "Size" ? 1 : a.display_order - b.display_order));
                  const sizeGroup = groups.find((g) => g.name === "Size");
                  const missingRequired = !!sizeGroup && !selectedOptions[`${item.id}:${sizeGroup.id}`];
                  return (
                    <div key={item.id} className="menu-card bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 transition-all duration-300" style={{ animationDelay: `${index * 0.05}s` }}>
                      <div className="relative overflow-hidden">
                        {item.image ? (
                          <img src={item.image} alt={itemName} className="w-full h-48 object-contain bg-gray-50 dark:bg-gray-900 p-4" />
                        ) : (
                          <div className="w-full h-48 bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                            <i className="fas fa-utensils text-gray-300 dark:text-gray-700 text-5xl"></i>
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <h3 className="font-bold text-gray-800 dark:text-white text-lg mb-1">{itemName}</h3>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mb-3 line-clamp-2">{itemDesc}</p>
                        <div className="flex flex-col gap-3">
                          {!sizeGroup && (
                            <span className="text-red-600 leading-none">
                              <span className="text-[10px] font-bold uppercase tracking-widest mr-1 opacity-70 align-top">{t("currency")}</span>
                              <span className="text-xl font-extrabold tracking-tight">{Number(item.price).toFixed(2)}</span>
                            </span>
                          )}
                          {groups.map((group) => {
                            const groupKey = `${item.id}:${group.id}`;
                            const values = (group.values ?? [])
                              .filter((v) => v.available)
                              .sort((a, b) => a.display_order - b.display_order);
                            const hasVal = !!selectedOptions[groupKey];
                            const isOpen = openDropdown === groupKey;
                            const selectedVal = values.find((v) => v.id === selectedOptions[groupKey]);
                            const placeholder = group.name === "Size"
                              ? `${t("select")} ${currentLang === "am" ? group.name_amharic || group.name : group.name} *`
                              : hasVal
                                ? currentLang === "am" ? "ይቅር ይበሉ" : "Unselect"
                                : `${t("select")} ${currentLang === "am" ? group.name_amharic || group.name : group.name}`;
                            return (
                              <div key={group.id} className="flex-1 min-w-0 relative" data-dropdown={groupKey}>
                                <button
                                  type="button"
                                  onClick={() => setOpenDropdown(isOpen ? null : groupKey)}
                                  className={`w-full text-left bg-gray-50 dark:bg-gray-900 border rounded-full pl-4 pr-9 py-2.5 min-h-[44px] cursor-pointer outline-none focus:ring-2 focus:ring-red-500/40 focus:border-red-400 transition-colors truncate ${
                                    hasVal
                                      ? "text-red-600 font-extrabold text-base tracking-tight border-red-200 dark:border-red-800 bg-red-50/60 dark:bg-red-900/20"
                                      : "text-gray-700 dark:text-gray-200 font-medium text-base border-gray-200 dark:border-gray-600"
                                  }`}
                                >
                                  {selectedVal
                                    ? `${currentLang === "am" ? selectedVal.name_amharic || selectedVal.name : selectedVal.name} ${t("currency")} ${Number(selectedVal.price_adjustment).toFixed(2)}`
                                    : placeholder}
                                </button>
                                <span className={`absolute inset-y-0 right-3.5 flex items-center pointer-events-none transition-colors ${hasVal ? "text-red-600" : "text-gray-500 dark:text-gray-400"}`}>
                                  <i className={`fas fa-chevron-down text-xs transition-transform ${isOpen ? "rotate-180" : ""}`}></i>
                                </span>
                                {isOpen && (
                                  <div className="absolute left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto">
                                    {values.map((v) => (
                                      <button
                                        key={v.id}
                                        type="button"
                                        onClick={() => {
                                          setSelectedOptions((prev) => ({ ...prev, [groupKey]: v.id }));
                                          setOpenDropdown(null);
                                        }}
                                        className={`w-full text-left px-4 py-2.5 text-sm cursor-pointer transition-colors ${
                                          selectedOptions[groupKey] === v.id
                                            ? "bg-red-50 dark:bg-red-900/20 text-red-600 font-bold"
                                            : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                                        }`}
                                      >
                                        {currentLang === "am" ? v.name_amharic || v.name : v.name} {t("currency")} {Number(v.price_adjustment).toFixed(2)}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          <button
                            onClick={() => addToCart(item)}
                            disabled={groups.length > 0 && missingRequired}
                            className="add-btn w-full bg-red-600 text-white px-4 py-2.5 rounded-full text-sm font-semibold hover:bg-red-700 transition flex items-center justify-center gap-1.5 active:scale-95 shadow-lg disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-red-600"
                          >
                            <i className="fas fa-plus text-xs"></i> {t("add")}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {filteredItems.length === 0 && (
                <div className="text-center py-16">
                  <p className="text-gray-500 dark:text-gray-400">No products in this category yet</p>
                </div>
              )}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-12">
                  <button
                    onClick={() => goToPage(page - 1)}
                    disabled={page === 1}
                    className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 flex items-center justify-center hover:bg-red-600 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-gray-100 disabled:dark:hover:bg-gray-700 disabled:hover:text-gray-700 disabled:dark:hover:text-gray-200 transition"
                    aria-label="Previous page"
                  >
                    <i className="fas fa-chevron-left text-xs"></i>
                  </button>
                  {pageNumbers.map((p) => (
                    <button
                      key={p}
                      onClick={() => goToPage(p)}
                      className={`w-10 h-10 rounded-full text-sm font-bold transition ${
                        p === page
                          ? "bg-red-600 text-white shadow-lg"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-red-100 dark:hover:bg-gray-600"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    onClick={() => goToPage(page + 1)}
                    disabled={page === totalPages}
                    className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 flex items-center justify-center hover:bg-red-600 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-gray-100 disabled:dark:hover:bg-gray-700 disabled:hover:text-gray-700 disabled:dark:hover:text-gray-200 transition"
                    aria-label="Next page"
                  >
                    <i className="fas fa-chevron-right text-xs"></i>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Store Locations Section */}
      {restaurantReady && (
        <section id="store-locations" className="py-16 bg-gray-50 dark:bg-gray-900 transition-colors duration-500">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-black text-gray-800 dark:text-white mb-2">{t("store_locations")}</h2>
            <div className="w-16 h-1 bg-red-600 rounded-full mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">Find us at these locations in Addis Ababa</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {restaurant?.latitude != null && restaurant.longitude != null && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 text-center shadow-sm border border-red-200 dark:border-red-800 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                <div className="w-14 h-14 bg-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <i className="fas fa-star text-white text-xl"></i>
                </div>
                <h3 className="font-bold text-gray-800 dark:text-white text-lg mb-2">{restaurant.name || "Main Branch"}</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  {Number(restaurant.latitude).toFixed(6)}, {Number(restaurant.longitude).toFixed(6)}<br />{restaurant.address || "Addis Ababa"}
                </p>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${Number(restaurant.latitude)},${Number(restaurant.longitude)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-full text-xs font-bold hover:bg-red-700 transition"
                >
                  <i className="fas fa-directions text-xs"></i> Get Directions
                </a>
              </div>
            )}
            {branches.filter((b) => !b.is_main && b.latitude != null && b.longitude != null).map((b, index) => (
              <div key={b.id} className="bg-white dark:bg-gray-800 rounded-2xl p-6 text-center shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <i className="fas fa-store text-red-600 text-xl"></i>
                </div>
                <h3 className="font-bold text-gray-800 dark:text-white text-lg mb-2">{b.name}</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  {Number(b.latitude).toFixed(5)}, {Number(b.longitude).toFixed(5)}<br />Addis Ababa
                </p>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${Number(b.latitude)},${Number(b.longitude)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-full text-xs font-bold hover:bg-red-700 transition"
                >
                  <i className="fas fa-directions text-xs"></i> Get Directions
                </a>
              </div>
            ))}
          </div>
          <div className="mt-10 overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg">
            <BranchMap restaurant={restaurant} branches={branches} />
          </div>
        </div>
        </section>
      )}

      {/* About Us Section */}
      <section id="about-us" className="py-16 bg-white dark:bg-gray-800 transition-colors duration-500">
        <div className="max-w-7xl mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-black text-gray-800 dark:text-white mb-2">{t("about_us")}</h2>
            <div className="w-16 h-1 bg-red-600 rounded-full mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 leading-relaxed text-lg whitespace-pre-line">
              {currentLang === "am" && restaurant?.about_amharic
                ? restaurant.about_amharic
                : restaurant?.about || t("footer_about")}
            </p>
          </div>
        </div>
      </section>

      <section className="py-16 bg-gray-50 dark:bg-gray-900 transition-colors duration-500">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="feature-card bg-white dark:bg-gray-800 rounded-3xl p-8 text-center shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="feature-icon w-20 h-20 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <i className="fas fa-utensils text-red-600 text-3xl"></i>
              </div>
              <h3 className="font-black text-gray-800 dark:text-white text-xl mb-3">{t("feat_quality")}</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">{t("feat_quality_desc")}</p>
            </div>
            <div className="feature-card bg-white dark:bg-gray-800 rounded-3xl p-8 text-center shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="feature-icon w-20 h-20 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <i className="fas fa-tag text-red-600 text-3xl"></i>
              </div>
              <h3 className="font-black text-gray-800 dark:text-white text-xl mb-3">{t("feat_deals")}</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">{t("feat_deals_desc")}</p>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-white dark:bg-gray-800 text-gray-800 dark:text-white pt-16 pb-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 via-red-400 to-red-600" />
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-12">
            <div className="text-center md:text-left">
              <div className="flex items-center gap-3 mb-5 justify-center md:justify-start">
                {restaurant?.logo ? (
                  <img src={restaurant.logo} alt={restaurant.name || "Restaurant"} className="w-10 h-10 rounded-full object-cover shadow-lg" />
                ) : (
                  <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center shadow-lg">
                    <svg viewBox="0 0 100 100" className="w-6 h-6" fill="white">
                      <path d="M50 5 L85 25 L85 35 L50 20 L15 35 L15 25 Z" />
                      <path d="M20 35 L20 75 Q20 85 30 85 L40 85 L40 45 L35 45 L35 35 Z" />
                      <path d="M45 35 L45 85 L55 85 L55 35 Z" />
                      <path d="M60 35 L60 45 L65 45 L65 85 L70 85 Q80 85 80 75 L80 35 Z" />
                    </svg>
                  </div>
                )}
                <span className="text-xl font-black">{restaurant?.name || "Pizza Hut"}</span>
              </div>
            </div>
            <div className="text-center md:text-left">
              <h4 className="font-black mb-5 text-lg">{t("help_support")}</h4>
              <ul className="space-y-3 text-sm text-gray-500 dark:text-gray-400">
                <li><span className="hover:text-red-600 hover:pl-2 transition-all duration-300 flex items-center gap-2 justify-center md:justify-start cursor-pointer"><i className="fas fa-chevron-right text-xs text-red-600 opacity-0 hover:opacity-100 transition-opacity"></i> {t("faqs")}</span></li>
                <li><span className="hover:text-red-600 hover:pl-2 transition-all duration-300 flex items-center gap-2 justify-center md:justify-start cursor-pointer"><i className="fas fa-chevron-right text-xs text-red-600 opacity-0 hover:opacity-100 transition-opacity"></i> {t("terms")}</span></li>
                <li><span className="hover:text-red-600 hover:pl-2 transition-all duration-300 flex items-center gap-2 justify-center md:justify-start cursor-pointer"><i className="fas fa-chevron-right text-xs text-red-600 opacity-0 hover:opacity-100 transition-opacity"></i> {t("privacy")}</span></li>
              </ul>
            </div>
            {restaurantReady && (
              <div className="text-center md:text-left">
                <h4 className="font-black mb-5 text-lg">{t("contact")}</h4>
                <ul className="space-y-3 text-sm text-gray-500 dark:text-gray-400">
                  {contacts.length > 0 ? (
                    contacts.map((c) => (
                      <div key={c.id} className="space-y-3">
                        <li className="flex items-center gap-3 justify-center md:justify-start hover:text-red-600 transition-colors cursor-pointer"><i className="fas fa-phone-alt text-red-600"></i> {c.phone}</li>
                        <li className="flex items-center gap-3 justify-center md:justify-start hover:text-red-600 transition-colors cursor-pointer"><i className="fas fa-envelope text-red-600"></i> {c.email}</li>
                        <li className="flex items-center gap-3 justify-center md:justify-start hover:text-red-600 transition-colors"><i className="fas fa-map-marker-alt text-red-600"></i> {c.location}</li>
                      </div>
                    ))
                  ) : (
                    <li className="text-gray-400 dark:text-gray-500">No contact info yet</li>
                  )}
                </ul>
                <div className="flex gap-3 mt-6 justify-center md:justify-start">
                  {socialLinks.length > 0 ? (
                    socialLinks.map((link) => (
                      <a
                        key={link.id}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={link.platform}
                        className="social-icon w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center hover:bg-red-600 hover:text-white transition"
                      >
                        <i className={socialIconMap[link.platform] || "fas fa-link"}></i>
                      </a>
                    ))
                  ) : (
                    <span className="text-sm text-gray-400 dark:text-gray-500">No social media links yet</span>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="border-t border-gray-200 dark:border-gray-700 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-500 dark:text-gray-400 text-sm">&copy; {new Date().getFullYear()} {restaurant?.name || "Pizza Hut"} {t("rights")}</p>
            <div className="flex items-center gap-4 text-gray-500 text-sm">
              <span>{t("delivered_by")}</span>
              <span className="font-black text-white bg-red-600 px-3 py-1 rounded-full text-xs">{restaurant?.name || t("ph_ethiopia")}</span>
            </div>
          </div>
        </div>
      </footer>

      <div onClick={() => setCartOpen(false)} className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-all duration-300 ${cartOpen ? "" : "hidden"}`} />
      <div className={`fixed top-0 right-0 h-full w-full max-w-md bg-white dark:bg-gray-800 z-50 shadow-2xl flex flex-col ${cartOpen ? "translate-x-0" : "translate-x-full"}`} style={{ transition: "transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)" }}>
        <div className="p-5 border-b dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-900">
          <h3 className="font-black text-xl text-gray-800 dark:text-white flex items-center gap-2"><i className="fas fa-shopping-bag text-red-600"></i> {t("your_cart")}</h3>
          <button onClick={() => setCartOpen(false)} className="w-10 h-10 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center transition hover:rotate-90 duration-300">
            <i className="fas fa-times text-gray-600 dark:text-gray-300 text-lg"></i>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {cart.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
                <i className="fas fa-shopping-basket text-gray-300 dark:text-gray-500 text-4xl"></i>
              </div>
              <p className="text-gray-500 dark:text-gray-400 font-bold text-lg">{t("cart_empty")}</p>
              <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">{t("cart_empty_desc")}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {cart.map((item) => (
                <div key={`${item.id}-${item.optionKey ?? ""}`} className="flex gap-3 bg-gray-50 dark:bg-gray-700 rounded-xl p-3">
                  {item.image ? (
                    <img src={item.image} alt={currentLang === "am" ? item.nameAm : item.name} className="w-16 h-16 object-contain rounded-lg bg-white dark:bg-gray-800" />
                  ) : (
                    <div className="w-16 h-16 bg-gray-200 dark:bg-gray-600 rounded-lg flex items-center justify-center text-gray-400 text-xs">No Image</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm text-gray-800 dark:text-white truncate">
                      {currentLang === "am" ? item.nameAm : item.name}
                      {item.optionNames && <span className="text-gray-500 font-normal ml-1">({item.optionNames})</span>}
                    </h4>
                    <p className="text-red-600 font-bold text-sm">{t("currency")} {item.price.toFixed(2)}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <button onClick={() => updateQty(item.id, item.optionKey, -1)} className="w-6 h-6 rounded-full bg-white dark:bg-gray-600 border dark:border-gray-500 flex items-center justify-center text-xs hover:bg-gray-100 dark:hover:bg-gray-500 text-gray-700 dark:text-white transition">-</button>
                      <span className="text-sm font-semibold w-4 text-center text-gray-800 dark:text-white">{item.qty}</span>
                      <button onClick={() => updateQty(item.id, item.optionKey, 1)} className="w-6 h-6 rounded-full bg-white dark:bg-gray-600 border dark:border-gray-500 flex items-center justify-center text-xs hover:bg-gray-100 dark:hover:bg-gray-500 text-gray-700 dark:text-white transition">+</button>
                    </div>
                  </div>
                  <button onClick={() => removeFromCart(item.id, item.optionKey)} className="text-gray-400 hover:text-red-500 transition self-start">
                    <i className="fas fa-trash-alt text-sm"></i>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        {cart.length > 0 && (
          <div className="p-5 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <div className="flex justify-between mb-3 text-sm">
              <span className="text-gray-500 dark:text-gray-400">{t("subtotal")}</span>
              <span className="font-bold text-gray-800 dark:text-white">{t("currency")} {totalCartPrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between mb-6 text-xl font-black text-gray-800 dark:text-white border-t dark:border-gray-700 pt-4">
              <span>{t("total")}</span>
              <span>{t("currency")} {totalCartPrice.toFixed(2)}</span>
            </div>
            <button
              onClick={() => {
                setCartOpen(false);
                if (!user) openAuth("login", "/orders");
                else router.push("/orders");
              }}
              className="w-full bg-red-600 text-white py-4 rounded-2xl font-black text-lg hover:bg-red-700 transition-all duration-300 shadow-lg hover:shadow-red-600/30 flex items-center justify-center gap-2"
            >
              {t("checkout")} <i className="fas fa-arrow-right"></i>
            </button>
          </div>
        )}
      </div>

      <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-8 py-4 rounded-2xl shadow-2xl z-50 items-center gap-3 font-bold ${toast.visible ? "flex" : "hidden"}`}>
        <i className="fas fa-check-circle text-green-400 dark:text-green-600 text-xl"></i>
        <span>{toast.message}</span>
      </div>

      <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className={`fixed bottom-8 right-8 w-12 h-12 bg-red-600 text-white rounded-full shadow-xl hover:scale-110 transition-all duration-300 z-40 items-center justify-center hover:shadow-red-600/40 ${showScrollTop ? "flex" : "hidden"}`}>
        <i className="fas fa-arrow-up"></i>
      </button>

      <ConfirmDialog
        open={logoutOpen}
        onClose={() => setLogoutOpen(false)}
        onConfirm={() => { setLogoutOpen(false); logout.mutate(); }}
        title="Logout"
        description="Are you sure you want to logout?"
        confirmLabel="Logout"
        destructive
      />
    </div>
  );
}
