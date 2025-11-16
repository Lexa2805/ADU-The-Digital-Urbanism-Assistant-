-- ================================================
-- Add profile fields for citizen information
-- ================================================
-- Adaugă câmpuri suplimentare în tabelul profiles pentru date personale

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Index pentru updated_at
CREATE INDEX IF NOT EXISTS idx_profiles_updated_at ON public.profiles(updated_at DESC);

-- Comentariu
COMMENT ON COLUMN public.profiles.phone IS 'Număr de telefon utilizator';
COMMENT ON COLUMN public.profiles.address IS 'Adresa utilizator';
COMMENT ON COLUMN public.profiles.city IS 'Oraș utilizator';
COMMENT ON COLUMN public.profiles.updated_at IS 'Data ultimei actualizări a profilului';
