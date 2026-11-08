-- Add liked column to movies table
-- liked = TRUE  → user liked the movie
-- liked = FALSE → user disliked the movie
-- liked = NULL  → no opinion set
ALTER TABLE public.movies
  ADD COLUMN IF NOT EXISTS liked BOOLEAN DEFAULT NULL;
