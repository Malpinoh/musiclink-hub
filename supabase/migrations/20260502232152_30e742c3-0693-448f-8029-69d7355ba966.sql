
-- Add audio preview column to pre_saves
ALTER TABLE public.pre_saves ADD COLUMN IF NOT EXISTS preview_audio_url text;

-- Create storage bucket for audio previews
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('audio-previews', 'audio-previews', true, 10485760, ARRAY['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/x-wav'])
ON CONFLICT (id) DO NOTHING;

-- Anyone can listen to audio previews
CREATE POLICY "Public read access for audio previews"
ON storage.objects FOR SELECT
USING (bucket_id = 'audio-previews');

-- Authenticated users can upload their own audio previews
CREATE POLICY "Users can upload their own audio previews"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'audio-previews' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Users can update their own audio previews
CREATE POLICY "Users can update their own audio previews"
ON storage.objects FOR UPDATE
USING (bucket_id = 'audio-previews' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Users can delete their own audio previews
CREATE POLICY "Users can delete their own audio previews"
ON storage.objects FOR DELETE
USING (bucket_id = 'audio-previews' AND auth.uid()::text = (storage.foldername(name))[1]);
