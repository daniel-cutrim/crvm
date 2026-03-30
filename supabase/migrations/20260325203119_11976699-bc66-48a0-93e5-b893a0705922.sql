INSERT INTO storage.buckets (id, name, public) VALUES ('chat-audio', 'chat-audio', true);

CREATE POLICY "Authenticated users can upload audio" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'chat-audio');
CREATE POLICY "Anyone can read chat audio" ON storage.objects FOR SELECT USING (bucket_id = 'chat-audio');
CREATE POLICY "Authenticated users can delete audio" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'chat-audio');