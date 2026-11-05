
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createPortal } from "react-dom";
import {
  ArrowDown,
  ArrowUp,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";

import { useMovieCollection } from "@/contexts/movie-collection-context";

const controlClass =
  "h-8 min-w-0 shrink-0 rounded-md border border-transparent " +
  "bg-[#242D3C] px-2.5 text-xs font-medium text-[#E2E5EB] " +
  "outline-none transition-all duration-200 " +
  "hover:border-[#74603D]/60 hover:bg-[#2C3646] " +
  "focus-visible:border-[#B49A70]";

const sortOptions = [
  { value: "created_at", label: "Date Added" },
  { value: "title", label: "Title" },
  { value: "year", label: "Year" },
  { value: "rating", label: "Rating" },
  { value: "genre", label: "Genre" },
  { value: "actors", label: "Actors" },
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

  useEffect(() => {
    setPortalReady(true);
  }, []);

  const searchRef = useRef(search);
  const pendingSearchRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);

  const status = searchParams.get("status") ?? "";
  const genre = searchParams.get("genre") ?? "";
  const year = searchParams.get("year") ?? "";
  const sort = searchParams.get("sort") ?? "created_at";
  const order = searchParams.get("order") ?? "desc";

  // Generate filter options from the current collection.
  const { genres, years } = useMemo(() => {
    const genreMap = new Map<string, string>();
    const yearSet = new Set<number>();

    for (const movie of movies) {
      if (movie.genre) {
        for (const rawGenre of movie.genre.split(",")) {
          const value = rawGenre.trim();

          if (!value) continue;

          const key = value.toLowerCase();

          if (!genreMap.has(key)) {
            genreMap.set(key, value);
          }
        }
      }

      if (movie.year != null) {
        yearSet.add(movie.year);
      }
    }

    return {
      genres: [...genreMap.values()].sort((a, b) =>
        a.localeCompare(b)
      ),
      years: [...yearSet].sort((a, b) => b - a),
    };
  }, [movies]);

  useEffect(() => {
    if (pendingSearchRef.current) return;

    searchRef.current = urlSearch;
    setSearch(urlSearch);
  }, [urlSearch]);

  useEffect(() => {
    return () => {
      if (pendingSearchRef.current) {
        clearTimeout(pendingSearchRef.current);
      }
    };
  }, []);

  const navigate = (
    updates: Record<string, string>
  ) => {
    const params = new URLSearchParams(
      window.location.search
    );

    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });

    const query = params.toString();

    router.replace(query ? `/?${query}` : "/", {
      scroll: false,
    });
  };

  const updateFilter = (
    key: string,
    value: string
  ) => {
    const updates: Record<string, string> = {
      [key]: value,
    };

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

    if (pendingSearchRef.current) {
      clearTimeout(pendingSearchRef.current);
    }

    pendingSearchRef.current = setTimeout(() => {
      pendingSearchRef.current = null;
      navigate({ search: searchRef.current.trim() });
    }, 350);
  };

  useEffect(() => {
    if (!filtersOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFiltersOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
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

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      {/* Search */}
      <div className="group relative min-w-0 flex-1 2xl:max-w-[420px]">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#B49A70]" />

        <input
          type="search"
          onFocus={() => onSearchFocusChange?.(true)}
          onBlur={() => onSearchFocusChange?.(false)}
          value={search}
          onChange={(event) =>
            handleSearch(event.target.value)
          }
          placeholder="Search your collection..."
          aria-label="Search movies"
          className="h-10 w-full rounded-lg border border-[#354052] bg-[#1A2230] pl-10 pr-9 text-sm text-[#E2E5EB] outline-none transition-all duration-200 placeholder:text-[#8994A5] hover:border-[#526078] focus:border-[#B49A70] focus:ring-2 focus:ring-[#74603D]/20"
        />

        {search && (
          <button
            type="button"
            onClick={clearSearch}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8994A5] transition-colors hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <button type="button" onClick={() => setFiltersOpen(true)} aria-label="Open filters" title="Filters" className={`${searchFocused ? "hidden" : "flex"} h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#354052] bg-[#1A2230] text-[#A6ADBA] hover:border-[#74603D] hover:text-white sm:hidden`}>
        <SlidersHorizontal className="h-4 w-4" />
      </button>

      {/* Desktop filters */}
      <div className="hidden min-w-0 items-center gap-2 overflow-x-auto sm:flex">
        <div className="flex h-10 shrink-0 items-center gap-1 rounded-lg border border-[#354052] bg-[#1A2230] px-1">
          <select
            value={status}
            onChange={(event) =>
              updateFilter("status", event.target.value)
            }
            aria-label="Filter by status"
            className={controlClass}
          >
            <option value="">All Statuses</option>
            <option value="watchlist">Watchlist</option>
            <option value="watched">Watched</option>
            <option value="favorites">Favorites</option>
          </select>

          <select
            value={genre}
            onChange={(event) =>
              updateFilter("genre", event.target.value)
            }
            aria-label="Filter by genre"
            className={controlClass}
          >
            <option value="">All Genres</option>

            {genres.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <select
            value={year}
            onChange={(event) =>
              updateFilter("year", event.target.value)
            }
            aria-label="Filter by year"
            className={controlClass}
          >
            <option value="">All Years</option>

            {years.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>

        {/* Sort group */}
        <div className="flex h-10 shrink-0 items-center gap-1 rounded-lg border border-[#354052] bg-[#1A2230] px-1">
          <select
            value={sort}
            onChange={(event) => {
              const updates: Record<string, string> = {
                sort: event.target.value,
                order: "asc",
              };

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
            {sortOptions.map((option) => (
              <option
                key={option.value}
                value={option.value}
              >
                {option.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() =>
              updateFilter(
                "order",
                order === "asc" ? "desc" : "asc"
              )
            }
            aria-label={
              order === "asc"
                ? "Sort ascending"
                : "Sort descending"
            }
            title={
              order === "asc"
                ? "Ascending"
                : "Descending"
            }
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#473456]/70 text-[#E0CBE8] transition-colors hover:bg-[#604474] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B49A70]"
          >
            {order === "asc" ? (
              <ArrowUp className="h-4 w-4" />
            ) : (
              <ArrowDown className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {portalReady && filtersOpen && createPortal(
        <div className="fixed inset-0 z-[100] sm:hidden" role="presentation">
          <button type="button" aria-label="Close filters" className="absolute inset-0 h-full w-full bg-black/70" onClick={() => setFiltersOpen(false)} />
          <aside role="dialog" aria-modal="true" aria-label="Collection filters" className="absolute left-0 top-0 flex h-dvh w-[min(85vw,340px)] flex-col gap-5 overflow-y-auto border-r border-[#354052] bg-[#141B27] p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#F4EDE2]">Filters & Sort</h2>
              <button type="button" aria-label="Close filters" onClick={() => setFiltersOpen(false)} className="rounded-lg p-2 text-[#A6ADBA] hover:bg-[#242D3C]"><X className="h-5 w-5" /></button>
            </div>
            {([
              { key: "status", label: "Status", value: status, options: [{value:"",label:"All Statuses"},{value:"watchlist",label:"Watchlist"},{value:"watched",label:"Watched"},{value:"favorites",label:"Favorites"}] },
              { key: "genre", label: "Genre", value: genre, options: [{value:"",label:"All Genres"}, ...genres.map(item => ({value:item,label:item}))] },
              { key: "year", label: "Year", value: year, options: [{value:"",label:"All Years"}, ...years.map(item => ({value:String(item),label:String(item)}))] },
              { key: "sort", label: "Sort by", value: sort, options: sortOptions },
            ]).map(filter => (
              <label key={filter.key} className="flex flex-col gap-2 text-xs font-medium uppercase tracking-wider text-[#9CA8B9]">
                {filter.label}
                <select value={filter.value} onChange={event => {
                  if (filter.key === "sort") navigate({ sort: event.target.value, order: "asc" });
                  else updateFilter(filter.key, event.target.value);
                  setFiltersOpen(false);
                }} className="h-11 w-full rounded-lg border border-[#354052] bg-[#242D3C] px-3 text-sm normal-case tracking-normal text-[#E2E5EB] outline-none focus:border-[#B49A70]">
                  {filter.options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
            ))}
            <button type="button" onClick={() => { updateFilter("order", order === "asc" ? "desc" : "asc"); setFiltersOpen(false); }} className="flex h-11 items-center justify-center gap-2 rounded-lg border border-[#354052] bg-[#242D3C] text-sm text-[#E2E5EB]">
              {order === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
              {order === "asc" ? "Ascending" : "Descending"}
            </button>
            <button type="button" onClick={() => { navigate({status:"",genre:"",year:"",sort:"",order:""}); setFiltersOpen(false); }} className="mt-auto rounded-lg border border-[#74603D]/50 px-4 py-3 text-sm text-[#D8C29D]">Reset filters</button>
          </aside>
        </div>,
        document.body
      )}
    </div>
  );
}
