
"use client";

import { Suspense, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Film, Plus } from "lucide-react";

import { MovieCard } from "@/components/movie-card";
import { useAuth } from "@/contexts/auth-context";
import { useAddMovie } from "@/contexts/add-movie-context";
import { useMovieCollection } from "@/contexts/movie-collection-context";
import type { Movie } from "@/types/movie";

type SortField =
  | "created_at"
  | "year"
  | "rating"
  | "metascore";

function MovieCollection() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { user, loading: authLoading } = useAuth();
  const { openDrawer } = useAddMovie();

  const {
    movies,
    loading,
    error,
    removeMovie,
    updateMovie,
    refreshMovies,
  } = useMovieCollection();

  const search = searchParams.get("search") ?? "";
  const status = searchParams.get("status") ?? "";
  const genre = searchParams.get("genre") ?? "";
  const year = searchParams.get("year") ?? "";
  const sort = (searchParams.get("sort") ??
    "created_at") as SortField;
  const order = searchParams.get("order") ?? "desc";

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [user, authLoading, router]);

  const filteredMovies = useMemo(() => {
    const query = search.trim().toLowerCase();

    return movies
      .filter((movie) => {
        const matchesSearch =
          !query ||
          movie.title.toLowerCase().includes(query) ||
          (movie.actors ?? "")
            .toLowerCase()
            .includes(query) ||
          (movie.genre ?? "")
            .toLowerCase()
            .includes(query);

        const matchesStatus =
          !status ||
          (status === "favorites" ? movie.is_favorite === true :
           status === "liked"     ? movie.liked === true :
           status === "disliked"  ? movie.liked === false :
           movie.status === status);

        const matchesGenre =
          !genre ||
          (movie.genre ?? "")
            .split(",")
            .map((item) => item.trim().toLowerCase())
            .includes(genre.toLowerCase());

        const matchesYear =
          !year || movie.year?.toString() === year;

        return (
          matchesSearch &&
          matchesStatus &&
          matchesGenre &&
          matchesYear
        );
      })
      .sort((a, b) => {
        let comparison = 0;

        switch (sort) {
          case "year":
            comparison = (a.year ?? 0) - (b.year ?? 0);
            break;

          case "rating": {
            const ra = a.rating != null ? Number(a.rating) : (a.imdb_rating && a.imdb_rating !== "N/A" ? Number(a.imdb_rating) : 0);
            const rb = b.rating != null ? Number(b.rating) : (b.imdb_rating && b.imdb_rating !== "N/A" ? Number(b.imdb_rating) : 0);
            comparison = ra - rb;
            break;
          }

          case "metascore":
            comparison = (Number(a.metascore) || 0) - (Number(b.metascore) || 0);
            break;

          default:
            comparison =
              new Date(a.created_at).getTime() -
              new Date(b.created_at).getTime();
        }

        return order === "asc"
          ? comparison
          : -comparison;
      });
  }, [movies, search, status, genre, year, sort, order]);

  if (authLoading || loading) {
    return (
      <div className="px-4 py-8 text-sm text-muted-foreground">
        Loading your collection...
      </div>
    );
  }

  if (!user) return null;

  if (error) {
    return (
      <section className="mx-auto w-full max-w-[1800px] px-4 py-10 text-center md:px-6">
        <p className="text-sm text-red-400">
          {error}
        </p>

        <button
          type="button"
          onClick={() => void refreshMovies()}
          className="mt-4 rounded-lg bg-[#74603D] px-4 py-2 text-sm font-medium text-[#F4EDE2] hover:bg-[#866F49]"
        >
          Try Again
        </button>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-[1800px] px-4 py-5 md:px-6">
      {movies.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20 text-center">
          <Film className="mb-4 h-12 w-12 text-[#B49A70]" />

          <button
            type="button"
            onClick={openDrawer}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#74603D] px-5 py-2.5 text-sm font-medium text-[#F4EDE2] hover:bg-[#866F49]"
          >
            <Plus className="h-4 w-4" />
            Add Your First Movie
          </button>
        </div>
      ) : filteredMovies.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
          <Film className="mb-4 h-10 w-10 text-muted-foreground" />

          <h2 className="text-lg font-semibold">
            No movies found
          </h2>

          <p className="mt-2 text-sm text-muted-foreground">
            Try adjusting your search or filters.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 2xl:grid-cols-8 sm:gap-3">
          {filteredMovies.map((movie: Movie) => (
            <MovieCard
              key={movie.id}
              movie={movie}
              onDelete={removeMovie}
              onUpdate={updateMovie}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="px-4 py-8 text-sm text-muted-foreground">
          Loading collection...
        </div>
      }
    >
      <MovieCollection />
    </Suspense>
  );
}
