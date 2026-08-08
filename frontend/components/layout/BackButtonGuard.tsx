"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export default function BackButtonGuard() {
  const pathname = usePathname();
  const pinned = useRef<string>(pathname);

  useEffect(() => {
    pinned.current = pathname;
  }, [pathname]);

  useEffect(() => {
    window.history.pushState(null, "", window.location.href);

    const onPopState = () => {
      window.history.pushState(null, "", pinned.current);
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  return null;
}
