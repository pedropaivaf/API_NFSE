
-- Tabela de Empresas (Tenants)
create table public.companies (
  id uuid primary key default gen_random_uuid(),
  cnpj text not null unique,
  name text not null,
  status text check (status in ('active', 'inactive')) default 'active',
  certificate_url text, -- Caminho no Storage
  certificate_password text, -- Senha encriptada (ou simples para MVP)
  certificate_expiry timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Tabela de Notas Fiscais (NFS-e)
create table public.nfs_docs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade not null,
  access_key text not null, -- Chave de Acesso
  issue_date timestamp with time zone,
  amount numeric(15, 2),
  xml_url text, -- Caminho no Storage
  status text default 'processed',
  created_at timestamp with time zone default now(),
  unique(company_id, access_key)
);

-- Tabela de Logs de Sincronização
create table public.sync_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade not null,
  searched_at timestamp with time zone default now(),
  docs_found integer default 0,
  status text check (status in ('success', 'error')) not null,
  error_message text
);

-- Row Level Security (RLS) - Opcional para início, mas recomendado enablement
alter table public.companies enable row level security;
alter table public.nfs_docs enable row level security;
alter table public.sync_logs enable row level security;

-- Policies (Exemplo simples: permitir tudo para testes/backend service role)
-- create policy "Enable read access for all users" on "public"."companies"
-- as permissive for select
-- to public
-- using (true);
