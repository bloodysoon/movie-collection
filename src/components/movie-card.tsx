
import Link from "next/link";
import Image from "next/image";
import { Film, Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Movie } from "@/types/movie";
import { cn } from "@/lib/utils";

interface MovieCardProps {
  movie: Movie;
  readonly?: boolean;
}

const statusStyles = {
  watched: {
    label: "Watched",
    className:
      "border-[#315650]/70 bg-[#315650]/25 text-[#9AC5B6]",
  },
  favorites: {
    label: "Favorites",
    className:
      "border-[#473456]/80 bg-[#473456]/35 text-[#C7A8D5]",
  },
  watchlist: {
    label: "Watchlist",
    className:
      "border-[#74603D]/70 bg-[#74603D]/25 text-[#D4BA8D]",
  },
};

export function MovieCard({
  movie,
  readonly = false,
}: MovieCardProps) {
  const status =
    movie.status === "watched" ||
    movie.status === "favorites" ||
    movie.status === "watchlist"
      ? movie.status
      : "watchlist";

  const statusConfig = statusStyles[status];

  const hasPoster = Boolean(
    movie.poster && movie.poster !== "N/A"
  );

  const cardContent = (
    <article
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-xl",
        "border border-border/70 bg-card",
        "transition-all duration-300 ease-out",
        "hover:-translate-y-1 hover:border-[#74603D]/50",
        "hover:shadow-[0_12px_32px_rgba(0,0,0,0.25)]"
      )}
    >
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
            <span className="text-xs">No poster available</span>
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/55 to-transparent" />

        <Badge
          className={cn(
            "absolute bottom-3 left-3 border px-2.5 py-1",
            "text-[11px] font-medium shadow-sm backdrop-blur-sm",
            statusConfig.className
          )}
        >
          {statusConfig.label}
        </Badge>
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

        {movie.actors && (
          <p className="line-clamp-1 text-xs text-muted-foreground">
            {movie.actors}
          </p>
        )}

        <div className="mt-auto flex items-center justify-between border-t border-border/60 pt-3">
          {movie.rating != null ? (
            <div className="flex items-center gap-1.5">
              <Star
                className="h-4 w-4 fill-[#B49A70] text-[#B49A70]"
              />
              <span className="text-sm font-semibold text-foreground">
                {movie.rating}
              </span>
              <span className="text-xs text-muted-foreground">
                /10
              </span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">
              Not rated
            </span>
          )}

          <span className="text-xs font-medium text-[#B49A70] opacity-0 transition-opacity group-hover:opacity-100">
            View details
          </span>
        </div>
      </div>
    </article>
  );

  if (readonly) {
    return cardContent;
  }

  return (
    <Link
      href={`/movie/${movie.id}`}
      className="block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {cardContent}
    </Link>
  );
}
