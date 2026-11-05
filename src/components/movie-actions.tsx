
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/auth-context";
import { useMovieCollection } from "@/contexts/movie-collection-context";

interface MovieActionsProps {
  movieId: number;
}

export function MovieActions({ movieId }: MovieActionsProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { refreshMovies } = useMovieCollection();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async () => {
    if (!user || loading) return;

    setLoading(true);
    setError("");

    try {
      const { data, error: deleteError } = await supabase
        .from("movies")
        .delete()
        .eq("id", movieId)
        .eq("user_id", user.id)
        .select("id")
        .maybeSingle();

      if (deleteError) throw deleteError;

      if (!data) {
        throw new Error("Movie not found or access denied.");
      }

      await refreshMovies();

      setDeleteDialogOpen(false);
      router.push("/");
      router.refresh();
    } catch (err) {
      console.error("Error deleting movie:", err);
      setError("Could not delete this movie. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={() => router.push(`/edit/${movieId}`)}
          disabled={!user || loading}
        >
          Edit
        </Button>

        <Button
          variant="destructive"
          onClick={() => {
            setError("");
            setDeleteDialogOpen(true);
          }}
          disabled={!user || loading}
        >
          Delete
        </Button>
      </div>

      <Dialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          if (!loading) setDeleteDialogOpen(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Movie</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this movie?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <p role="alert" className="text-sm text-red-400">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>

            <Button
              variant="destructive"
              onClick={() => void handleDelete()}
              disabled={loading || !user}
            >
              {loading ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
