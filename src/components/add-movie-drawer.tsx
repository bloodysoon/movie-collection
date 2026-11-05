"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, Check, Film, Heart, Loader2, Plus, Search, Star, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { searchMovies, getMovieDetails, mapOMDBToMovieFormData, type OMDBMovie } from "@/lib/omdb";
import type { MovieFormData, MovieStatus } from "@/types/movie";
import { useAuth } from "@/contexts/auth-context";
import { useMovieCollection } from "@/contexts/movie-collection-context";
import { useAddMovie } from "@/contexts/add-movie-context";
import { cn } from "@/lib/utils";

const emptyMovie: MovieFormData = {
  title: "", year: undefined, genre: undefined, rating: undefined,
  status: "watchlist", is_favorite: false, notes: undefined,
  actors: undefined, director: undefined, plot: undefined,
  poster: undefined, imdb_id: undefined, runtime: undefined,
  language: undefined, country: undefined, awards: undefined,
  metascore: undefined, imdb_rating: undefined,
};

const fieldClass = "w-full rounded-lg border border-[#283A52] bg-[#0F1927] px-3 py-2.5 text-sm text-[#E2E5EB] outline-none placeholder:text-[#4E5F74] focus:border-[#B49A70] transition-colors";
const labelClass = "mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-[#5E7088]";

function Poster({ src, title }: { src?: string | null; title: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  if (src && src !== "N/A" && !failed) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={title || "Movie poster"} onError={() => setFailed(true)} className="h-full w-full object-cover" />;
  }
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-1.5">
      <Film className="h-7 w-7 text-[#74603D]/60" />
    </div>
  );
}

