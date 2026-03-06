# API NFSe - Baixador de XMLs (DF-e)

Aplicacao desktop (Electron) para autenticar via Certificado Digital A1 e baixar automaticamente XMLs de Notas Fiscais de Servico (NFS-e) do Portal Nacional do Governo Federal.

## Funcionalidades

- Autenticacao SSL mutua com certificado `.pfx`
- Cadastro de multiplas empresas
- Sincronizacao automatica (cron) e manual
- Download, descompactacao (GZIP/Base64) e armazenamento dos XMLs
- Dashboard com historico e status por empresa
- Logs de sincronizacao

---

## Pre-requisitos

- [Node.js](https://nodejs.org/) v18 ou superior
- Certificado Digital A1 (`.pfx` ou `.p12`) e senha
- Conta no [Supabase](https://supabase.com/) (gratuita)

---

## Instalacao e Configuracao

### 1. Clonar o repositorio

```bash
git clone <url-do-repositorio>
cd API_NFSE
```

### 2. Configurar o Supabase

**a) Criar as tabelas** - No SQL Editor do Supabase, execute o arquivo:
```
server/supabase/migrations/00_init_schema.sql
```

**b) Criar os buckets de Storage:**
- `certificates` (privado)
- `xmls` (privado)

> Instrucoes detalhadas em [Docs/Context/INSTRUCOES_SETUP.md](Docs/Context/INSTRUCOES_SETUP.md)

### 3. Configurar variaveis de ambiente

**Backend** - crie `server/.env`:
```ini
PORT=3000
SUPABASE_URL=https://xxxxxxxx.supabase.co
SUPABASE_ANON_KEY=sua_service_role_key
URL_API_PRODUCAO=https://adn.nfse.gov.br/contribuintes/DFe/0
```

**Frontend** - crie `web/.env`:
```ini
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=sua_anon_key_publica
VITE_API_URL=http://localhost:3000
```

### 4. Instalar dependencias

```bash
cd server && npm install && cd ..
cd web && npm install && cd ..
```

---

## Executar em Desenvolvimento

```bash
# Terminal 1 - Backend
cd server
npm start

# Terminal 2 - Frontend + Electron
cd web
npm run electron:dev
```

---

## Gerar o Executavel (Build)

```bash
cd web
npm run electron:build
```

O instalador sera gerado em:
```
web/dist-electron/API NFSe Setup X.X.X.exe
```

Para fazer release com bump de versao automatico:
```bash
cd web
npm run release:patch   # 0.0.4 -> 0.0.5
npm run release:minor   # 0.0.4 -> 0.1.0
npm run release:major   # 0.0.4 -> 1.0.0
```

> Guia completo de build em [Docs/Context/WORKFLOW_BUILD.md](Docs/Context/WORKFLOW_BUILD.md)

---

## Versao Atual

`v0.0.4` - Electron 28 + React 19 + Express 5 + Supabase

---

## Estrutura do Projeto

```
API_NFSE/
├── web/              # Frontend React + Electron shell
│   └── dist-electron/  # Instalador gerado (API NFSe Setup X.X.X.exe)
├── server/           # Backend Express + workers de sincronizacao
├── Docs/
│   ├── Context/      # Documentacao: arquitetura, setup, workflows
│   └── ...           # Exemplos de configuracao
└── README.md
```

> Documentacao completa em [Docs/Context/](Docs/Context/)

---

## Proximo Passo (06/03/2026)

```bash
git pull origin main
```

Execute o plano completo em [Docs/Context/PLANO_SCRAPER_NFSE.md](Docs/Context/PLANO_SCRAPER_NFSE.md):

- **Sprint 1** — pode executar imediatamente (validacao de cert, fix IPC, fix schema)
- **Pre-requisito** — mapear o fluxo de login com Chrome DevTools (HAR export)
- **Sprint 2 + 3** — login real + scraping real, depois de ter o fluxo mapeado