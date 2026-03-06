# Arquitetura do Projeto - API NFSe

## Visao Geral

Aplicacao desktop (Electron) com backend Node.js integrado para baixar XMLs de NFS-e via API do Portal Nacional.

## Estrutura de Pastas

```
API_NFSE/
├── web/                        # Frontend React + Electron
│   ├── src/                    # Codigo React (paginas, componentes)
│   ├── electron/               # main.cjs + preload.js
│   ├── dist/                   # Build Vite (gerado)
│   ├── dist-electron/          # Instalador gerado pelo electron-builder
│   │   └── API NFSe Setup X.X.X.exe
│   └── package.json            # Versao do app + config electron-builder
│
├── server/                     # Backend Express (bundled no Electron)
│   ├── src/
│   │   ├── index.js            # Entry point Express
│   │   ├── routes/             # Rotas da API
│   │   ├── controllers/        # Logica de negocio
│   │   ├── services/           # Integracao Supabase, NFSe gov
│   │   └── config/             # Configuracoes
│   ├── supabase/migrations/    # SQL de migracao do banco
│   └── package.json
│
├── Docs/
│   ├── config_clientes.js      # Exemplo de configuracao multi-cliente
│   ├── index.js                # Script legado standalone
│   └── Context/                # Documentacao centralizada
│       ├── ARQUITETURA.md      (este arquivo)
│       ├── INSTRUCOES_SETUP.md
│       └── README_SAAS.md
│
├── .env                        # Variaveis de ambiente raiz
├── index.js                    # Script legado standalone (raiz)
└── README.md                   # Documentacao principal
```

## Stack

| Camada     | Tecnologia                             |
|------------|----------------------------------------|
| Desktop    | Electron 28                            |
| Frontend   | React 19 + Vite 7 + TailwindCSS 4     |
| Backend    | Node.js + Express 5                    |
| Banco      | Supabase (PostgreSQL)                  |
| Storage    | Supabase Storage (certificados + XMLs) |
| Scheduler  | node-cron                              |
| Scraping   | Cheerio + Puppeteer                    |
| Auth cert  | Certificado Digital A1 (.pfx)          |

## Fluxo Principal

1. Usuario cadastra empresa + certificado `.pfx` pelo frontend
2. Certificado e salvo no Supabase Storage (bucket `certificates`)
3. O scheduler (cron) ou acao manual dispara a sincronizacao
4. Backend baixa o certificado em memoria, autentica na API gov
5. XMLs sao baixados, descompactados (GZIP/Base64) e salvos no bucket `xmls`
6. Metadados (chave de acesso, data, valor) sao inseridos na tabela `nfs_docs`
7. Log e gravado em `sync_logs`
