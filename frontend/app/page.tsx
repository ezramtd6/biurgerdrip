"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/services/api";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
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
import { RestaurantInfo, Category, Product, Branch, SocialLink, Contact } from "@/types";
import dynamic from "next/dynamic";

const BranchMap = dynamic(() => import("@/components/BranchMap"), { ssr: false });

const translations: Record<string, Record<string, string>> = {
  en: {
    store_locations: "Store Locations",
    contact_us: "Contact Us",
    menu: "Menu",
    about_us: "About Us",
    my_account: "Login",
    cart: "Cart",
    hero_title: "No One OutPizzas the Hut!",
    hero_desc: "Order your favorite pizza online from Pizza Hut Ethiopia. Explore delicious flavors and enjoy fast, reliable delivery to your doorstep in Addis Ababa.",
    order_now: "Order Now",
    view_deals: "View Deals",
    free_delivery: "Free Delivery",
    free_delivery_desc: "On orders over ETB 500",
    cat_pizza: "PIZZAS",
    cat_sides: "SIDES",
    cat_melts: "MELTS",
    cat_pasta: "PASTA",
    cat_drinks: "DRINKS",
    cat_desserts: "DESSERTS",
    hot_deal: "HOT DEAL",
    deal_title: "3 Personal Pan Pizzas",
    deal_desc: "Starting @ ETB 499 only! Save up to 35%",
    grab_deal: "Grab the Deal",
    our_menu: "Our Menu",
    menu_subtitle: "Freshly made, delivered hot to your door",
    all: "All",
    feat_delivery: "Fast Delivery",
    feat_delivery_desc: "Hot and fresh delivered to your doorstep in 30 minutes or less.",
    feat_quality: "Quality Ingredients",
    feat_quality_desc: "Only the freshest ingredients go into every pizza we make.",
    feat_deals: "Best Deals",
    feat_deals_desc: "Amazing combos and discounts every day of the week.",
    footer_about: "The Pizza Hut story begins in May 1958. Dan and Frank Carney opened their 550-square-foot pizza restaurant in Wichita, Kansas.",
    help_support: "Help & Support",
    faqs: "FAQs",
    terms: "Terms & Conditions",
    privacy: "Privacy Policy",
    contact: "Contact",
    rights: "All rights reserved.",
    delivered_by: "Delivered by:",
    ph_ethiopia: "Pizza Hut Ethiopia",
    your_cart: "Your Cart",
    cart_empty: "Your cart is empty",
    cart_empty_desc: "Add some delicious items!",
    subtotal: "Subtotal",
    delivery: "Delivery",
    free: "Free",
    total: "Total",
    checkout: "Checkout",
    add: "Add",
    added_to_cart: "added to cart!",
  },
  am: {
    store_locations: "የሱቅ ቦታዎች",
    contact_us: "አግኙን",
    menu: "ምናሌ",
    about_us: "ስለ እኛ",
    my_account: "የእኔ መለያ",
    cart: "ተራማጅ",
    hero_title: "ማንም ሆቱን አያሸንፍም!",
    hero_desc: "የተወደደውን ፒዛ ከፒዛ ሆት ኢትዮጵያ በኦንላይን ይዘዙ። ጣፋጭ ጣዕሞችን ያስሱ እና በአዲስ አበባ ወደ ቤትዎ ፈጣን እና አስተማማኝ አቅርቦት ይደህኑ።",
    order_now: "አሁን ይዘዙ",
    view_deals: "ቅናሾችን ይመልከቱ",
    free_delivery: "ነፃ አቅርቦት",
    free_delivery_desc: "በ ETB 500 በላይ ትዕዛዞች ላይ",
    cat_pizza: "ፒዛዎች",
    cat_sides: "ጎን ምግቦች",
    cat_melts: "ሜልትስ",
    cat_pasta: "ፓስታ",
    cat_drinks: "መጠጦች",
    cat_desserts: "ጣፋጭ ምግቦች",
    hot_deal: "ሞቃታማ ቅናሽ",
    deal_title: "3 የግል ፓን ፒዛዎች",
    deal_desc: "ከ ETB 499 ጀምሮ! እስከ 35% ይቆጥቡ",
    grab_deal: "ቅናሹን ያግኙ",
    our_menu: "ምናሌያችን",
    menu_subtitle: "በቅርብ ጊዜ የተሰራ፣ ለበርዎ በሙቀት ይደርሳል",
    all: "ሁሉም",
    feat_delivery: "ፈጣን አቅርቦት",
    feat_delivery_desc: "በሙቀት እና በአዲስነት ወደ ቤትዎ በ30 ደቂቃ ውስጥ ይደርሳል።",
    feat_quality: "ጥራት ያላቸው ንጥረ ነገሮች",
    feat_quality_desc: "በእያንዳንዱ ፒዛ ውስጥ የሚገቡት የተረጋገጠ ንጥረ ነገሮች ብቻ ናቸው።",
    feat_deals: "ምርጥ ቅናሾች",
    feat_deals_desc: "በሳምንቱ ሁሉ ቀን አስደናቂ ኮምቦዎች እና ቅናሾች።",
    footer_about: "የፒዛ ሆት ታሪክ በሚያዚያ 1958 ጀመረ። ዳን እና ፍራንክ ካርኒ በዊቺታ፣ ካንሳስ 550 ካሬ ጫማ የሆነውን የፒዛ ሬስቶራንት ከፈቱ።",
    help_support: "እገዛ እና ድጋፍ",
    faqs: "ተደጋጋሚ ጥያቄዎች",
    terms: "ደንቦች እና ሁኔታዎች",
    privacy: "የግላዊነት ፖሊሲ",
    contact: "አድራሻ",
    rights: "ሁሉም መብቶች የተጠበቁ ናቸው።",
    delivered_by: "የሚያቀርበው፦",
    ph_ethiopia: "ፒዛ ሆት ኢትዮጵያ",
    your_cart: "ተራማጅዎ",
    cart_empty: "ተራማጅዎ ባዶ ነው",
    cart_empty_desc: "ጣፋጭ ዕቃዎችን ይጨምሩ!",
    subtotal: "ንዑስ ድምር",
    delivery: "አቅርቦት",
    free: "ነፃ",
    total: "ጠቅላላ",
    checkout: "ይክፈሉ",
    add: "ጨምር",
    added_to_cart: "ወደ ተራማጅ ተጨምሯል!",
  },
};

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
}

