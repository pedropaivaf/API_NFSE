-- Sprint 1: Fix schema inconsistency (nfs_docs -> nfs)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'nfs_docs')
     AND NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'nfs') THEN
    ALTER TABLE public.nfs_docs RENAME TO nfs;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.nfs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade not null,
  access_key text not null,
  issue_date timestamp with time zone,
  amount numeric(15, 2),
  xml_url text,
  status text default 'processed',
  created_at timestamp with time zone default now(),
  unique(company_id, access_key)
);

ALTER TABLE IF EXISTS public.nfs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies WHERE tablename = 'nfs' AND policyname = 'Allow all nfs'
  ) THEN
    CREATE POLICY "Allow all nfs" ON public.nfs FOR ALL USING (true);
  END IF;
END $$;
