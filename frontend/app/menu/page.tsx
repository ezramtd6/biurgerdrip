"use client";

import { useState, useEffect, useRef } from "react";
import { useCategories, useProducts, useRestaurant } from "@/hooks/useProducts";
import { useAuth } from "@/hooks/useAuth";
import { Loading } from "@/components/common/Loading";
import { useTheme } from "@/hooks/useTheme";
import Link from "next/link";
import { Product } from "@/types";

interface CartItem extends Product {
  qty: number;
}

export default function MenuPage() {
  const { data: restaurant, isLoading: loadingRestaurant } = useRestaurant();
  const { data: categories, isLoading: loadingCategories } = useCategories();
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const { data: products, isLoading: loadingProducts } = useProducts(selectedCategory);
  const { user } = useAuth();
  const { isDark, toggleDarkMode } = useTheme();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: "", visible: false });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const restaurantExists = restaurant && restaurant.length > 0;
  const restaurantInfo = restaurantExists ? restaurant[0] : null;

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
      setShowScrollTop(window.scrollY > 500);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing) {
        return prev.map((i) => (i.id === product.id ? { ...i, qty: i.qty + 1 } : i));
      }
      return [...prev, { ...product, qty: 1 }];
    });
    showToast(`${product.name} added to cart!`);
  };

  const removeFromCart = (id: number) => {
    setCart((prev) => prev.filter((i) => i.id !== id));
  };

  const updateQty = (id: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => (i.id === id ? { ...i, qty: i.qty + delta } : i))
        .filter((i) => i.qty > 0)
    );
  };

  const showToast = (message: string) => {
    setToast({ message, visible: true });
    setTimeout(() => setToast((prev) => ({ ...prev, visible: false })), 2500);
  };

  const totalCartItems = cart.reduce((sum, i) => sum + i.qty, 0);
  const totalCartPrice = cart.reduce((sum, i) => sum + i.price * i.qty, 0);

  const scrollToMenu = () => {
    menuRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  if (loadingRestaurant || loadingCategories) return <Loading />;

  if (!restaurantExists) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center max-w-lg">
          <div className="w-24 h-24 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-12 h-12 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h1 className="text-3xl font-black text-gray-800 dark:text-white mb-3">Restaurant Not Set Up</h1>
          <p className="text-gray-500 dark:text-gray-400 text-lg mb-6">
            The restaurant has not been configured yet. Please contact the manager to set up the restaurant information.
          </p>
          <div className="w-16 h-1 bg-orange-500 rounded-full mx-auto mb-6" />
          {!user && (
            <Link href="/login" className="inline-block bg-orange-500 text-white px-8 py-3 rounded-full font-bold hover:bg-orange-600 transition shadow-lg">
              Sign In
            </Link>
          )}
        </div>
      </div>
    );
  }

  const allCategories = categories || [];

  return (
    <div className="bg-gray-50 dark:bg-gray-900 transition-colors duration-500">
      {/* Header */}
      <header className={`bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl shadow-sm sticky top-0 z-50 transition-all duration-300 ${scrolled ? "shadow-md" : ""}`}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-18 py-3">
            <Link href="/menu" className="flex items-center gap-3 group">
              <div className="w-11 h-11 bg-orange-500 rounded-full flex items-center justify-center shadow-lg group-hover:shadow-orange-500/30 group-hover:scale-110 transition-all duration-300">
                {restaurantInfo?.logo ? (
                  <img src={restaurantInfo.logo} alt={restaurantInfo.name} className="w-full h-full object-cover rounded-full" />
                ) : (
                  <svg viewBox="0 0 100 100" className="w-7 h-7" fill="white">
                    <path d="M50 15 C30 15 15 30 15 50 C15 70 30 85 50 85 C70 85 85 70 85 50 C85 30 70 15 50 15 Z" />
                    <circle cx="35" cy="45" r="5" fill="#C2410C" />
                    <circle cx="55" cy="35" r="4" fill="#C2410C" />
                    <circle cx="65" cy="55" r="5" fill="#C2410C" />
                    <circle cx="45" cy="60" r="4" fill="#C2410C" />
                  </svg>
                )}
              </div>
              <span className="text-2xl font-black text-orange-500 tracking-tight group-hover:tracking-wide transition-all duration-300">
                {restaurantInfo?.name || "Burger House"}
              </span>
            </Link>

            <nav className="hidden lg:flex items-center gap-8">
              <Link href="/menu" className="nav-link text-sm font-bold text-gray-700 dark:text-gray-200 hover:text-orange-500 transition-colors py-2">
                Menu
              </Link>
              {user && (
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
              <button onClick={toggleDarkMode} className="dark-toggle w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-yellow-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition shadow-sm">
                {isDark ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" /></svg>
                ) : (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" /></svg>
                )}
              </button>

              <button onClick={() => setCartOpen(true)} className="relative bg-orange-500 text-white px-5 py-2.5 rounded-full text-sm font-bold hover:bg-orange-600 transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-orange-500/30 hover:scale-105 active:scale-95">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                <span className="hidden sm:inline">Cart</span>
                {totalCartItems > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-yellow-400 text-orange-600 text-xs font-black w-5 h-5 rounded-full flex items-center justify-center badge-pulse">
                    {totalCartItems}
                  </span>
                )}
              </button>

              {user ? (
                <div className="hidden md:flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{user.first_name}</span>
                  <Link href="/login" className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-orange-500 transition-colors">Logout</Link>
                </div>
              ) : (
                <Link href="/login" className="hidden md:flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-200 hover:text-orange-500 transition px-3 py-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
                  Sign In
                </Link>
              )}

              <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="lg:hidden text-gray-700 dark:text-gray-200 text-xl p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition">
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
              <Link href="/menu" onClick={() => setMobileMenuOpen(false)} className="block py-3 px-4 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-orange-50 dark:hover:bg-gray-700 hover:text-orange-500 rounded-xl transition-all">Menu</Link>
              {user && (
                <>
                  <Link href="/orders" onClick={() => setMobileMenuOpen(false)} className="block py-3 px-4 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-orange-50 dark:hover:bg-gray-700 hover:text-orange-500 rounded-xl transition-all">My Orders</Link>
                  <Link href="/profile" onClick={() => setMobileMenuOpen(false)} className="block py-3 px-4 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-orange-50 dark:hover:bg-gray-700 hover:text-orange-500 rounded-xl transition-all">Profile</Link>
                </>
              )}
              {!user && <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="block py-3 px-4 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-orange-50 dark:hover:bg-gray-700 hover:text-orange-500 rounded-xl transition-all">Sign In</Link>}
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="hero-gradient relative overflow-hidden min-h-[500px] flex items-center">
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
        </div>
        <div className="max-w-7xl mx-auto px-4 py-20 md:py-28 relative z-10">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="text-white slide-up">
              <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight tracking-tight">
                <span className="block">Taste the</span>
                <span className="block text-yellow-300">Best Burgers!</span>
              </h1>
              <p className="text-lg md:text-xl text-orange-100 mb-10 max-w-lg leading-relaxed">
                {restaurantInfo?.address
                  ? `Order your favorite burgers and meals online from ${restaurantInfo.name}. Enjoy fast, reliable delivery to your doorstep.`
                  : "Order your favorite burgers and meals online. Explore delicious flavors and enjoy fast, reliable delivery."}
              </p>
              <div className="flex flex-wrap gap-4">
                <button onClick={scrollToMenu} className="group bg-white text-orange-500 px-8 py-4 rounded-full font-black text-lg hover:bg-gray-100 transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 flex items-center gap-2">
                  Order Now
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                </button>
              </div>
            </div>
            <div className="relative hidden md:block">
              <div className="float">
                <div className="w-80 h-80 mx-auto bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <svg viewBox="0 0 100 100" className="w-48 h-48" fill="white">
                    <ellipse cx="50" cy="60" rx="40" ry="15" fill="#D97706" />
                    <ellipse cx="50" cy="50" rx="38" ry="12" fill="#65A30D" />
                    <ellipse cx="50" cy="40" rx="36" ry="10" fill="#DC2626" />
                    <ellipse cx="50" cy="30" rx="38" ry="12" fill="#F59E0B" />
                  </svg>
                </div>
              </div>
              {restaurantInfo?.opening_hours && (
                <div className="absolute -bottom-2 -left-4 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-2xl p-4 shadow-2xl hover:scale-105 transition-transform duration-300 cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <div>
                      <p className="font-bold text-gray-800 dark:text-gray-100">Open Now</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{restaurantInfo.opening_hours}</p>
                    </div>
                  </div>
                </div>
              )}
              {restaurantInfo?.phone && (
                <div className="absolute top-10 -right-4 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-2xl p-4 shadow-2xl hover:scale-105 transition-transform duration-300 cursor-pointer" style={{ animationDuration: "3s" }}>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                    </div>
                    <div>
                      <p className="font-bold text-gray-800 dark:text-gray-100">{restaurantInfo.phone}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Call to order</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Menu Section */}
      <section ref={menuRef} id="menu" className="py-16 bg-white dark:bg-gray-800 transition-colors duration-500">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6">
            <div>
              <h2 className="text-3xl md:text-4xl font-black text-gray-800 dark:text-white mb-2">Our Menu</h2>
              <div className="w-16 h-1 bg-orange-500 rounded-full mb-2" />
              <p className="text-gray-500 dark:text-gray-400">Freshly made, delivered hot to your door</p>
            </div>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`filter-btn flex-shrink-0 px-6 py-2.5 rounded-full text-sm font-bold transition whitespace-nowrap ${
                  selectedCategory === null ? "active brand-selected" : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
                }`}
              >
                All
              </button>
              {allCategories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`filter-btn flex-shrink-0 px-6 py-2.5 rounded-full text-sm font-bold transition whitespace-nowrap ${
                    selectedCategory === cat.id ? "active brand-selected" : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {loadingProducts ? (
            <Loading />
          ) : products && products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-7">
              {products.map((product, index) => (
                <div
                  key={product.id}
                  className="menu-card bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-700 transition-all duration-300 fade-in"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="relative overflow-hidden">
                    {product.image ? (
                      <img src={product.image} alt={product.name} className="w-full h-48 object-cover bg-gray-50 dark:bg-gray-900" />
                    ) : (
                      <div className="w-full h-48 bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-400 text-sm">No Image</div>
                    )}
                    {product.option_groups && product.option_groups.length > 0 && (
                      <span className="absolute top-3 left-3 bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">Customizable</span>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-gray-800 dark:text-white text-lg mb-1">{product.name}</h3>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mb-3 line-clamp-2">{product.description}</p>
                    <div className="flex items-center justify-between">
                      <Link href={`/menu/${product.id}`} className="add-btn bg-orange-500 text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-orange-600 transition flex items-center gap-1.5 active:scale-95 shadow-lg">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        View
                      </Link>
                      <button onClick={() => addToCart(product)} className="add-btn bg-orange-500 text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-orange-600 transition flex items-center gap-1.5 active:scale-95 shadow-lg">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <svg className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
              <p className="text-gray-500 dark:text-gray-400 font-bold text-lg">No products available</p>
              <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">Check back later for delicious items!</p>
            </div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-gray-50 dark:bg-gray-900 transition-colors duration-500">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="feature-card bg-white dark:bg-gray-800 rounded-3xl p-8 text-center shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="feature-icon w-20 h-20 bg-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <h3 className="font-black text-gray-800 dark:text-white text-xl mb-3">Fast Delivery</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">Hot and fresh delivered to your doorstep in 30 minutes or less.</p>
            </div>
            <div className="feature-card bg-white dark:bg-gray-800 rounded-3xl p-8 text-center shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="feature-icon w-20 h-20 bg-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <h3 className="font-black text-gray-800 dark:text-white text-xl mb-3">Quality Ingredients</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">Only the freshest ingredients go into every meal we make.</p>
            </div>
            <div className="feature-card bg-white dark:bg-gray-800 rounded-3xl p-8 text-center shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="feature-icon w-20 h-20 bg-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
              </div>
              <h3 className="font-black text-gray-800 dark:text-white text-xl mb-3">Best Deals</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">Amazing combos and discounts every day of the week.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800 text-gray-800 dark:text-white pt-16 pb-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 via-orange-400 to-orange-500" />
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-12">
            <div>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center shadow-lg">
                  <svg viewBox="0 0 100 100" className="w-6 h-6" fill="white">
                    <path d="M50 15 C30 15 15 30 15 50 C15 70 30 85 50 85 C70 85 85 70 85 50 C85 30 70 15 50 15 Z" />
                    <circle cx="35" cy="45" r="5" fill="#C2410C" />
                    <circle cx="55" cy="35" r="4" fill="#C2410C" />
                  </svg>
                </div>
                <span className="text-xl font-black">{restaurantInfo?.name || "Burger House"}</span>
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">{restaurantInfo?.name || "Burger House"} brings you the finest meals, crafted with passion and the freshest ingredients.</p>
            </div>
            <div>
              <h4 className="font-black mb-5 text-lg">Contact</h4>
              <ul className="space-y-3 text-sm text-gray-500 dark:text-gray-400">
                {restaurantInfo?.phone && (
                  <li className="flex items-center gap-3 hover:text-orange-500 transition-colors cursor-pointer">
                    <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                    {restaurantInfo.phone}
                  </li>
                )}
                {restaurantInfo?.address && (
                  <li className="flex items-center gap-3 hover:text-orange-500 transition-colors">
                    <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    {restaurantInfo.address}
                  </li>
                )}
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-200 dark:border-gray-700 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-500 dark:text-gray-400 text-sm">&copy; 2026 {restaurantInfo?.name || "Burger House"}. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Cart Sidebar */}
      {cartOpen && <div onClick={() => setCartOpen(false)} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-all duration-300" />}
      <div className={`fixed top-0 right-0 h-full w-full max-w-md bg-white dark:bg-gray-800 z-50 cart-slide shadow-2xl flex flex-col ${cartOpen ? "cart-open" : "cart-closed"}`}>
        <div className="p-5 border-b dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-900">
          <h3 className="font-black text-xl text-gray-800 dark:text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
            Your Cart
          </h3>
          <button onClick={() => setCartOpen(false)} className="w-10 h-10 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center transition hover:rotate-90 duration-300">
            <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {cart.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-12 h-12 text-gray-300 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
              </div>
              <p className="text-gray-500 dark:text-gray-400 font-bold text-lg">Your cart is empty</p>
              <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">Add some delicious items!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {cart.map((item) => (
                <div key={item.id} className="flex gap-3 bg-gray-50 dark:bg-gray-700 rounded-xl p-3">
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="w-16 h-16 object-cover rounded-lg" />
                  ) : (
                    <div className="w-16 h-16 bg-gray-200 dark:bg-gray-600 rounded-lg flex items-center justify-center text-gray-400 text-xs">No Image</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm text-gray-800 dark:text-white truncate">{item.name}</h4>
                    <p className="text-orange-500 font-bold text-sm">ETB {item.price.toFixed(2)}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <button onClick={() => updateQty(item.id, -1)} className="w-6 h-6 rounded-full bg-white dark:bg-gray-600 border dark:border-gray-500 flex items-center justify-center text-xs hover:bg-gray-100 dark:hover:bg-gray-500 text-gray-700 dark:text-white transition">-</button>
                      <span className="text-sm font-semibold w-4 text-center text-gray-800 dark:text-white">{item.qty}</span>
                      <button onClick={() => updateQty(item.id, 1)} className="w-6 h-6 rounded-full bg-white dark:bg-gray-600 border dark:border-gray-500 flex items-center justify-center text-xs hover:bg-gray-100 dark:hover:bg-gray-500 text-gray-700 dark:text-white transition">+</button>
                    </div>
                  </div>
                  <button onClick={() => removeFromCart(item.id)} className="text-gray-400 hover:text-red-500 transition self-start hover:scale-110">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {cart.length > 0 && (
          <div className="p-5 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <div className="flex justify-between mb-3 text-sm">
              <span className="text-gray-500 dark:text-gray-400">Subtotal</span>
              <span className="font-bold text-gray-800 dark:text-white">ETB {totalCartPrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between mb-6 text-xl font-black text-gray-800 dark:text-white border-t dark:border-gray-700 pt-4">
              <span>Total</span>
              <span>ETB {totalCartPrice.toFixed(2)}</span>
            </div>
            <Link href="/orders" onClick={() => setCartOpen(false)} className="w-full bg-orange-500 text-white py-4 rounded-2xl font-black text-lg hover:bg-orange-600 transition-all duration-300 shadow-lg hover:shadow-orange-500/30 hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2">
              Checkout
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
            </Link>
          </div>
        )}
      </div>

      {/* Toast */}
      {toast.visible && (
        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-8 py-4 rounded-2xl shadow-2xl z-50 flex items-center gap-3 font-bold ${toast.visible ? "toast-enter" : "toast-exit"}`}>
          <svg className="w-5 h-5 text-green-400 dark:text-green-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
          {toast.message}
        </div>
      )}

      {/* Scroll to top */}
      {showScrollTop && (
        <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="fixed bottom-8 right-8 w-12 h-12 bg-orange-500 text-white rounded-full shadow-xl hover:scale-110 transition-all duration-300 z-40 flex items-center justify-center hover:shadow-orange-500/40">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
        </button>
      )}
    </div>
  );
}
