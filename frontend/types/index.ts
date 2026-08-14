export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  role: "ADMIN" | "MANAGER" | "CASHIER" | "CUSTOMER";
  is_active: boolean;
  branch: number | null;
}

export interface Category {
  id: number;
  name: string;
  name_amharic: string;
  image: string | null;
  description: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: number;
  category: number;
  name: string;
  name_amharic: string;
  description: string;
  description_amharic: string;
  price: number;
  discounted_price: number | null;
  has_sizes: boolean;
  is_active: boolean;
  image: string | null;
  option_groups: OptionGroup[];
  created_at: string;
  updated_at: string;
}

export interface OptionGroup {
  id: number;
  product: number;
  name: string;
  name_amharic: string;
  is_active: boolean;
  required: boolean;
  multiple_choice: boolean;
  display_order: number;
  values: OptionValue[];
}

export interface OptionValue {
  id: number;
  option_group: number;
  name: string;
  name_amharic: string;
  price_adjustment: number;
  available: boolean;
  display_order: number;
}

export interface RestaurantInfo {
  id: number;
  name: string;
  logo: string | null;
  address: string;
  phone: string;
  opening_hours: string;
  about: string;
  about_amharic: string;
  is_active: boolean;
  latitude: number | null;
  longitude: number | null;
}

export interface Branch {
  id: number;
  restaurant: number;
  name: string;
  is_main: boolean;
  latitude: number | null;
  longitude: number | null;
}

export type SocialPlatform =
  | "facebook"
  | "instagram"
  | "twitter"
  | "tiktok"
  | "youtube"
  | "telegram";

export interface SocialLink {
  id: number;
  restaurant: number;
  platform: SocialPlatform;
  url: string;
  created_at?: string;
}

export interface Contact {
  id: number;
  phone: string;
  email: string;
  location: string;
  created_at?: string;
}

export interface Order {
  id: number;
  order_number: string;
  customer: number | null;
  cashier: number | null;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  coupon: number | null;
  payment_method: "CASH" | "CARD" | "MOBILE" | string | null;
  payment_proof: string | null;
  status: "PENDING" | "PREPARING" | "READY" | "COMPLETED" | "CANCELLED";
  created_at: string;
  updated_at: string;
  items: OrderItem[];
  notifications?: OrderNotification[];
}

export interface OrderNotification {
  id: number;
  order: number;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface OrderItem {
  id: number;
  product: number;
  quantity: number;
  unit_price: number;
  total_price: number;
  options: OrderItemOption[];
}

export interface OrderItemOption {
  id: number;
  option_value: number;
  price_adjustment: number;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  password: string;
}

export interface CreateOrderPayload {
  discount: number;
  tax: number;
  payment_method: string;
  coupon_code?: string;
  items: {
    product: number;
    quantity: number;
    option_values: number[];
  }[];
}

export type PromotionType = "DISCOUNT" | "BANNER";

export interface Promotion {
  id: number;
  type: PromotionType;
  title: string;
  description: string;
  discount_percent: number | null;
  discount_amount: number | null;
  products: number[];
  image: string | null;
  link: string;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface Coupon {
  id: number;
  code: string;
  discount_percent: number | null;
  discount_amount: number | null;
  min_subtotal: number;
  max_discount: number | null;
  valid_from: string | null;
  valid_until: string | null;
  usage_limit: number | null;
  times_used: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PaymentSystem {
  id: number;
  name: string;
  code: string;
  icon: string | null;
  details: string;
  is_active: boolean;
  cashier_enabled: boolean;
  customer_enabled: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}
