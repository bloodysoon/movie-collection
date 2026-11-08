
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createPortal } from "react-dom";
import { ArrowDown, ArrowUp, Search, SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";

import { useMovieCollection } from "@/contexts/movie-collection-context";

const controlClass =
  "h-8 min-w-0 shrink-0 rounded-md border border-transparent " +
  "bg-[#111A28] px-2.5 text-xs font-medium text-[#B8C2D0] " +
  "outline-none transition-all duration-200 " +
  "hover:border-[#74603D]/45 hover:bg-[#172030] " +
  "focus-visible:border-[#B49A70]";

const sortOptions = [
  { value: "created_at", label: "Date Added" },
  { value: "year",       label: "Year"       },
  { value: "rating",     label: "Rating"     },
  { value: "metascore",  label: "Metascore"  },
];

type CollectionToolbarProps = {
  searchFocused?: boolean;
  onSearchFocusChange?: (focused: boolean) => void;
};

export function CollectionToolbar({
  searchFocused = false,
  onSearchFocusChange,
}: CollectionToolbarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { movies } = useMovieCollection();

  const urlSearch = searchParams.get("search") ?? "";
  const [search, setSearch] = useState(urlSearch);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [portalReady, setPortalReady] = useState(false);

  useEffect(() => { setPortalReady(true); }, []);

  const searchRef = useRef(search);
  const pendingSearchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const status = searchParams.get("status") ?? "";
  const genre  = searchParams.get("genre")  ?? "";
  const year   = searchParams.get("year")   ?? "";
  const sort   = searchParams.get("sort")   ?? "created_at";
  const order  = searchParams.get("order")  ?? "desc";

  const hasActiveFilters = !!(status || genre || year);

  const { genres, years } = useMemo(() => {
    const genreMap = new Map<string, string>();
    const yearSet  = new Set<number>();

    for (const movie of movies) {
      if (movie.genre) {
        for (const rawGenre of movie.genre.split(",")) {
          const value = rawGenre.trim();
          if (!value) continue;
          const key = value.toLowerCase();
          if (!genreMap.has(key)) genreMap.set(key, value);
        }
      }
      if (movie.year != null) yearSet.add(movie.year);
    }

    return {
      genres: [...genreMap.values()].sort((a, b) => a.localeCompare(b)),
      years:  [...yearSet].sort((a, b) => b - a),
    };
  }, [movies]);

  useEffect(() => {
    if (pendingSearchRef.current) return;
    searchRef.current = urlSearch;
    setSearch(urlSearch);
  }, [urlSearch]);

  useEffect(() => {
    return () => {
      if (pendingSearchRef.current) clearTimeout(pendingSearchRef.current);
    };
  }, []);

  const navigate = (updates: Record<string, string>) => {
    const params = new URLSearchParams(window.location.search);
    Object.entries(updates).forEach(([key, value]) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });
    const query = params.toString();
    router.replace(query ? `/?${query}` : "/", { scroll: false });
  };

  const updateFilter = (key: string, value: string) => {
    const updates: Record<string, string> = { [key]: value };
    if (pendingSearchRef.current) {
      clearTimeout(pendingSearchRef.current);
      pendingSearchRef.current = null;
      updates.search = searchRef.current.trim();
    }
    navigate(updates);
  };

  const handleSearch = (value: string) => {
    searchRef.current = value;
    setSearch(value);
    if (pendingSearchRef.current) clearTimeout(pendingSearchRef.current);
    pendingSearchRef.current = setTimeout(() => {
      pendingSearchRef.current = null;
      navigate({ search: searchRef.current.trim() });
    }, 350);
  };

  useEffect(() => {
    if (!filtersOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setFiltersOpen(false); };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [filtersOpen]);

  const clearSearch = () => {
    if (pendingSearchRef.current) {
      clearTimeout(pendingSearchRef.current);
      pendingSearchRef.current = null;
    }
    searchRef.current = "";
    setSearch("");
    navigate({ search: "" });
  };

  /* ── pill helper ── */
  const Pill = ({
    active,
    onClick,
    children,
  }: {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
  }) => (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
        active
          ? "border border-[#9A8157]/60 bg-[#74603D] text-[#F4EDE2]"
          : "border border-[#1E2D3D] bg-[#111A28] text-[#8C9BAC] hover:border-[#2C3D52] hover:text-[#C8D0DC]"
      )}
    >
      {children}
    </button>
  );

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">

      {/* ── Search ── */}
      <div className="relative min-w-0 flex-1 2xl:max-w-[420px]">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#B49A70]/70" />
        <input
          type="search"
          onFocus={() => onSearchFocusChange?.(true)}
          onBlur={() => onSearchFocusChange?.(false)}
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search…"
          aria-label="Search movies"
          className="h-10 w-full rounded-lg border border-[#172030] bg-[#0C1520] pl-10 pr-9 text-sm text-[#C8D0DC] outline-none transition-all duration-200 placeholder:text-[#3E4E62] hover:border-[#263345] focus:border-[#B49A70] focus:ring-2 focus:ring-[#74603D]/20"
        />
        {search && (
          <button
            type="button"
            onClick={clearSearch}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4E5E72] transition-colors hover:text-[#C8D0DC]"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* ── Mobile filter button ── */}
      <button
        type="button"
        onClick={() => setFiltersOpen(true)}
        aria-label="Open filters"
        title="Filters"
        className={cn(
          "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors sm:hidden",
          "border bg-[#0C1520]",
          hasActiveFilters
            ? "border-[#74603D]/60 text-[#B49A70]"
            : "border-[#172030] text-[#6B7A8D] hover:border-[#263345] hover:text-[#C8D0DC]",
          searchFocused && "hidden"
        )}
      >
        <SlidersHorizontal className="h-4 w-4" />
        {hasActiveFilters && (
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#B49A70]" />
        )}
      </button>

      {/* ── Desktop filters ── */}
      <div className="hidden min-w-0 items-center gap-2 overflow-x-auto sm:flex">
        {/* Filter group */}
        <div className="flex h-10 shrink-0 items-center gap-0.5 rounded-lg border border-[#172030] bg-[#0C1520] px-1">
          <select
            value={status}
            onChange={(e) => updateFilter("status", e.target.value)}
            aria-label="Filter by status"
            className={controlClass}
          >
            <option value="">All</option>
            <option value="watchlist">Watchlist</option>
            <option value="watched">Watched</option>
            <option value="favorites">Favorites</option>
            <option value="liked">Liked</option>
            <option value="disliked">Disliked</option>
          </select>

          <select
            value={genre}
            onChange={(e) => updateFilter("genre", e.target.value)}
            aria-label="Filter by genre"
            className={controlClass}
          >
            <option value="">Genre</option>
            {genres.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>

          <select
            value={year}
            onChange={(e) => updateFilter("year", e.target.value)}
            aria-label="Filter by year"
            className={controlClass}
          >
            <option value="">Year</option>
            {years.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>

        {/* Sort group */}
        <div className="flex h-10 shrink-0 items-center gap-0.5 rounded-lg border border-[#172030] bg-[#0C1520] px-1">
          <select
            value={sort}
            onChange={(e) => {
              const updates: Record<string, string> = { sort: e.target.value, order: "asc" };
              if (pendingSearchRef.current) {
                clearTimeout(pendingSearchRef.current);
                pendingSearchRef.current = null;
                updates.search = searchRef.current.trim();
              }
              navigate(updates);
            }}
            aria-label="Sort movies by"
            className={controlClass}
          >
            {sortOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => updateFilter("order", order === "asc" ? "desc" : "asc")}
            aria-label={order === "asc" ? "Sort ascending" : "Sort descending"}
            title={order === "asc" ? "Ascending" : "Descending"}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#2A1E3A]/80 text-[#C4A8D8] transition-colors hover:bg-[#3A2850] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B49A70]"
          >
            {order === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* ── Mobile bottom-sheet filter panel ── */}
      {portalReady && filtersOpen && createPortal(
        <div className="fixed inset-0 z-[100] sm:hidden" role="presentation">
          {/* Backdrop */}
          <button
            type="button"
            aria-label="Close filters"
            className="animate-fade-in absolute inset-0 h-full w-full bg-black/65 backdrop-blur-sm"
            onClick={() => setFiltersOpen(false)}
          />

          {/* Sheet */}
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Filters"
            className="animate-slide-up absolute inset-x-0 bottom-0 max-h-[88dvh] overflow-y-auto rounded-t-2xl border-t border-[#1A2436] bg-[#0A1018] shadow-2xl"
          >
            {/* Drag handle */}
            <div className="sticky top-0 z-10 flex justify-center bg-[#0A1018] pb-2 pt-3">
              <div className="h-1 w-10 rounded-full bg-[#243040]" />
            </div>

            <div className="space-y-6 px-5 pb-10 pt-3">

              {/* Status */}
              <div>
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-[#4A5A6A]">Status</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: "",           label: "All"       },
                    { value: "watchlist",  label: "Watchlist" },
                    { value: "watched",    label: "Watched"   },
                    { value: "favorites",  label: "Favorites" },
                    { value: "liked",      label: "👍 Liked"  },
                    { value: "disliked",   label: "👎 Disliked" },
                  ].map((o) => (
                    <Pill
                      key={o.value}
                      active={status === o.value}
                      onClick={() => { updateFilter("status", o.value); setFiltersOpen(false); }}
                    >
                      {o.label}
                    </Pill>
                  ))}
                </div>
              </div>

              {/* Genre */}
              {genres.length > 0 && (
                <div>
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-[#4A5A6A]">Genre</p>
                  <select
                    value={genre}
                    onChange={(e) => { updateFilter("genre", e.target.value); setFiltersOpen(false); }}
                    className="h-11 w-full rounded-xl border border-[#1E2D3D] bg-[#111A28] px-3 text-sm text-[#C8D0DC] outline-none focus:border-[#B49A70]"
                  >
                    <option value="">All Genres</option>
                    {genres.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </div>
              )}

              {/* Year */}
              {years.length > 0 && (
                <div>
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-[#4A5A6A]">Year</p>
                  <select
                    value={year}
                    onChange={(e) => { updateFilter("year", e.target.value); setFiltersOpen(false); }}
                    className="h-11 w-full rounded-xl border border-[#1E2D3D] bg-[#111A28] px-3 text-sm text-[#C8D0DC] outline-none focus:border-[#B49A70]"
                  >
                    <option value="">All Years</option>
                    {years.map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
              )}

              {/* Sort by */}
              <div>
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-[#4A5A6A]">Sort By</p>
                <div className="flex flex-wrap gap-2">
                  {sortOptions.map((o) => (
                    <Pill
                      key={o.value}
                      active={sort === o.value}
                      onClick={() => { navigate({ sort: o.value, order }); setFiltersOpen(false); }}
                    >
                      {o.label}
                    </Pill>
                  ))}
                </div>
              </div>

              {/* Order */}
              <div>
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-[#4A5A6A]">Order</p>
                <div className="flex gap-2">
                  {([
                    { value: "asc",  label: "Ascending",  Icon: ArrowUp   },
                    { value: "desc", label: "Descending", Icon: ArrowDown },
                  ] as const).map((o) => (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => { updateFilter("order", o.value); setFiltersOpen(false); }}
                      className={cn(
                        "flex flex-1 items-center justify-center gap-2 rounded-xl border py-3 text-xs font-medium transition-colors",
                        order === o.value
                          ? "border-[#765887]/60 bg-[#2A1E3A] text-[#C4A8D8]"
                          : "border-[#1E2D3D] bg-[#111A28] text-[#8C9BAC] hover:border-[#2C3D52]"
                      )}
                    >
                      <o.Icon className="h-3.5 w-3.5" />
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reset */}
              <button
                type="button"
                onClick={() => { navigate({ status: "", genre: "", year: "", sort: "created_at", order: "desc" }); setFiltersOpen(false); }}
                className="w-full rounded-xl border border-[#74603D]/25 py-3 text-sm text-[#C8A87A] transition-colors hover:border-[#74603D]/50 hover:bg-[#74603D]/8"
              >
                Reset Filters
              </button>

            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
