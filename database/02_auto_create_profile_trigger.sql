-- ### TRIGGER PENTRU AUTO-CREAREA PROFILULUI UTILIZATORULUI ###
-- Acest trigger creează automat un profil în tabelul public.profiles
-- când un utilizator nou se înregistrează în auth.users

-- Funcția care va fi apelată de trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'citizen' -- Rolul implicit este 'citizen'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger-ul care apelează funcția la crearea unui user nou
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


-- ### VERIFICARE ȘI TESTARE ###
-- Pentru a verifica dacă trigger-ul funcționează:
-- 1. Creează un cont nou prin interfață
-- 2. Verifică în Supabase Dashboard -> Authentication -> Users
-- 3. Verifică în Table Editor -> profiles dacă s-a creat automat profilul


-- ### MIGRARE UTILIZATORI EXISTENȚI (OPȚIONAL) ###
-- Dacă ai deja utilizatori în auth.users fără profil, rulează:
INSERT INTO public.profiles (id, full_name, role)
SELECT 
  id,
  COALESCE(raw_user_meta_data->>'full_name', ''),
  'citizen'
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;
