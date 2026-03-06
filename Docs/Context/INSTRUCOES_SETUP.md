
# 🛠️ Próximos Passos: Configuração do Supabase

Como houve uma falha de conexão no script automático, siga estes passos manuais para garantir que tudo funcione:

## 1. Banco de Dados (SQL)

1. Acesse o **[Supabase Dashboard](https://supabase.com/dashboard/project/uebwjpfutqvtjotjpilp)**.
2. Vá no menu lateral **SQL Editor**.
3. Clique em **New Query**.
4. Cole o conteúdo abaixo e clique em **Run**:

```sql
-- Tabela de Empresas
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  cnpj text not null unique,
  name text not null,
  status text check (status in ('active', 'inactive')) default 'active',
  certificate_url text,
  certificate_password text,
  certificate_expiry timestamp with time zone,
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

-- Habilitar RLS (Segurança)
alter table public.companies enable row level security;
alter table public.nfs_docs enable row level security;
alter table public.sync_logs enable row level security;

-- Política de Teste (Permitir tudo para testar)
create policy "Allow all operations for anon/service_role" on public.companies for all using (true);
create policy "Allow all operations for anon/service_role" on public.nfs_docs for all using (true);
create policy "Allow all operations for anon/service_role" on public.sync_logs for all using (true);
```

## 2. Storage (Buckets)

1. No menu lateral, vá em **Storage**.
2. Clique em **New Bucket**.
3. Crie um bucket chamado `certificates` (Privado).
4. Crie um segundo bucket chamado `xmls` (Privado).
5. **Políticas de Storage**:
   - Para este MVP, como estamos usando a chave `service_role` no backend, ele já tem permissão total.
   - Para o frontend fazer upload, você pode precisar criar uma policy no bucket `certificates`:
     - Selecione o bucket certificates -> Configuration -> Policies.
     - Add Policy -> "Full Access" -> Target roles: Anon key.

## 3. Rodar o Projeto

**Terminal 1 (Backend):**
```bash
cd server
npm start
```

**Terminal 2 (Frontend):**
```bash
cd web
npm run dev
```

Acesse `http://localhost:5173` e teste o cadastro de uma empresa!
