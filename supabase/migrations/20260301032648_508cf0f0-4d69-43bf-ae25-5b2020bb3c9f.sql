
-- Add malpinoh_artist_id to profiles table for cross-platform linking
ALTER TABLE public.profiles
ADD COLUMN malpinoh_artist_id text UNIQUE DEFAULT NULL;

-- Create index for fast lookup by malpinoh_artist_id
CREATE INDEX idx_profiles_malpinoh_artist_id ON public.profiles (malpinoh_artist_id) WHERE malpinoh_artist_id IS NOT NULL;
