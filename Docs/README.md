# Documentação — API NFSe

Índice central de toda a documentação do projeto.

> **Convenção:** toda mudança de funcionalidade deve atualizar o documento correspondente antes do commit. Ver tabela de responsabilidade em [guides/development.md](guides/development.md#atualização-contínua-de-documentação).

---

## Índice

### Arquitetura
| Documento | Descrição |
|-----------|-----------|
| [architecture/overview.md](architecture/overview.md) | Stack, estrutura de pastas, fluxo mTLS, tabelas do banco, rotas da API |

### Setup
| Documento | Descrição |
|-----------|-----------|
| [setup/supabase.md](setup/supabase.md) | Criar projeto Supabase, migrações SQL, buckets de Storage |
| [setup/environment.md](setup/environment.md) | Variáveis de ambiente de `server/.env` e `web/.env` |

### Guias
| Documento | Descrição |
|-----------|-----------|
| [guides/development.md](guides/development.md) | Instalação, dev local, scripts utilitários, debug |
| [guides/saas-platform.md](guides/saas-platform.md) | Funcionalidades, rotas da API, segurança |
| [guides/build-release.md](guides/build-release.md) | Build executável, bump de versão, histórico de releases |

### Implementação
| Documento | Descrição |
|-----------|-----------|
| [implementation/scraper-nfse.md](implementation/scraper-nfse.md) | Arquitetura do scraper, sprints, histórico de bugs, debug |

---

## Quick Reference

```bash
# Desenvolvimento
cd server && npm start          # Terminal 1: backend (porta 3000)
cd web && npm run electron:dev  # Terminal 2: frontend + Electron

# Build
cd web && npm run electron:build
# Saída: web/dist-app/API NFSe Setup X.X.X.exe

# Release automático
cd web && npm run release:patch  # patch | minor | major
```

**Versão atual:** v0.2.2 — ver [guides/build-release.md](guides/build-release.md) para histórico.
