# API NFSe - Automação Nacional (mTLS & Senha)
**Versão:** v0.3.3
**Status:** Produção Estável

Este projeto é uma ferramenta de automação para busca, extração e organização de Notas Fiscais de Serviço eletrônicas (NFS-e) diretamente do Portal Nacional (nfse.gov.br), utilizando tanto Certificados Digitais A1 (mTLS) quanto login por usuário e senha.

## ✨ Novidades da Versão 0.3.3
- **Extração Histórica Completa**: Novo motor de loop que divide períodos longos (até 5 anos) em blocos de 15 dias para contornar limites do portal.
- **Agrupamento por Competência**: Notas agora são salvas com `competence_date` e exibidas na UI em blocos organizados por Mês/Ano.
- **Download Inteligente**: ZIPs filtrados por competência e correção de bugs de interface no Electron.
- **Resiliência a Falsos Positivos**: Detecção aprimorada de erros reais vs textos informativos do portal.

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
