# Build e Release

## Gerar o Executável

```bash
cd web
npm run electron:build
# Saída: web/dist-app/API NFSe Setup X.X.X.exe
```

## Atualizar a Versão

Edite `web/package.json`:
```json
"version": "0.3.0"
```

Convenção (SemVer):
- `patch` (0.0.X) — bugfixes
- `minor` (0.X.0) — novas funcionalidades
- `major` (X.0.0) — mudanças incompatíveis

## Release Automatizado

```bash
cd web
npm run release:patch   # 0.2.2 → 0.2.3
npm run release:minor   # 0.2.2 → 0.3.0
npm run release:major   # 0.2.2 → 1.0.0
```

Cada comando: bump de versão → `electron:build` → `git push --follow-tags`

## Histórico de Versões

| Versão | Data       | Descrição                                                    |
|--------|------------|--------------------------------------------------------------|
| 0.0.1  | 2025       | Versão inicial                                               |
| 0.0.4  | 2026-03-06 | Ajustes de UI + loop scraping                                |
| 0.1.0  | 2026-03-09 | mTLS real: auth check corrigido, extração PEM via node-forge |
| 0.1.1  | 2026-03-09 | Fix TLS 1.3 vs IIS, diagnóstico mTLS, ordem cadeia cert      |
| 0.2.1  | 2026-03-09 | Autenticação dupla (cert+senha), prevenção duplicatas, UI    |
| 0.2.2  | 2026-03-09 | Fix período 30 dias, opção Personalizado, erro empresas não-bloqueante, remoção checkbox "Salvar chave", reorganização docs |
