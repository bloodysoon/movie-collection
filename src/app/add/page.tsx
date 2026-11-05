"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, Check, Film, Heart, Loader2, Plus, Search, Star, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { searchMovies, getMovieDetails, mapOMDBToMovieFormData, type OMDBMovie } from "@/lib/omdb";
import type { MovieFormData, MovieStatus } from "@/types/movie";
import { useAuth } from "@/contexts/auth-context";
import { useMovieCollection } from "@/contexts/movie-collection-context";

const emptyMovie: MovieFormData = {
  title: "", year: undefined, genre: undefined, rating: undefined,
  status: "watchlist", is_favorite: false, notes: undefined,
  actors: undefined, director: undefined, plot: undefined,
  poster: undefined, imdb_id: undefined, runtime: undefined,
  language: undefined, country: undefined, awards: undefined,
  metascore: undefined, imdb_rating: undefined,
};

const fieldClass = "w-full rounded-lg border border-[#354052] bg-[#242D3C] px-3 py-2.5 text-sm text-[#E2E5EB] outline-none placeholder:text-[#788597] focus:border-[#B49A70]";
const sectionClass = "min-w-0 rounded-2xl border border-[#354052] bg-[#1A2230] p-4 sm:p-6";
const labelClass = "mb-2 block text-xs font-medium uppercase tracking-wider text-[#9CA8B9]";

function Poster({ src, title, className = "" }: { src?: string | null; title: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  return (
    <div className={`overflow-hidden rounded-xl border border-[#354052] bg-[#18202C] ${className}`}>
      {src && src !== "N/A" && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={title || "Movie poster"} onError={() => setFailed(true)} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full min-h-44 w-full flex-col items-center justify-center gap-2 text-[#8994A5]">
          <Film className="h-10 w-10 text-[#74603D]" />
          <span className="text-xs">No poster available</span>
        </div>
      )}
    </div>
  );
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className={labelClass}>{label}</p>
      <div className="break-words text-sm leading-relaxed text-[#E2E5EB]">{children || "—"}</div>
    </div>
  );
}

