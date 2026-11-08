-- =====================================================
-- SOCIAL FEATURES MIGRATION
-- Run this entire file in your Supabase SQL Editor
-- =====================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─────────────────────────────────────────────────
-- 1. Extend user_profiles (already exists)
-- ─────────────────────────────────────────────────
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS nickname TEXT,
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Case-insensitive unique index on nickname (nulls allowed)
CREATE UNIQUE INDEX IF NOT EXISTS user_profiles_nickname_unique_idx
  ON public.user_profiles (lower(nickname)) WHERE nickname IS NOT NULL;

-- Auto-create profile row on new signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, share_token)
  VALUES (NEW.id, gen_random_uuid())
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Back-fill profiles for existing users
INSERT INTO public.user_profiles (user_id, share_token)
SELECT id, gen_random_uuid()
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- ─────────────────────────────────────────────────
-- 2. Friendships
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.friendships (
  id            BIGSERIAL PRIMARY KEY,
  requester_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addressee_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'accepted')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (requester_id, addressee_id),
  CONSTRAINT no_self_friendship CHECK (requester_id <> addressee_id)
);

CREATE INDEX IF NOT EXISTS friendships_addressee_idx ON public.friendships (addressee_id);
CREATE INDEX IF NOT EXISTS friendships_status_idx    ON public.friendships (status);

