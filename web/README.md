# web/ — Frontend React + Electron

Módulo de interface do usuário da aplicação API NFSe.

## Stack

- React 19 + Vite 7
- TailwindCSS 4
- Electron 28 (desktop shell)
- React Router DOM
- Supabase JS Client
- Lucide React (ícones)
- Axios (chamadas ao backend)

## Estrutura

```
web/
├── src/
│   ├── pages/
│   │   ├── Login.jsx           # Autenticação por chave de acesso
│   │   ├── DashboardHome.jsx   # Dashboard principal
│   │   ├── BuscarNota.jsx      # Extração RPA (cert A1 ou usuário/senha)
│   │   ├── Companies.jsx       # Gestão de empresas
│   │   ├── NfseList.jsx        # Lista de notas fiscais
│   │   ├── Settings.jsx        # Configurações
│   │   └── Users.jsx           # Gestão de usuários
│   ├── components/
│   │   ├── Layout.jsx          # Layout com sidebar e header
│   │   └── AddCompanyModal.jsx # Modal de cadastro de empresa
│   ├── supabaseClient.js       # Cliente Supabase para o frontend
│   └── App.jsx                 # Rotas da aplicação
│
├── electron/
│   ├── main.cjs    # Processo principal Electron (janela, IPC, spawn do backend)
│   └── preload.js  # Bridge IPC segura (contextBridge)
│
└── dist-electron/  # Instalador gerado (não versionado)
    └── API NFSe Setup X.X.X.exe
```

## Scripts

```bash
# Desenvolvimento com Electron (hot reload)
npm run electron:dev

# Desenvolvimento apenas no browser
npm run dev

# Build de produção + empacotamento Electron
npm run electron:build

# Release com bump de versão automático
npm run release:patch   # patch
npm run release:minor   # minor
npm run release:major   # major
```

## Variáveis de Ambiente

Copie `.env.example` para `.env`:

```ini
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=sua_chave_anon_publica
VITE_API_URL=http://localhost:3000
```

> Guia completo: [../docs/setup/environment.md](../docs/setup/environment.md)
