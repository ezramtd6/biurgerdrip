"use client";

import { useState, useEffect, useCallback } from "react";

export function useTheme() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === "undefined") return false;
    return document.documentElement.classList.contains("dark") || localStorage.getItem("darkMode") === "true";
  });

  useEffect(() => {
    const updateThemeState = () => {
      const dark = document.documentElement.classList.contains("dark");
      setIsDark(dark);
    };

    updateThemeState();

    window.addEventListener("themechange", updateThemeState);
    window.addEventListener("storage", updateThemeState);

    return () => {
      window.removeEventListener("themechange", updateThemeState);
      window.removeEventListener("storage", updateThemeState);
    };
  }, []);

  const toggleDarkMode = useCallback(() => {
    const current = document.documentElement.classList.contains("dark");
    const next = !current;

    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("darkMode", String(next));

    setIsDark(next);
    window.dispatchEvent(new Event("themechange"));
  }, []);

  return { isDark, toggleDarkMode };
}
