"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, Send, Users, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";
import type { MovieRecommendation } from "@/types/social";

interface Friend {
  user_id: string;
  nickname: string;
}

interface RecommendButtonProps {
  movie: {
    title: string;
    year?: number | null;
    poster?: string | null;
    imdb_id?: string | null;
    genre?: string | null;
    imdb_rating?: string | null;
  };
}

export function RecommendButton({ movie }: RecommendButtonProps) {
  const { user } = useAuth();

  const [open, setOpen] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  // Load friends when modal opens
  useEffect(() => {
    if (!open || !user) return;
    setFriendsLoading(true);
    async function load() {
      const { data: fships } = await supabase
        .from("friendships")
        .select("*")
        .or(`requester_id.eq.${user!.id},addressee_id.eq.${user!.id}`)
        .eq("status", "accepted");

      if (!fships || fships.length === 0) { setFriends([]); setFriendsLoading(false); return; }

      const otherIds = fships.map(f =>
        f.requester_id === user!.id ? f.addressee_id : f.requester_id
      );
      const { data: profiles } = await supabase
        .from("user_profiles")
        .select("user_id, nickname")
        .in("user_id", otherIds)
        .not("nickname", "is", null);

      setFriends(profiles?.map(p => ({ user_id: p.user_id, nickname: p.nickname })) ?? []);
      setFriendsLoading(false);
    }
    void load();
  }, [open, user]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") handleClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [open]);

  const handleClose = () => {
    setOpen(false);
    setSelected(new Set());
    setMessage("");
    setError("");
    setSent(false);
  };

  const toggleFriend = (uid: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(uid) ? next.delete(uid) : next.add(uid);
      return next;
    });
  };

  const handleSend = async () => {
    if (!user || selected.size === 0 || sending) return;
    setSending(true);
    setError("");

    const inserts = [...selected].map(to_user_id => ({
      from_user_id: user.id,
      to_user_id,
      movie_title: movie.title,
      movie_year: movie.year ?? null,
      movie_poster: movie.poster ?? null,
      movie_imdb_id: movie.imdb_id ?? null,
      movie_genre: movie.genre ?? null,
      movie_imdb_rating: movie.imdb_rating ?? null,
      message: message.trim() || null,
    }));

    const { error: err } = await supabase.from("movie_recommendations").insert(inserts);
    if (err) {
      setError("Could not send recommendations. Try again.");
    } else {
      setSent(true);
      setTimeout(handleClose, 1500);
    }
    setSending(false);
  };

  if (!user) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-[#283A52] bg-[#0F1927] px-3.5 py-2 text-sm text-[#8994A5] transition-colors hover:border-[#526078] hover:text-[#D8DDE6]"
      >
        <Send className="h-4 w-4" />
        Recommend
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm"
            onClick={handleClose}
            aria-hidden="true"
          />

          {/* Modal */}
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Recommend movie"
            className="fixed left-1/2 top-1/2 z-[301] w-full max-w-sm -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-[#1A2436] bg-[#0C1520] shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#111D2B] px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold text-[#D8DDE6]">Recommend Movie</h2>
                <p className="mt-0.5 truncate text-xs text-[#5E7088]">{movie.title}</p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#5E7088] hover:bg-[#111D2B] hover:text-[#D8DDE6]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              {/* Friends list */}
              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-[#5E7088]">
                  Select Friends
                </p>

                {friendsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-[#B49A70]" />
                  </div>
                ) : friends.length === 0 ? (
                  <div className="rounded-xl border border-[#111D2B] py-6 text-center">
                    <Users className="mx-auto mb-2 h-6 w-6 text-[#283A52]" />
                    <p className="text-xs text-[#5E7088]">No friends yet.</p>
                    <a href="/friends" className="mt-1 block text-xs text-[#B49A70] hover:underline">
                      Find friends
                    </a>
                  </div>
                ) : (
                  <div className="max-h-44 overflow-y-auto space-y-1.5">
                    {friends.map(f => {
                      const sel = selected.has(f.user_id);
                      return (
                        <button
                          key={f.user_id}
                          type="button"
                          onClick={() => toggleFriend(f.user_id)}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all",
                            sel
                              ? "border-[#74603D]/60 bg-[#74603D]/10"
                              : "border-[#111D2B] hover:border-[#283A52]"
                          )}
                        >
                          <div className={cn(
                            "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold",
                            sel ? "border-[#B49A70] bg-[#74603D] text-[#FFF0DC]" : "border-[#283A52] text-[#5E7088]"
                          )}>
                            {sel ? <Check className="h-3.5 w-3.5" /> : f.nickname[0].toUpperCase()}
                          </div>
                          <span className={cn("text-sm font-medium", sel ? "text-[#D4BA8D]" : "text-[#C8D0DC]")}>
                            {f.nickname}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Message */}
              {friends.length > 0 && (
                <div>
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-[#5E7088]">
                    Message (optional)
                  </p>
                  <textarea
                    rows={2}
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    maxLength={280}
                    placeholder="Why do you recommend this?"
                    className="w-full resize-none rounded-lg border border-[#283A52] bg-[#0F1927] px-3 py-2 text-sm text-[#E2E5EB] outline-none placeholder:text-[#4E5F74] focus:border-[#B49A70] transition-colors"
                  />
                </div>
              )}

              {error && <p className="text-xs text-red-400">{error}</p>}

              {/* Send */}
              {friends.length > 0 && (
                <button
                  type="button"
                  disabled={selected.size === 0 || sending || sent}
                  onClick={() => void handleSend()}
                  className={cn(
                    "flex h-10 w-full items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition-all",
                    sent
                      ? "border-emerald-700/40 bg-emerald-900/20 text-emerald-400"
                      : selected.size > 0
                        ? "border-[#9A8157]/35 bg-gradient-to-b from-[#866F49] to-[#634E32] text-[#FFF0DC] hover:from-[#9A8157] hover:to-[#6E5538]"
                        : "border-[#172030] bg-[#0F1927] text-[#5E7088]",
                    "disabled:cursor-not-allowed disabled:opacity-60"
                  )}
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : sent ? (
                    <><Check className="h-4 w-4" /> Sent!</>
                  ) : (
                    <><Send className="h-4 w-4" /> Send to {selected.size || ""} {selected.size === 1 ? "friend" : "friends"}</>
                  )}
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
