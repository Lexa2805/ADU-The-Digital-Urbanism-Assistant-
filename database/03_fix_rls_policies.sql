-- ### FIX PENTRU POLITICI RLS - PROFILES (FĂRĂ RECURSIVITATE) ###
-- Problema: Recursivitate infinită când politicile verifică alte rânduri din același tabel
-- Soluție: Politici simple care permit tuturor utilizatorilor autentificați să citească toate profilele

-- 1. Șterge TOATE politicile vechi
DROP POLICY IF EXISTS "Utilizatorii își pot vedea și actualiza propriul profil" ON public.profiles;
DROP POLICY IF EXISTS "Adminii pot vedea și modifica toate profilele" ON public.profiles;
DROP POLICY IF EXISTS "Utilizatorii pot citi propriul profil" ON public.profiles;
DROP POLICY IF EXISTS "Utilizatorii pot actualiza propriul profil" ON public.profiles;
DROP POLICY IF EXISTS "Adminii pot citi toate profilele" ON public.profiles;
DROP POLICY IF EXISTS "Adminii pot modifica toate profilele" ON public.profiles;
DROP POLICY IF EXISTS "Funcționarii pot citi toate profilele" ON public.profiles;
DROP POLICY IF EXISTS "Sistemul poate crea profile" ON public.profiles;

-- 2. Creează politici SIMPLE fără recursivitate

-- Politica 1: Toți utilizatorii autentificați pot CITI toate profilele
-- (Necesară pentru ca aplicația să poată determina rolul la login)
CREATE POLICY "Allow authenticated users to read all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- Politica 2: Utilizatorii pot actualiza DOAR propriul profil
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Politica 3: Permite inserarea profilului (pentru signup)
CREATE POLICY "Allow profile creation"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);


-- ### VERIFICARE ###
-- Rulează pentru a verifica politicile:
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'profiles';
