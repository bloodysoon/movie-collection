
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Bookmark,
  Check,
  CheckCircle2,
  Film,
  Heart,
  Loader2,
  MoreHorizontal,
  Star,
  Trash2,
} from "lucide-react";

import { Movie, MovieStatus } from "@/types/movie";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

interface MovieCardProps {
  movie: Movie;
  readonly?: boolean;
  onDelete?: (movieId: number) => void;
  onUpdate?: (movieId: number, changes: Partial<Movie>) => void;
}

const statusOptions = [
  { value: "watched"   as const, label: "Watched",   icon: CheckCircle2 },
  { value: "watchlist" as const, label: "Watchlist",  icon: Bookmark     },
];

export function MovieCard({ movie, readonly = false, onDelete, onUpdate }: MovieCardProps) {
  const [status,     setStatus]     = useState<MovieStatus>(movie.status);
  const [isFavorite, setIsFavorite] = useState(movie.is_favorite ?? false);
  const [menuOpen,   setMenuOpen]   = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState("");

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setStatus(movie.status);
    setIsFavorite(movie.is_favorite ?? false);
  }, [movie.status, movie.is_favorite]);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointer = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMenuOpen(false); };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!deleteOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !saving) setDeleteOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [deleteOpen, saving]);

  const personalRating = movie.rating;
  const imdbRating     = movie.imdb_rating;
  const displayRating  =
    personalRating != null
      ? Number(personalRating)
      : imdbRating && imdbRating !== "N/A"
        ? Number(imdbRating)
        : null;
  const hasRating = displayRating !== null && Number.isFinite(displayRating);
  const hasPoster = Boolean(movie.poster && movie.poster !== "N/A");

  async function handleStatusChange(newStatus: MovieStatus) {
    if (saving || newStatus === status) { setMenuOpen(false); return; }
    setSaving(true); setError("");
    try {
      const { data, error: err } = await supabase
        .from("movies").update({ status: newStatus }).eq("id", movie.id).select("status").single();
      if (err) throw err;
      const updated = data.status as MovieStatus;
      setStatus(updated);
      onUpdate?.(movie.id, { status: updated });
      setMenuOpen(false);
    } catch (e) {
      console.error(e); setError("Could not update status.");
    } finally { setSaving(false); }
  }

  async function handleFavoriteToggle() {
    if (saving) return;
    setSaving(true); setError("");
    try {
      const { data, error: err } = await supabase
        .from("movies").update({ is_favorite: !isFavorite }).eq("id", movie.id).select("is_favorite").single();
      if (err) throw err;
      setIsFavorite(data.is_favorite);
      onUpdate?.(movie.id, { is_favorite: data.is_favorite });
    } catch (e) {
      console.error(e); setError("Could not update favorite.");
    } finally { setSaving(false); }
  }

  async function handleDelete() {
    if (saving) return;
    setSaving(true); setError("");
    try {
      const { data, error: err } = await supabase
        .from("movies").delete().eq("id", movie.id).select("id").single();
      if (err) throw err;
      onDelete?.(data.id);
      setDeleteOpen(false);
    } catch (e) {
      console.error(e); setError("Could not delete movie.");
    } finally { setSaving(false); }
  }

  return (
    /* group lives here so the action buttons (sibling of article) also respond to hover */
    <div className="group relative">
      <article
        className={cn(
          "relative aspect-[2/3] overflow-hidden rounded-lg",
          "border border-border/50 bg-card",
          "transition-all duration-300 ease-out",
          "group-hover:-translate-y-0.5 group-hover:border-[#74603D]/50",
          "group-hover:shadow-[0_6px_20px_rgba(0,0,0,0.5)]"
        )}
      >
        {!readonly && (
          <Link
            href={`/movie/${movie.id}`}
            aria-label={`View details for ${movie.title}`}
            className="absolute inset-0 z-10 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B49A70]"
          />
        )}

        {/* Poster */}
        <div className="absolute inset-0">
          {hasPoster ? (
            <Image
              src={movie.poster!}
              alt={`Poster for ${movie.title}`}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 15vw"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-muted">
              <Film className="h-6 w-6 opacity-20 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Always-visible: thin status line at card bottom */}
        <div
          className={cn(
            "absolute inset-x-0 bottom-0 z-20 h-[3px]",
            status === "watched" ? "bg-[#315650]" : "bg-[#74603D]/70"
          )}
        />

        {/* Always-visible: favorite heart (top-left, tiny) */}
        {isFavorite && (
          <Heart className="absolute left-1.5 top-1.5 z-20 h-2.5 w-2.5 fill-[#E0CBE8]/80 text-[#E0CBE8]/80 drop-shadow" />
        )}

        {/* Gradient — hover only */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/95 via-black/60 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />

        {/* Text overlay — hover only */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 p-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <h3 className="line-clamp-2 text-[11px] font-semibold leading-tight text-white">
            {movie.title}
          </h3>
          <div className="mt-0.5 flex items-center gap-1 text-[10px] text-white/50">
            {movie.year && <span>{movie.year}</span>}
            {movie.year && movie.genre && <span>·</span>}
            {movie.genre && (
              <span className="flex-1 truncate">{movie.genre.split(",")[0].trim()}</span>
            )}
            {hasRating && (
              <span className="ml-auto flex shrink-0 items-center gap-0.5 text-[#B49A70]">
                <Star className="h-2.5 w-2.5 fill-current" />
                <span className="font-semibold text-white">{displayRating}</span>
              </span>
            )}
          </div>
        </div>
      </article>

      {/* Action buttons — hover only, outside article so they're always above */}
      {!readonly && (
        <div
          ref={menuRef}
          className="absolute right-1 top-1 z-20 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
        >
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={handleFavoriteToggle}
              disabled={saving}
              aria-label={isFavorite ? `Remove ${movie.title} from favorites` : `Add ${movie.title} to favorites`}
              aria-pressed={isFavorite}
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-md border backdrop-blur-md transition-colors",
                isFavorite
                  ? "border-[#765887] bg-[#473456]/90 text-[#E0CBE8]"
                  : "border-white/15 bg-black/65 text-white hover:bg-black/85",
                "disabled:opacity-60"
              )}
            >
              {saving
                ? <Loader2 className="h-3 w-3 animate-spin" />
                : <Heart className={cn("h-3 w-3", isFavorite && "fill-current")} />
              }
            </button>

            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              disabled={saving}
              aria-label={`Actions for ${movie.title}`}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              className="flex h-6 w-6 items-center justify-center rounded-md border border-white/15 bg-black/65 text-white backdrop-blur-md transition-colors hover:bg-black/85 disabled:opacity-60"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
          </div>

          {menuOpen && (
            <div
              role="menu"
              aria-label={`Actions for ${movie.title}`}
              className="absolute right-0 top-7 z-30 w-36 overflow-hidden rounded-lg border border-[#354052] bg-[#1A2230] p-1 shadow-2xl"
            >
              {statusOptions.map((option) => {
                const Icon  = option.icon;
                const active = status === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="menuitemradio"
                    aria-checked={active}
                    onClick={() => handleStatusChange(option.value)}
                    disabled={saving}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs transition-colors",
                      active ? "bg-[#473456]/50 text-[#E0CBE8]" : "text-[#D5DAE2] hover:bg-[#2C3646]"
                    )}
                  >
                    <Icon className="h-3 w-3" />
                    <span className="flex-1">{option.label}</span>
                    {active && <Check className="h-3 w-3" />}
                  </button>
                );
              })}
              <div className="my-1 h-px bg-[#2C3646]" />
              <button
                type="button"
                role="menuitem"
                onClick={() => { setMenuOpen(false); setError(""); setDeleteOpen(true); }}
                disabled={saving}
                className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs text-red-400 transition-colors hover:bg-red-500/10"
              >
                <Trash2 className="h-3 w-3" />
                Delete
              </button>
            </div>
          )}
        </div>
      )}

      {/* Delete confirmation */}
      {deleteOpen && !readonly && (
        <div
          role="presentation"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onMouseDown={(e) => { if (e.target === e.currentTarget && !saving) setDeleteOpen(false); }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={`delete-title-${movie.id}`}
            aria-describedby={`delete-desc-${movie.id}`}
            className="w-full max-w-sm rounded-xl border border-[#354052] bg-[#1A2230] p-6 shadow-2xl"
          >
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10 text-red-400">
              <Trash2 className="h-4 w-4" />
            </div>
            <h2 id={`delete-title-${movie.id}`} className="text-base font-semibold text-white">Delete movie?</h2>
            <p id={`delete-desc-${movie.id}`} className="mt-2 text-sm leading-relaxed text-[#AAB3C2]">
              <span className="font-medium text-white">{movie.title}</span> will be permanently removed.
            </p>
            {error && <p role="alert" className="mt-3 text-xs text-red-400">{error}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteOpen(false)}
                disabled={saving}
                className="inline-flex h-9 items-center justify-center rounded-lg border border-[#354052] bg-[#242D3C] px-4 text-xs font-medium text-[#E2E5EB] transition-colors hover:bg-[#303B4C] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={saving}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 text-xs font-medium text-white transition-colors hover:bg-red-500 disabled:opacity-50"
              >
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {error && !deleteOpen && !readonly && (
        <p role="alert" className="mt-1 text-[10px] text-red-400">{error}</p>
      )}
    </div>
  );
}
