
-- Allow authenticated users to delete conversations
CREATE POLICY "Authenticated users can delete conversations"
ON public.chat_conversas
FOR DELETE
TO authenticated
USING (true);

-- Allow authenticated users to delete messages (for cascade cleanup)
CREATE POLICY "Authenticated users can delete messages"
ON public.chat_mensagens
FOR DELETE
TO authenticated
USING (true);
