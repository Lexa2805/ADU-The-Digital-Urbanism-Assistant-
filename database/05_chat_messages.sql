-- ================================================
-- Tabel pentru mesajele de chat
-- ================================================
-- Stochează conversațiile între utilizatori și AI

CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- ID-ul utilizatorului care a trimis mesajul sau NULL pentru AI
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Rolul: 'user' sau 'assistant'
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    
    -- Conținutul mesajului
    content TEXT NOT NULL,
    
    -- Checklist opțional (pentru răspunsurile AI cu liste)
    checklist JSONB,
    
    -- ID-ul dosarului asociat (opțional)
    request_id UUID REFERENCES public.requests(id) ON DELETE SET NULL,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index pentru interogări rapide
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON public.chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at DESC);

-- Politici RLS pentru mesajele de chat
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Utilizatorii pot vedea și crea doar propriile mesaje
CREATE POLICY "Utilizatorii pot vedea și crea propriile mesaje"
    ON public.chat_messages FOR ALL
    USING (auth.uid() = user_id);

-- Adminii pot vedea toate mesajele
CREATE POLICY "Adminii pot vedea toate mesajele"
    ON public.chat_messages FOR SELECT
    USING (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
    );
