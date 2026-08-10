"use client";

import { useRestaurant } from "@/hooks/useRestaurant";

export default function SiteBrand({ fallback = "Burger House" }: { fallback?: string }) {
  const { data: restaurant } = useRestaurant();

  return (
    <span className="flex items-center gap-2">
      {restaurant?.logo && (
        <img src={restaurant.logo} alt={restaurant.name || fallback} className="w-6 h-6 rounded-full object-cover" />
      )}
      <span>{restaurant?.name || fallback}</span>
    </span>
  );
}
