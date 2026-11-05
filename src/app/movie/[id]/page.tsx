"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Check, Film, Heart, Loader2, Star, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useMovieCollection } from "@/contexts/movie-collection-context";
import { supabase } from "@/lib/supabase";
import type { Movie, MovieStatus } from "@/types/movie";

const sectionClass =
  "min-w-0 rounded-2xl border border-[#354052] bg-[#1A2230] p-4 sm:p-6";
const labelClass =
  "mb-2 block text-xs font-medium uppercase tracking-wider text-[#9CA8B9]";

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  if (children === null || children === undefined || children === "") return null;
  return (
    <div className="min-w-0">
      <p className={labelClass}>{label}</p>
      <div className="break-words text-sm leading-relaxed text-[#E2E5EB]">{children}</div>
    </div>
  );
}

function Poster({ src, title }: { src?: string | null; title: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);

  return (
    <div className="mx-auto aspect-[2/3] w-full max-w-[420px] overflow-hidden rounded-xl border border-[#354052] bg-[#18202C] lg:max-w-none">
      {src && src !== "N/A" && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={title}
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-[#8994A5]">
          <Film className="h-10 w-10 text-[#74603D]" />
          <span className="text-xs">No poster available</span>
        </div>
      )}
    </div>
  );
}

export default function MoviePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-[#B49A70]" />
        </div>
      }
    >
      <MoviePageContent />
    </Suspense>
  );
}

function MoviePageContent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { movies, loading: moviesLoading, error } = useMovieCollection();

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);

  const movie = movies.find((item) => String(item.id) === id);

  if (authLoading || (user && moviesLoading)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-[#B49A70]" />
      </div>
    );
  }

  if (!user) return null;

  if (error) {
    return <p role="alert" className="p-8 text-red-400">Unable to load your collection. Please try again.</p>;
  }

  if (!movie) {
    return (
      <main className="min-h-screen bg-[#0D1119] px-4 py-10 text-[#E2E5EB]">
        <h1 className="text-2xl font-semibold">Movie not found</h1>
        <p className="mt-2 text-[#8994A5]">This movie is not available in your collection.</p>
        <Link href="/" className="mt-5 inline-block text-[#B49A70] hover:underline">Back to Collection</Link>
      </main>
    );
  }

  return <EditableMovieDetails key={String(movie.id)} movie={movie} userId={user.id} />;
}

