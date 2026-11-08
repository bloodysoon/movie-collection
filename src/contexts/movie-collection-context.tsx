
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-context";
import { Movie } from "@/types/movie";

interface MovieCollectionContextValue {
  movies: Movie[];
  loading: boolean;
  error: string | null;
  refreshMovies: () => Promise<void>;
  updateMovie: (
    movieId: number,
    changes: Partial<Movie>
  ) => void;
  removeMovie: (movieId: number) => void;
}

const MovieCollectionContext =
  createContext<MovieCollectionContextValue | null>(null);

export function MovieCollectionProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { user, loading: authLoading } = useAuth();

  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoaded = useRef(false);

  const loadMovies = useCallback(async (userId: string) => {
    // Only show the loading spinner on the very first fetch — subsequent
    // refreshes (tab refocus, manual refresh) run silently in the background.
    if (!hasLoaded.current) setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from("movies")
      .select("*")
      .eq("user_id", userId);

    if (fetchError) {
      console.error("Error fetching movies:", fetchError);
      setError("Could not load your movie collection.");
    } else {
      setMovies(data ?? []);
    }

    hasLoaded.current = true;
    setLoading(false);
  }, []);

  const userId = user?.id;

  useEffect(() => {
    if (authLoading) return;

    if (!userId) {
      hasLoaded.current = false;
      setMovies([]);
      setError(null);
      setLoading(false);
      return;
    }

    void loadMovies(userId);
  }, [userId, authLoading, loadMovies]);

  const refreshMovies = useCallback(async () => {
    if (!user) return;
    await loadMovies(user.id);
  }, [user, loadMovies]);

  const updateMovie = useCallback(
    (movieId: number, changes: Partial<Movie>) => {
      setMovies((current) =>
        current.map((movie) =>
          movie.id === movieId
            ? { ...movie, ...changes }
            : movie
        )
      );
    },
    []
  );

  const removeMovie = useCallback((movieId: number) => {
    setMovies((current) =>
      current.filter((movie) => movie.id !== movieId)
    );
  }, []);

  return (
    <MovieCollectionContext.Provider
      value={{
        movies,
        loading,
        error,
        refreshMovies,
        updateMovie,
        removeMovie,
      }}
    >
      {children}
    </MovieCollectionContext.Provider>
  );
}

export function useMovieCollection() {
  const context = useContext(MovieCollectionContext);

  if (!context) {
    throw new Error(
      "useMovieCollection must be used inside MovieCollectionProvider"
    );
  }

  return context;
}
