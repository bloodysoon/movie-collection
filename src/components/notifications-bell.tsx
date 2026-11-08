"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, CheckCheck, Film, UserCheck, UserPlus } from "lucide-react";
import { useNotifications } from "@/contexts/notifications-context";
import { cn } from "@/lib/utils";
import type { Notification } from "@/types/social";

function relativeTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function notifIcon(type: Notification["type"]) {
  if (type === "friend_request") return <UserPlus className="h-3.5 w-3.5" />;
  if (type === "friend_accepted") return <UserCheck className="h-3.5 w-3.5" />;
  return <Film className="h-3.5 w-3.5" />;
}

function notifIconBg(type: Notification["type"]) {
  if (type === "friend_request") return "bg-blue-500/15 text-blue-400";
  if (type === "friend_accepted") return "bg-emerald-500/15 text-emerald-400";
  return "bg-[#74603D]/20 text-[#B49A70]";
}

function notifText(n: Notification) {
  const name = n.from_nickname ?? "Someone";
  if (n.type === "friend_request") return `${name} sent you a friend request`;
  if (n.type === "friend_accepted") return `${name} accepted your friend request`;
  return `${name} recommended you a movie`;
}

function notifHref(type: Notification["type"]) {
  if (type === "movie_recommendation") return "/recommendations";
  return "/friends";
}

export function NotificationsBell() {
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } =
    useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", handler);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", handler);
      document.removeEventListener("keydown", key);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-label={`Notifications${unreadCount > 0 ? ` · ${unreadCount} unread` : ""}`}
        aria-expanded={open}
        className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#172030] bg-[#0C1520] text-[#6B7A8D] transition-colors hover:border-[#283A52] hover:text-[#C8D0DC]"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#C0392B] px-0.5 text-[9px] font-bold text-white leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 top-11 z-[300] w-[340px] overflow-hidden rounded-xl border border-[#1A2436] bg-[#0C1520] shadow-[0_8px_40px_rgba(0,0,0,0.6)]"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#111D2B] px-4 py-3">
            <span className="text-sm font-semibold text-[#D8DDE6]">Notifications</span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => void markAllAsRead()}
                className="flex items-center gap-1.5 text-xs text-[#B49A70] transition-colors hover:text-[#D4BA8D]"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[420px] overflow-y-auto">
            {loading ? (
              <p className="px-4 py-8 text-center text-sm text-[#5E7088]">Loading…</p>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 px-4 py-10">
                <Bell className="h-8 w-8 text-[#1A2436]" />
                <p className="text-sm text-[#5E7088]">No notifications yet</p>
              </div>
            ) : (
              notifications.map(n => (
                <Link
                  key={n.id}
                  href={notifHref(n.type)}
                  onClick={() => { void markAsRead(n.id); setOpen(false); }}
                  className={cn(
                    "flex items-start gap-3 px-4 py-3 transition-colors hover:bg-[#111D2B]",
                    !n.is_read && "bg-[#0F1927]"
                  )}
                >
                  <div className={cn(
                    "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                    notifIconBg(n.type)
                  )}>
                    {notifIcon(n.type)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className={cn(
                      "text-sm leading-snug",
                      n.is_read ? "text-[#8994A5]" : "font-medium text-[#D8DDE6]"
                    )}>
                      {notifText(n)}
                    </p>
                    <p className="mt-0.5 text-xs text-[#4E5F74]">
                      {relativeTime(n.created_at)}
                    </p>
                  </div>

                  {!n.is_read && (
                    <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                  )}
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