function EditableMovieDetails({ movie, userId }: { movie: Movie; userId: string }) {
  const [status, setStatus] = useState<MovieStatus>(movie.status);
  const [favorite, setFavorite] = useState(Boolean(movie.is_favorite));
  const [notes, setNotes] = useState(movie.notes ?? "");
  const [savingSetting, setSavingSetting] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [message, setMessage] = useState("");
  const [notesMessage, setNotesMessage] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const router = useRouter();
  const { refreshMovies } = useMovieCollection();

  async function saveSetting(field: "status" | "is_favorite", value: MovieStatus | boolean) {
    if (savingSetting) return;
    const previousStatus = status;
    const previousFavorite = favorite;
    if (field === "status") setStatus(value as MovieStatus);
    else setFavorite(value as boolean);
    setSavingSetting(true);
    setMessage("");
    try {
      const { error } = await supabase.from("movies").update({ [field]: value }).eq("id", movie.id).eq("user_id", userId);
      if (error) throw error;
    } catch (error) {
      console.error("Update movie failed:", error);
      setStatus(previousStatus);
      setFavorite(previousFavorite);
      setMessage("Could not save changes. Please try again.");
    } finally {
      setSavingSetting(false);
    }
  }

  async function saveNotes() {
    if (savingNotes) return;
    setSavingNotes(true);
    setNotesMessage("");
    try {
      const { error } = await supabase.from("movies").update({ notes: notes.trim() || null }).eq("id", movie.id).eq("user_id", userId);
      if (error) throw error;
      setNotesMessage("Notes saved.");
    } catch (error) {
      console.error("Save notes failed:", error);
      setNotesMessage("Could not save notes. Please try again.");
    } finally {
      setSavingNotes(false);
    }
  }

  async function deleteMovie() {
    if (deleting) return;
    setDeleting(true);
    setDeleteError("");
    try {
      const { error } = await supabase
        .from("movies")
        .delete()
        .eq("id", movie.id)
        .eq("user_id", userId);
      if (error) throw error;
      await refreshMovies();
      router.replace("/");
    } catch (error) {
      console.error("Delete movie failed:", error);
      setDeleteError("Could not delete this movie. Please try again.");
      setDeleting(false);
    }
  }

  return (
    <main className="min-h-screen w-full bg-[#0D1119] text-[#E2E5EB]">
      <div className="w-full px-4 pb-16 pt-6 sm:px-6 lg:px-8 2xl:px-10">
        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(230px,26%)_minmax(0,1fr)] 2xl:grid-cols-[minmax(300px,23%)_minmax(0,1fr)] 2xl:gap-7">
          <aside className="min-w-0 space-y-4">
            <Poster src={movie.poster} title={movie.title} />
            {movie.imdb_rating && (
              <div className={`${sectionClass} flex items-center justify-between gap-3`}>
                <span className="text-sm text-[#9CA8B9]">IMDb Rating</span>
                <span className="inline-flex items-center gap-2 font-semibold">
                  <Star className="h-4 w-4 fill-[#B49A70] text-[#B49A70]" />
                  {movie.imdb_rating}
                </span>
              </div>
            )}
          </aside>

          <div className="min-w-0 space-y-5">
            <section className={sectionClass}>
              <div className="mb-5 border-b border-[#354052] pb-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#B49A70]">Movie Information</p>
                <h1 className="mt-1 break-words text-xl font-semibold text-[#F4EDE2] sm:text-2xl">{movie.title}</h1>
              </div>
              <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 xl:grid-cols-3">
                <Info label="Release Year">{movie.year}</Info>
                <Info label="Genres">{movie.genre}</Info>
                <Info label="Runtime">{movie.runtime}</Info>
                <Info label="Director">{movie.director}</Info>
                <div className="sm:col-span-2"><Info label="Cast">{movie.actors}</Info></div>
                <Info label="Language">{movie.language}</Info>
                <Info label="Country">{movie.country}</Info>
                <Info label="Metascore">{movie.metascore}</Info>
                {movie.awards && <div className="sm:col-span-2 xl:col-span-3"><Info label="Awards">{movie.awards}</Info></div>}
                {movie.plot && <div className="sm:col-span-2 xl:col-span-3"><Info label="Plot">{movie.plot}</Info></div>}
                {movie.imdb_id && (
                  <div className="sm:col-span-2 xl:col-span-3">
                    <p className={labelClass}>IMDb</p>
                    <a
                      href={`https://www.imdb.com/title/${encodeURIComponent(movie.imdb_id)}/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-[#D8C29D] underline-offset-4 hover:underline"
                    >
                      View on IMDb
                    </a>
                  </div>
                )}
              </div>
            </section>

            <section className={sectionClass}>
              <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#B49A70]">Collection</p>
              <p className={labelClass}>Status</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {([
                  { value: "watchlist", label: "Watchlist", hint: "Watch later" },
                  { value: "watched", label: "Watched", hint: "Already seen" },
                ] as const).map((option) => {
                  const selected = status === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      disabled={savingSetting}
                      aria-pressed={selected}
                      onClick={() => void saveSetting("status", option.value)}
                      className={`rounded-xl border px-4 py-3 text-left transition-colors ${selected ? "border-[#B49A70] bg-[#74603D]/20" : "border-[#354052] bg-[#242D3C] hover:border-[#526078]"}`}
                    >
                      <span className="flex items-center justify-between gap-2 text-sm font-semibold">
                        {option.label}
                        {selected && <Check className="h-4 w-4 text-[#B49A70]" />}
                      </span>
                    </button>
                  );
                })}
              </div>
              <button type="button" disabled={savingSetting} aria-pressed={favorite} onClick={() => void saveSetting("is_favorite", !favorite)} className={`mt-3 flex w-full items-center gap-3 rounded-xl border p-3.5 text-left transition-colors ${favorite ? "border-[#9D6B79] bg-[#9D6B79]/15" : "border-[#354052] bg-[#242D3C] hover:border-[#526078]"}`}>
                <Heart className={`h-4 w-4 ${favorite ? "fill-[#D99EAF] text-[#D99EAF]" : "text-[#8994A5]"}`} />
                <span className="flex-1 text-sm font-medium">Favorite</span>
                {favorite && <Check className="h-4 w-4 text-[#D99EAF]" />}
              </button>
              {message && <p role="alert" className="mt-3 text-sm text-red-400">{message}</p>}
              {movie.rating != null && <div className="mt-5"><Info label="Your Rating">{`${movie.rating}/10`}</Info></div>}
            </section>

            <section className={sectionClass}>
              <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#B49A70]">Notes</p>
              <label htmlFor="movie-notes" className="sr-only">Notes</label>
              <textarea id="movie-notes" rows={4} value={notes} onChange={(event) => { setNotes(event.target.value); setNotesMessage(""); }} placeholder="What did you think about this movie?" className="w-full rounded-lg border border-[#354052] bg-[#242D3C] px-3 py-2.5 text-sm text-[#E2E5EB] outline-none placeholder:text-[#788597] focus:border-[#B49A70]" />
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <span role="status" className={`text-xs ${notesMessage.startsWith("Could") ? "text-red-400" : "text-[#9CA8B9]"}`}>{notesMessage}</span>
                <button type="button" disabled={savingNotes || notes === (movie.notes ?? "")} onClick={() => void saveNotes()} className="inline-flex items-center gap-2 rounded-lg bg-[#74603D] px-4 py-2.5 text-sm font-semibold text-[#F4EDE2] transition-colors hover:bg-[#866F49] disabled:cursor-not-allowed disabled:opacity-50">{savingNotes && <Loader2 className="h-4 w-4 animate-spin" />}{savingNotes ? "Saving..." : "Save Notes"}</button>
              </div>
            </section>

            <div className="flex flex-col items-end gap-3">
              <button
              type="button"
              onClick={() => { setConfirmDelete(true); setDeleteError(""); }}
              className="inline-flex items-center gap-2 rounded-lg border border-red-900/60 bg-red-950/20 px-3 py-2 text-sm text-red-300 transition-colors hover:bg-red-950/50"
            >
              <Trash2 className="h-4 w-4" /> Delete Movie
            </button>
            {confirmDelete && (
              <div role="dialog" aria-modal="true" aria-labelledby="delete-movie-title" className="w-full rounded-xl border border-red-900/60 bg-[#1A2230] p-4 sm:p-5">
                <h2 id="delete-movie-title" className="font-semibold text-[#F4EDE2]">Delete this movie?</h2>
                <p className="mt-2 text-sm text-[#A6ADBA]">Remove <strong>{movie.title}</strong> from your collection permanently? This cannot be undone.</p>
                {deleteError && <p role="alert" className="mt-3 text-sm text-red-400">{deleteError}</p>}
                <div className="mt-4 flex flex-wrap gap-3">
                  <button type="button" disabled={deleting} onClick={() => setConfirmDelete(false)} className="rounded-lg border border-[#354052] px-4 py-2 text-sm text-[#E2E5EB] hover:bg-[#242D3C] disabled:opacity-50">Cancel</button>
                  <button type="button" disabled={deleting} onClick={() => void deleteMovie()} className="inline-flex items-center gap-2 rounded-lg bg-red-800 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
                    {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
                    {deleting ? "Deleting..." : "Yes, delete movie"}
                  </button>
                </div>
              </div>
            )}
            </div>

          </div>
        </div>
      </div>
    </main>
  );
}
