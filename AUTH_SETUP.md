# ADU - Sistem de Autentificare cu Roluri

## 📋 Configurare Supabase

### Pas 1: Rulează scripturile SQL

În Supabase Dashboard → SQL Editor, rulează în ordine:

1. **Schema principală** - `database/01_schema.sql` (dacă nu ai rulat deja)
2. **Trigger auto-creare profil** - `database/02_auto_create_profile_trigger.sql`

### Pas 2: Dezactivează confirmarea prin email (pentru dezvoltare)

1. Mergi la **Authentication** → **Providers** → **Email**
2. Dezactivează **"Confirm email"** (toggle OFF)
3. Salvează modificările

### Pas 3: Configurare completă ✅

Acum sistemul este gata!

---

## 🚀 Funcționalități Implementate

### 1. **Înregistrare (Signup)**
- Pagină: `/signup`
- Creează automat un profil în DB cu rol `citizen`
- Validări complete (email, parolă min 8 caractere, confirmare parolă)
- Redirect automat la `/login` după succes

### 2. **Autentificare (Login)**
- Pagină: `/login`
- Verifică credențialele cu Supabase Auth
- Obține profilul utilizatorului din DB
- **Redirect inteligent bazat pe rol:**
  - `citizen` → `/citizen`
  - `clerk` → `/clerk`
  - `admin` → `/admin`

### 3. **Dashboard-uri pentru fiecare rol**

#### 🏠 Cetățean (`/citizen`)
- Vedere generală cereri
- Buton "Cerere Nouă"
- Acces la "Cererile Mele"
- Asistent AI

#### 📋 Funcționar (`/clerk`)
- Coada de priorități (Pizza Tracker)
- Statistici cereri (noi, în procesare, aproape de termen)
- Validare documente AI
- Hartă cereri (GIS)
- Rapoarte

#### ⚙️ Administrator (`/admin`)
- Gestionare utilizatori
- Configurare sistem
- Rapoarte și analize
- Gestionare bază de cunoștințe RAG
- Statistici complete

---

## 🧪 Testare

### Creează conturi de test pentru fiecare rol:

```sql
-- Rulează în Supabase SQL Editor după ce ai creat userii

-- 1. Creează un utilizator citizen prin interfață (/signup)
--    Email: citizen@test.com
--    Parola: password123

-- 2. Creează un utilizator clerk
--    Email: clerk@test.com
--    Parola: password123
-- Apoi schimbă-i rolul:
UPDATE public.profiles 
SET role = 'clerk' 
WHERE id = (SELECT id FROM auth.users WHERE email = 'clerk@test.com');

-- 3. Creează un utilizator admin
--    Email: admin@test.com
--    Parola: password123
-- Apoi schimbă-i rolul:
UPDATE public.profiles 
SET role = 'admin' 
WHERE id = (SELECT id FROM auth.users WHERE email = 'admin@test.com');
```

### Pași de testare:

1. **Test Citizen:**
   - Du-te la `/signup`
   - Creează cont cu `citizen@test.com`
   - Autentifică-te → ar trebui redirectat la `/citizen`

2. **Test Clerk:**
   - Creează cont cu `clerk@test.com`
   - Schimbă rolul în DB (SQL de mai sus)
   - Delogare + relogare → redirect la `/clerk`

3. **Test Admin:**
   - Creează cont cu `admin@test.com`
   - Schimbă rolul în DB
   - Delogare + relogare → redirect la `/admin`

---

## 📁 Structura Proiectului

```
web/
├── app/
│   ├── login/page.tsx          # Pagină autentificare
│   ├── signup/page.tsx         # Pagină înregistrare
│   ├── citizen/page.tsx        # Dashboard cetățean
│   ├── clerk/page.tsx          # Dashboard funcționar
│   └── admin/page.tsx          # Dashboard administrator
├── components/
│   ├── AuthLayout.tsx          # Layout pentru login/signup
│   ├── AuthCard.tsx            # Card pentru formulare auth
│   ├── DashboardLayout.tsx     # Layout comun dashboard-uri
│   ├── TextInput.tsx           # Input text reutilizabil
│   └── PasswordInput.tsx       # Input parolă cu show/hide
└── lib/
    ├── supabaseClient.ts       # Client Supabase
    └── profileService.ts       # Servicii pentru profiluri
```

---

## 🎨 Design

- **Schema de culori:** Alb + Mov (Purple)
- **Fundal:** `bg-white` / `bg-gray-50`
- **Accente:** `text-purple-600`, `bg-purple-600`, `hover:bg-purple-700`
- **Framework:** Tailwind CSS
- **Iconuri:** Heroicons (SVG inline)

---

## 🔐 Securitate

- **Row Level Security (RLS)** activat pe toate tabelele
- Utilizatorii văd doar propriile date
- Funcționarii și adminii au acces extins
- Sesiuni gestionate automat de Supabase Auth

---

## 📝 Next Steps (TODO)

- [ ] Implementare funcționalitate "Cerere Nouă" pentru cetățeni
- [ ] Pizza Tracker pentru urmărire status
- [ ] Integrare AI pentru validare documente
- [ ] Hartă GIS pentru funcționari
- [ ] Bază de cunoștințe RAG
- [ ] Notificări în timp real

---

## 🐛 Troubleshooting

### Login nu merge - "Invalid login credentials"

**Soluții:**
1. Verifică dacă emailul există în Supabase Dashboard → Authentication → Users
2. Verifică dacă ai dezactivat "Confirm email"
3. Verifică consola browser-ului (F12) pentru erori detaliate
4. Asigură-te că profilul există în tabelul `profiles`

### User nu are profil după înregistrare

**Soluții:**
1. Verifică dacă trigger-ul `on_auth_user_created` este creat
2. Rulează manual migrarea pentru userii existenți (vezi SQL în trigger)
3. Verifică log-urile în Supabase Dashboard

### Redirect la rol greșit

**Soluții:**
1. Verifică rolul în DB: `SELECT * FROM profiles WHERE id = 'user-id'`
2. Schimbă rolul manual dacă e necesar
3. Delogare + relogare pentru refresh

---

## 📞 Suport

Pentru probleme sau întrebări, verifică:
- Console browser (F12)
- Supabase Dashboard → Logs
- Network tab pentru request-uri
