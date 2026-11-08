-- =====================================================
-- DEBUG: Run each section in Supabase SQL Editor
-- =====================================================

-- 1. All accepted friendships (with nicknames)
SELECT
  f.id,
  f.status,
  up1.nickname AS requester,
  up2.nickname AS addressee,
  f.requester_id,
  f.addressee_id
FROM friendships f
LEFT JOIN user_profiles up1 ON up1.user_id = f.requester_id
LEFT JOIN user_profiles up2 ON up2.user_id = f.addressee_id
WHERE f.status = 'accepted';

-- ─────────────────────────────────────────────────

-- 2. Activity rows per user (with nickname)
SELECT
  up.nickname,
  fa.activity_type,
  COUNT(*) AS count
FROM friend_activity fa
LEFT JOIN user_profiles up ON up.user_id = fa.user_id
GROUP BY up.nickname, fa.activity_type
ORDER BY up.nickname;

-- ─────────────────────────────────────────────────

-- 3. Sample rows from friend_activity (most recent 5)
SELECT
  fa.id,
  up.nickname,
  fa.activity_type,
  m.title AS movie_title,
  fa.created_at
FROM friend_activity fa
LEFT JOIN user_profiles up ON up.user_id = fa.user_id
LEFT JOIN movies m ON m.id = fa.movie_id
ORDER BY fa.created_at DESC
LIMIT 5;
