# Variáveis de Ambiente

## Backend — `server/.env`

Copie `server/.env.example` para `server/.env` e preencha:

```ini
PORT=3000
SUPABASE_URL=https://xxxxxxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=sua_service_role_key
URL_API_PRODUCAO=https://adn.nfse.gov.br/contribuintes/DFe/0
LOCAL_CERT_PATH=V:\Certificado Digital
```

| Variável              | Obrigatória | Descrição |
|-----------------------|-------------|-----------|
| `PORT`                | Não         | Porta do Express (padrão: 3000) |
| `SUPABASE_URL`        | **Sim**     | URL do projeto Supabase |
| `SUPABASE_ANON_KEY`   | **Sim**     | Chave service_role (acesso admin sem RLS) |
| `URL_API_PRODUCAO`    | Não         | URL da API gov.br (já tem padrão) |
| `LOCAL_CERT_PATH`     | Não         | Pasta local de .pfx (padrão: `V:\Certificado Digital`) |

## Frontend — `web/.env`

Copie `web/.env.example` para `web/.env` e preencha:

```ini
VITE_SUPABASE_URL=https://xxxxxxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=sua_chave_anon_publica
VITE_API_URL=http://localhost:3000
```

| Variável               | Obrigatória | Descrição |
|------------------------|-------------|-----------|
| `VITE_SUPABASE_URL`    | **Sim**     | URL do projeto Supabase |
| `VITE_SUPABASE_ANON_KEY` | **Sim** | Chave pública anon (não usar service_role aqui) |
| `VITE_API_URL`         | Não         | URL do backend (padrão: `http://localhost:3000`) |

## Diferença entre as chaves Supabase

| Chave          | Uso                | Onde usar |
|----------------|--------------------|-----------|
| `anon/public`  | Leitura pública    | Frontend (web) |
| `service_role` | Admin sem RLS      | Backend (server) — **nunca expor no frontend** |
