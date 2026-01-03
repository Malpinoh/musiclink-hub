-- Create storage bucket for artwork uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('artwork', 'artwork', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload artwork
CREATE POLICY "Users can upload artwork"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'artwork');

-- Allow public read access to artwork
CREATE POLICY "Public can view artwork"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'artwork');

-- Allow users to update their own artwork
CREATE POLICY "Users can update own artwork"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'artwork' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to delete their own artwork
CREATE POLICY "Users can delete own artwork"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'artwork' AND auth.uid()::text = (storage.foldername(name))[1]);