"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, LogOut, Plus } from "lucide-react";

import { useAuth } from "@/contexts/auth-context";
import { ShareButton } from "@/components/share-button";
import { CollectionToolbar } from "@/components/collection-toolbar";

export function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const { user, loading, signOut } = useAuth();
  const isAuthPage = pathname === "/login" || pathname === "/signup";
  const isCollectionPage = pathname === "/";
  const isAddPage = pathname === "/add";
  const showBackButton = isAddPage || pathname.startsWith("/edit/") || pathname.startsWith("/movies/") || pathname.startsWith("/movie/");

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

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-[#293241] bg-[#0D1119]/95 backdrop-blur-xl">
        <nav className="mx-auto flex w-full max-w-[1920px] flex-wrap items-center gap-2 px-3 py-2.5 sm:px-4 2xl:px-6">
          {user && isCollectionPage && <CollectionToolbar searchFocused={searchFocused} onSearchFocusChange={setSearchFocused} />}

          {user && showBackButton && (
            <Link href="/" className="inline-flex h-10 w-fit shrink-0 items-center gap-2 rounded-lg px-2 text-sm font-medium text-[#A6ADBA] transition-colors hover:bg-[#1A2230] hover:text-[#F4EDE2]">
              <ArrowLeft className="h-4 w-4" /> Back to Collection
            </Link>
          )}

          <div className={`${searchFocused && isCollectionPage ? "hidden sm:flex" : "flex"} ml-auto shrink-0 items-center gap-1.5 sm:gap-2`}>
            {loading ? (
              <span className="text-xs text-muted-foreground">Loading...</span>
            ) : user ? (
              <>
                {/* Keep the existing share behavior, only compact its appearance on mobile. */}
                <div className="[&_button]:!h-10 [&_button]:!w-10 [&_button]:!min-w-0 [&_button]:!gap-0 [&_button]:!px-0 [&_button]:!text-[0px] [&_button_svg]:!h-4 [&_button_svg]:!w-4 sm:[&_button]:!w-auto sm:[&_button]:!gap-2 sm:[&_button]:!px-3 sm:[&_button]:!text-xs">
                  <ShareButton />
                </div>

                {!isAddPage && (
                  <a href="/add" className="hidden h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-[#354052] bg-[#74603D] px-3 text-xs font-medium leading-none text-[#F4EDE2] transition-colors hover:bg-[#866F49] sm:inline-flex">
                    <Plus className="h-3.5 w-3.5" /> Add Movie
                  </a>
                )}

                <button type="button" onClick={() => void handleSignOut()} disabled={signingOut} aria-label="Sign out" title="Sign out" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#354052] bg-[#1A2230] text-[#A6ADBA] transition-colors hover:border-[#74603D] hover:text-white">
                  <LogOut className="h-4 w-4" />
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="inline-flex h-10 items-center rounded-lg px-4 text-sm text-muted-foreground transition-colors hover:text-foreground">Login</Link>
                <Link href="/signup" className="inline-flex h-10 items-center rounded-lg bg-[#74603D] px-4 text-sm font-medium text-[#F4EDE2] hover:bg-[#866F49]">Sign Up</Link>
              </>
            )}
          </div>
        </nav>
      </header>

      {user && !isAddPage && (
        <a href="/add" aria-label="Add Movie" title="Add Movie" className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full border border-[#9A8157] bg-[#74603D] text-[#F4EDE2] shadow-xl shadow-black/40 transition-colors hover:bg-[#866F49] sm:hidden">
          <Plus className="h-6 w-6" />
        </a>
      )}
    </>
  );
}
