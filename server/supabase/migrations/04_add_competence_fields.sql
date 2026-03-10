-- Migration 04: Add competence tracking to nfs table
ALTER TABLE public.nfs ADD COLUMN IF NOT EXISTS competence_date date;
ALTER TABLE public.nfs ADD COLUMN IF NOT EXISTS competence_period text;

-- Index for faster grouping
CREATE INDEX IF NOT EXISTS idx_nfs_competence ON public.nfs (company_id, competence_date);

COMMENT ON COLUMN public.nfs.competence_date IS 'Tax competence date (e.g. 2024-03-01 for March 2024)';
COMMENT ON COLUMN public.nfs.competence_period IS 'Tax competence string as shown in the portal (e.g. 03/2024)';
