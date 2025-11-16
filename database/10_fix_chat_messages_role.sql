-- ================================================
-- Fix: Allow 'system' role in chat_messages
-- ================================================
-- Actualizează constraint-ul pentru a permite mesaje de tip 'system'
-- pentru stocarea contextului conversației

-- Drop constraint-ul vechi
ALTER TABLE public.chat_messages 
DROP CONSTRAINT IF EXISTS chat_messages_role_check;

-- Adaugă constraint nou care permite 'user', 'assistant', și 'system'
ALTER TABLE public.chat_messages 
ADD CONSTRAINT chat_messages_role_check 
CHECK (role IN ('user', 'assistant', 'system'));

-- Comentariu: 
-- Mesajele 'system' sunt folosite pentru a stoca context (ex: domain detectat)
-- și nu sunt afișate utilizatorului final în interfață
