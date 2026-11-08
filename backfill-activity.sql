-- =====================================================
-- BACKFILL FRIEND ACTIVITY
-- Run this in your Supabase SQL Editor
-- =====================================================
-- Movies added before the trigger was created have no
-- entries in friend_activity. This backfills them.
-- Safe to run multiple times (uses WHERE NOT EXISTS).
-- =====================================================

-- ─────────────────────────────────────────────────
-- 1. Backfill watched / watchlist entries
-- ─────────────────────────────────────────────────
INSERT INTO public.friend_activity (user_id, movie_id, activity_type, created_at)
SELECT
  m.user_id,
  m.id,
  CASE WHEN m.status = 'watched' THEN 'added_watched' ELSE 'added_watchlist' END,
  m.created_at
FROM public.movies m
WHERE NOT EXISTS (
  SELECT 1 FROM public.friend_activity fa
  WHERE fa.movie_id   = m.id
    AND fa.user_id    = m.user_id
    AND fa.activity_type IN ('added_watched', 'added_watchlist')
);

-- ─────────────────────────────────────────────────
-- 2. Backfill favorite entries
-- ─────────────────────────────────────────────────
INSERT INTO public.friend_activity (user_id, movie_id, activity_type, created_at)
SELECT
  m.user_id,
  m.id,
  'added_favorite',
  m.created_at
FROM public.movies m
WHERE m.is_favorite = true
  AND NOT EXISTS (
    SELECT 1 FROM public.friend_activity fa
    WHERE fa.movie_id    = m.id
      AND fa.user_id     = m.user_id
      AND fa.activity_type = 'added_favorite'
  );

-- ─────────────────────────────────────────────────
-- 3. Quick sanity check — should return rows now
-- ─────────────────────────────────────────────────
SELECT activity_type, COUNT(*) FROM public.friend_activity GROUP BY activity_type;
