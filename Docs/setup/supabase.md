# Setup do Supabase

## 1. Criar Projeto

Acesse [supabase.com](https://supabase.com/) e crie um projeto gratuito.

## 2. Banco de Dados — Migrações SQL

No **SQL Editor** do Supabase, execute os arquivos na ordem:

```
server/supabase/migrations/00_init_schema.sql
server/supabase/migrations/01_fix_nfs_table.sql
server/supabase/migrations/02_add_local_cert_col.sql
server/supabase/migrations/03_config_and_credentials.sql
server/supabase/migrations/99_fix_persistence_final.sql
```

Ou execute o SQL completo abaixo (schema completo com todas as correções):

```sql
-- Tabela de Empresas
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  cnpj text not null unique,
  name text not null,
  certificate_url text,
  certificate_password text,
  certificate_expiry timestamp with time zone,
  local_cert_path text,
  login_user text,
  login_password text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Tabela de Notas Fiscais
create table if not exists public.nfs_docs (
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

-- Tabela de Logs
create table if not exists public.sync_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade not null,
  searched_at timestamp with time zone default now(),
  docs_found integer default 0,
  status text check (status in ('success', 'error')) not null,
  error_message text
);

-- Tabela de Usuários
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  access_key text not null unique,
  role text default 'USER',
  plan_type text default 'BASIC',
  is_active boolean default true,
  expires_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

-- Tabela de Configurações
create table if not exists public.settings (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value text,
  updated_at timestamp with time zone default now()
);

-- Habilitar RLS
alter table public.companies enable row level security;
alter table public.nfs_docs enable row level security;
alter table public.sync_logs enable row level security;
alter table public.users enable row level security;
alter table public.settings enable row level security;

-- Políticas (permissivas para MVP)
create policy "Allow all" on public.companies for all using (true);
create policy "Allow all" on public.nfs_docs for all using (true);
create policy "Allow all" on public.sync_logs for all using (true);
create policy "Allow all" on public.users for all using (true);
create policy "Allow all" on public.settings for all using (true);
```

## 3. Storage — Buckets

No menu **Storage**, crie dois buckets privados:

| Bucket         | Visibilidade | MIME permitido                              | Limite |
|----------------|-------------|----------------------------------------------|--------|
| `certificates` | Privado     | `application/x-pkcs12` (ou sem restrição)    | 5 MB   |
| `xmls`         | Privado     | `text/xml`, `application/xml`                | 10 MB  |

## 4. Obter as Chaves

No Supabase, acesse **Settings → API**:

- **Project URL** → `SUPABASE_URL` / `VITE_SUPABASE_URL`
- **anon/public** → `VITE_SUPABASE_ANON_KEY` (frontend)
- **service_role** → `SUPABASE_ANON_KEY` (backend — acesso total sem RLS)

> Ver [environment.md](./environment.md) para a lista completa de variáveis.
