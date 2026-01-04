-- Add columns to pre_save_actions for storing Spotify OAuth tokens
ALTER TABLE public.pre_save_actions 
ADD COLUMN IF NOT EXISTS spotify_access_token TEXT,
ADD COLUMN IF NOT EXISTS spotify_refresh_token TEXT,
ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS library_saved BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS library_saved_at TIMESTAMP WITH TIME ZONE;

-- Add Apple Music pre-add tracking columns to pre_saves
ALTER TABLE public.pre_saves
ADD COLUMN IF NOT EXISTS apple_music_url TEXT,
ADD COLUMN IF NOT EXISTS apple_music_resolved BOOLEAN DEFAULT false;

-- Create index for efficient token refresh lookups
CREATE INDEX IF NOT EXISTS idx_pre_save_actions_token_expires 
ON public.pre_save_actions(token_expires_at) 
WHERE spotify_refresh_token IS NOT NULL AND library_saved = false;