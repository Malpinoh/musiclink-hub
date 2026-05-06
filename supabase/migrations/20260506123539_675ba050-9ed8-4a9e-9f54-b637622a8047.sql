
DROP POLICY "Users can upload their own audio previews" ON storage.objects;

CREATE POLICY "Users can upload their own audio previews"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'audio-previews'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

DROP POLICY "Users can update their own audio previews" ON storage.objects;

CREATE POLICY "Users can update their own audio previews"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'audio-previews'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

DROP POLICY "Users can delete their own audio previews" ON storage.objects;

CREATE POLICY "Users can delete their own audio previews"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'audio-previews'
  AND (storage.foldername(name))[2] = auth.uid()::text
);
