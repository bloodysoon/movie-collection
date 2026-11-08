
"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";

import { supabase } from "@/lib/supabase";
import { MovieCard } from "@/components/movie-card";
import { Button } from "@/components/ui/button";
import type { Movie } from "@/types/movie";

export default function SharedPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto px-4 py-8">
          Loading...
        </div>
      }
    >
      <SharedCollectionContent />
    </Suspense>
  );
}

function SharedCollectionContent() {
  const { token } = useParams<{ token: string }>();
  const searchParams = useSearchParams();

  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadSharedMovies() {
      setLoading(true);
      setError(false);

      const { data, error: fetchError } = await supabase.rpc(
        "get_movies_by_share_token",
        { p_share_token: token }
      );

      if (!active) return;

      if (fetchError) {
        console.error("Error fetching shared movies:", fetchError);
        setError(true);
        setMovies([]);
      } else {
        setMovies(data || []);
      }

      setLoading(false);
    }

    void loadSharedMovies();
    return () => { active = false; };
  }, [token]);

  // Parse ?lists= param — undefined means no filter (show all)
  const listsParam = searchParams.get("lists");
  const activeFilters = useMemo<Set<string> | null>(() => {
    if (!listsParam) return null;
    const parts = listsParam.split(",").map(s => s.trim()).filter(Boolean);
    return parts.length > 0 ? new Set(parts) : null;
  }, [listsParam]);

  const filteredMovies = useMemo(() => {
    if (!activeFilters) return movies;
    return movies.filter(movie => {
      if (activeFilters.has("favorites") && movie.is_favorite) return true;
      if (activeFilters.has("watched")   && movie.status === "watched") return true;
      if (activeFilters.has("watchlist") && movie.status === "watchlist") return true;
      return false;
    });
  }, [movies, activeFilters]);

  // Label for the active filter
  const filterLabel = useMemo(() => {
    if (!activeFilters) return null;
    const names: Record<string, string> = {
      favorites: "Favorites",
      watched: "Watched",
      watchlist: "Watchlist",
    };
    return [...activeFilters].map(k => names[k] ?? k).join(", ");
  }, [activeFilters]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        Loading...
      </div>
    );
  }

  if (error || movies.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="py-12 text-center">
          <p className="mb-4 text-muted-foreground">
            This collection is not available or has been removed.
          </p>
          <Link href="/">
            <Button variant="outline">Create Your Own Collection</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (filteredMovies.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="py-12 text-center">
          <p className="mb-4 text-muted-foreground">
            No movies in {filterLabel ?? "this collection"}.
          </p>
          <Link href="/">
            <Button variant="outline">Create Your Own Collection</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="mb-2 text-4xl font-bold">
          Shared Movie Collection
        </h1>
        <p className="text-muted-foreground">
          {filterLabel
            ? `${filteredMovies.length} ${filteredMovies.length === 1 ? "movie" : "movies"} · ${filterLabel}`
            : `${filteredMovies.length} ${filteredMovies.length === 1 ? "movie" : "movies"}`}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 2xl:grid-cols-8 sm:gap-3">
        {filteredMovies.map((movie) => (
          <div key={movie.id} className="opacity-90">
            <MovieCard movie={movie} readonly />
          </div>
        ))}
      </div>

      <div className="mt-8 text-center">
        <Link href="/">
          <Button variant="outline">Create Your Own Collection</Button>
        </Link>
      </div>
    </div>
  );
}
