-- =====================================================
-- FRIEND CODE MIGRATION
-- Run this entire file in your Supabase SQL Editor
-- =====================================================

-- ─────────────────────────────────────────────────
-- 1. Add friend_code column to user_profiles
-- ─────────────────────────────────────────────────
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS friend_code TEXT;

-- ─────────────────────────────────────────────────
-- 2. Function to generate a unique friend code
--    Format: FR-XXXXXX
--    Charset excludes confusable chars: 0,O,1,I,L
--    32^6 ≈ 1 billion possible codes
-- ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.generate_friend_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  code  TEXT;
BEGIN
  LOOP
    code := 'FR-'
      || substr(chars, (floor(random() * length(chars)) + 1)::int, 1)
      || substr(chars, (floor(random() * length(chars)) + 1)::int, 1)
      || substr(chars, (floor(random() * length(chars)) + 1)::int, 1)
      || substr(chars, (floor(random() * length(chars)) + 1)::int, 1)
      || substr(chars, (floor(random() * length(chars)) + 1)::int, 1)
      || substr(chars, (floor(random() * length(chars)) + 1)::int, 1);
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.user_profiles WHERE friend_code = code
    );
  END LOOP;
  RETURN code;
END;
$$;

-- ─────────────────────────────────────────────────
-- 3. Back-fill existing users (one at a time so
--    the uniqueness check inside the function sees
--    each previously written code)
-- ─────────────────────────────────────────────────
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT user_id FROM public.user_profiles WHERE friend_code IS NULL
  LOOP
    UPDATE public.user_profiles
    SET    friend_code = public.generate_friend_code()
    WHERE  user_id = r.user_id;
  END LOOP;
END;
$$;

-- ─────────────────────────────────────────────────
-- 4. Add unique constraint (after back-fill)
-- ─────────────────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS user_profiles_friend_code_unique_idx
  ON public.user_profiles (friend_code)
  WHERE friend_code IS NOT NULL;

-- ─────────────────────────────────────────────────
-- 5. Update new-user trigger to auto-assign a code
-- ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, share_token, friend_code)
  VALUES (NEW.id, gen_random_uuid(), public.generate_friend_code())
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- ─────────────────────────────────────────────────
-- 6. Lookup function: find a user by friend code
--    - Excludes the caller (no self-add)
--    - Returns friendship status with the caller
-- ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_user_by_friend_code(p_code TEXT)
RETURNS TABLE (
  user_id           UUID,
  nickname          TEXT,
  bio               TEXT,
  movie_count       BIGINT,
  friendship_status TEXT,
  friendship_id     BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    up.user_id,
    up.nickname,
    up.bio,
    COUNT(m.id)  AS movie_count,
    f.status     AS friendship_status,
    f.id         AS friendship_id
  FROM  user_profiles up
  LEFT  JOIN movies m ON m.user_id = up.user_id
  LEFT  JOIN friendships f ON (
    (f.requester_id = auth.uid() AND f.addressee_id = up.user_id)
    OR
    (f.addressee_id = auth.uid() AND f.requester_id = up.user_id)
  )
  WHERE upper(up.friend_code) = upper(p_code)
    AND up.user_id <> auth.uid()
  GROUP BY up.user_id, up.nickname, up.bio, f.status, f.id;
END;
$$;
