"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

const translations: Record<string, Record<string, string>> = {
  en: {
    store_locations: "Store Locations",
    contact_us: "Contact Us",
    menu: "Menu",
    about_us: "About Us",
    orders: "Orders",
    my_account: "Login",
    cart: "Cart",
    hero_title: "No One OutPizzas the Hut!",
    hero_desc: "Order your favorite pizza online from Pizza Hut Ethiopia. Explore delicious flavors and enjoy fast, reliable delivery to your doorstep in Addis Ababa.",
    order_now: "Order Now",
    view_deals: "View Deals",
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
    size: "Size",
    select: "Select",
    currency: "ETB",
    my_orders: "My Orders",
    profile: "Profile",
    your_cart_checkout: "Your Cart & Checkout",
    order_history: "Order History",
    place_new_order: "Place New Order",
    your_cart_label: "Your Cart",
    subtotal_label: "Subtotal",
    coupon_discount: "Coupon discount",
    total_label: "Total",
    coupon_placeholder: "Coupon code (optional)",
    checking_coupon: "Checking coupon...",
    payment_method: "Payment Method",
    payment_proof: "Payment Proof",
    payment_proof_desc: "Attach a screenshot or photo of your payment receipt so the cashier can verify it.",
    tap_upload: "Tap to upload proof of payment",
    png_jpg: "PNG or JPG photo of your receipt",
    remove: "Remove",
    place_order: "Place Order",
    placing_order: "Placing Order...",
    final_confirmation: "Final Confirmation",
    final_choice: "Are you sure this is your final choice?",
    no_refunds: "No refunds will be issued once the order is placed.",
    go_back: "Go Back",
    yes_place_order: "Yes, Place Order",
    placing: "Placing...",
    order_placed: "Your order has been placed successfully!",
    view_order_history: "View order history",
    order_history_title: "Order History",
    no_orders_yet: "You haven't placed any orders yet",
    payment: "Payment:",
    payment_rejected_3: "Payment Rejected After 3 Attempts",
    re_upload_proof: "Re-upload payment proof",
    uploading: "Uploading...",
    new_proof_uploaded: "New proof uploaded — the cashier will verify it again.",
    your_cart_empty: "Your cart is empty",
    view_order_history_btn: "View Order History",
  },
  am: {
    store_locations: "የሱቅ ቦታዎች",
    contact_us: "አግኙን",
    menu: "ምናሌ",
    about_us: "ስለ እኛ",
    orders: "ትዕዛዞች",
    my_account: "የእኔ መለያ",
    cart: "ተራማጅ",
    hero_title: "ማንም ሆቱን አያሸንፍም!",
    hero_desc: "የተወደደውን ፒዛ ከፒዛ ሆት ኢትዮጵያ በኦንላይን ይዘዙ። ጣፋጭ ጣዕሞችን ያስሱ እና በአዲስ አበባ ወደ ቤትዎ ፈጣን እና አስተማማኝ አቅርቦት ይደህኑ።",
    order_now: "አሁን ይዘዙ",
    view_deals: "ቅናሾችን ይመልከቱ",
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
    size: "መጠን",
    select: "ይምረጡ",
    currency: "ብር",
    my_orders: "የእኔ ትዕዛዞች",
    profile: "መገለጫ",
    your_cart_checkout: "ተራማጅዎ እና ይክፈሉ",
    order_history: "የትዕዛዝ ታሪክ",
    place_new_order: "አዲስ ትዕዛዝ ይስጡ",
    your_cart_label: "ተራማጅዎ",
    subtotal_label: "ንዑስ ድምር",
    coupon_discount: "የኩፖን ቅናሽ",
    total_label: "ጠቅላላ",
    coupon_placeholder: "የኩፖን ባድኜ (አማራጭ)",
    checking_coupon: "ኩፖን እየተመመመ...",
    payment_method: "የክፍያ ዘዴ",
    payment_proof: "የክፍያ ማረጋገጫ",
    payment_proof_desc: "ከክፍያ ደብዳቤ ፎቶ ወይም ስክሪንሾት ይያዙ እንዲያረጋግጥዎ።",
    tap_upload: "ለመስቀል ይንኩ",
    png_jpg: "የደብዳቤ ፎቶ PNG ወይም JPG",
    remove: "አስወግድ",
    place_order: "ትዕዛዝ ይስጡ",
    placing_order: "ትዕዛዝ እየተሰጥ...",
    final_confirmation: "የመጨረሻ ማረጋገጫ",
    final_choice: "ይህ የመጨረሻ ምርጫ መሆኑን እርግጠኛ ነዎት?",
    no_refunds: "ትዕዛዙ በተሰጣቸው በኋላ ገንዘብ አይመለስም።",
    go_back: "ተመለስ",
    yes_place_order: "አዎ፣ ትዕዛዝ ይስጡ",
    placing: "እየተሰጥ...",
    order_placed: "ትዕዛዙ በተሳካ ሁኔታ ተሰጥቷል!",
    view_order_history: "የትዕዛዝ ታሪክ ይመልከቱ",
    order_history_title: "የትዕዛዝ ታሪክ",
    no_orders_yet: "ምንም ትዕዛዞች አልሰጡም",
    payment: "ክፍያ:",
    payment_rejected_3: "ክፍያ ውድቅ ተደርጓል (3)",
    re_upload_proof: "ማረጋገጫውን እንደገና ስቀል",
    uploading: "በመስቀል ላይ...",
    new_proof_uploaded: "አዲስ ማረጋገጫ ተሰቅሏል",
    options: "አማራጮች",
    option: "አማራጭ",
    your_cart_empty: "ተራማጅዎ ባዶ ነው",
    view_order_history_btn: "የትዕዛዝ ታሪክ ይመልከቱ",
  },
};

export type Language = "en" | "am";

interface LanguageContextValue {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(() => {
    if (typeof window === "undefined") return "en";
    const saved = localStorage.getItem("lang");
    return saved === "en" || saved === "am" ? saved : "en";
  });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const setLang = useCallback((l: Language) => {
    setLangState(l);
    localStorage.setItem("lang", l);
    document.documentElement.lang = l;
  }, []);

  const t = useCallback(
    (key: string) => translations[lang]?.[key] || translations.en[key] || key,
    [lang]
  );

  if (!mounted) {
    const tFallback = (key: string) => translations.en[key] || key;
    return (
      <LanguageContext.Provider value={{ lang: "en", setLang, t: tFallback }}>
        {children}
      </LanguageContext.Provider>
    );
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
