-- ============================================
-- TRIGGER BIDIRECTIONAL: Sincronizare Auth ↔ Profiles
-- ============================================
-- Acest script creează trigger-e care sincronizează ștergerea între
-- auth.users și public.profiles în ambele direcții

-- ============================================
-- 1. TRIGGER: Șterge din profiles când ștergi din auth.users
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_auth_user_deleted()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Șterge profilul când user-ul este șters din Authentication
  DELETE FROM public.profiles WHERE id = OLD.id;
  RETURN OLD;
END;
$$;

-- Drop și recreează trigger-ul
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;

CREATE TRIGGER on_auth_user_deleted
  BEFORE DELETE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_auth_user_deleted();

-- ============================================
-- 2. TRIGGER: Șterge din auth.users când ștergi din profiles
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_profile_deleted()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  auth_user_exists boolean;
BEGIN
  -- Verifică dacă user-ul există în auth.users
  SELECT EXISTS (
    SELECT 1 FROM auth.users WHERE id = OLD.id
  ) INTO auth_user_exists;
  
  -- Șterge din auth.users doar dacă există
  IF auth_user_exists THEN
    DELETE FROM auth.users WHERE id = OLD.id;
  END IF;
  
  RETURN OLD;
END;
$$;

-- Drop și recreează trigger-ul
DROP TRIGGER IF EXISTS on_profile_deleted ON public.profiles;

CREATE TRIGGER on_profile_deleted
  BEFORE DELETE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_profile_deleted();

-- ============================================
-- VERIFICARE: Testează că trigger-ele sunt active
-- ============================================
SELECT 
    trigger_name,
    event_manipulation,
    event_object_schema,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_name IN ('on_auth_user_deleted', 'on_profile_deleted')
ORDER BY trigger_name;

-- ============================================
-- INSTRUCȚIUNI DE UTILIZARE:
-- ============================================
-- 1. Copiază tot acest script
-- 2. Deschide Supabase Dashboard → SQL Editor
-- 3. Lipește și rulează script-ul (Ctrl+Enter sau click Run)
-- 4. Verifică că vezi 2 trigger-e în rezultat
--
-- DUPĂ INSTALARE:
-- ✅ Ștergi din Authentication → șterge automat din profiles
-- ✅ Ștergi din Table Editor (profiles) → șterge automat din Authentication
-- ✅ Cascade delete șterge automat: requests, documents, chat_messages, etc.
--
-- ⚠️ ATENȚIE: Ștergerea este IREVERSIBILĂ!
-- ============================================

-- Testare (OPȚIONAL - doar pentru verificare):
-- SELECT * FROM public.profiles;
-- -- Șterge un user de test din Dashboard
-- -- Apoi verifică că profilul a fost șters automat:
-- SELECT * FROM public.profiles WHERE id = '[user_id_șters]';
