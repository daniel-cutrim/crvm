-- Normalize phone numbers in chat_conversas and leads to always have 55 prefix
-- This fixes message aggregation when UZAPI sends phone with/without country code

-- Normalize chat_conversas.phone: add 55 prefix if missing (only digits, starts with 11-99)
UPDATE public.chat_conversas
SET phone = '55' || phone
WHERE phone ~ '^[1-9][0-9]{9,10}$'
  AND phone NOT LIKE '55%';

-- Normalize leads.telefone the same way
UPDATE public.leads
SET telefone = '55' || telefone
WHERE telefone ~ '^[1-9][0-9]{9,10}$'
  AND telefone NOT LIKE '55%';
