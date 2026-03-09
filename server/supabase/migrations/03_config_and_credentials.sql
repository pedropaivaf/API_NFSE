-- Migration to add credentials column and settings table
-- Run this in the Supabase SQL Editor

-- 1. Add certificate_password column to public.companies
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS certificate_password TEXT;

-- 2. Create app_settings table for global configurations
CREATE TABLE IF NOT EXISTS public.app_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    value TEXT,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Enable RLS and add policy for service_role/authenticated
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_policies WHERE tablename = 'app_settings' AND policyname = 'Allow all app_settings'
    ) THEN
        CREATE POLICY "Allow all app_settings" ON public.app_settings FOR ALL USING (true);
    END IF;
END $$;

-- 4. Seed default settings
INSERT INTO public.app_settings (key, value, description)
VALUES 
    ('output_path', 'C:\Users\pedro.paiva\Documents\notas_processadas', 'Pasta de saída para os XMLs'),
    ('certificates_path', 'C:\Users\pedro.paiva\Documents\Certificados', 'Pasta onde estão os certificados A1')
ON CONFLICT (key) DO NOTHING;