export function AddMovieDrawer() {
  const { open, closeDrawer } = useAddMovie();
  const { user } = useAuth();
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

  const searchInputRef = useRef<HTMLInputElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Reset state and focus when drawer opens
  useEffect(() => {
    if (!open) return;
    setMode("search");
    setFormData({ ...emptyMovie });
    setSearchQuery("");
    setSearchResults([]);
    setSearching(false);
    setSearchDone(false);
    setSearchError("");
    setSaveError("");
    // Small delay so the panel CSS transition has started before focus
    const id = setTimeout(() => searchInputRef.current?.focus(), 50);
    return () => clearTimeout(id);
  }, [open]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape" && !loading) closeDrawer(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, loading, closeDrawer]);

  const existingIds = useMemo(
    () => new Set(movies.map(m => m.imdb_id).filter((id): id is string => Boolean(id))),
    [movies]
  );

  // Debounced search
  useEffect(() => {
    let cancelled = false;
    const query = searchQuery.trim();
    if (mode !== "search" || query.length < 2) {
      if (query.length < 2) setSearchResults([]);
      return;
    }
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

  const goBackToSearch = () => {
    setMode("search");
    setFormData({ ...emptyMovie });
    setSaveError("");
    setTimeout(() => searchInputRef.current?.focus(), 50);
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
        genre: formData.genre?.trim() || null,
        rating: mode === "omdb" ? null : formData.rating ?? null,
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
      closeDrawer();
    } catch (error: unknown) {
      console.error("Save movie failed:", error);
      const duplicate = typeof error === "object" && error !== null && "code" in error && error.code === "23505";
      setSaveError(duplicate ? "This movie is already in your collection." : "Could not save this movie. Please try again.");
    } finally { setLoading(false); }
  };

  if (!mounted) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm transition-opacity duration-300",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={() => { if (!loading) closeDrawer(); }}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Add Movie"
        className={cn(
          "fixed right-0 top-0 z-[201] flex h-dvh w-full max-w-[520px] flex-col",
          "border-l border-[#111D2B] bg-[#070C13]",
          "transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center gap-3 border-b border-[#111D2B] px-4 py-3">
          {mode !== "search" ? (
            <button
              type="button"
              onClick={goBackToSearch}
              disabled={loading}
              aria-label="Back to search"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#5E7088] transition-colors hover:bg-[#111D2B] hover:text-[#D8DDE6] disabled:opacity-50"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          ) : (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#74603D]/30 bg-[#74603D]/10">
              <Film className="h-3.5 w-3.5 text-[#B49A70]" />
            </div>
          )}

          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-[#D8DDE6]">
              {mode === "search" ? "Add Movie" : mode === "omdb" ? formData.title || "Add Movie" : "Add Manually"}
            </h2>
            {mode !== "search" && formData.year && (
              <p className="text-xs text-[#5E7088]">{formData.year}</p>
            )}
          </div>

          <button
            type="button"
            onClick={closeDrawer}
            disabled={loading}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#5E7088] transition-colors hover:bg-[#111D2B] hover:text-[#D8DDE6] disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        {mode === "search" ? (
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Search input */}
            <div className="shrink-0 px-4 py-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#B49A70]" />
                <input
                  ref={searchInputRef}
                  type="search"
                  value={searchQuery}
                  onChange={e => {
                    setSearchQuery(e.target.value);
                    setSearchDone(false);
                    setSearchError("");
                    if (e.target.value.trim().length < 2) setSearchResults([]);
                  }}
                  placeholder="Search by title..."
                  className="h-11 w-full rounded-xl border border-[#172030] bg-[#0C1520] pl-10 pr-10 text-sm text-[#E2E5EB] outline-none placeholder:text-[#4E5F74] focus:border-[#B49A70]/60 transition-colors"
                />
                {searching ? (
                  <Loader2 className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[#B49A70]" />
                ) : searchQuery ? (
                  <button
                    type="button"
                    aria-label="Clear"
                    onClick={() => { setSearchQuery(""); setSearchResults([]); setSearchDone(false); setSearchError(""); }}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#4E5F74] hover:text-[#D8DDE6]"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>
              {searchError && <p role="alert" className="mt-2 text-xs text-red-400">{searchError}</p>}
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto px-4 pb-4">
              {searchResults.length > 0 ? (
                <div className="space-y-1.5">
                  {searchResults.map(movie => {
                    const added = existingIds.has(movie.imdbID);
                    return (
                      <button
                        key={movie.imdbID}
                        type="button"
                        disabled={added || searching}
                        onClick={() => void selectMovie(movie.imdbID)}
                        className={cn(
                          "flex w-full min-w-0 items-center gap-3 rounded-xl border p-2.5 text-left transition-all",
                          added
                            ? "cursor-not-allowed border-[#111D2B] opacity-40"
                            : "border-[#111D2B] bg-[#0C1520]/60 hover:border-[#74603D]/40 hover:bg-[#0F1927]"
                        )}
                      >
                        <div className="h-[72px] w-12 shrink-0 overflow-hidden rounded-lg border border-[#172030] bg-[#0A141E]">
                          <Poster src={movie.Poster} title={movie.Title} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-1 text-sm font-medium text-[#D8DDE6]">{movie.Title}</p>
                          <p className="mt-0.5 text-xs text-[#4E5F74]">{movie.Year}</p>
                          <span className={cn("mt-2 inline-flex items-center gap-1 text-[11px]", added ? "text-[#315650]" : "text-[#B49A70]/70")}>
                            {added ? <><Check className="h-3 w-3" /> In collection</> : <><Plus className="h-3 w-3" /> Select</>}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : searchDone && !searching ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <p className="text-sm text-[#4E5F74]">No results found.</p>
                  <button
                    type="button"
                    onClick={() => setMode("manual")}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-[#172030] px-3.5 py-2 text-xs text-[#8994A5] transition-colors hover:border-[#283A52] hover:text-[#D8DDE6]"
                  >
                    <Plus className="h-3 w-3" />
                    Add manually
                  </button>
                </div>
              ) : !searchQuery ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#111D2B] bg-[#0C1520]">
                    <Search className="h-5 w-5 text-[#283A52]" />
                  </div>
                  <p className="text-sm text-[#4E5F74]">Search for a movie to get started</p>
                  <button
                    type="button"
                    onClick={() => setMode("manual")}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-[#172030] px-3.5 py-2 text-xs text-[#8994A5] transition-colors hover:border-[#283A52] hover:text-[#D8DDE6]"
                  >
                    <Plus className="h-3 w-3" />
                    Add manually
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <form id="add-movie-form" onSubmit={saveMovie} className="flex flex-1 flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto">
              {/* Hero: poster + key info */}
              <div className="flex gap-4 border-b border-[#0F1927] px-4 py-4">
                <div className="h-[120px] w-20 shrink-0 overflow-hidden rounded-xl border border-[#172030] bg-[#0A141E]">
                  <Poster src={formData.poster} title={formData.title} />
                </div>
                <div className="min-w-0 flex-1 py-0.5">
                  {mode === "omdb" ? (
                    <>
                      <h3 className="text-base font-semibold leading-snug text-[#F4EDE2]">{formData.title}</h3>
                      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-[#5E7088]">
                        {formData.year && <span>{formData.year}</span>}
                        {formData.runtime && <span>{formData.runtime}</span>}
                        {formData.genre && <span className="truncate">{formData.genre.split(",")[0].trim()}</span>}
                      </div>
                      {formData.imdb_rating && (
                        <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-[#283A52] bg-[#0F1927] px-2 py-1">
                          <Star className="h-3 w-3 fill-[#B49A70] text-[#B49A70]" />
                          <span className="text-xs font-semibold text-[#D8DDE6]">{formData.imdb_rating}</span>
                          <span className="text-[10px] text-[#4E5F74]">IMDb</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="space-y-2">
                      <div>
                        <label htmlFor="title" className={labelClass}>Title *</label>
                        <input id="title" required className={fieldClass} value={formData.title} onChange={e => update("title", e.target.value)} />
                      </div>
                      <div>
                        <label htmlFor="poster" className={labelClass}>Poster URL</label>
                        <input id="poster" type="url" className={fieldClass} placeholder="https://..." value={formData.poster ?? ""} onChange={e => update("poster", e.target.value)} />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Details */}
              {mode === "omdb" ? (
                <div className="divide-y divide-[#0F1927]">
                  {formData.director && (
                    <div className="px-4 py-3">
                      <p className={labelClass}>Director</p>
                      <p className="text-sm text-[#C8D0DC]">{formData.director}</p>
                    </div>
                  )}
                  {formData.actors && (
                    <div className="px-4 py-3">
                      <p className={labelClass}>Cast</p>
                      <p className="text-sm leading-relaxed text-[#C8D0DC]">{formData.actors}</p>
                    </div>
                  )}
                  {formData.plot && (
                    <div className="px-4 py-3">
                      <p className={labelClass}>Plot</p>
                      <p className="text-sm leading-relaxed text-[#9CA8B9]">{formData.plot}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3 px-4 py-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="year" className={labelClass}>Year</label>
                      <input id="year" type="number" min="1888" max="2100" className={fieldClass} value={formData.year ?? ""} onChange={e => update("year", e.target.value ? Number(e.target.value) : undefined)} />
                    </div>
                    <div>
                      <label htmlFor="genre" className={labelClass}>Genre</label>
                      <input id="genre" className={fieldClass} placeholder="Drama, Action" value={formData.genre ?? ""} onChange={e => update("genre", e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="director" className={labelClass}>Director</label>
                    <input id="director" className={fieldClass} value={formData.director ?? ""} onChange={e => update("director", e.target.value)} />
                  </div>
                  <div>
                    <label htmlFor="actors" className={labelClass}>Cast</label>
                    <input id="actors" className={fieldClass} value={formData.actors ?? ""} onChange={e => update("actors", e.target.value)} />
                  </div>
                  <div>
                    <label htmlFor="plot" className={labelClass}>Plot</label>
                    <textarea id="plot" rows={3} className={fieldClass} value={formData.plot ?? ""} onChange={e => update("plot", e.target.value)} />
                  </div>
                </div>
              )}

              <div className="h-px bg-[#0F1927]" />

              {/* Collection settings */}
              <div className="space-y-3 px-4 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[#B49A70]">Collection</p>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { value: "watchlist", label: "Watchlist" },
                    { value: "watched", label: "Watched" },
                  ] as const).map(opt => {
                    const sel = formData.status === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        aria-pressed={sel}
                        onClick={() => update("status", opt.value as MovieStatus)}
                        className={cn(
                          "flex items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 text-sm font-medium transition-all",
                          sel
                            ? "border-[#74603D]/60 bg-[#74603D]/15 text-[#D4BA8D]"
                            : "border-[#172030] bg-[#0C1520] text-[#8994A5] hover:border-[#283A52] hover:text-[#C8D0DC]"
                        )}
                      >
                        {opt.label}
                        {sel && <Check className="h-3.5 w-3.5" />}
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  aria-pressed={formData.is_favorite ?? false}
                  onClick={() => update("is_favorite", !formData.is_favorite)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left text-sm font-medium transition-all",
                    formData.is_favorite
                      ? "border-[#9D6B79]/50 bg-[#9D6B79]/10 text-[#D99EAF]"
                      : "border-[#172030] bg-[#0C1520] text-[#8994A5] hover:border-[#283A52] hover:text-[#C8D0DC]"
                  )}
                >
                  <Heart className={cn("h-4 w-4 shrink-0", formData.is_favorite && "fill-current")} />
                  <span className="flex-1">Favorite</span>
                  {formData.is_favorite && <Check className="h-3.5 w-3.5" />}
                </button>
              </div>

              <div className="h-px bg-[#0F1927]" />

              {/* Notes */}
              <div className="px-4 py-4">
                <label htmlFor="notes" className={labelClass}>Notes</label>
                <textarea
                  id="notes"
                  rows={3}
                  className={fieldClass}
                  placeholder="Your thoughts on this movie..."
                  value={formData.notes ?? ""}
                  onChange={e => update("notes", e.target.value)}
                />
              </div>

              {saveError && (
                <div className="px-4 pb-2">
                  <p role="alert" className="text-xs text-red-400">{saveError}</p>
                </div>
              )}
            </div>

            {/* Sticky footer */}
            <div className="shrink-0 border-t border-[#111D2B] bg-[#070C13] px-4 py-3">
              <button
                type="submit"
                disabled={loading}
                className={cn(
                  "flex h-11 w-full items-center justify-center gap-2 rounded-xl",
                  "bg-gradient-to-b from-[#866F49] to-[#634E32]",
                  "border border-[#9A8157]/35 text-sm font-semibold text-[#FFF0DC]",
                  "transition-all hover:from-[#9A8157] hover:to-[#6E5538]",
                  "hover:shadow-[0_0_18px_rgba(116,96,61,0.4)] disabled:opacity-50"
                )}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {loading ? "Adding..." : "Add to Collection"}
              </button>
            </div>
          </form>
        )}
      </div>
    </>,
    document.body
  );
}
