-- ### VERIFICARE ȘI GESTIONARE ROLURI UTILIZATORI ###

-- 1. VERIFICĂ TOȚI UTILIZATORII ȘI ROLURILE LOR
SELECT 
    p.id,
    p.full_name,
    p.role,
    u.email,
    u.created_at
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
ORDER BY u.created_at DESC;


-- 2. SCHIMBĂ ROLUL UNUI UTILIZATOR (înlocuiește email-ul)
-- Pentru CLERK:
UPDATE public.profiles 
SET role = 'clerk' 
WHERE id = (SELECT id FROM auth.users WHERE email = 'clerk@test.com');

-- Pentru ADMIN:
UPDATE public.profiles 
SET role = 'admin' 
WHERE id = (SELECT id FROM auth.users WHERE email = 'admin@test.com');

-- Pentru CITIZEN (revenire la default):
UPDATE public.profiles 
SET role = 'citizen' 
WHERE id = (SELECT id FROM auth.users WHERE email = 'user@example.com');


-- 3. VERIFICĂ DACĂ TOȚI USERII AU PROFIL
SELECT 
    u.id,
    u.email,
    u.created_at,
    CASE 
        WHEN p.id IS NULL THEN 'NU ARE PROFIL' 
        ELSE 'ARE PROFIL' 
    END as status_profil
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
ORDER BY u.created_at DESC;


-- 4. CREEAZĂ PROFIL PENTRU UTILIZATORI FĂRĂ PROFIL
INSERT INTO public.profiles (id, full_name, role)
SELECT 
    u.id,
    COALESCE(u.raw_user_meta_data->>'full_name', ''),
    'citizen'
FROM auth.users u
WHERE u.id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;


-- 5. ȘTERGE UN UTILIZATOR COMPLET (cu profil)
-- ATENȚIE: Această operațiune este PERMANENTĂ!
-- DELETE FROM auth.users WHERE email = 'user@example.com';
-- (Profilul se șterge automat datorită ON DELETE CASCADE)


-- 6. VERIFICĂ ROLUL UNUI UTILIZATOR SPECIFIC
SELECT 
    p.role,
    p.full_name,
    u.email
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
WHERE u.email = 'nicoletaduicu08@gmail.com';  -- Înlocuiește cu emailul tău


-- 7. CREEAZĂ UTILIZATORI DE TEST CU ROLURI DIFERITE
-- După ce ai creat conturile prin interfață, rulează:

-- User 1: Citizen
UPDATE public.profiles 
SET role = 'citizen' 
WHERE id = (SELECT id FROM auth.users WHERE email = 'citizen@test.com');

-- User 2: Clerk
UPDATE public.profiles 
SET role = 'clerk', full_name = 'Funcționar Test'
WHERE id = (SELECT id FROM auth.users WHERE email = 'clerk@test.com');

-- User 3: Admin
UPDATE public.profiles 
SET role = 'admin', full_name = 'Administrator Test'
WHERE id = (SELECT id FROM auth.users WHERE email = 'admin@test.com');
