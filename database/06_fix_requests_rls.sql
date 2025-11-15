-- ================================================
-- FIX RLS POLICIES PENTRU TABELA REQUESTS
-- ================================================
-- Problema: Utilizatorii nu pot insera cereri noi din cauza politicii RLS
-- Soluție: Adăugăm politici separate pentru INSERT, SELECT, UPDATE, DELETE

-- 1. Șterge politicile vechi
DROP POLICY IF EXISTS "Utilizatorii își pot gestiona propriile cereri" ON public.requests;
DROP POLICY IF EXISTS "Funcționarii și adminii pot vedea și gestiona toate cererile" ON public.requests;

-- 2. Creează politici separate pentru fiecare operație

-- POLITICA 1: Utilizatorii pot INSERA cereri noi (CREATE)
CREATE POLICY "Users can insert their own requests"
    ON public.requests FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- POLITICA 2: Utilizatorii pot CITI propriile cereri (READ)
CREATE POLICY "Users can view their own requests"
    ON public.requests FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- POLITICA 3: Utilizatorii pot ACTUALIZA propriile cereri (UPDATE)
CREATE POLICY "Users can update their own requests"
    ON public.requests FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- POLITICA 4: Utilizatorii pot ȘTERGE propriile cereri (DELETE)
CREATE POLICY "Users can delete their own requests"
    ON public.requests FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- POLITICA 5: Funcționarii pot CITI toate cererile
CREATE POLICY "Clerks can view all requests"
    ON public.requests FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role IN ('clerk', 'admin')
        )
    );

-- POLITICA 6: Funcționarii pot ACTUALIZA toate cererile
CREATE POLICY "Clerks can update all requests"
    ON public.requests FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role IN ('clerk', 'admin')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role IN ('clerk', 'admin')
        )
    );

-- POLITICA 7: Adminii pot ȘTERGE orice cerere
CREATE POLICY "Admins can delete any request"
    ON public.requests FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role = 'admin'
        )
    );

-- ================================================
-- FIX RLS POLICIES PENTRU TABELA DOCUMENTS
-- ================================================

-- 1. Șterge politicile vechi pentru documents
DROP POLICY IF EXISTS "Utilizatorii pot vedea și gestiona documentele din cererile lor" ON public.documents;
DROP POLICY IF EXISTS "Funcționarii și adminii pot vedea și gestiona toate documentele" ON public.documents;

-- 2. Creează politici pentru documents

-- POLITICA 1: Utilizatorii pot INSERA documente în propriile cereri
CREATE POLICY "Users can insert documents for their requests"
    ON public.documents FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.requests
            WHERE id = request_id
            AND user_id = auth.uid()
        )
    );

-- POLITICA 2: Utilizatorii pot CITI documentele din propriile cereri
CREATE POLICY "Users can view their own documents"
    ON public.documents FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.requests
            WHERE id = request_id
            AND user_id = auth.uid()
        )
    );

-- POLITICA 3: Utilizatorii pot ACTUALIZA documentele din propriile cereri
CREATE POLICY "Users can update their own documents"
    ON public.documents FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.requests
            WHERE id = request_id
            AND user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.requests
            WHERE id = request_id
            AND user_id = auth.uid()
        )
    );

-- POLITICA 4: Funcționarii pot CITI toate documentele
CREATE POLICY "Clerks can view all documents"
    ON public.documents FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role IN ('clerk', 'admin')
        )
    );

-- POLITICA 5: Funcționarii pot ACTUALIZA toate documentele
CREATE POLICY "Clerks can update all documents"
    ON public.documents FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role IN ('clerk', 'admin')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role IN ('clerk', 'admin')
        )
    );

-- ================================================
-- VERIFICARE POLITICI
-- ================================================

-- Verifică politicile pentru requests
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename = 'requests'
ORDER BY policyname;

-- Verifică politicile pentru documents
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename = 'documents'
ORDER BY policyname;
