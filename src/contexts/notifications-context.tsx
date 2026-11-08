"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-context";
import type { Notification } from "@/types/social";

interface NotificationsContextValue {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refresh: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!user) { setNotifications([]); return; }
    setLoading(true);
    try {
      const { data: notifData } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (!notifData) { setLoading(false); return; }

      // Enrich with sender nicknames
      const fromIds = [...new Set(
        notifData.filter(n => n.from_user_id).map(n => n.from_user_id as string)
      )];

      let nicknameMap = new Map<string, string | null>();
      if (fromIds.length > 0) {
        const { data: profiles } = await supabase
          .from("user_profiles")
          .select("user_id, nickname")
          .in("user_id", fromIds);
        nicknameMap = new Map(profiles?.map(p => [p.user_id, p.nickname]) ?? []);
      }

      setNotifications(
        notifData.map(n => ({
          ...n,
          from_nickname: n.from_user_id ? (nicknameMap.get(n.from_user_id) ?? null) : null,
        }))
      );
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { void load(); }, [load]);

  // Realtime: re-fetch on new notification
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`notifs-${user.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${user.id}`,
      }, () => void load())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [user, load]);

  const markAsRead = useCallback(async (id: number) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, is_read: true } : n)
    );
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id);
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!user) return;
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);
  }, [user]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <NotificationsContext.Provider
      value={{ notifications, unreadCount, loading, markAsRead, markAllAsRead, refresh: load }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationsProvider");
  return ctx;
}
