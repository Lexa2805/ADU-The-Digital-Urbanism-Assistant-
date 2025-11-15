-- ### MIGRATION SCRIPT FOR ADMIN DASHBOARD ###
-- This script adds ONLY the new features needed for the admin dashboard
-- Safe to run on existing database - only adds missing columns and tables

-- ### 1. ADD NEW COLUMNS TO PROFILES TABLE (IF NOT EXISTS) ###

-- Add email column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'email'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN email TEXT;
    END IF;
END $$;

-- Add phone column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'phone'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN phone TEXT;
    END IF;
END $$;

-- Add gdpr_consent column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'gdpr_consent'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN gdpr_consent BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Add gdpr_consent_date column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'gdpr_consent_date'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN gdpr_consent_date TIMESTAMPTZ;
    END IF;
END $$;

-- Add last_login column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'last_login'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN last_login TIMESTAMPTZ;
    END IF;
END $$;

-- Add is_active column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'is_active'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
    END IF;
END $$;

-- Add updated_at column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
    END IF;
END $$;


-- ### 2. CREATE ACTIVITY_LOG TABLE (IF NOT EXISTS) ###

CREATE TABLE IF NOT EXISTS public.activity_log (
  id BIGSERIAL PRIMARY KEY,
  -- Utilizatorul care a efectuat acțiunea
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  -- Utilizatorul afectat de acțiune (pentru acțiuni admin: schimbare rol, etc.)
  affected_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  -- Tipul acțiunii
  action_type TEXT NOT NULL
    CHECK (action_type IN (
      'login', 'logout', 
      'create_request', 'update_request', 'delete_request',
      'upload_document', 'delete_document',
      'role_change', 'account_create', 'account_disable',
      'gdpr_consent', 'gdpr_data_export', 'gdpr_data_delete',
      'admin_view_user', 'admin_edit_user'
    )),
  -- Detalii despre acțiune (JSON)
  details JSONB,
  -- IP-ul de unde a fost efectuată acțiunea (pentru securitate)
  ip_address INET,
  -- User agent (browser/device)
  user_agent TEXT,
  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ### 3. CREATE INDEXES FOR ACTIVITY_LOG (IF NOT EXISTS) ###

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = 'activity_log' 
        AND indexname = 'idx_activity_log_user_id'
    ) THEN
        CREATE INDEX idx_activity_log_user_id ON public.activity_log(user_id);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = 'activity_log' 
        AND indexname = 'idx_activity_log_affected_user_id'
    ) THEN
        CREATE INDEX idx_activity_log_affected_user_id ON public.activity_log(affected_user_id);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = 'activity_log' 
        AND indexname = 'idx_activity_log_created_at'
    ) THEN
        CREATE INDEX idx_activity_log_created_at ON public.activity_log(created_at DESC);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = 'activity_log' 
        AND indexname = 'idx_activity_log_action_type'
    ) THEN
        CREATE INDEX idx_activity_log_action_type ON public.activity_log(action_type);
    END IF;
END $$;


-- ### 4. ENABLE RLS ON ACTIVITY_LOG (IF NOT ALREADY ENABLED) ###

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;


-- ### 5. CREATE RLS POLICIES FOR ACTIVITY_LOG (IF NOT EXISTS) ###

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'activity_log' 
        AND policyname = 'Utilizatorii pot vedea propriul istoric'
    ) THEN
        CREATE POLICY "Utilizatorii pot vedea propriul istoric"
          ON public.activity_log FOR SELECT
          USING (auth.uid() = user_id);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'activity_log' 
        AND policyname = 'Adminii pot vedea tot istoricul'
    ) THEN
        CREATE POLICY "Adminii pot vedea tot istoricul"
          ON public.activity_log FOR SELECT
          USING (
            (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
          );
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'activity_log' 
        AND policyname = 'Backend poate insera în activity_log'
    ) THEN
        CREATE POLICY "Backend poate insera în activity_log"
          ON public.activity_log FOR INSERT
          WITH CHECK (true);
    END IF;
END $$;


-- ### 6. VERIFICATION QUERY ###
-- Run this to verify the migration was successful

SELECT 
    'profiles columns' as check_type,
    COUNT(*) as count
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'profiles'
AND column_name IN ('email', 'phone', 'gdpr_consent', 'gdpr_consent_date', 'last_login', 'is_active', 'updated_at')

UNION ALL

SELECT 
    'activity_log exists' as check_type,
    COUNT(*) as count
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name = 'activity_log'

UNION ALL

SELECT 
    'activity_log indexes' as check_type,
    COUNT(*) as count
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename = 'activity_log'

UNION ALL

SELECT 
    'activity_log policies' as check_type,
    COUNT(*) as count
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'activity_log';
