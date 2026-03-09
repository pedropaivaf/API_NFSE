const { Client } = require('pg');

const config = {
    host: 'db.gamhftfvbngrlorwnhxr.supabase.co',
    port: 5432,
    user: 'postgres',
    password: process.env.SUPABASE_DB_PASSWORD,
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
};

const sql = `
-- 1. Garante que a tabela tem os campos corretos
CREATE TABLE IF NOT EXISTS public.nfs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade not null,
  access_key text not null,
  issue_date timestamp with time zone,
  amount numeric(15, 2),
  xml_url text,
  status text default 'processed',
  created_at timestamp with time zone default now()
);

-- 2. CRÍTICO: Cria a constraint de unicidade necessária para o UPSERT
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'nfs_company_id_access_key_key'
    ) THEN
        ALTER TABLE public.nfs ADD CONSTRAINT nfs_company_id_access_key_key UNIQUE (company_id, access_key);
    END IF;
END $$;

-- 3. Garante que o RLS não está bloqueando o salvamento
ALTER TABLE public.nfs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all nfs" ON public.nfs;
CREATE POLICY "Allow all nfs" ON public.nfs FOR ALL USING (true) WITH CHECK (true);
`;

async function applySql() {
    const client = new Client(config);
    try {
        await client.connect();
        console.log('Connected to Postgres.');
        await client.query(sql);
        console.log('SQL Migration Applied Successfully!');
    } catch (err) {
        console.error('Connection/Execution Error:', err.message);
    } finally {
        await client.end();
    }
}

applySql();