export default function AddMoviePage() {
  const router = useRouter();
  const pathname = usePathname();
  const previousPathRef = useRef(pathname);
  const { user, loading: authLoading } = useAuth();
  const { movies, refreshMovies } = useMovieCollection();
  const [mode, setMode] = useState<"search" | "omdb" | "manual">("search");
  const [formData, setFormData] = useState<MovieFormData>(emptyMovie);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<OMDBMovie[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchDone, setSearchDone] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [loading, setLoading] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Reset the draft when navigating back to Add Movie without a full remount.
  useEffect(() => {
    const previousPath = previousPathRef.current;
    previousPathRef.current = pathname;

    if (pathname !== "/add" || previousPath === "/add") return;

    setMode("search");
    setFormData({ ...emptyMovie });
    setSearchQuery("");
    setSearchResults([]);
    setSearching(false);
    setSearchDone(false);
    setSearchError("");
    setSaveError("");
  }, [pathname]);

  const existingIds = useMemo(() => new Set(movies.map(m => m.imdb_id).filter((id): id is string => Boolean(id))), [movies]);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);

  useEffect(() => {
    let cancelled = false;
    const query = searchQuery.trim();
    if (mode !== "search" || query.length < 2) return;
    const timeout = setTimeout(async () => {
      setSearching(true);
      setSearchDone(false);
      setSearchError("");
      try {
        const results = await searchMovies(query);
        if (!cancelled) { setSearchResults(results); setSearchDone(true); }
      } catch (error) {
        console.error("OMDb search failed:", error);
        if (!cancelled) { setSearchResults([]); setSearchError("Search failed. Please try again."); }
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 450);
    return () => { cancelled = true; clearTimeout(timeout); };
  }, [searchQuery, mode]);

  const update = <K extends keyof MovieFormData>(field: K, value: MovieFormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const selectMovie = async (imdbId: string) => {
    if (existingIds.has(imdbId)) return;
    setSearching(true);
    setSearchError("");
    try {
      const details = await getMovieDetails(imdbId);
      const mapped = mapOMDBToMovieFormData(details);
      setFormData({ ...mapped, status: "watchlist", is_favorite: false, notes: "" });
      setMode("omdb");
    } catch (error) {
      console.error("OMDb details failed:", error);
      setSearchError("Unable to load movie details. Please try again.");
    } finally { setSearching(false); }
  };

  const saveMovie = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user || loading) return;
    if (!formData.title.trim()) { setSaveError("Movie title is required."); return; }
    if (formData.imdb_id && existingIds.has(formData.imdb_id)) {
      setSaveError("This movie is already in your collection."); return;
    }
    setLoading(true);
    setSaveError("");
    try {
      const { error } = await supabase.from("movies").insert({
        user_id: user.id,
        title: formData.title.trim(), year: formData.year ?? null,
        genre: formData.genre?.trim() || null, rating: mode === "omdb" ? null : formData.rating ?? null,
        status: formData.status, is_favorite: formData.is_favorite ?? false,
        notes: formData.notes?.trim() || null,
        actors: formData.actors?.trim() || null,
        director: formData.director?.trim() || null,
        plot: formData.plot?.trim() || null,
        poster: formData.poster?.trim() || null,
        imdb_id: formData.imdb_id || null,
        runtime: formData.runtime || null,
        language: formData.language || null,
        country: formData.country || null,
        awards: formData.awards || null,
        metascore: formData.metascore || null,
        imdb_rating: formData.imdb_rating || null,
      });
      if (error) throw error;
      await refreshMovies();
      router.push("/");
    } catch (error: unknown) {
      console.error("Save movie failed:", error);
      const duplicate = typeof error === "object" && error !== null && "code" in error && error.code === "23505";
      setSaveError(duplicate ? "This movie is already in your collection." : "Could not save this movie. Please try again.");
    } finally { setLoading(false); }
  };

  if (authLoading) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-[#B49A70]" /></div>;
  if (!user) return null;

  return (
    <main className="min-h-screen w-full bg-[#0D1119] text-[#E2E5EB]">
      <div className="w-full px-4 pb-16 pt-6 sm:px-6 lg:px-8 2xl:px-10">

        {mode === "search" ? (
          <section className="w-full rounded-2xl border border-[#354052] bg-[#1A2230] p-4 sm:p-6">
            <h2 className="mb-1 text-lg font-semibold text-[#F4EDE2]">Find a Movie</h2>
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#B49A70]" />
              <input autoFocus type="search" value={searchQuery} onChange={event => {
                setSearchQuery(event.target.value); setSearchDone(false); setSearchError("");
                if (event.target.value.trim().length < 2) setSearchResults([]);
              }} placeholder="Search by movie title..." className={`${fieldClass} h-14 pl-12 pr-12 text-base`} />
              {searching ? <Loader2 className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin text-[#B49A70]" /> : searchQuery ? (
                <button type="button" aria-label="Clear search" onClick={() => { setSearchQuery(""); setSearchResults([]); setSearchDone(false); setSearchError(""); }} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8994A5] hover:text-white"><X className="h-4 w-4" /></button>
              ) : null}
            </div>
            {searchError && <p role="alert" className="mt-3 text-sm text-red-400">{searchError}</p>}
            {searchResults.length > 0 && (
              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {searchResults.map(movie => {
                  const added = existingIds.has(movie.imdbID);
                  return (
                    <button key={movie.imdbID} type="button" disabled={added || searching} onClick={() => void selectMovie(movie.imdbID)} className={`flex min-w-0 items-center gap-3 rounded-xl border p-3 text-left transition-colors ${added ? "cursor-not-allowed border-[#354052] opacity-50" : "border-[#354052] bg-[#242D3C] hover:border-[#B49A70]"}`}>
                      <Poster src={movie.Poster} title={movie.Title} className="h-24 w-16 shrink-0" />
                      <div className="min-w-0 flex-1"><p className="line-clamp-2 text-sm font-semibold text-[#F4EDE2]">{movie.Title}</p><p className="mt-1 text-xs text-[#8994A5]">{movie.Year}</p><span className="mt-3 inline-flex items-center gap-1 text-xs text-[#B49A70]">{added ? <><Check className="h-3 w-3" /> In Collection</> : <><Plus className="h-3 w-3" /> Select Movie</>}</span></div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        ) : (
          <form onSubmit={saveMovie} className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(230px,26%)_minmax(0,1fr)] 2xl:grid-cols-[minmax(300px,23%)_minmax(0,1fr)] 2xl:gap-7">
            <aside className="min-w-0 space-y-4">
              <Poster src={formData.poster} title={formData.title} className="mx-auto aspect-[2/3] w-full max-w-[420px] lg:max-w-none" />
              {mode === "manual" && <div className={sectionClass}><label htmlFor="poster" className={labelClass}>Poster URL</label><input id="poster" type="url" className={fieldClass} placeholder="https://..." value={formData.poster ?? ""} onChange={event => update("poster", event.target.value)} /></div>}
              {formData.imdb_rating && <div className={`${sectionClass} flex items-center justify-between gap-3`}><span className="text-sm text-[#9CA8B9]">IMDb Rating</span><span className="inline-flex items-center gap-2 font-semibold"><Star className="h-4 w-4 fill-[#B49A70] text-[#B49A70]" />{formData.imdb_rating}</span></div>}
            </aside>

            <div className="min-w-0 space-y-5">
              <section className={sectionClass}>
                <div className="mb-5 border-b border-[#354052] pb-4"><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#B49A70]">Movie Information</p><h2 className="mt-1 text-lg font-semibold text-[#F4EDE2]">Movie Details</h2><p className="mt-1 text-xs text-[#8994A5]">{mode === "omdb" ? "Imported from OMDb · Read-only" : "Enter details for a movie not found in OMDb"}</p></div>
                {mode === "omdb" ? (
                  <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 xl:grid-cols-3">
                    <div className="sm:col-span-2 xl:col-span-3"><Info label="Title"><h3 className="text-xl font-semibold text-[#F4EDE2] sm:text-2xl">{formData.title}</h3></Info></div>
                    <Info label="Release Year">{formData.year}</Info>
                    <Info label="Genres">{formData.genre}</Info>
                    <Info label="Runtime">{formData.runtime}</Info>
                    <Info label="Director">{formData.director}</Info>
                    <div className="sm:col-span-2"><Info label="Cast">{formData.actors}</Info></div>
                    {formData.language && <Info label="Language">{formData.language}</Info>}
                    {formData.country && <Info label="Country">{formData.country}</Info>}
                    {formData.plot && <div className="sm:col-span-2 xl:col-span-3"><Info label="Plot">{formData.plot}</Info></div>}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    <div className="sm:col-span-2 xl:col-span-3"><label htmlFor="title" className={labelClass}>Title *</label><input id="title" required className={fieldClass} value={formData.title} onChange={event => update("title", event.target.value)} /></div>
                    <div><label htmlFor="year" className={labelClass}>Year</label><input id="year" type="number" min="1888" max="2100" className={fieldClass} value={formData.year ?? ""} onChange={event => update("year", event.target.value ? Number(event.target.value) : undefined)} /></div>
                    <div className="sm:col-span-2"><label htmlFor="genre" className={labelClass}>Genres</label><input id="genre" className={fieldClass} placeholder="Drama, Adventure" value={formData.genre ?? ""} onChange={event => update("genre", event.target.value)} /></div>
                    <div><label htmlFor="director" className={labelClass}>Director</label><input id="director" className={fieldClass} value={formData.director ?? ""} onChange={event => update("director", event.target.value)} /></div>
                    <div className="sm:col-span-2"><label htmlFor="actors" className={labelClass}>Cast</label><input id="actors" className={fieldClass} value={formData.actors ?? ""} onChange={event => update("actors", event.target.value)} /></div>
                    <div className="sm:col-span-2 xl:col-span-3"><label htmlFor="plot" className={labelClass}>Plot</label><textarea id="plot" rows={3} className={fieldClass} value={formData.plot ?? ""} onChange={event => update("plot", event.target.value)} /></div>
                  </div>
                )}
              </section>

              <section className={sectionClass}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#B49A70]">Personal Collection</p><h2 className="mb-5 mt-1 text-lg font-semibold text-[#F4EDE2]">Collection Settings</h2>
                <p className={labelClass}>Watching Status</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {([{ value: "watchlist", label: "Watchlist", hint: "Watch later" }, { value: "watched", label: "Watched", hint: "Already seen" }] as const).map(option => {
                    const selected = formData.status === option.value;
                    return <button key={option.value} type="button" aria-pressed={selected} onClick={() => update("status", option.value as MovieStatus)} className={`rounded-xl border px-4 py-3 text-left transition-colors ${selected ? "border-[#B49A70] bg-[#74603D]/20" : "border-[#354052] bg-[#242D3C] hover:border-[#526078]"}`}><span className="flex items-center justify-between gap-2 text-sm font-semibold">{option.label}{selected && <Check className="h-4 w-4 text-[#B49A70]" />}</span><span className="mt-1 block text-xs text-[#8994A5]">{option.hint}</span></button>;
                  })}
                </div>
                <button type="button" aria-pressed={formData.is_favorite ?? false} onClick={() => update("is_favorite", !formData.is_favorite)} className={`mt-3 flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-colors ${formData.is_favorite ? "border-[#9D6B79] bg-[#9D6B79]/15" : "border-[#354052] bg-[#242D3C] hover:border-[#526078]"}`}><Heart className={`h-5 w-5 ${formData.is_favorite ? "fill-[#D99EAF] text-[#D99EAF]" : "text-[#8994A5]"}`} /><span className="flex-1"><span className="block text-sm font-semibold">Add to Favorites</span><span className="block text-xs text-[#8994A5]">Keep this movie among your favorites.</span></span>{formData.is_favorite && <Check className="h-4 w-4 text-[#D99EAF]" />}</button>
              </section>

              <section className={sectionClass}><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#B49A70]">Your Thoughts</p><h2 className="mb-4 mt-1 text-lg font-semibold text-[#F4EDE2]">Personal Notes</h2><label htmlFor="notes" className="sr-only">Personal Notes</label><textarea id="notes" rows={4} className={fieldClass} placeholder="What did you think about this movie?" value={formData.notes ?? ""} onChange={event => update("notes", event.target.value)} /></section>

              {saveError && <p role="alert" className="text-sm text-red-400">{saveError}</p>}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#354052] bg-[#1A2230] p-4">
                <button type="button" disabled={loading} onClick={() => { setMode("search"); setSearchQuery(""); setSearchResults([]); setSearchDone(false); setSearchError(""); }} className="inline-flex items-center gap-2 rounded-lg border border-[#354052] px-4 py-2.5 text-sm text-[#A6ADBA] hover:text-white disabled:opacity-50"><Search className="h-4 w-4" /> Choose Another Movie</button>
                <div className="flex flex-wrap items-center gap-3"><button type="button" disabled={loading} onClick={() => router.push("/")} className="px-3 py-2.5 text-sm text-[#8994A5] hover:text-white disabled:opacity-50">Cancel</button><button type="submit" disabled={loading} className="inline-flex items-center gap-2 rounded-lg bg-[#74603D] px-5 py-3 text-sm font-semibold text-[#F4EDE2] hover:bg-[#866F49] disabled:opacity-50">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}{loading ? "Adding Movie..." : "Add to Collection"}</button></div>
              </div>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
