"use client";

import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export default function OfflineBanner() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-red-600 text-white text-center text-sm font-medium py-2 px-4 flex items-center justify-center gap-2 shadow-lg">
      <i className="fas fa-wifi-slash"></i>
      No internet connection. Please check your network.
    </div>
  );
}
