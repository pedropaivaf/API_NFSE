# Workflow: Gerar Novo Executavel (Release)

## Pre-requisitos

- Node.js v18+ instalado
- `npm install` executado em `web/` e `server/`
- Arquivo `.env` configurado em `server/`

## Passo a Passo

### 1. Atualizar a Versao

Edite `web/package.json` e incremente `"version"`:

```json
"version": "0.0.5"
```

Convencao de versionamento:
- `patch` (0.0.X): bugfixes, pequenos ajustes
- `minor` (0.X.0): novas funcionalidades
- `major` (X.0.0): mudancas incompativeis

### 2. Instalar dependencias (se necessario)

```bash
cd web
npm install

cd ../server
npm install
```

### 3. Gerar o Build

```bash
cd web
npm run electron:build
```

O comando executa em sequencia:
1. `vite build` - compila o React para `web/dist/`
2. `electron-builder` - empacota tudo como instalador NSIS

### 4. Localizar o Instalador

```
web/dist-electron/API NFSe Setup X.X.X.exe
```

### 5. (Opcional) Release com tag git

```bash
cd web
npm run release:patch   # bump patch + build + git push --follow-tags
npm run release:minor   # bump minor + build + git push --follow-tags
npm run release:major   # bump major + build + git push --follow-tags
```

## Modo Desenvolvimento (sem build)

```bash
# Terminal 1 - Backend
cd server
npm start

# Terminal 2 - Frontend + Electron
cd web
npm run electron:dev
```

## Historico de Versoes

| Versao | Data       | Descricao                     |
|--------|------------|-------------------------------|
| 0.0.1  | 2025       | Versao inicial                |
| 0.0.4  | 2026-03-06 | Ajustes de UI + loop scraping |
