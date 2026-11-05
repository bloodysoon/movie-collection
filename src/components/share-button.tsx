
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

export function ShareButton() {
  const { user } = useAuth();

  const [open, setOpen] = useState(false);
  const [shareToken, setShareToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const handleOpen = async () => {
    if (!user) return;

    setOpen(true);
    setLoading(true);
    setError("");
    setShareToken("");
    setCopied(false);

    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("share_token")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;

      if (!data?.share_token) {
        throw new Error("Share token not found");
      }

      setShareToken(data.share_token);
    } catch (err) {
      console.error("Error fetching share token:", err);
      setError("Unable to generate your share link.");
    } finally {
      setLoading(false);
    }
  };

  const shareUrl =
    shareToken && typeof window !== "undefined"
      ? `${window.location.origin}/share/${shareToken}`
      : "";

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
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-[#354052] bg-[#1A2230] text-[#A6ADBA] transition-colors hover:border-[#74603D] hover:text-white sm:w-auto sm:px-3"
      >
        <Share2 className="h-4 w-4 shrink-0" />
        <span className="hidden text-xs font-medium sm:inline">
          Share Collection
        </span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="border-[#354052] bg-[#1A2230] text-[#E2E5EB] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#F4EDE2]">
              Share Your Collection
            </DialogTitle>
            <DialogDescription className="text-[#9CA8B9]">
              Share your movie collection with others using this link.
              Anyone with the link can view your collection.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {loading ? (
              <div className="flex items-center gap-2 py-4 text-sm text-[#9CA8B9]">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading share link...
              </div>
            ) : shareUrl ? (
              <>
                <div>
                  <label
                    htmlFor="share-link"
                    className="mb-2 block text-sm font-medium"
                  >
                    Share Link
                  </label>

                  <div className="flex gap-2">
                    <Input
                      id="share-link"
                      value={shareUrl}
                      readOnly
                      className="min-w-0 flex-1 border-[#354052] bg-[#242D3C]"
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
                  This link gives read-only access to your movie collection.
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
