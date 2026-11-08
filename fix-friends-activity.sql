-- =====================================================
-- FIX: get_friends_activity — pass user_id explicitly
-- Run this in your Supabase SQL Editor
-- =====================================================

-- Drop old signature first (different param list = separate overload)
DROP FUNCTION IF EXISTS public.get_friends_activity(INTEGER);

CREATE OR REPLACE FUNCTION public.get_friends_activity(
  p_user_id   UUID,
  limit_count INTEGER DEFAULT 60
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
  INNER JOIN movies m        ON m.id       = fa.movie_id
  LEFT  JOIN user_profiles up ON up.user_id = fa.user_id
  WHERE fa.user_id IN (
    SELECT
      CASE
        WHEN requester_id = p_user_id THEN addressee_id
        ELSE requester_id
      END
    FROM friendships
    WHERE (requester_id = p_user_id OR addressee_id = p_user_id)
      AND status = 'accepted'
  )
  ORDER BY fa.created_at DESC
  LIMIT limit_count;
END;
$$;