-- ─────────────────────────────────────────────────
-- 3. Friend Activity Log
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.friend_activity (
  id            BIGSERIAL PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  movie_id      BIGINT NOT NULL REFERENCES public.movies(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL
                  CHECK (activity_type IN ('added_watched', 'added_watchlist', 'added_favorite')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS friend_activity_user_created_idx
  ON public.friend_activity (user_id, created_at DESC);

-- ─────────────────────────────────────────────────
-- 4. Movie Recommendations (snapshot — no FK to movies)
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.movie_recommendations (
  id               BIGSERIAL PRIMARY KEY,
  from_user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  movie_title      TEXT NOT NULL,
  movie_year       INTEGER,
  movie_poster     TEXT,
  movie_imdb_id    TEXT,
  movie_genre      TEXT,
  movie_imdb_rating TEXT,
  message          TEXT,
  is_read          BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS recs_to_user_idx
  ON public.movie_recommendations (to_user_id, is_read, created_at DESC);

-- ─────────────────────────────────────────────────
-- 5. Notifications
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
  id           BIGSERIAL PRIMARY KEY,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type         TEXT NOT NULL
                 CHECK (type IN ('friend_request', 'friend_accepted', 'movie_recommendation')),
  from_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reference_id BIGINT,
  is_read      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notifications_user_read_idx
  ON public.notifications (user_id, is_read, created_at DESC);

-- ─────────────────────────────────────────────────
-- TRIGGERS
-- ─────────────────────────────────────────────────

-- Activity log on movie INSERT/UPDATE
CREATE OR REPLACE FUNCTION public.log_movie_activity()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO friend_activity (user_id, movie_id, activity_type)
    VALUES (NEW.user_id, NEW.id,
      CASE WHEN NEW.status = 'watched' THEN 'added_watched' ELSE 'added_watchlist' END);
    IF NEW.is_favorite THEN
      INSERT INTO friend_activity (user_id, movie_id, activity_type)
      VALUES (NEW.user_id, NEW.id, 'added_favorite');
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO friend_activity (user_id, movie_id, activity_type)
      VALUES (NEW.user_id, NEW.id,
        CASE WHEN NEW.status = 'watched' THEN 'added_watched' ELSE 'added_watchlist' END);
    END IF;
    IF OLD.is_favorite IS DISTINCT FROM NEW.is_favorite AND NEW.is_favorite = TRUE THEN
      INSERT INTO friend_activity (user_id, movie_id, activity_type)
      VALUES (NEW.user_id, NEW.id, 'added_favorite');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS movies_activity_trigger ON public.movies;
CREATE TRIGGER movies_activity_trigger
  AFTER INSERT OR UPDATE ON public.movies
  FOR EACH ROW EXECUTE FUNCTION public.log_movie_activity();

-- Friendship notifications
CREATE OR REPLACE FUNCTION public.handle_friendship_notification()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'pending' THEN
    INSERT INTO notifications (user_id, type, from_user_id, reference_id)
    VALUES (NEW.addressee_id, 'friend_request', NEW.requester_id, NEW.id);
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status = 'accepted' THEN
    INSERT INTO notifications (user_id, type, from_user_id, reference_id)
    VALUES (NEW.requester_id, 'friend_accepted', NEW.addressee_id, NEW.id);
    DELETE FROM notifications
    WHERE reference_id = NEW.id AND type = 'friend_request';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS friendships_notification_trigger ON public.friendships;
CREATE TRIGGER friendships_notification_trigger
  AFTER INSERT OR UPDATE ON public.friendships
  FOR EACH ROW EXECUTE FUNCTION public.handle_friendship_notification();

-- Recommendation notifications
CREATE OR REPLACE FUNCTION public.handle_recommendation_notification()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO notifications (user_id, type, from_user_id, reference_id)
  VALUES (NEW.to_user_id, 'movie_recommendation', NEW.from_user_id, NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS recommendations_notification_trigger ON public.movie_recommendations;
CREATE TRIGGER recommendations_notification_trigger
  AFTER INSERT ON public.movie_recommendations
  FOR EACH ROW EXECUTE FUNCTION public.handle_recommendation_notification();

-- ─────────────────────────────────────────────────
-- RLS POLICIES
-- ─────────────────────────────────────────────────

-- user_profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_select" ON public.user_profiles;
DROP POLICY IF EXISTS "profiles_insert" ON public.user_profiles;
DROP POLICY IF EXISTS "profiles_update" ON public.user_profiles;
CREATE POLICY "profiles_select" ON public.user_profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_insert" ON public.user_profiles
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "profiles_update" ON public.user_profiles
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- friendships
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "friendships_select" ON public.friendships;
DROP POLICY IF EXISTS "friendships_insert" ON public.friendships;
DROP POLICY IF EXISTS "friendships_update" ON public.friendships;
DROP POLICY IF EXISTS "friendships_delete" ON public.friendships;
CREATE POLICY "friendships_select" ON public.friendships
  FOR SELECT TO authenticated
  USING (requester_id = auth.uid() OR addressee_id = auth.uid());
CREATE POLICY "friendships_insert" ON public.friendships
  FOR INSERT TO authenticated WITH CHECK (requester_id = auth.uid());
CREATE POLICY "friendships_update" ON public.friendships
  FOR UPDATE TO authenticated
  USING (requester_id = auth.uid() OR addressee_id = auth.uid());
CREATE POLICY "friendships_delete" ON public.friendships
  FOR DELETE TO authenticated
  USING (requester_id = auth.uid() OR addressee_id = auth.uid());

-- friend_activity (SECURITY DEFINER trigger bypasses RLS for inserts)
ALTER TABLE public.friend_activity ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "activity_select" ON public.friend_activity;
CREATE POLICY "activity_select" ON public.friend_activity
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.friendships f
      WHERE f.status = 'accepted'
        AND (
          (f.requester_id = auth.uid() AND f.addressee_id = friend_activity.user_id)
          OR (f.addressee_id = auth.uid() AND f.requester_id = friend_activity.user_id)
        )
    )
  );

-- movie_recommendations
ALTER TABLE public.movie_recommendations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "recs_select" ON public.movie_recommendations;
DROP POLICY IF EXISTS "recs_insert" ON public.movie_recommendations;
DROP POLICY IF EXISTS "recs_update" ON public.movie_recommendations;
CREATE POLICY "recs_select" ON public.movie_recommendations
  FOR SELECT TO authenticated
  USING (from_user_id = auth.uid() OR to_user_id = auth.uid());
CREATE POLICY "recs_insert" ON public.movie_recommendations
  FOR INSERT TO authenticated WITH CHECK (from_user_id = auth.uid());
CREATE POLICY "recs_update" ON public.movie_recommendations
  FOR UPDATE TO authenticated USING (to_user_id = auth.uid());

-- notifications (SECURITY DEFINER triggers handle inserts)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notifs_select" ON public.notifications;
DROP POLICY IF EXISTS "notifs_update" ON public.notifications;
CREATE POLICY "notifs_select" ON public.notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notifs_update" ON public.notifications
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- ─────────────────────────────────────────────────
-- HELPER FUNCTIONS
-- ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_friends_activity(limit_count INTEGER DEFAULT 50)
RETURNS TABLE (
  id            BIGINT,
  user_id       UUID,
  movie_id      BIGINT,
  activity_type TEXT,
  created_at    TIMESTAMPTZ,
  movie_title   TEXT,
  movie_poster  TEXT,
  movie_year    INTEGER,
  movie_imdb_id TEXT,
  friend_nickname TEXT
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT
    fa.id, fa.user_id, fa.movie_id, fa.activity_type, fa.created_at,
    m.title, m.poster, m.year, m.imdb_id,
    up.nickname
  FROM friend_activity fa
  INNER JOIN movies m ON m.id = fa.movie_id
  LEFT JOIN user_profiles up ON up.user_id = fa.user_id
  WHERE fa.user_id IN (
    SELECT CASE
      WHEN requester_id = auth.uid() THEN addressee_id
      ELSE requester_id
    END
    FROM friendships
    WHERE (requester_id = auth.uid() OR addressee_id = auth.uid())
      AND status = 'accepted'
  )
  ORDER BY fa.created_at DESC
  LIMIT limit_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.search_users_by_nickname(search_query TEXT)
RETURNS TABLE (
  user_id          UUID,
  nickname         TEXT,
  movie_count      BIGINT,
  friendship_status TEXT,
  friendship_id    BIGINT
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT
    up.user_id,
    up.nickname,
    COUNT(m.id) AS movie_count,
    f.status    AS friendship_status,
    f.id        AS friendship_id
  FROM user_profiles up
  LEFT JOIN movies m ON m.user_id = up.user_id
  LEFT JOIN friendships f ON (
    (f.requester_id = auth.uid() AND f.addressee_id = up.user_id)
    OR (f.addressee_id = auth.uid() AND f.requester_id = up.user_id)
  )
  WHERE up.nickname ILIKE '%' || search_query || '%'
    AND up.user_id <> auth.uid()
    AND up.nickname IS NOT NULL
  GROUP BY up.user_id, up.nickname, f.status, f.id
  ORDER BY up.nickname
  LIMIT 20;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_public_profile(p_nickname TEXT)
RETURNS TABLE (
  user_id          UUID,
  nickname         TEXT,
  bio              TEXT,
  watched_count    BIGINT,
  watchlist_count  BIGINT,
  favorite_count   BIGINT,
  total_count      BIGINT,
  friendship_status TEXT,
  friendship_id    BIGINT
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT
    up.user_id, up.nickname, up.bio,
    COUNT(m.id) FILTER (WHERE m.status = 'watched')   AS watched_count,
    COUNT(m.id) FILTER (WHERE m.status = 'watchlist') AS watchlist_count,
    COUNT(m.id) FILTER (WHERE m.is_favorite = TRUE)   AS favorite_count,
    COUNT(m.id)                                        AS total_count,
    f.status AS friendship_status,
    f.id     AS friendship_id
  FROM user_profiles up
  LEFT JOIN movies m ON m.user_id = up.user_id
  LEFT JOIN friendships f ON (
    (f.requester_id = auth.uid() AND f.addressee_id = up.user_id)
    OR (f.addressee_id = auth.uid() AND f.requester_id = up.user_id)
  )
  WHERE lower(up.nickname) = lower(p_nickname)
    AND up.nickname IS NOT NULL
  GROUP BY up.user_id, up.nickname, up.bio, f.status, f.id;
END;
$$;

-- ─────────────────────────────────────────────────
-- REALTIME
-- ─────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;
