"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Bookmark, CheckCircle2, Film, Heart,
  Loader2, UserCheck, UserPlus, UserX,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";
import type { FriendActivity, PublicProfile } from "@/types/social";

// ─── helpers ────────────────────────────────────────────────────────────────

function groupByDate(items: FriendActivity[]): Array<{ label: string; items: FriendActivity[] }> {
  const map = new Map<string, FriendActivity[]>();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  for (const item of items) {
    const d = new Date(item.created_at); d.setHours(0, 0, 0, 0);
    let label: string;
    if (d.getTime() === today.getTime()) label = "Today";
    else if (d.getTime() === yesterday.getTime()) label = "Yesterday";
    else label = new Date(item.created_at).toLocaleDateString("en-US", {
      month: "long", day: "numeric",
      ...(d.getFullYear() !== today.getFullYear() && { year: "numeric" }),
    });
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(item);
  }
  return Array.from(map.entries()).map(([label, items]) => ({ label, items }));
}

function relativeTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days < 7 ? `${days}d ago` : new Date(dateStr).toLocaleDateString();
}

// ─── page ────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  return (
    <Suspense fallback={null}>
      <ProfilePageInner />
    </Suspense>
  );
}

function ProfilePageInner() {
  const { nickname } = useParams<{ nickname: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [activity, setActivity] = useState<FriendActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const decoded = decodeURIComponent(nickname);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user || !decoded) return;
    async function load() {
      setLoading(true);
      const { data } = await supabase.rpc("get_public_profile", { p_nickname: decoded });
      if (!data || data.length === 0) { setNotFound(true); setLoading(false); return; }
      const p = data[0] as PublicProfile;
      setProfile(p);
      if (p.friendship_status === "accepted") {
        const { data: acts } = await supabase.rpc("get_profile_activity", {
          p_user_id: p.user_id, limit_count: 40,
        });
        setActivity(acts ?? []);
      }
      setLoading(false);
    }
    void load();
  }, [user, decoded]);

  const sendRequest = async () => {
    if (!user || !profile || actionLoading) return;
    setActionLoading(true);
    await supabase.from("friendships").insert({ requester_id: user.id, addressee_id: profile.user_id });
    setProfile(p => p ? { ...p, friendship_status: "pending", friendship_id: -1 } : p);
    setActionLoading(false);
  };

  const cancelOrRemove = async () => {
    if (!user || !profile?.friendship_id || actionLoading) return;
    setActionLoading(true);
    await supabase.from("friendships").delete().eq("id", profile.friendship_id);
    setProfile(p => p ? { ...p, friendship_status: null, friendship_id: null } : p);
    setActivity([]);
    setActionLoading(false);
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#B49A70]" />
      </div>
    );
  }

  if (notFound) {
    return (
      <main className="flex min-h-[60vh] flex-col items-center justify-center gap-2 bg-[#070C13] text-[#E2E5EB]">
        <Film className="h-8 w-8 text-[#283A52]" />
        <p className="text-sm font-medium text-[#D8DDE6]">Profile not found</p>
        <p className="text-xs text-[#5E7088]">No user with nickname &ldquo;{decoded}&rdquo;</p>
        <Link href="/friends" className="mt-2 text-xs text-[#B49A70] hover:underline">← Back to Friends</Link>
      </main>
    );
  }

  if (!profile) return null;

  const isOwnProfile = user?.id === profile.user_id;
  const stats = [
    { label: "Watched",   value: Number(profile.watched_count) },
    { label: "Watchlist", value: Number(profile.watchlist_count) },
    { label: "Favorites", value: Number(profile.favorite_count) },
    { label: "Total",     value: Number(profile.total_count) },
  ];

  return (
    <main className="min-h-screen w-full bg-[#070C13] text-[#E2E5EB]">
      <div className="mx-auto max-w-2xl px-4 pb-20 pt-6 sm:px-6">

        {/* ── Profile header ── */}
        <div className="mb-6 overflow-hidden rounded-2xl border border-[#131D2A] bg-[#0C1520]">
          {/* Top band */}
          <div className="h-14 bg-gradient-to-r from-[#0F1927] via-[#131D2A] to-[#0F1927]" />

          <div className="-mt-8 px-5 pb-5">
            {/* Avatar + action row */}
            <div className="flex items-end justify-between gap-3">
              <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-[#070C13] bg-gradient-to-br from-[#1A2436] to-[#0F1927] text-2xl font-bold text-[#B49A70] shadow-lg">
                {profile.nickname[0].toUpperCase()}
              </div>

              {!isOwnProfile && (
                <div className="mb-1">
                  {profile.friendship_status === "accepted" ? (
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1 text-xs text-emerald-400">
                        <UserCheck className="h-3.5 w-3.5" /> Friends
                      </span>
                      <button type="button" disabled={actionLoading} onClick={() => void cancelOrRemove()}
                        className="text-[11px] text-[#4E5F74] hover:text-red-400 disabled:opacity-40 transition-colors">
                        {actionLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Remove"}
                      </button>
                    </div>
                  ) : profile.friendship_status === "pending" ? (
                    <button type="button" disabled={actionLoading} onClick={() => void cancelOrRemove()}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#172030] bg-[#0A1018] px-3 py-1.5 text-xs text-[#5E7088] hover:border-[#283A52] hover:text-[#D8DDE6] disabled:opacity-40 transition-colors">
                      {actionLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserX className="h-3.5 w-3.5" />}
                      Requested
                    </button>
                  ) : (
                    <button type="button" disabled={actionLoading} onClick={() => void sendRequest()}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#74603D]/40 bg-[#74603D]/20 px-3.5 py-1.5 text-xs font-medium text-[#D4BA8D] hover:bg-[#74603D]/30 disabled:opacity-40 transition-colors">
                      {actionLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
                      Add Friend
                    </button>
                  )}
                </div>
              )}

              {isOwnProfile && (
                <Link href="/friends" className="mb-1 text-xs text-[#5E7088] hover:text-[#B49A70] transition-colors">
                  Edit profile →
                </Link>
              )}
            </div>

            {/* Name + bio */}
            <div className="mt-3">
              <h1 className="text-lg font-bold text-[#F4EDE2]">{profile.nickname}</h1>
              {profile.bio && <p className="mt-0.5 text-sm text-[#8994A5]">{profile.bio}</p>}
            </div>

            {/* Stats row */}
            <div className="mt-4 flex gap-5 border-t border-[#131D2A] pt-4">
              {stats.map(({ label, value }) => (
                <div key={label} className="flex flex-col">
                  <span className="text-base font-bold text-[#F4EDE2]">{value}</span>
                  <span className="text-[11px] text-[#4E5F74]">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Activity / locked state ── */}
        {profile.friendship_status === "accepted" ? (
          <>
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-[#4E5F74]">Activity</p>
            {activity.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-14 text-center">
                <Film className="h-8 w-8 text-[#283A52]" />
                <p className="text-sm text-[#4E5F74]">No activity yet</p>
              </div>
            ) : (
              <ProfileTimeline items={activity} />
            )}
          </>
        ) : !isOwnProfile ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-[#111D2B] bg-[#0C1520] py-10 text-center">
            <Film className="h-7 w-7 text-[#283A52]" />
            <p className="text-sm font-medium text-[#8994A5]">
              Add {profile.nickname} as a friend to see their activity
            </p>
          </div>
        ) : null}
      </div>
    </main>
  );
}

// ─── Profile timeline ────────────────────────────────────────────────────────

function ProfileTimeline({ items }: { items: FriendActivity[] }) {
  const groups = groupByDate(items);
  return (
    <div className="space-y-8">
      {groups.map(({ label, items: groupItems }) => (
        <div key={label}>
          <div className="mb-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-[#172030]" />
            <span className="rounded-full border border-[#172030] bg-[#0A1018] px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#4E5F74]">
              {label}
            </span>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[#172030]" />
          </div>

          <div className="relative ml-2 pl-7">
            <div className="absolute left-0 top-3 bottom-0 w-px bg-gradient-to-b from-[#1E2D3D] to-transparent" />
            <div className="space-y-3">
              {groupItems.map(item => {
                const dot =
                  item.activity_type === "added_watched"
                    ? { ring: "border-emerald-500/40 bg-[#071A10]", icon: <CheckCircle2 className="h-3 w-3 text-emerald-400" /> }
                    : item.activity_type === "added_favorite"
                    ? { ring: "border-pink-500/30 bg-[#1A0810]",    icon: <Heart        className="h-3 w-3 text-pink-400" /> }
                    :                                                    { ring: "border-[#74603D]/40 bg-[#140E04]",   icon: <Bookmark     className="h-3 w-3 text-[#B49A70]" /> };
                const href = item.movie_imdb_id ? `https://www.imdb.com/title/${item.movie_imdb_id}/` : undefined;
                const badge =
                  item.activity_type === "added_watched" ? "Watched" :
                  item.activity_type === "added_favorite" ? "Favorited" : "Watchlist";

                return (
                  <div key={item.id} className="relative flex items-start gap-4">
                    <div className={cn("absolute -left-[27px] top-[14px] flex h-6 w-6 items-center justify-center rounded-full border", dot.ring)}>
                      {dot.icon}
                    </div>
                    <div className="flex flex-1 items-center gap-3 rounded-xl border border-[#0F1927] bg-[#0A1420] px-3 py-2.5 transition-colors hover:border-[#1A2A3A] hover:bg-[#0C1828]">
                      {/* Poster */}
                      <div className="h-14 w-10 shrink-0 overflow-hidden rounded-md border border-[#172030] bg-[#070C13]">
                        {item.movie_poster && item.movie_poster !== "N/A" ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.movie_poster} alt={item.movie_title} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Film className="h-3.5 w-3.5 text-[#283A52]" />
                          </div>
                        )}
                      </div>
                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-[#E2E5EB]">
                          {href
                            ? <a href={href} target="_blank" rel="noopener noreferrer" className="hover:text-[#B49A70] transition-colors">{item.movie_title}</a>
                            : item.movie_title}
                          {item.movie_year && <span className="ml-1 text-xs font-normal text-[#4E5F74]">{item.movie_year}</span>}
                        </p>
                        <p className="mt-0.5 text-xs text-[#4E5F74]">{badge} · {relativeTime(item.created_at)}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
