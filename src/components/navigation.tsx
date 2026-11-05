
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Clapperboard,
  Film,
  LogIn,
  LogOut,
  Plus,
  UserPlus,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { ShareButton } from "@/components/share-button";
import { cn } from "@/lib/utils";

export function Navigation() {
  const pathname = usePathname();
  const { user, loading, signOut } = useAuth();

  const isMoviesPage = pathname === "/";

  const primaryLinkClass =
    "inline-flex h-9 items-center justify-center gap-2 rounded-md " +
    "bg-[#74603D] px-4 py-2 text-sm font-medium text-[#F4EDE2] " +
    "transition-colors hover:bg-[#866F49]";

  const ghostLinkClass =
    "inline-flex h-9 items-center justify-center gap-2 rounded-md " +
    "px-4 py-2 text-sm font-medium text-muted-foreground " +
    "transition-colors hover:bg-muted hover:text-foreground";

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/95 backdrop-blur-md">
      <nav className="container mx-auto flex min-h-20 flex-wrap items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="group flex items-center gap-3"
            aria-label="Movie Collection home"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#74603D]/40 bg-[#74603D]/15 transition-colors group-hover:bg-[#74603D]/25">
              <Clapperboard
                className="h-5 w-5 text-[#B49A70]"
                strokeWidth={1.8}
              />
            </div>

            <span className="text-lg font-semibold tracking-tight text-foreground">
              Movie
              <span className="ml-1 text-[#B49A70]">
                Collection
              </span>
            </span>
          </Link>

          {user && (
            <Link
              href="/"
              className={cn(
                "hidden items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors sm:flex",
                isMoviesPage
                  ? "bg-[#473456]/50 text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Film className="h-4 w-4" />
              My Movies
            </Link>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {loading ? (
            <span className="text-sm text-muted-foreground">
              Loading...
            </span>
          ) : user ? (
            <>
              <ShareButton />

              <Link href="/add" className={primaryLinkClass}>
                <Plus className="h-4 w-4" />
                Add Movie
              </Link>

              <Button
                variant="ghost"
                size="sm"
                onClick={signOut}
                className="gap-2 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">
                  Sign Out
                </span>
              </Button>
            </>
          ) : (
            <>
              <Link href="/login" className={ghostLinkClass}>
                <LogIn className="h-4 w-4" />
                Login
              </Link>

              <Link href="/signup" className={primaryLinkClass}>
                <UserPlus className="h-4 w-4" />
                Sign Up
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
