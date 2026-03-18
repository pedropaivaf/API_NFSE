# Arquitetura do Projeto — API NFSe

**Versão atual:** v0.5.0

## Visão Geral

Aplicação desktop (Electron) com backend Node.js integrado para autenticar via Certificado Digital A1 (mTLS) e baixar automaticamente XMLs de Notas Fiscais de Serviço (NFS-e) do Portal Nacional do Governo Federal.

## Stack Técnica

| Camada     | Tecnologia                             |
|------------|----------------------------------------|
| Desktop    | Electron 28                            |
| Frontend   | React 19 + Vite 7 + TailwindCSS 4     |
| Backend    | Node.js + Express 5                    |
| Banco      | Supabase (PostgreSQL)                  |
| Storage    | Supabase Storage (certificados + XMLs) |
| Scheduler  | node-cron                              |
| Cert parse | node-forge                             |
| Scraping   | Cheerio (parse HTML/JSON do gov.br)    |
| Auth cert  | Certificado Digital A1 (.pfx) via mTLS |

## Estrutura de Pastas

```
API_NFSE/
├── web/                        # Frontend React + Electron
│   ├── src/
│   │   ├── pages/              # BuscarNota, Companies, DashboardHome, Login, NfseList, Settings, Users
│   │   ├── components/         # AddCompanyModal, Layout
│   │   └── supabaseClient.js
│   ├── electron/
│   │   ├── main.cjs            # Processo principal do Electron
│   │   └── preload.js          # Bridge IPC segura
│   ├── dist/                   # Build Vite (gerado)
│   └── dist-app/               # Instalador NSIS gerado
│       └── API NFSe Setup X.X.X.exe
│
├── server/                     # Backend Express
│   ├── src/
│   │   ├── index.js            # Entry point — Express + rotas + cron
│   │   ├── routes/             # companies.js, scraper.js, settings.js, users.js
│   │   ├── controllers/        # companyController, nfsController, settingsController
│   │   ├── services/
│   │   │   ├── certificateService.js   # Valida .pfx, extrai CN/CNPJ/validade
│   │   │   ├── nfseScraperService.js   # mTLS auth + scraping + download XMLs
│   │   │   ├── nfseService.js          # Consulta metadados no Supabase
│   │   │   └── scheduler.js            # Cron de sincronização automática
│   │   ├── config/
│   │   │   ├── multer.js
│   │   │   └── supabaseClient.js       # Cliente Supabase (service role)
│   │   └── utils/logger.js
│   └── supabase/
│       └── migrations/         # SQL versionado (00_init → 99_fix)
│
└── docs/                       # Documentação centralizada (este diretório)
```

## Fluxo Principal de Autenticação e Extração

```
[Usuário]
    │
    ├─► Seleciona .pfx + informa senha  (ou usuário/senha)
    │       └─► POST /scraper/validate-cert
    │               └─► certificateService.js valida pfx (node-forge)
    │                   └─► Extrai CN, CNPJ, validade
    │                   └─► Auto-vincula ou cadastra empresa no Supabase
    │
    └─► Clica "Iniciar Extração"
            └─► POST /scraper/fetch-gov
                    ├─► _authenticate()
                    │       └─► GET /EmissorNacional/Certificado (mTLS TLSv1.2)
                    │           └─► 302 → /Dashboard
                    │               └─► Extrai JWT (window.sessionStorage)
                    │
                    └─► _continueExtraction()
                            └─► GET /EmissorNacional/Notas/{Recebidas|Emitidas}
                                    ?dataInicio=DD/MM/YYYY&dataFim=DD/MM/YYYY
                                    Authorization: Bearer {JWT}
                            └─► Parse HTML/JSON com Cheerio
                            └─► Upsert metadados → Supabase tabela `nfs`
                            └─► Download XMLs → [OutputPath]/[Empresa]/[tipo]/[mês]/
```

## Tabelas do Banco de Dados (Supabase)

| Tabela        | Descrição                                             |
|---------------|-------------------------------------------------------|
| `companies`   | Empresas cadastradas (CNPJ, certificado, credenciais) |
| `nfs_docs`    | Metadados das notas (chave de acesso, valor, data)    |
| `sync_logs`   | Histórico de execuções do scraper                     |
| `users`       | Usuários com chave de acesso e plano                  |
| `settings`    | Configurações globais                                 |

## Rotas da API (Backend Express)

| Método | Rota                              | Descrição                          |
|--------|-----------------------------------|------------------------------------|
| GET    | `/companies`                      | Lista todas as empresas            |
| POST   | `/companies/quick`                | Cadastro rápido (auto-vinculo)     |
| POST   | `/companies/:id/credentials`      | Salva credenciais usuário/senha    |
| GET    | `/companies/local-certificates`   | Lista .pfx do drive local          |
| GET    | `/companies/grouped-nfs`          | Notas agrupadas por empresa/mês    |
| GET    | `/companies/:id/download-zip`     | Download ZIP das notas             |
| POST   | `/scraper/validate-cert`          | Valida .pfx ou credenciais login   |
| POST   | `/scraper/fetch-gov`              | Executa extração RPA               |
| POST   | `/scraper/bulk-sync`              | Sincronização em lote (mensal)     |
| GET    | `/api/settings`                   | Configurações globais              |
| POST   | `/api/settings`                   | Atualizar configurações            |

## Convenção de Período

O portal NFSe bloqueia consultas com intervalo superior a 30 dias:

- **`period: 'atual'`** → últimos 30 dias (hoje − 30 → hoje)
- **`period: 'custom'`** → datas definidas pelo usuário, limitadas a 30 dias
- **`period: 'anterior'`** → mês anterior, limitado a 30 dias retroativos

> Implementação em `server/src/services/nfseScraperService.js` → `_calcularPeriodo()`

---

*Ver [../implementation/scraper-nfse.md](../implementation/scraper-nfse.md) para histórico de bugs e sprints.*
