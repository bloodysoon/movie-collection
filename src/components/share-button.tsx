
"use client";

import { useState } from "react";
import { Share2, Check, Copy, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

type ListKey = "favorites" | "watched" | "watchlist";

const LIST_OPTIONS: { key: ListKey; label: string }[] = [
  { key: "favorites", label: "Favorites" },
  { key: "watched",   label: "Watched"   },
  { key: "watchlist", label: "Watchlist" },
];

export function ShareButton() {
  const { user } = useAuth();

  const [open, setOpen]           = useState(false);
  const [shareToken, setShareToken] = useState("");
  const [loading, setLoading]     = useState(false);
  const [copied, setCopied]       = useState(false);
  const [error, setError]         = useState("");
  const [selected, setSelected]   = useState<Set<ListKey>>(
    new Set(["favorites", "watched", "watchlist"])
  );

  const handleOpen = async () => {
    if (!user) return;
    setOpen(true);
    setLoading(true);
    setError("");
    setShareToken("");
    setCopied(false);
    setSelected(new Set(["favorites", "watched", "watchlist"]));
    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("share_token")
        .eq("user_id", user.id)
        .single();
      if (error) throw error;
      if (!data?.share_token) throw new Error("Share token not found");
      setShareToken(data.share_token);
    } catch (err) {
      console.error("Error fetching share token:", err);
      setError("Unable to generate your share link.");
    } finally {
      setLoading(false);
    }
  };

  const toggleList = (key: ListKey) => {
    setCopied(false);
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        // Keep at least one selected
        if (next.size > 1) next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const appUrl = (
    process.env.NEXT_PUBLIC_APP_URL ||
    (typeof window !== "undefined" ? window.location.origin : "")
  ).replace(/\/$/, "");

  // Only append ?lists= when it's not all three (all three = no filter needed)
  const allSelected = selected.size === 3;
  const listsParam = allSelected
    ? ""
    : `?lists=${[...selected].join(",")}`;

  const shareUrl = shareToken ? `${appUrl}/share/${shareToken}${listsParam}` : "";

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setError("");
    } catch (err) {
      console.error("Failed to copy link:", err);
      setError("Could not copy the link.");
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => void handleOpen()}
        aria-label="Share Collection"
        title="Share Collection"
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center gap-2 rounded-lg border border-[#1E2D3D] bg-[#0C1520] text-[#6B7A8D] transition-all hover:border-[#74603D]/45 hover:bg-[#74603D]/10 hover:text-[#B49A70] sm:w-auto sm:px-3"
      >
        <Share2 className="h-4 w-4 shrink-0" />
        <span className="hidden text-xs font-medium sm:inline">Share</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="border-[#354052] bg-[#1A2230] text-[#E2E5EB] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#F4EDE2]">
              Share Your Collection
            </DialogTitle>
            <DialogDescription className="text-[#9CA8B9]">
              Choose which lists to include, then copy the link.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {loading ? (
              <div className="flex items-center gap-2 py-4 text-sm text-[#9CA8B9]">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading share link...
              </div>
            ) : shareToken ? (
              <>
                {/* List selector */}
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wider text-[#6B7A8D]">
                    Include
                  </p>
                  <div className="flex gap-2">
                    {LIST_OPTIONS.map(({ key, label }) => {
                      const active = selected.has(key);
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => toggleList(key)}
                          aria-pressed={active}
                          className={cn(
                            "flex flex-1 items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-medium transition-all",
                            active
                              ? "border-[#74603D]/60 bg-[#74603D]/15 text-[#D4BA8D]"
                              : "border-[#354052] bg-[#242D3C] text-[#6B7A8D] hover:border-[#526078] hover:text-[#C8D0DC]"
                          )}
                        >
                          <span
                            className={cn(
                              "flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border transition-colors",
                              active
                                ? "border-[#B49A70] bg-[#74603D]"
                                : "border-[#526078] bg-transparent"
                            )}
                          >
                            {active && <Check className="h-2.5 w-2.5 text-[#FFF0DC]" />}
                          </span>
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Share link */}
                <div>
                  <label
                    htmlFor="share-link"
                    className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#6B7A8D]"
                  >
                    Share Link
                  </label>
                  <div className="flex gap-2">
                    <Input
                      id="share-link"
                      value={shareUrl}
                      readOnly
                      className="min-w-0 flex-1 border-[#354052] bg-[#242D3C] text-xs text-[#9CA8B9]"
                    />
                    <Button
                      type="button"
                      onClick={() => void handleCopy()}
                      className="shrink-0 bg-[#74603D] text-[#F4EDE2] hover:bg-[#866F49]"
                    >
                      {copied ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                      {copied ? "Copied!" : "Copy"}
                    </Button>
                  </div>
                </div>

                <p className="text-xs text-[#9CA8B9]">
                  Anyone with this link can view the selected lists — read-only.
                </p>
              </>
            ) : null}

            {error && (
              <p role="alert" className="text-sm text-red-400">
                {error}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="border-[#354052] bg-[#242D3C] text-[#E2E5EB] hover:bg-[#354052]"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
