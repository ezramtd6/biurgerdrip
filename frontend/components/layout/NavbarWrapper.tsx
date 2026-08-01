"use client";

import { usePathname } from "next/navigation";
import Navbar from "@/components/layout/Navbar";

const HIDE_NAVBAR_PATHS = ["/login", "/register", "/forgot-password", "/change-password", "/dashboard", "/cashier", "/menu"];

export default function NavbarWrapper() {
  const pathname = usePathname();

  if (pathname === "/" || HIDE_NAVBAR_PATHS.some((p) => pathname.startsWith(p))) {
    return null;
  }

  return <Navbar />;
}
