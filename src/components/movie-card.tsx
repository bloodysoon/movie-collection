
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

import { Badge } from "@/components/ui/badge";
import { Movie, MovieStatus } from "@/types/movie";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

interface MovieCardProps {
  movie: Movie;
  readonly?: boolean;
  onDelete?: (movieId: number) => void;
  onUpdate?: (
    movieId: number,
    changes: Partial<Movie>
  ) => void;
}

const statusStyles = {
  watched: {
    label: "Watched",
    className:
      "border-[#315650]/70 bg-[#315650]/25 text-[#9AC5B6]",
  },
  watchlist: {
    label: "Watchlist",
    className:
      "border-[#74603D]/70 bg-[#74603D]/25 text-[#D4BA8D]",
  },
};

const statusOptions = [
  {
    value: "watched" as const,
    label: "Watched",
    icon: CheckCircle2,
  },
  {
    value: "watchlist" as const,
    label: "Watchlist",
    icon: Bookmark,
  },
];

export function MovieCard({
  movie,
  readonly = false,
  onDelete,
  onUpdate,
}: MovieCardProps) {
  const [status, setStatus] = useState<MovieStatus>(
    movie.status
  );
  const [isFavorite, setIsFavorite] = useState(
    movie.is_favorite ?? false
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setStatus(movie.status);
    setIsFavorite(movie.is_favorite ?? false);
  }, [movie.status, movie.is_favorite]);

  useEffect(() => {
    if (!menuOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener(
        "pointerdown",
        handlePointerDown
      );
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!deleteOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !saving) {
        setDeleteOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [deleteOpen, saving]);

  const statusConfig = statusStyles[status];

  const personalRating = movie.rating;
const imdbRating = movie.imdb_rating;

const displayRating =
  personalRating != null
    ? Number(personalRating)
    : imdbRating && imdbRating !== "N/A"
      ? Number(imdbRating)
      : null;

const hasRating =
  displayRating !== null && Number.isFinite(displayRating);

  const hasPoster = Boolean(
    movie.poster && movie.poster !== "N/A"
  );

  async function handleStatusChange(newStatus: MovieStatus) {
    if (saving || newStatus === status) {
      setMenuOpen(false);
      return;
    }

    setSaving(true);
    setError("");

    try {
      const { data, error: updateError } = await supabase
        .from("movies")
        .update({ status: newStatus })
        .eq("id", movie.id)
        .select("status")
        .single();

      if (updateError) throw updateError;

      const updatedStatus = data.status as MovieStatus;

      setStatus(updatedStatus);
      onUpdate?.(movie.id, { status: updatedStatus });
      setMenuOpen(false);
    } catch (updateError) {
      console.error("Error updating movie status:", updateError);
      setError("Could not update movie status.");
    } finally {
      setSaving(false);
    }
  }

  async function handleFavoriteToggle() {
    if (saving) return;

    setSaving(true);
    setError("");

    try {
      const { data, error: updateError } = await supabase
        .from("movies")
        .update({ is_favorite: !isFavorite })
        .eq("id", movie.id)
        .select("is_favorite")
        .single();

      if (updateError) throw updateError;

      setIsFavorite(data.is_favorite);
      onUpdate?.(movie.id, {
        is_favorite: data.is_favorite,
      });
    } catch (updateError) {
      console.error("Error updating favorite:", updateError);
      setError("Could not update favorite.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (saving) return;

    setSaving(true);
    setError("");

    try {
      const { data, error: deleteError } = await supabase
        .from("movies")
        .delete()
        .eq("id", movie.id)
        .select("id")
        .single();

      if (deleteError) throw deleteError;

      onDelete?.(data.id);
      setDeleteOpen(false);
    } catch (deleteError) {
      console.error("Error deleting movie:", deleteError);
      setError("Could not delete movie.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="relative h-full">
      <article
        className={cn(
          "group relative flex h-full flex-col overflow-hidden rounded-xl",
          "border border-border/70 bg-card",
          "transition-all duration-300 ease-out",
          "hover:-translate-y-1 hover:border-[#74603D]/50",
          "hover:shadow-[0_12px_32px_rgba(0,0,0,0.25)]"
        )}
      >
        {!readonly && (
          <Link
            href={`/movie/${movie.id}`}
            aria-label={`View details for ${movie.title}`}
            className="absolute inset-0 z-10 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B49A70]"
          />
        )}

        <div className="relative aspect-[2/3] w-full overflow-hidden bg-muted">
          {hasPoster ? (
            <Image
              src={movie.poster!}
              alt={`Poster for ${movie.title}`}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-muted-foreground">
              <Film className="h-12 w-12 opacity-40" />
              <span className="text-xs">
                No poster available
              </span>
            </div>
          )}

          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/55 to-transparent" />

          <div className="absolute bottom-3 left-3 flex flex-wrap items-center gap-1.5">
            <Badge
              className={cn(
                "border px-2.5 py-1 text-[11px] font-medium shadow-sm backdrop-blur-sm",
                statusConfig.className
              )}
            >
              {statusConfig.label}
            </Badge>

            {isFavorite && (
              <Badge className="border border-[#473456]/80 bg-[#473456]/70 px-2.5 py-1 text-[11px] font-medium text-[#E0CBE8] backdrop-blur-sm">
                <Heart className="mr-1 h-3 w-3 fill-current" />
                Favorite
              </Badge>
            )}
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-3 p-4">
          <div className="space-y-1">
            <h3 className="line-clamp-2 text-base font-semibold leading-snug tracking-tight text-foreground transition-colors group-hover:text-[#D4BA8D]">
              {movie.title}
            </h3>

            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {movie.year && <span>{movie.year}</span>}

              {movie.year && movie.genre && (
                <span className="text-border">•</span>
              )}

              {movie.genre && (
                <span className="line-clamp-1">
                  {movie.genre.split(",")[0].trim()}
                </span>
              )}
            </div>
          </div>


          <div className="mt-auto flex items-center justify-between border-t border-border/60 pt-3">
           {hasRating ? (
  <div className="flex items-center gap-1.5">
    <Star className="h-4 w-4 fill-[#B49A70] text-[#B49A70]" />

    <span className="text-sm font-semibold text-foreground">
      {displayRating}
    </span>

    <span className="text-xs text-muted-foreground">
      /10
    </span>

    {personalRating == null && (
      <span className="ml-1 text-[10px] text-muted-foreground">
        IMDb
      </span>
    )}
  </div>
) : (
  <span className="text-xs text-muted-foreground">
    Not rated
  </span>
)}

            {!readonly && (
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setDeleteOpen(true);
                }}
                disabled={saving}
                aria-label={`Delete ${movie.title}`}
                title="Delete movie"
                className="relative z-20 flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </article>

      {!readonly && (
        <div
          ref={menuRef}
          className="absolute right-3 top-3 z-20"
        >
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleFavoriteToggle}
              disabled={saving}
              aria-label={
                isFavorite
                  ? `Remove ${movie.title} from favorites`
                  : `Add ${movie.title} to favorites`
              }
              aria-pressed={isFavorite}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg border backdrop-blur-md transition-colors",
                isFavorite
                  ? "border-[#765887] bg-[#473456]/90 text-[#E0CBE8]"
                  : "border-white/15 bg-black/65 text-white hover:bg-black/85",
                "disabled:cursor-not-allowed disabled:opacity-60"
              )}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Heart
                  className={cn(
                    "h-4 w-4",
                    isFavorite && "fill-current"
                  )}
                />
              )}
            </button>

            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              disabled={saving}
              aria-label={`Actions for ${movie.title}`}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 bg-black/65 text-white backdrop-blur-md transition-colors hover:bg-black/85 disabled:opacity-60"
            >
              <MoreHorizontal className="h-5 w-5" />
            </button>
          </div>

          {menuOpen && (
            <div
              role="menu"
              aria-label={`Status for ${movie.title}`}
              className="absolute right-0 top-11 z-30 w-44 overflow-hidden rounded-lg border border-[#354052] bg-[#1A2230] p-1 shadow-2xl"
            >
              {statusOptions.map((option) => {
                const Icon = option.icon;
                const active = status === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    role="menuitemradio"
                    aria-checked={active}
                    onClick={() =>
                      handleStatusChange(option.value)
                    }
                    disabled={saving}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs transition-colors",
                      active
                        ? "bg-[#473456]/50 text-[#E0CBE8]"
                        : "text-[#D5DAE2] hover:bg-[#2C3646]"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="flex-1">
                      {option.label}
                    </span>
                    {active && (
                      <Check className="h-3.5 w-3.5" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {deleteOpen && !readonly && (
        <div
          role="presentation"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) {
              setDeleteOpen(false);
            }
          }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={`delete-title-${movie.id}`}
            aria-describedby={`delete-description-${movie.id}`}
            className="w-full max-w-sm rounded-xl border border-[#354052] bg-[#1A2230] p-6 shadow-2xl"
          >
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-red-500/10 text-red-400">
              <Trash2 className="h-5 w-5" />
            </div>

            <h2
              id={`delete-title-${movie.id}`}
              className="text-lg font-semibold text-white"
            >
              Delete movie?
            </h2>

            <p
              id={`delete-description-${movie.id}`}
              className="mt-2 text-sm leading-relaxed text-[#AAB3C2]"
            >
              Are you sure you want to delete{" "}
              <span className="font-medium text-white">
                {movie.title}
              </span>
              ? This action cannot be undone.
            </p>

            {error && (
              <p role="alert" className="mt-3 text-xs text-red-400">
                {error}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-2">
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
                {saving && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                )}
                Delete Movie
              </button>
            </div>
          </div>
        </div>
      )}

      {error && !deleteOpen && !readonly && (
        <p role="alert" className="mt-2 text-xs text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
