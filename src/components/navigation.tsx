"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, LogOut, Plus, Users } from "lucide-react";
import { cn } from "@/lib/utils";

import { useAuth } from "@/contexts/auth-context";
import { useAddMovie } from "@/contexts/add-movie-context";
import { ShareButton } from "@/components/share-button";
import { CollectionToolbar } from "@/components/collection-toolbar";
import { NotificationsBell } from "@/components/notifications-bell";

export function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const { user, loading, signOut } = useAuth();
  const { open: drawerOpen, openDrawer } = useAddMovie();

  const isAuthPage = pathname === "/login" || pathname === "/signup";
  const isCollectionPage = pathname === "/";
  const isFriendsSubPage =
    pathname === "/activity" ||
    pathname === "/recommendations" ||
    pathname.startsWith("/profile/");

  const isFriendsPage = pathname === "/friends";

  const showBackButton =
    pathname.startsWith("/edit/") ||
    pathname.startsWith("/movies/") ||
    pathname.startsWith("/movie/") ||
    isFriendsPage ||
    isFriendsSubPage;

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut();
      router.replace("/login");
    } catch (error) {
      console.error("Sign out failed:", error);
      setSigningOut(false);
    }
  };

  if (isAuthPage || (!loading && !user)) return null;

  const searchExpanded = searchFocused && isCollectionPage;

  return (
    <>
      <header className="sticky top-0 z-40 w-full">
        {/* Warm accent line */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#74603D]/50 to-transparent" />

        <div className="border-b border-[#131D2A] bg-[#070C13]/97 shadow-[0_2px_24px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <nav className="mx-auto flex w-full max-w-[1920px] items-center gap-2 px-3 py-2 sm:px-4 2xl:px-6">

            {/* ── Left: back button ── */}
            {showBackButton && (
              <Link
                href={isFriendsSubPage ? "/friends" : "/"}
                className="flex h-9 shrink-0 items-center gap-2 rounded-lg px-2.5 text-sm font-medium text-[#6B7A8D] transition-colors hover:bg-[#111A26] hover:text-[#D8DDE6]"
              >
                <ArrowLeft className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">{isFriendsSubPage ? "Friends" : "Collection"}</span>
              </Link>
            )}

            {/* ── Middle: search + filters (home only) ── */}
            {user && isCollectionPage && (
              <CollectionToolbar
                searchFocused={searchFocused}
                onSearchFocusChange={setSearchFocused}
              />
            )}

            {/* ── Right: actions ── */}
            <div
              className={cn(
                "ml-auto flex shrink-0 items-center gap-1.5",
                searchExpanded && "hidden sm:flex"
              )}
            >
              {!loading && user && (
                <>
                  {/* Notifications */}
                  <NotificationsBell />

                  {/* Friends */}
                  <Link
                    href="/friends"
                    aria-label="Friends"
                    title="Friends"
                    className={cn(
                      "flex h-9 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors",
                      pathname === "/friends" || pathname === "/activity" || pathname === "/recommendations"
                        ? "border-[#74603D]/40 bg-[#74603D]/10 text-[#B49A70]"
                        : "border-[#172030] bg-[#0C1520] text-[#6B7A8D] hover:border-[#283A52] hover:text-[#C8D0DC]"
                    )}
                  >
                    <Users className="h-4 w-4 shrink-0" />
                    <span className="hidden sm:inline">Friends</span>
                  </Link>

                  {/* Share */}
                  <ShareButton />

                  {/* Add Movie — desktop only (FAB covers mobile) */}
                  {!drawerOpen && (
                    <button
                      type="button"
                      onClick={openDrawer}
                      className={cn(
                        "hidden sm:inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3.5",
                        "border border-[#9A8157]/35 bg-gradient-to-b from-[#866F49] to-[#634E32]",
                        "text-xs font-semibold text-[#FFF0DC]",
                        "transition-all hover:from-[#9A8157] hover:to-[#6E5538]",
                        "hover:shadow-[0_0_18px_rgba(116,96,61,0.45)] hover:border-[#9A8157]/55"
                      )}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Movie
                    </button>
                  )}

                  {/* Sign out */}
                  <button
                    type="button"
                    onClick={() => void handleSignOut()}
                    disabled={signingOut}
                    aria-label="Sign out"
                    title="Sign out"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#172030] bg-[#0C1520] text-[#6B7A8D] transition-colors hover:border-[#283A52] hover:text-[#C8D0DC] disabled:opacity-50"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </>
              )}

              {!loading && !user && (
                <>
                  <Link href="/login" className="inline-flex h-9 items-center rounded-lg px-3 text-sm text-[#8994A5] transition-colors hover:text-foreground">
                    Login
                  </Link>
                  <Link href="/signup" className="inline-flex h-9 items-center rounded-lg bg-[#74603D] px-3 text-sm font-medium text-[#F4EDE2] hover:bg-[#866F49]">
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      </header>

      {/* Mobile floating add button */}
      {user && !drawerOpen && (
        <button
          type="button"
          onClick={openDrawer}
          aria-label="Add Movie"
          className={cn(
            "fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-4 z-30 sm:hidden",
            "flex h-14 w-14 items-center justify-center rounded-full",
            "border border-[#9A8157]/40 bg-gradient-to-b from-[#866F49] to-[#5C4826]",
            "text-[#FFF0DC] shadow-[0_4px_24px_rgba(90,70,38,0.7)] transition-all",
            "hover:from-[#9A8157] hover:to-[#6E5538] hover:shadow-[0_6px_32px_rgba(116,96,61,0.75)]"
          )}
        >
          <Plus className="h-6 w-6" />
        </button>
      )}
    </>
  );
}
