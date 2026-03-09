# Guia de Desenvolvimento

## Pré-requisitos

- Node.js v18 ou superior
- Certificado Digital A1 (`.pfx`) para testar autenticação mTLS
- Projeto Supabase configurado (ver [../setup/supabase.md](../setup/supabase.md))
- Arquivos `.env` configurados (ver [../setup/environment.md](../setup/environment.md))

## Instalação

```bash
git clone <url-do-repositorio>
cd API_NFSE
cd server && npm install && cd ..
cd web && npm install && cd ..
```

## Rodar em Desenvolvimento

```bash
# Terminal 1 — Backend Express
cd server
npm start
# Servidor em http://localhost:3000

# Terminal 2 — Frontend + Electron
cd web
npm run electron:dev
```

> Apenas browser (sem Electron): `cd web && npm run dev` → http://localhost:5173

## Scripts Utilitários do Backend

Localizados em `server/`:

| Script                  | Descrição                                  |
|-------------------------|--------------------------------------------|
| `check_db.js`           | Verifica conexão e tabelas no Supabase     |
| `check_data.js`         | Exibe dados existentes nas tabelas         |
| `check_columns.js`      | Lista colunas das tabelas                  |
| `check_settings.js`     | Exibe configurações salvas                 |
| `cleanup_test_data.js`  | Remove dados de teste do banco             |
| `test_update_flow.js`   | Testa fluxo de atualização de empresa      |
| `apply_sql.js`          | Aplica SQL via API Supabase                |

```bash
cd server && node check_db.js
```

## Debug do Scraper

Se o scraper retornar `0 notas encontradas`:

```javascript
// Em nfseScraperService.js, dentro de _continueExtraction():
require('fs').writeFileSync(`${os.homedir()}/Documents/debug_notas.html`, notasResp.data);
```

## Certificados Locais em Desenvolvimento

Por padrão o app busca `.pfx` em `V:\Certificado Digital`. Em dev, aponte para sua pasta:

```ini
# server/.env
LOCAL_CERT_PATH=C:\Users\SeuUsuario\Certificados
```

## Atualização Contínua de Documentação

Ao fazer alterações, atualize o doc correspondente **antes do commit**:

| Tipo de mudança           | Arquivo a atualizar                          |
|---------------------------|----------------------------------------------|
| Nova rota na API          | [saas-platform.md](./saas-platform.md)       |
| Mudança de schema SQL     | [../setup/supabase.md](../setup/supabase.md) + nova migração |
| Nova variável de ambiente | [../setup/environment.md](../setup/environment.md) |
| Nova versão / release     | [build-release.md](./build-release.md)       |
| Mudança no scraper        | [../implementation/scraper-nfse.md](../implementation/scraper-nfse.md) |
| Mudança arquitetural      | [../architecture/overview.md](../architecture/overview.md) |
