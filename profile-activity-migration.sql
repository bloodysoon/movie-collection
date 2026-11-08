-- =====================================================
-- PROFILE ACTIVITY FUNCTION
-- Run this in your Supabase SQL Editor
-- =====================================================

-- Returns activity for a specific user's profile page.
-- SECURITY DEFINER bypasses RLS so it can read their movies.
-- Only returns data if the caller is friends with that user
-- (or is viewing their own profile).
CREATE OR REPLACE FUNCTION public.get_profile_activity(
  p_user_id   UUID,
  limit_count INTEGER DEFAULT 20
)
RETURNS TABLE (
  id              BIGINT,
  user_id         UUID,
  movie_id        BIGINT,
  activity_type   TEXT,
  created_at      TIMESTAMPTZ,
  movie_title     TEXT,
  movie_poster    TEXT,
  movie_year      INTEGER,
  movie_imdb_id   TEXT,
  friend_nickname TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Gate: caller must be friends with p_user_id, or viewing own profile
  IF auth.uid() <> p_user_id AND NOT EXISTS (
    SELECT 1 FROM friendships
    WHERE status = 'accepted'
      AND (
        (requester_id = auth.uid() AND addressee_id = p_user_id)
        OR (addressee_id = auth.uid() AND requester_id = p_user_id)
      )
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    fa.id,
    fa.user_id,
    fa.movie_id,
    fa.activity_type,
    fa.created_at,
    m.title       AS movie_title,
    m.poster      AS movie_poster,
    m.year::INTEGER AS movie_year,
    m.imdb_id     AS movie_imdb_id,
    up.nickname   AS friend_nickname
  FROM friend_activity fa
  INNER JOIN movies m  ON m.id  = fa.movie_id
  LEFT  JOIN user_profiles up ON up.user_id = fa.user_id
  WHERE fa.user_id = p_user_id
  ORDER BY fa.created_at DESC
  LIMIT limit_count;
END;
$$;
