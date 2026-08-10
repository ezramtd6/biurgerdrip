"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useRestaurant } from "@/hooks/useRestaurant";

export default function DocumentTitle() {
  const { data: restaurant } = useRestaurant();
  const pathname = usePathname();

  useEffect(() => {
    const name = restaurant?.name;
    if (!name) return;

    document.title = name;

    const enforce = () => {
      if (document.title !== name) document.title = name;
    };

    const observer = new MutationObserver(enforce);
    observer.observe(document.head, { childList: true, subtree: true, characterData: true });

    return () => observer.disconnect();
  }, [restaurant?.name, pathname]);

  useEffect(() => {
    if (!restaurant?.logo) return;
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = restaurant.logo;
  }, [restaurant?.logo]);

  return null;
}
