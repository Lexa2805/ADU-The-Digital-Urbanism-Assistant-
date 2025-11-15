-- ### 1. ACTIVAREA EXTENSIILOR NECESARE ###
-- Trebuie rulate o singură dată pentru proiectul vostru

-- Activați extensia PostGIS pentru a stoca locații pe hartă
CREATE EXTENSION IF NOT EXISTS postgis;

-- Activați extensia pgvector pentru a stoca embeddings (vectori AI) pentru RAG
CREATE EXTENSION IF NOT EXISTS vector;


-- ### 2. TABELUL DE PROFILURI UTILIZATOR ###
-- Acest tabel extinde tabelul auth.users implicit din Supabase
-- Va stoca rolul utilizatorului (cetățean, funcționar, admin) și numele complet.

CREATE TABLE public.profiles (
  id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  -- Rolurile cheie ale aplicației
  role TEXT NOT NULL DEFAULT 'citizen'
    CHECK (role IN ('citizen', 'clerk', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Permite utilizatorilor să-și vadă și să-și editeze propriul profil
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Utilizatorii își pot vedea și actualiza propriul profil"
  ON public.profiles FOR ALL
  USING (auth.uid() = id);

-- Adminii pot vedea și modifica toate profilele
CREATE POLICY "Adminii pot vedea și modifica toate profilele"
  ON public.profiles FOR ALL
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );


-- ### 3. TABELUL PENTRU CERERI (DOSARE) ###
-- Acesta este tabelul central al aplicației.

CREATE TABLE public.requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  -- ID-ul utilizatorului care a creat cererea (cetățean sau alt user)
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Tipul cererii (ex. Certificat de Urbanism, Autorizație de Construire)
  request_type TEXT NOT NULL,
  
  -- Statusul principal al dosarului (pentru "Pizza Tracker")
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'pending_validation', 'in_review', 'rejected', 'approved')),
  
  -- Prioritatea setată de AI pentru triajul funcționarului
  priority INT DEFAULT 0,
  
  -- Termenul legal (pentru prioritizare)
  legal_deadline TIMESTAMPTZ,

  -- Locația geografică (pentru funcția GIS)
  -- Stochează un Punct (Longitudine, Latitudine)
  location geography(Point, 4326), 
  
  -- Toate datele extrase de AI (Nume, CNP, Nr. Cadastral) vor fi stocate aici
  extracted_metadata JSONB,
  
  -- ID-ul funcționarului căruia i-a fost asignat dosarul
  assigned_clerk_id uuid REFERENCES public.profiles(id),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Politici RLS pentru Cereri
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;

-- Utilizatorii își pot gestiona propriile cereri
CREATE POLICY "Utilizatorii își pot gestiona propriile cereri"
  ON public.requests FOR ALL
  USING (auth.uid() = user_id);

-- Funcționarii și adminii pot vedea și gestiona toate cererile
CREATE POLICY "Funcționarii și adminii pot vedea și gestiona toate cererile"
  ON public.requests FOR ALL
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('clerk', 'admin')
  );


-- ### 4. TABELUL PENTRU DOCUMENTE ###
-- Stochează informații despre fișierele încărcate (ex. buletin, plan cadastral)

CREATE TABLE public.documents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  -- Legătura către cererea (dosarul) de care aparține
  request_id uuid NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  
  -- Calea către fișier în Supabase Storage (ex. "user_uploads/file.pdf")
  storage_path TEXT NOT NULL UNIQUE,
  
  -- Numele original al fișierului
  file_name TEXT NOT NULL,
  
  -- Tipul documentului identificat de AI (ex. 'carte_identitate', 'plan_cadastral')
  document_type_ai TEXT,
  
  -- Statusul validării AI (crucial pentru demo)
  validation_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (validation_status IN ('pending', 'approved', 'rejected')),
  
  -- Mesajul de eroare de la AI (ex. "Buletin expirat la data X")
  validation_message TEXT,
  
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Politici RLS pentru Documente
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Utilizatorii își pot gestiona documentele proprii (legate de cererile lor)
CREATE POLICY "Utilizatorii își pot gestiona documentele proprii"
  ON public.documents FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.requests
      WHERE public.requests.id = request_id
        AND public.requests.user_id = auth.uid()
    )
  );

-- Funcționarii și adminii pot vedea toate documentele
CREATE POLICY "Funcționarii și adminii pot vedea toate documentele"
  ON public.documents FOR ALL
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('clerk', 'admin')
  );


-- ### 5. TABELUL PENTRU BAZA DE CUNOȘTINȚE (RAG) ###
-- Aici veți stoca bucățile de text din PUG, PUZ, Legi și vectorii lor

CREATE TABLE public.knowledge_base (
  id BIGSERIAL PRIMARY KEY,
  
  -- Sursa (ex. 'Legea_50_1991_Art_3', 'PUG_Oras_Zona_X')
  source TEXT NOT NULL,
  
  -- Conținutul (bucata de text)
  content TEXT NOT NULL,
  
  -- Vectorul de embedding (presupunând model de 1536 dimensiuni)
  embedding vector(1536)
);

-- Politici RLS pentru Baza de Cunoștințe
ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;

-- Toată lumea (chiar și neautentificată) poate CITI din baza de cunoștințe
CREATE POLICY "Oricine poate citi baza de cunoștințe"
  ON public.knowledge_base FOR SELECT
  USING (true);

-- Funcționarii și adminii pot adăuga cunoștințe
CREATE POLICY "Funcționarii și adminii pot adăuga cunoștințe"
  ON public.knowledge_base FOR INSERT
  WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('clerk', 'admin')
  );


-- ### 6. POLITICI PENTRU SUPABASE STORAGE ###
-- Crează un "bucket" (folder) numit 'uploads' în Storage

INSERT INTO storage.buckets (id, name, public)
VALUES ('uploads', 'uploads', FALSE)
ON CONFLICT (id) DO NOTHING;

-- Politica: Utilizatorii autentificați pot încărca documente în bucket-ul 'uploads'
CREATE POLICY "Utilizatorii autentificați pot încărca documente"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'uploads');

-- Politica: Utilizatorii își pot vedea propriile documente,
-- iar funcționarii și adminii pot vedea toate documentele din uploads
CREATE POLICY "Acces la fișierele din uploads"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'uploads'
    AND (
      -- Funcționarii și adminii au acces complet
      (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('clerk', 'admin')
      OR
      -- Utilizatorul vede doar documentele legate de cererile lui
      EXISTS (
        SELECT 1
        FROM public.documents
        JOIN public.requests
          ON public.requests.id = public.documents.request_id
        WHERE public.documents.storage_path = storage.objects.name
          AND public.requests.user_id = auth.uid()
      )
    )
  );