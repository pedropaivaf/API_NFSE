# API NFSe — Baixador de NFS-e

**v0.2.9** · Electron 28 + React 19 + Express 5 + Supabase

Aplicação desktop para autenticar via **Certificado Digital A1 (mTLS)** ou **usuário/senha** e baixar automaticamente XMLs de Notas Fiscais de Serviço do Portal Nacional Gov.br.

---

## Funcionalidades

- Autenticação mTLS com certificado `.pfx` ou usuário/senha
- Cadastro de múltiplas empresas
- Extração de NFS-e com período configurável (últimos 30 dias ou personalizado)
- Sincronização automática (cron) e manual
- Download e armazenamento de XMLs
- Dashboard com histórico e status por empresa

---

## Início Rápido

### Pré-requisitos

- [Node.js](https://nodejs.org/) v18 ou superior
- Certificado Digital A1 (`.pfx`) e/ou credenciais do portal Gov.br
- Conta no [Supabase](https://supabase.com/) (gratuita)

### Instalação

```bash
git clone <url-do-repositorio>
cd API_NFSE

cd server && npm install && cd ..
cd web && npm install && cd ..
```

### Configurar Supabase

Execute as migrações SQL no SQL Editor do Supabase e crie os buckets `certificates` e `xmls` (privados).

> Instruções completas: [docs/setup/supabase.md](docs/setup/supabase.md)

### Configurar Variáveis de Ambiente

```bash
cp server/.env.example server/.env   # preencher SUPABASE_URL e SUPABASE_ANON_KEY
cp web/.env.example web/.env         # preencher VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
```

> Guia de variáveis: [docs/setup/environment.md](docs/setup/environment.md)

### Rodar em Desenvolvimento

```bash
# Terminal 1 — Backend
cd server && npm start

# Terminal 2 — Frontend + Electron
cd web && npm run electron:dev
```

### Gerar Executável

```bash
cd web && npm run electron:build
# Saída: web/dist-electron/API NFSe Setup X.X.X.exe
```

---

## Documentação

Toda a documentação está centralizada em **[docs/](docs/README.md)**:

| Seção | Documento |
|-------|-----------|
| Arquitetura | [docs/architecture/overview.md](docs/architecture/overview.md) |
| Setup Supabase | [docs/setup/supabase.md](docs/setup/supabase.md) |
| Variáveis de Ambiente | [docs/setup/environment.md](docs/setup/environment.md) |
| Desenvolvimento | [docs/guides/development.md](docs/guides/development.md) |
| Build e Release | [docs/guides/build-release.md](docs/guides/build-release.md) |
| Plataforma e Rotas | [docs/guides/saas-platform.md](docs/guides/saas-platform.md) |
| Scraper NFSe | [docs/implementation/scraper-nfse.md](docs/implementation/scraper-nfse.md) |

---

## Estrutura do Projeto

```
API_NFSE/
├── web/          # Frontend React + shell Electron
├── server/       # Backend Express + workers + migrações SQL
├── docs/         # Documentação centralizada
├── .project-context.md  # Resumo técnico para agentes de IA
└── README.md
```
