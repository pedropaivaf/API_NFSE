
# 🚀 API_NFSE SaaS - Guia Completo

Este projeto foi transformado em uma plataforma SaaS completa para gestão de Notas Fiscais de Serviço (NFS-e).

## 📂 Estrutura do Projeto

- **/server**: Backend em Node.js (Express) + Supabase Client + Worker de Sincronização.
- **/web**: Frontend em React (Vite) + TailwindCSS + Dashboard Premium.

---

## 🛠️ Configuração Inicial

### 1. Supabase (Banco de Dados e Storage)

Você precisa criar um projeto no [Supabase](https://supabase.com/).

1. **Rode o SQL de Migração**:
   - Vá no SQL Editor do Supabase.
   - Copie e cole o conteúdo de `server/supabase/migrations/00_init_schema.sql`.
   - Execute para criar as tabelas (`companies`, `nfs_docs`, `sync_logs`).

2. **Crie os Buckets de Storage**:
   - Vá em Storage.
   - Crie um bucket privado chamado `certificates`.
   - Crie um bucket privado chamado `xmls`.
   - (Opcional) Configure Policies se necessário, ou use a `SERVICE_ROLE_KEY` no backend.

### 2. Configuração de Variáveis (.env)

#### Backend (`/server/.env`)
Renomeie ou edite o arquivo `.env` na pasta `server`:
```ini
PORT=3000
SUPABASE_URL=SUA_URL_SUPABASE
SUPABASE_ANON_KEY=SUA_CHAVE_SERVICE_ROLE (Para ter permissão de escrita no Storage/DB sem RLS)
URL_API_PRODUCAO=https://adn.nfse.gov.br/contribuintes/DFe/0
```

#### Frontend (`/web/.env`)
Edite o arquivo `.env` na pasta `web`:
```ini
VITE_SUPABASE_URL=SUA_URL_SUPABASE
VITE_SUPABASE_ANON_KEY=SUA_CHAVE_ANON_PUBLICA
VITE_API_URL=http://localhost:3000
```

---

## ▶️ Como Rodar

### 1. Iniciar o Backend
```bash
cd server
npm install
npm start
```
*O servidor rodará na porta 3000 e iniciará o agendador de tarefas (Cron).*

### 2. Iniciar o Frontend
```bash
cd web
npm install
npm run dev
```
*Acesse o dashboard em `http://localhost:5173`.*

---

## 📱 Funcionalidades

- **Cadastro de Empresas**: Upload de certificado A1 (.pfx) e senha.
- **Sincronização**:
  - **Manual**: Via botão no dashboard.
  - **Automática**: A cada hora (configurado no `scheduler.js`).
- **Dashboard**: Visualização de empresas e status.

## ⚠️ Notas Importantes
- O Certificado Digital é salvo no Storage e baixado em memória apenas no momento da execução para segurança.
- A senha do certificado está sendo salva em texto plano no banco para este MVP. **Em produção, implemente criptografia**.
- As requisições para o Governo usam certificados reais; testes devem ser feitos com cautela.
