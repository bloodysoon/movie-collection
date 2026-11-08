"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Film, Loader2, MessageSquare } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";
import type { MovieRecommendation } from "@/types/social";

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

function MoviePoster({ src, title }: { src: string | null; title: string }) {
  const [failed, setFailed] = useState(false);
  if (src && src !== "N/A" && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={title} onError={() => setFailed(true)} className="h-full w-full object-cover" />
    );
  }
  return <div className="flex h-full w-full items-center justify-center"><Film className="h-5 w-5 text-[#283A52]" /></div>;
}

type ViewMode = "received" | "sent";

export default function RecommendationsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [received, setReceived] = useState<MovieRecommendation[]>([]);
  const [sent, setSent] = useState<MovieRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>("received");

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    async function load() {
      setLoading(true);

      const { data: recs } = await supabase
        .from("movie_recommendations")
        .select("*")
        .or(`from_user_id.eq.${user!.id},to_user_id.eq.${user!.id}`)
        .order("created_at", { ascending: false });

      if (!recs) { setLoading(false); return; }

      // Enrich with nicknames
      const userIds = [...new Set([
        ...recs.map(r => r.from_user_id),
        ...recs.map(r => r.to_user_id),
      ])];
      const { data: profiles } = await supabase
        .from("user_profiles")
        .select("user_id, nickname")
        .in("user_id", userIds);
      const nickMap = new Map(profiles?.map(p => [p.user_id, p.nickname]) ?? []);

      const enriched = recs.map(r => ({
        ...r,
        from_nickname: nickMap.get(r.from_user_id) ?? null,
        to_nickname: nickMap.get(r.to_user_id) ?? null,
      }));

      setReceived(enriched.filter(r => r.to_user_id === user!.id));
      setSent(enriched.filter(r => r.from_user_id === user!.id));

      // Mark received as read
      const unreadIds = enriched
        .filter(r => r.to_user_id === user!.id && !r.is_read)
        .map(r => r.id);
      if (unreadIds.length > 0) {
        await supabase
          .from("movie_recommendations")
          .update({ is_read: true })
          .in("id", unreadIds);
      }

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

  const list = view === "received" ? received : sent;
  const unreadCount = received.filter(r => !r.is_read).length;

  return (
    <main className="min-h-screen w-full bg-[#070C13] text-[#E2E5EB]">
      <div className="w-full px-4 pb-16 pt-6 sm:px-6 lg:px-8 xl:px-12">
        <div className="mb-7">
          <h1 className="text-xl font-semibold text-[#F4EDE2]">Recommendations</h1>
          <p className="mt-1 text-sm text-[#5E7088]">Movies your friends think you&apos;ll love</p>
        </div>

        {/* Tabs */}
        <div className="mb-5 flex gap-1 rounded-xl border border-[#131D2A] bg-[#0C1520] p-1">
          {([
            { key: "received" as ViewMode, label: "Received", count: received.length },
            { key: "sent" as ViewMode, label: "Sent", count: sent.length },
          ]).map(t => (
            <button
              key={t.key}
              type="button"
              onClick={() => setView(t.key)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                view === t.key ? "bg-[#111D2B] text-[#D8DDE6]" : "text-[#5E7088] hover:text-[#8994A5]"
              )}
            >
              {t.label}
              {t.count > 0 && (
                <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#1A2436] px-1 text-[10px] font-bold text-[#8994A5]">
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {list.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#111D2B] bg-[#0C1520] text-[#283A52]">
              <Film className="h-10 w-10" />
            </div>
            <h3 className="text-base font-semibold text-[#D8DDE6]">
              {view === "received" ? "No recommendations yet" : "You haven't sent any"}
            </h3>
            <p className="mt-1 text-sm text-[#5E7088]">
              {view === "received"
                ? "When friends recommend movies to you, they'll appear here."
                : "Open any movie and use the Recommend button to share it with a friend."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
            {list.map(rec => (
              <RecommendationCard key={rec.id} rec={rec} mode={view} userId={user.id} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function RecommendationCard({ rec, mode, userId }: {
  rec: MovieRecommendation;
  mode: ViewMode;
  userId: string;
}) {
  const isUnread = mode === "received" && !rec.is_read;
  const otherNick = mode === "received" ? rec.from_nickname : rec.to_nickname;
  const imdbHref = rec.movie_imdb_id
    ? `https://www.imdb.com/title/${rec.movie_imdb_id}/`
    : undefined;

  return (
    <div className={cn(
      "rounded-xl border bg-[#0C1520] p-4 transition-colors",
      isUnread ? "border-[#74603D]/40" : "border-[#111D2B]"
    )}>
      <div className="flex gap-3">
        {/* Poster */}
        <div className="h-20 w-14 shrink-0 overflow-hidden rounded-lg border border-[#172030] bg-[#0A141E]">
          <MoviePoster src={rec.movie_poster ?? null} title={rec.movie_title} />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              {imdbHref ? (
                <a href={imdbHref} target="_blank" rel="noopener noreferrer"
                  className="text-sm font-semibold text-[#F4EDE2] hover:text-[#B49A70]">
                  {rec.movie_title}
                </a>
              ) : (
                <span className="text-sm font-semibold text-[#F4EDE2]">{rec.movie_title}</span>
              )}
              <div className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-[#5E7088]">
                {rec.movie_year && <span>{rec.movie_year}</span>}
                {rec.movie_genre && <span>{rec.movie_genre.split(",")[0].trim()}</span>}
                {rec.movie_imdb_rating && <span>★ {rec.movie_imdb_rating}</span>}
              </div>
            </div>
            <span className="shrink-0 text-xs text-[#4E5F74]">{relativeTime(rec.created_at)}</span>
          </div>

          <p className="mt-1.5 text-xs text-[#5E7088]">
            {mode === "received" ? "From " : "To "}
            <Link
              href={`/profile/${encodeURIComponent(otherNick ?? "")}`}
              className="font-medium text-[#8994A5] hover:text-[#B49A70]"
            >
              {otherNick ?? "Unknown"}
            </Link>
          </p>

          {rec.message && (
            <div className="mt-2 flex items-start gap-1.5 rounded-lg border border-[#172030] bg-[#0F1927] px-3 py-2">
              <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#4E5F74]" />
              <p className="text-xs text-[#9CA8B9]">{rec.message}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
