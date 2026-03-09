# Guia da Plataforma

## Visão Geral

Plataforma desktop multi-empresa para extração automatizada de NFS-e do Portal Nacional Gov.br.

## Funcionalidades

### Cadastro de Empresas
- Upload de Certificado Digital A1 (`.pfx`) com senha
- Suporte a credenciais usuário/senha (alternativa ao certificado)
- Certificado armazenado no Supabase Storage (bucket `certificates`, privado)

### Extração de NFS-e

**Autenticação:**
1. **Certificado A1 (mTLS)** — `.pfx` + senha
2. **Usuário/Senha** — CPF/CNPJ + senha do portal Gov.br

**Parâmetros:**
- Tipo: Notas Recebidas ou Emitidas
- Período: Últimos 30 dias ou Personalizado (máx. 30 dias)
- Saída: XML (Padrão Nacional)

### Sincronização Automática
- Cron em `server/src/services/scheduler.js`

## Rotas da API

| Método | Rota                              | Descrição                          |
|--------|-----------------------------------|------------------------------------|
| GET    | `/companies`                      | Lista todas as empresas            |
| POST   | `/companies/quick`                | Cadastro rápido por CNPJ           |
| POST   | `/companies/:id/credentials`      | Salva login/senha da empresa       |
| GET    | `/companies/local-certificates`   | Lista .pfx do drive local          |
| POST   | `/scraper/validate-cert`          | Valida .pfx ou credenciais         |
| POST   | `/scraper/fetch-gov`              | Executa extração RPA               |
| GET    | `/users`                          | Lista usuários                     |
| POST   | `/users/login`                    | Autenticação por chave de acesso   |
| GET    | `/settings`                       | Lê configurações globais           |
| PUT    | `/settings`                       | Atualiza configurações             |

## Segurança

- Certificados em Storage privado, baixados em memória apenas na execução
- Senhas em texto plano no banco (MVP — **criptografar em produção**)
- Chave `service_role` usada apenas no backend
- Políticas RLS permissivas no MVP
