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
    const logo = restaurant?.logo;
    if (!logo) return;

    const setRoundedFavicon = async () => {
      let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        link.type = "image/png";
        document.head.appendChild(link);
      }

      const fallback = () => {
        link.href = logo;
      };

      try {
        const img = new Image();
        img.crossOrigin = "anonymous";
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error("logo load failed"));
          img.src = logo;
        });

        const size = 64;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          fallback();
          return;
        }

        const radius = size / 2;
        ctx.beginPath();
        ctx.arc(radius, radius, radius, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();

        const scale = Math.max(size / img.naturalWidth, size / img.naturalHeight);
        const w = img.naturalWidth * scale;
        const h = img.naturalHeight * scale;
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);

        link.href = canvas.toDataURL("image/png");
      } catch {
        fallback();
      }
    };

    setRoundedFavicon();
  }, [restaurant?.logo]);
  return null;
}
