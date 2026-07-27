export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  role: "ADMIN" | "MANAGER" | "CASHIER" | "CUSTOMER";
  is_active: boolean;
}

export interface Category {
  id: number;
  name: string;
  image: string | null;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: number;
  category: number;
  name: string;
  description: string;
  image: string | null;
  option_groups: OptionGroup[];
  created_at: string;
  updated_at: string;
}

export interface OptionGroup {
  id: number;
  product: number;
  name: string;
  required: boolean;
  multiple_choice: boolean;
  display_order: number;
  values: OptionValue[];
}

export interface OptionValue {
  id: number;
  option_group: number;
  name: string;
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
  payment_method: "CASH" | "CARD" | "MOBILE" | null;
  status: "PENDING" | "PREPARING" | "READY" | "COMPLETED" | "CANCELLED";
  created_at: string;
  updated_at: string;
  items: OrderItem[];
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
  items: {
    product: number;
    quantity: number;
    option_values: number[];
  }[];
}
