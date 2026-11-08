"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Bookmark, CheckCircle2, Film, Heart, Loader2, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";
import type { FriendActivity, ActivityType } from "@/types/social";

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

function activityLabel(type: ActivityType) {
  if (type === "added_watched") return "watched";
  if (type === "added_favorite") return "favorited";
  return "added to watchlist";
}

function activityIcon(type: ActivityType) {
  if (type === "added_watched") return <CheckCircle2 className="h-3.5 w-3.5" />;
  if (type === "added_favorite") return <Heart className="h-3.5 w-3.5" />;
  return <Bookmark className="h-3.5 w-3.5" />;
}

function activityColor(type: ActivityType) {
  if (type === "added_watched") return "bg-emerald-500/15 text-emerald-400";
  if (type === "added_favorite") return "bg-[#9D6B79]/20 text-[#D99EAF]";
  return "bg-[#74603D]/20 text-[#B49A70]";
}

function MoviePoster({ src, title }: { src: string | null; title: string }) {
  const [failed, setFailed] = useState(false);
  if (src && src !== "N/A" && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={title}
        onError={() => setFailed(true)}
        className="h-full w-full object-cover"
      />
    );
  }
  return (
    <div className="flex h-full w-full items-center justify-center">
      <Film className="h-5 w-5 text-[#283A52]" />
    </div>
  );
}

export default function ActivityPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [activity, setActivity] = useState<FriendActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasFriends, setHasFriends] = useState<boolean | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    async function load() {
      setLoading(true);

      // Check if user has friends
      const { count } = await supabase
        .from("friendships")
        .select("id", { count: "exact", head: true })
        .or(`requester_id.eq.${user!.id},addressee_id.eq.${user!.id}`)
        .eq("status", "accepted");
      setHasFriends((count ?? 0) > 0);

      const { data } = await supabase.rpc("get_friends_activity", { limit_count: 60 });
      setActivity(data ?? []);
      setLoading(false);
    }
    void load();
  }, [user]);

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-[#B49A70]" />
      </div>
    );
  }
  if (!user) return null;

  return (
    <main className="min-h-screen w-full bg-[#070C13] text-[#E2E5EB]">
      <div className="w-full px-4 pb-16 pt-6 sm:px-6 lg:px-8 xl:px-12">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-[#F4EDE2]">Friends&apos; Activity</h1>
          <p className="mt-1 text-sm text-[#5E7088]">What your friends have been watching</p>
        </div>

        {!hasFriends ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#111D2B] bg-[#0C1520] text-[#283A52]">
              <Users className="h-10 w-10" />
            </div>
            <h3 className="text-base font-semibold text-[#D8DDE6]">No friends yet</h3>
            <p className="mt-1 text-sm text-[#5E7088]">Add friends to see their activity here.</p>
            <Link
              href="/friends"
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#74603D] px-4 py-2 text-sm font-medium text-[#FFF0DC] hover:bg-[#866F49]"
            >
              Find Friends
            </Link>
          </div>
        ) : activity.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#111D2B] bg-[#0C1520] text-[#283A52]">
              <Film className="h-10 w-10" />
            </div>
            <h3 className="text-base font-semibold text-[#D8DDE6]">Nothing yet</h3>
            <p className="mt-1 text-sm text-[#5E7088]">Your friends haven&apos;t added any movies recently.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {activity.map(item => (
              <ActivityItem key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function ActivityItem({ item }: { item: FriendActivity }) {
  const href = item.movie_imdb_id
    ? `https://www.imdb.com/title/${item.movie_imdb_id}/`
    : undefined;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-[#111D2B] bg-[#0C1520] px-4 py-3">
      {/* Poster thumbnail */}
      <div className="h-14 w-10 shrink-0 overflow-hidden rounded-lg border border-[#172030] bg-[#0A141E]">
        <MoviePoster src={item.movie_poster} title={item.movie_title} />
      </div>

      {/* Text */}
      <div className="min-w-0 flex-1">
        <p className="text-sm text-[#D8DDE6]">
          <Link
            href={`/profile/${encodeURIComponent(item.friend_nickname ?? "")}`}
            className="font-semibold hover:text-[#B49A70]"
          >
            {item.friend_nickname ?? "Someone"}
          </Link>
          {" "}
          <span className="text-[#8994A5]">{activityLabel(item.activity_type as ActivityType)}</span>
        </p>

        <p className="mt-0.5 truncate text-sm font-medium text-[#C8D0DC]">
          {href ? (
            <a href={href} target="_blank" rel="noopener noreferrer" className="hover:text-[#B49A70]">
              {item.movie_title}
            </a>
          ) : (
            item.movie_title
          )}
          {item.movie_year && (
            <span className="ml-1.5 text-xs text-[#4E5F74]">{item.movie_year}</span>
          )}
        </p>

        <p className="mt-0.5 text-xs text-[#4E5F74]">{relativeTime(item.created_at)}</p>
      </div>

      {/* Activity badge */}
      <div className={cn(
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
        activityColor(item.activity_type as ActivityType)
      )}>
        {activityIcon(item.activity_type as ActivityType)}
      </div>
    </div>
  );
}
