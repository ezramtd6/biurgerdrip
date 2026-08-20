"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useRestaurant } from "@/hooks/useRestaurant";

function setTextFavicon(text: string, color = "#dc2626") {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#fff";
  ctx.font = "bold 36px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text.toUpperCase(), size / 2, size / 2 + 2);

  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  link.href = canvas.toDataURL("image/png");
}

export default function DocumentTitle() {
  const { data: restaurant } = useRestaurant();
  const pathname = usePathname();
  const faviconSet = useRef(false);

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
    if (faviconSet.current) return;

    const logo = restaurant?.logo;
    const name = restaurant?.name;

    if (!logo && name) {
      setTextFavicon(name.charAt(0));
      faviconSet.current = true;
      return;
    }

    if (!logo) return;

    const setRoundedFavicon = async () => {
      let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        link.type = "image/png";
        document.head.appendChild(link);
      }

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
        if (!ctx) throw new Error("no ctx");

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
        link.type = "image/png";
        faviconSet.current = true;
      } catch {
        link.href = logo;
        link.type = "image/png";
        faviconSet.current = true;
      }
    };

    setRoundedFavicon();
  }, [restaurant?.logo, restaurant?.name]);

  useEffect(() => {
    if (!restaurant?.name) return;
    const interval = setInterval(() => {
      if (document.title !== restaurant.name) {
        document.title = restaurant.name;
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [restaurant?.name]);

  return null;
}