export default function Home() {
  const { user, logout } = useAuth();
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
  const [currentLang, setCurrentLang] = useState("en");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<string | number>("all");
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: "", visible: false });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [headerScrolled, setHeaderScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
        setRestaurant(data && data.length > 0 ? data[0] : null);
        setRestaurantReady(data && data.length > 0);
      })
      .catch(() => setRestaurantReady(false))
      .finally(() => setCheckingRestaurant(false));
  }, []);

  useEffect(() => {
    api.get("/categories/")
      .then((res) => {
        const data = res.data.results || res.data;
        setCategories(Array.isArray(data) ? data : []);
      })
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    api.get("/products/")
      .then((res) => {
        const data = res.data.results || res.data;
        setProducts(Array.isArray(data) ? data : []);
      })
      .catch(() => setProducts([]));
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

  const t = (key: string) => translations[currentLang]?.[key] || translations.en[key] || key;

  const addToCart = (item: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) return prev.map((i) => (i.id === item.id ? { ...i, qty: i.qty + 1 } : i));
      return [{ id: item.id, name: item.name, nameAm: item.name_amharic || item.name, price: Number(item.price), image: item.image || "", qty: 1 }, ...prev];
    });
    showToast(`${currentLang === "am" ? item.name_amharic || item.name : item.name} ${t("added_to_cart")}`);
  };

  const removeFromCart = (id: number) => setCart((prev) => prev.filter((i) => i.id !== id));

  const updateQty = (id: number, delta: number) => {
    setCart((prev) => prev.map((i) => (i.id === id ? { ...i, qty: i.qty + delta } : i)).filter((i) => i.qty > 0));
  };

  const showToast = (message: string) => {
    setToast({ message, visible: true });
    setTimeout(() => setToast({ message: "", visible: false }), 2500);
  };

  const filteredItems = currentCategory === "all" ? products : products.filter((i) => i.category === currentCategory);
  const totalQty = cart.reduce((sum, i) => sum + i.qty, 0);
  const totalCartPrice = cart.reduce((sum, i) => sum + i.price * i.qty, 0);

  const menuAvailable = !checkingRestaurant && restaurantReady;

  return (
    <div className="bg-gray-50 dark:bg-gray-900 transition-colors duration-500">
      <header className={`bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl sticky top-0 z-50 transition-all duration-300 ${headerScrolled ? "shadow-md" : "shadow-sm"}`}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-18 py-3">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-11 h-11 bg-red-600 rounded-full flex items-center justify-center shadow-lg group-hover:shadow-red-600/30 group-hover:scale-110 transition-all duration-300">
                <svg viewBox="0 0 100 100" className="w-7 h-7" fill="white">
                  <path d="M50 5 L85 25 L85 35 L50 20 L15 35 L15 25 Z" />
                  <path d="M20 35 L20 75 Q20 85 30 85 L40 85 L40 45 L35 45 L35 35 Z" />
                  <path d="M45 35 L45 85 L55 85 L55 35 Z" />
                  <path d="M60 35 L60 45 L65 45 L65 85 L70 85 Q80 85 80 75 L80 35 Z" />
                </svg>
              </div>
              <span className="text-2xl font-black text-red-600 tracking-tight group-hover:tracking-wide transition-all duration-300">Pizza Hut</span>
            </Link>
            <nav className="hidden lg:flex items-center gap-8">
              <a href="#menu" className="nav-link text-sm font-bold text-gray-700 dark:text-gray-200 hover:text-red-600 transition-colors py-2">{t("menu")}</a>
              <a href="#store-locations" className="nav-link text-sm font-bold text-gray-700 dark:text-gray-200 hover:text-red-600 transition-colors py-2">{t("store_locations")}</a>
              <a href="#about-us" className="nav-link text-sm font-bold text-gray-700 dark:text-gray-200 hover:text-red-600 transition-colors py-2">{t("about_us")}</a>
            </nav>
            <div className="flex items-center gap-3">
              <button onClick={toggleDarkMode} className="dark-toggle w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-yellow-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition shadow-sm">
                {isDark ? <i className="fas fa-sun text-lg"></i> : <i className="fas fa-moon text-lg"></i>}
              </button>
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
                      <DropdownMenuItem onClick={() => router.push("/change-password")}>
                        Change Password
                      </DropdownMenuItem>
                      <DropdownMenuItem variant="destructive" onClick={() => logout.mutate()}>
                        Logout
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ) : (
                <Link href="/login" className="hidden md:flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-200 hover:text-red-600 transition px-3 py-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                  <i className="far fa-user"></i> {t("my_account")}
                </Link>
              )}
              <button onClick={() => setCartOpen(true)} className="relative bg-red-600 text-white px-5 py-2.5 rounded-full text-sm font-bold hover:bg-red-700 transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-red-600/30 hover:scale-105 active:scale-95">
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
        <div className={`lg:hidden bg-white dark:bg-gray-800 border-t dark:border-gray-700 shadow-lg ${mobileMenuOpen ? "" : "hidden"}`}>
          <div className="px-4 py-4 space-y-1">
            <a href="#menu" onClick={() => setMobileMenuOpen(false)} className="block py-3 px-4 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-red-50 dark:hover:bg-gray-700 hover:text-red-600 rounded-xl transition-all">{t("menu")}</a>
            <a href="#store-locations" onClick={() => setMobileMenuOpen(false)} className="block py-3 px-4 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-red-50 dark:hover:bg-gray-700 hover:text-red-600 rounded-xl transition-all">{t("store_locations")}</a>
            <a href="#about-us" onClick={() => setMobileMenuOpen(false)} className="block py-3 px-4 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-red-50 dark:hover:bg-gray-700 hover:text-red-600 rounded-xl transition-all">{t("about_us")}</a>
            {user && mounted ? (
              <button onClick={() => { logout.mutate(); setMobileMenuOpen(false); }} className="block w-full text-left py-3 px-4 text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-gray-700 hover:text-red-600 rounded-xl transition-all">Logout</button>
            ) : (
              <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="block py-3 px-4 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-red-50 dark:hover:bg-gray-700 hover:text-red-600 rounded-xl transition-all">{t("my_account")}</Link>
            )}
          </div>
        </div>
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
            <div className="text-white">
              <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight tracking-tight">
                <span className="block">No One OutPizzas</span>
                <span className="block text-yellow-300">the Hut!</span>
              </h1>
              <p className="text-lg md:text-xl text-red-100 mb-10 max-w-lg leading-relaxed">{t("hero_desc")}</p>
              <div className="flex flex-wrap gap-4">
                <a href="#menu" className="group bg-white text-red-600 px-8 py-4 rounded-full font-black text-lg hover:bg-gray-100 transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 flex items-center gap-2">
                  {t("order_now")} <i className="fas fa-arrow-right group-hover:translate-x-1 transition-transform"></i>
                </a>
                <a href="#deals" className="group border-2 border-white text-white px-8 py-4 rounded-full font-black text-lg hover:bg-white hover:text-red-600 transition-all duration-300 flex items-center gap-2 backdrop-blur-sm">{t("view_deals")}</a>
              </div>
            </div>
            <div className="relative hidden md:block">
              <div className="animate-bounce" style={{ animationDuration: "6s" }}>
                <img src="https://www.pizzahut.et/95e49adae4d362a79e4d4df4c7c1c62d04bf9250" alt="Pizza" className="w-full max-w-lg mx-auto drop-shadow-2xl rounded-full" />
              </div>
              <div className="absolute -bottom-2 -left-4 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-2xl p-4 shadow-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <i className="fas fa-motorcycle text-green-600 text-xl"></i>
                  </div>
                  <div>
                    <p className="font-bold text-gray-800 dark:text-gray-100">{t("free_delivery")}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t("free_delivery_desc")}</p>
                  </div>
                </div>
              </div>
              <div className="absolute top-10 -right-4 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-2xl p-4 shadow-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                    <i className="fas fa-star text-yellow-600 text-xl"></i>
                  </div>
                  <div>
                    <p className="font-bold text-gray-800 dark:text-gray-100">4.9 Rating</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">10,000+ Reviews</p>
                  </div>
                </div>
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
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
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
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6">
            <div>
              <h2 className="text-3xl md:text-4xl font-black text-gray-800 dark:text-white mb-2">{t("our_menu")}</h2>
              <div className="w-16 h-1 bg-red-600 rounded-full mb-2" />
              <p className="text-gray-500 dark:text-gray-400">{t("menu_subtitle")}</p>
            </div>
            {menuAvailable && (
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
                <button onClick={() => setCurrentCategory("all")} className={`filter-btn flex-shrink-0 px-6 py-2.5 rounded-full text-sm font-bold transition whitespace-nowrap ${currentCategory === "all" ? "active brand-selected" : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200"}`}>{t("all")}</button>
                {categories.map((cat) => (
                  <button key={cat.id} onClick={() => setCurrentCategory(cat.id)} className={`filter-btn flex-shrink-0 px-6 py-2.5 rounded-full text-sm font-bold transition whitespace-nowrap ${currentCategory === cat.id ? "active brand-selected" : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200"}`}>{currentLang === "am" ? cat.name_amharic || cat.name : cat.name}</button>
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
              <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">The restaurant has not been configured yet. Please check back later.</p>
            </div>
          )}
          {menuAvailable && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-7">
                {filteredItems.map((item, index) => {
                  const itemName = currentLang === "am" ? item.name_amharic || item.name : item.name;
                  const itemDesc = currentLang === "am" ? item.description_amharic || item.description : item.description;
                  return (
                    <div key={item.id} className="menu-card bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-700 transition-all duration-300" style={{ animationDelay: `${index * 0.05}s` }}>
                      <div className="relative overflow-hidden">
                        <img src={item.image || ""} alt={itemName} className="w-full h-48 object-contain bg-gray-50 dark:bg-gray-900 p-4" />
                      </div>
                      <div className="p-4">
                        <h3 className="font-bold text-gray-800 dark:text-white text-lg mb-1">{itemName}</h3>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mb-3 line-clamp-2">{itemDesc}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-red-600 font-black text-xl">ETB {Number(item.price).toFixed(2)}</span>
                          <button onClick={() => addToCart(item)} className="add-btn bg-red-600 text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-red-700 transition flex items-center gap-1.5 active:scale-95 shadow-lg">
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
            </>
          )}
        </div>
      </section>

      {/* Store Locations Section */}
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
                  {Number(restaurant.latitude).toFixed(5)}, {Number(restaurant.longitude).toFixed(5)}<br />Addis Ababa
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
            {branches.filter((b) => b.latitude != null && b.longitude != null).map((b, index) => (
              <div key={b.id} className="bg-white dark:bg-gray-800 rounded-2xl p-6 text-center shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <i className="fas fa-store text-red-600 text-xl"></i>
                </div>
                <h3 className="font-bold text-gray-800 dark:text-white text-lg mb-2">Branch {index + 1}</h3>
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

      {/* About Us Section */}
      <section id="about-us" className="py-16 bg-white dark:bg-gray-800 transition-colors duration-500">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="flex-1">
              <h2 className="text-3xl md:text-4xl font-black text-gray-800 dark:text-white mb-2">{t("about_us")}</h2>
              <div className="w-16 h-1 bg-red-600 rounded-full mb-4" />
              <p className="text-gray-500 dark:text-gray-400 leading-relaxed text-lg">{t("footer_about")}</p>
            </div>
            <div className="flex-1">
              <div className="bg-red-50 dark:bg-gray-700 rounded-3xl p-8 text-center shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <i className="fas fa-pizza-slice text-white text-3xl"></i>
                </div>
                <h3 className="font-black text-gray-800 dark:text-white text-xl mb-2">Since 1958</h3>
                <p className="text-gray-500 dark:text-gray-400">Serving quality pizza for over 65 years</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-gray-50 dark:bg-gray-900 transition-colors duration-500">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="feature-card bg-white dark:bg-gray-800 rounded-3xl p-8 text-center shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="feature-icon w-20 h-20 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <i className="fas fa-motorcycle text-red-600 text-3xl"></i>
              </div>
              <h3 className="font-black text-gray-800 dark:text-white text-xl mb-3">{t("feat_delivery")}</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">{t("feat_delivery_desc")}</p>
            </div>
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
            <div>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center shadow-lg">
                  <svg viewBox="0 0 100 100" className="w-6 h-6" fill="white">
                    <path d="M50 5 L85 25 L85 35 L50 20 L15 35 L15 25 Z" />
                    <path d="M20 35 L20 75 Q20 85 30 85 L40 85 L40 45 L35 45 L35 35 Z" />
                    <path d="M45 35 L45 85 L55 85 L55 35 Z" />
                    <path d="M60 35 L60 45 L65 45 L65 85 L70 85 Q80 85 80 75 L80 35 Z" />
                  </svg>
                </div>
                <span className="text-xl font-black">Pizza Hut</span>
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">{t("footer_about")}</p>
            </div>
            <div>
              <h4 className="font-black mb-5 text-lg">{t("help_support")}</h4>
              <ul className="space-y-3 text-sm text-gray-500 dark:text-gray-400">
                <li><span className="hover:text-red-600 hover:pl-2 transition-all duration-300 flex items-center gap-2 cursor-pointer"><i className="fas fa-chevron-right text-xs text-red-600 opacity-0 hover:opacity-100 transition-opacity"></i> {t("contact_us")}</span></li>
                <li><span className="hover:text-red-600 hover:pl-2 transition-all duration-300 flex items-center gap-2 cursor-pointer"><i className="fas fa-chevron-right text-xs text-red-600 opacity-0 hover:opacity-100 transition-opacity"></i> {t("faqs")}</span></li>
                <li><span className="hover:text-red-600 hover:pl-2 transition-all duration-300 flex items-center gap-2 cursor-pointer"><i className="fas fa-chevron-right text-xs text-red-600 opacity-0 hover:opacity-100 transition-opacity"></i> {t("terms")}</span></li>
                <li><span className="hover:text-red-600 hover:pl-2 transition-all duration-300 flex items-center gap-2 cursor-pointer"><i className="fas fa-chevron-right text-xs text-red-600 opacity-0 hover:opacity-100 transition-opacity"></i> {t("privacy")}</span></li>
              </ul>
            </div>
            <div>
              <h4 className="font-black mb-5 text-lg">{t("contact")}</h4>
              <ul className="space-y-3 text-sm text-gray-500 dark:text-gray-400">
                {contacts.length > 0 ? (
                  contacts.map((c) => (
                    <div key={c.id} className="space-y-3">
                      <li className="flex items-center gap-3 hover:text-red-600 transition-colors cursor-pointer"><i className="fas fa-phone-alt text-red-600"></i> {c.phone}</li>
                      <li className="flex items-center gap-3 hover:text-red-600 transition-colors cursor-pointer"><i className="fas fa-envelope text-red-600"></i> {c.email}</li>
                      <li className="flex items-center gap-3 hover:text-red-600 transition-colors"><i className="fas fa-map-marker-alt text-red-600"></i> {c.location}</li>
                    </div>
                  ))
                ) : (
                  <li className="text-gray-400 dark:text-gray-500">No contact info yet</li>
                )}
              </ul>
              <div className="flex gap-3 mt-6">
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
          </div>
          <div className="border-t border-gray-200 dark:border-gray-700 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-500 dark:text-gray-400 text-sm">&copy; 2026 Pizza Hut (Pty) Ltd. {t("rights")}</p>
            <div className="flex items-center gap-4 text-gray-500 text-sm">
              <span>{t("delivered_by")}</span>
              <span className="font-black text-white bg-red-600 px-3 py-1 rounded-full text-xs">{t("ph_ethiopia")}</span>
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
                <div key={item.id} className="flex gap-3 bg-gray-50 dark:bg-gray-700 rounded-xl p-3">
                  <img src={item.image} alt={currentLang === "am" ? item.nameAm : item.name} className="w-16 h-16 object-contain rounded-lg bg-white dark:bg-gray-800" />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm text-gray-800 dark:text-white truncate">{currentLang === "am" ? item.nameAm : item.name}</h4>
                    <p className="text-red-600 font-bold text-sm">ETB {item.price.toFixed(2)}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <button onClick={() => updateQty(item.id, -1)} className="w-6 h-6 rounded-full bg-white dark:bg-gray-600 border dark:border-gray-500 flex items-center justify-center text-xs hover:bg-gray-100 dark:hover:bg-gray-500 text-gray-700 dark:text-white transition">-</button>
                      <span className="text-sm font-semibold w-4 text-center text-gray-800 dark:text-white">{item.qty}</span>
                      <button onClick={() => updateQty(item.id, 1)} className="w-6 h-6 rounded-full bg-white dark:bg-gray-600 border dark:border-gray-500 flex items-center justify-center text-xs hover:bg-gray-100 dark:hover:bg-gray-500 text-gray-700 dark:text-white transition">+</button>
                    </div>
                  </div>
                  <button onClick={() => removeFromCart(item.id)} className="text-gray-400 hover:text-red-500 transition self-start">
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
              <span className="font-bold text-gray-800 dark:text-white">ETB {totalCartPrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between mb-4 text-sm">
              <span className="text-gray-500 dark:text-gray-400">{t("delivery")}</span>
              <span className="font-bold text-green-600 flex items-center gap-1"><i className="fas fa-check-circle text-xs"></i> {t("free")}</span>
            </div>
            <div className="flex justify-between mb-6 text-xl font-black text-gray-800 dark:text-white border-t dark:border-gray-700 pt-4">
              <span>{t("total")}</span>
              <span>ETB {totalCartPrice.toFixed(2)}</span>
            </div>
            <Link href="/orders" onClick={() => setCartOpen(false)} className="w-full bg-red-600 text-white py-4 rounded-2xl font-black text-lg hover:bg-red-700 transition-all duration-300 shadow-lg hover:shadow-red-600/30 flex items-center justify-center gap-2">
              {t("checkout")} <i className="fas fa-arrow-right"></i>
            </Link>
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
    </div>
  );
}
