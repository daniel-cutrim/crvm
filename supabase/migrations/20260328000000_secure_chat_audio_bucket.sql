-- Migration to secure the chat-audio bucket
-- 1. Make the bucket private
UPDATE storage.buckets
SET public = false
WHERE id = 'chat-audio';

-- 2. Drop the old insecure policy that allowed anyone to read audio
DROP POLICY IF EXISTS "Anyone can read chat audio" ON storage.objects;

-- 3. Create a secure policy that only allows authenticated users to read audio via signed URLs
CREATE POLICY "Authenticated users can read chat audio"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'chat-audio');
