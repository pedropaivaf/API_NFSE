-- Migration to add local certificate filename column to companies
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS certificate_local_name text;
