-- Create movies table with all fields including OMDB data
CREATE TABLE IF NOT EXISTS movies (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  year BIGINT,
  genre TEXT,
  rating NUMERIC,
  status TEXT DEFAULT 'watchlist' CHECK (status IN ('watched', 'watchlist', 'favorites')),
  notes TEXT,
  actors TEXT,
  director TEXT,
  plot TEXT,
  poster TEXT,
  imdb_id TEXT UNIQUE,
  runtime TEXT,
  language TEXT,
  country TEXT,
  awards TEXT,
  metascore TEXT,
  imdb_rating TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- If the table already exists with old 'watched' column, migrate it
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'movies' AND column_name = 'watched'
    ) THEN
        -- Add the new status column
        ALTER TABLE movies ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'watchlist';
        ALTER TABLE movies ADD CONSTRAINT movies_status_check CHECK (status IN ('watched', 'watchlist', 'favorites'));

        -- Migrate existing data: watched=true -> status='watched', watched=false -> status='watchlist'
        UPDATE movies SET status = CASE WHEN watched = true THEN 'watched' ELSE 'watchlist' END WHERE status IS NULL OR status = 'watchlist';

        -- Drop the old watched column
        ALTER TABLE movies DROP COLUMN IF EXISTS watched;
    END IF;

    -- Add user_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'movies' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE movies ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
        -- Set existing movies to NULL user_id (will be handled by auth)
        UPDATE movies SET user_id = NULL WHERE user_id IS NULL;
    END IF;
END $$;

-- Create index on imdb_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_movies_imdb_id ON movies(imdb_id);

-- Create index on actors for sorting/filtering
CREATE INDEX IF NOT EXISTS idx_movies_actors ON movies(actors);

-- Create index on director for sorting/filtering
CREATE INDEX IF NOT EXISTS idx_movies_director ON movies(director);

-- Create index on year for sorting
CREATE INDEX IF NOT EXISTS idx_movies_year ON movies(year);

-- Create index on genre for sorting/filtering
CREATE INDEX IF NOT EXISTS idx_movies_genre ON movies(genre);

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_movies_status ON movies(status);

-- Create index on user_id for filtering
CREATE INDEX IF NOT EXISTS idx_movies_user_id ON movies(user_id);

-- Create index on created_at for default sorting
CREATE INDEX IF NOT EXISTS idx_movies_created_at ON movies(created_at DESC);

-- Enable Row Level Security
ALTER TABLE movies ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable all access for all users" ON movies;
DROP POLICY IF EXISTS "Users can view their own movies" ON movies;
DROP POLICY IF EXISTS "Users can insert their own movies" ON movies;
DROP POLICY IF EXISTS "Users can update their own movies" ON movies;
DROP POLICY IF EXISTS "Users can delete their own movies" ON movies;

-- Create policies to allow users to manage their own movies
CREATE POLICY "Users can view their own movies" ON movies
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own movies" ON movies
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own movies" ON movies
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own movies" ON movies
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create user_profiles table for sharing
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  share_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create a trigger to automatically create user profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Enable RLS on user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" ON user_profiles
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON user_profiles
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create a function to get movies by share token
CREATE OR REPLACE FUNCTION get_movies_by_share_token(p_share_token TEXT)
RETURNS TABLE (
  id BIGINT,
  user_id UUID,
  title TEXT,
  year BIGINT,
  genre TEXT,
  rating NUMERIC,
  status TEXT,
  notes TEXT,
  actors TEXT,
  director TEXT,
  plot TEXT,
  poster TEXT,
  imdb_id TEXT,
  runtime TEXT,
  language TEXT,
  country TEXT,
  awards TEXT,
  metascore TEXT,
  imdb_rating TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) SECURITY DEFINER
LANGUAGE sql
AS $$
  SELECT m.*
  FROM movies m
  JOIN user_profiles up ON m.user_id = up.user_id
  WHERE up.share_token = p_share_token;
$$;
