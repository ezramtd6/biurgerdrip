"use client";

import { useState } from "react";
import { useNotifications, useMarkNotificationRead } from "@/hooks/useOrders";
import { useLanguage } from "@/hooks/useLanguage";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export default function NotificationBell({
  triggerClassName = "",
  popupClassName = "",
}: {
  triggerClassName?: string;
  popupClassName?: string;
}) {
  const { data: notifications, isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();
  const { lang: currentLang } = useLanguage();
  const [open, setOpen] = useState(false);

  const unread = notifications?.filter((n) => !n.is_read).length ?? 0;
  const items = notifications ?? [];

  const handleOpenChange = (o: boolean) => setOpen(o);

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger
        className={`relative flex items-center justify-center rounded-full transition cursor-pointer outline-none ${triggerClassName}`}
        aria-label="Notifications"
      >
        <i className="far fa-bell text-lg"></i>
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-black min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className={`w-80 ${popupClassName}`}>
        <DropdownMenuGroup>
          <DropdownMenuLabel className="px-3 py-2">Notifications</DropdownMenuLabel>
          <DropdownMenuSeparator />
        </DropdownMenuGroup>
        {isLoading ? (
          <div className="px-4 py-6 text-center text-sm text-gray-400">
            <i className="fas fa-spinner fa-spin mr-1"></i> Loading...
          </div>
        ) : items.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-gray-400">
            No notifications yet
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            {items.slice(0, 30).map((n) => (
              <div
                key={n.id}
                className={`px-3 py-3 text-sm border-b border-gray-100 last:border-b-0 ${
                  n.is_read ? "" : "bg-blue-50/60 dark:bg-blue-900/10"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  {!n.is_read && (
                    <span className="mt-1.5 w-2 h-2 rounded-full bg-red-600 shrink-0"></span>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-700 dark:text-gray-200 leading-snug">{currentLang === "am" && n.message_amharic ? n.message_amharic : n.message}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(n.created_at).toLocaleString()}
                    </p>
                  </div>
                  {!n.is_read && (
                    <button
                      onClick={() => markRead.mutate(n.id)}
                      className="text-xs font-semibold text-red-600 hover:underline shrink-0 cursor-pointer"
                    >
                      Mark read
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
