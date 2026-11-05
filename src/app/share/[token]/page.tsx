
"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

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

    return () => {
      active = false;
    };
  }, [token]);

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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="mb-2 text-4xl font-bold">
          Shared Movie Collection
        </h1>

        <p className="text-muted-foreground">
          Browse this collection of {movies.length} movies
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {movies.map((movie) => (
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
