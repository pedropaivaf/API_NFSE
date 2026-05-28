# Microsserviço NFSe Emissor — Juiz de Fora/MG

> **Status:** Planejamento técnico aprovado em 2026-05-28
> **Branch:** `feature/nfse-modular-integration` (este documento)
> **Implementação:** em repositório separado (a criar)
> **Padrão:** ABRASF 2.02
> **Municipalidade:** Juiz de Fora — MG

Documento de planejamento e handoff para implementação em repositório separado. Quando o microsserviço estiver validado em produção, este projeto (API_NFSE Electron) será modularizado para consumi-lo via SDK.

---

## 1. Visão geral

Microsserviço HTTP/REST que orquestra emissão, cancelamento e consulta de NFSe junto ao webservice oficial da Prefeitura de Juiz de Fora. Atende múltiplos consumidores (Lovable, app Electron API_NFSE, n8n, terceiros) com isolamento multi-tenant.

### Consumidores

| Consumidor | Função | Autenticação |
|---|---|---|
| Lovable (frontend web) | Portal cliente público — emissão e consulta via interface | JWT Supabase (usuário humano) |
| App Electron API_NFSE | Aplicação desktop contábil — emissão + extração já existente | JWT Supabase |
| n8n (mesma VPS) | Automações: emissão por evento, envio email/WhatsApp | API Key |
| Terceiros autorizados | Integrações externas (ERPs, ONGs, sistemas contábeis) | API Key |

### Princípio de design

> **API estável, prefeitura instável.** O microsserviço esconde da camada cliente toda a complexidade do webservice SOAP da PJF (namespace ABRASF, assinatura xmldsig-core SHA-1, mTLS, 411 códigos de erro). Cliente fala JSON limpo.

---

## 2. Stack técnica

| Camada | Tecnologia | Versão |
|---|---|---|
| Runtime | Node.js LTS | 22 |
| Linguagem | TypeScript strict | 5 |
| Framework HTTP | Fastify | 5.x |
| Validação | Zod | 3.x |
| Certificado PKCS#12 | node-forge | 1.x |
| Assinatura XML | xml-crypto + @xmldom/xmldom + xpath | 3.x / 0.9.x |
| Cliente SOAP | axios + https.Agent (mTLS TLS 1.2) | 1.x |
| Parse XML resposta | fast-xml-parser | 4.x |
| Banco / Storage / Auth | Supabase (PostgreSQL) | — |
| Testes | Vitest | 2.x |
| Logging | pino (JSON estruturado) | 9.x |
| Process manager | PM2 (Hostinger) | — |

### Bibliotecas proibidas (lições aprendidas)

- `node-soap`, `strong-soap` — bugs de namespace com WSDL ABRASF
- `xmldom` (sem `@`) — namespace silenciosamente quebrado
- `crypto-js` para XML — não implementa xmldsig-core

> **Envelope SOAP é montado MANUALMENTE como string**, não via lib SOAP.

---

## 3. Arquitetura de alto nível

```
┌─────────────────────────────────────────────────────────────────┐
│  VPS Hostinger Business                                         │
│                                                                 │
│  ┌──────────────────────┐    ┌──────────────────────┐          │
│  │  Microsserviço NFSe  │◄───┤  n8n self-hosted     │          │
│  │  (Node.js + Fastify) │    │  (workflows)         │          │
│  │                      │    │  - email/WhatsApp    │          │
│  │  ┌────────────────┐  │    │  - eventos externos  │          │
│  │  │ /v1/nfse/*     │  │    └──────────────────────┘          │
│  │  │ /v1/health     │  │                                       │
│  │  └────────────────┘  │    ┌──────────────────────┐          │
│  │                      │    │  Supabase            │          │
│  │  - mTLS (.pfx)      │◄───┤  PostgreSQL          │          │
│  │  - xml-signer       │    │  Storage (.pfx AES)  │          │
│  │  - error mapping    │    │  Auth (JWT)          │          │
│  └──────────┬───────────┘    └──────────────────────┘          │
└─────────────┼───────────────────────────────────────────────────┘
              │ HTTPS + JWT/API Key
   ┌──────────┼──────────┬─────────────┬──────────────┐
   ▼          ▼          ▼             ▼              ▼
[Electron] [Lovable] [n8n flows] [Terceiros]    Prefeitura JF
                                                (mTLS porta 4431/4432)
```

---

## 4. Modelo de dados (Supabase)

### Tabelas

#### `tenants`
Organização que usa a API (contadores, empresas, integradores).
```sql
id            uuid PK
nome          text not null
slug          text unique not null
plano         text default 'free'
created_at    timestamptz default now()
```

#### `usuarios`
Vinculado ao Supabase Auth (`auth.users.id`), pertence a um tenant.
```sql
id              uuid PK references auth.users(id)
tenant_id       uuid FK -> tenants(id)
nome            text
role            text default 'member'  -- owner | admin | member | viewer
created_at      timestamptz default now()
```

#### `api_keys`
Chaves para n8n/terceiros.
```sql
id              uuid PK
tenant_id       uuid FK -> tenants(id)
nome            text not null
hash            text not null          -- bcrypt da key
prefix          text not null          -- primeiros 8 chars para identificação
scopes          text[]                 -- ['nfse:emit', 'nfse:read']
rate_limit      int default 60         -- requests/min
last_used_at    timestamptz
expires_at      timestamptz
created_at      timestamptz default now()
```

#### `empresas`
Prestadores que emitem nota — uma empresa pertence a um tenant.
```sql
id                    uuid PK
tenant_id             uuid FK -> tenants(id)
cnpj                  text not null
inscricao_municipal   text not null
razao_social          text not null
nome_fantasia         text
regime_tributario     text                -- simples | normal | mei | lp
regime_especial       text
optante_simples       boolean default false
incentivador_cultural boolean default false
endereco              jsonb               -- {logradouro, numero, bairro, codigo_municipio, uf, cep}
email                 text
telefone              text
created_at            timestamptz default now()
unique(tenant_id, cnpj)
```

#### `certificados`
Certificado A1 criptografado.
```sql
id              uuid PK
empresa_id      uuid FK -> empresas(id)
storage_path    text not null            -- caminho no Supabase Storage
nome_arquivo    text
cnpj_titular    text not null            -- extraído do Subject, validação E287
emitido_em      timestamptz
expira_em       timestamptz not null     -- alerta 30 dias antes
senha_cifrada   text not null            -- AES-256 com chave em KMS
algoritmo       text default 'aes-256-gcm'
revoked         boolean default false
created_at      timestamptz default now()
```

#### `tomadores`
Cache de tomadores recorrentes (opcional, pode ficar no payload do RPS).
```sql
id              uuid PK
tenant_id       uuid FK -> tenants(id)
tipo_doc        text not null            -- cpf | cnpj
documento       text not null
razao_social    text
email           text
endereco        jsonb
created_at      timestamptz default now()
unique(tenant_id, documento)
```

#### `rps`
Recibo Provisório de Serviços (antes de virar NFSe).
```sql
id              uuid PK
empresa_id      uuid FK -> empresas(id)
numero          bigint not null          -- do contador_rps (SEQUENCE)
serie           text not null default 'A1'
tipo            int not null default 1   -- 1=RPS, 2=Nota Fiscal Conjugada Mista, 3=Cupom
data_emissao    timestamptz not null
status          text default 'pendente'  -- pendente | enviado | aceito | rejeitado | cancelado
servico         jsonb not null           -- {codigo_servico, descricao, valor_servicos, iss_retido, ...}
tomador         jsonb not null
xml_assinado    text                     -- payload enviado à PJF
xml_resposta    text                     -- retorno bruto
codigo_erro     text                     -- E1, E10, etc se falhou
mensagem_erro   text
created_at      timestamptz default now()
unique(empresa_id, numero, serie)
```

#### `nfse`
NFSe efetivamente emitida.
```sql
id                  uuid PK
rps_id              uuid FK -> rps(id)
numero              bigint not null
codigo_verificacao  text not null
data_emissao        timestamptz not null
url_pdf             text                   -- link prefeitura
xml_nfse            text                   -- XML retorno PJF
status              text default 'ativa'   -- ativa | cancelada | substituida
created_at          timestamptz default now()
```

#### `cancelamentos`
```sql
id                  uuid PK
nfse_id             uuid FK -> nfse(id)
motivo              text not null
codigo_motivo       int                    -- 1=erro emissão, 2=serviço não prestado, ...
solicitado_por      uuid FK -> usuarios(id)
data_cancelamento   timestamptz
xml_requisicao      text
xml_resposta        text
status              text                   -- pendente | aceito | rejeitado
created_at          timestamptz default now()
```

#### `logs_webservice`
Auditoria fiscal — retenção mínima 5 anos.
```sql
id              uuid PK
tenant_id       uuid FK -> tenants(id)
empresa_id      uuid FK -> empresas(id)
operacao        text not null            -- GerarNfse | CancelarNfse | ConsultarNfsePorRps | ConsultarLoteRps
soap_request    text not null
soap_response   text
http_status     int
latencia_ms     int
sucesso         boolean
created_at      timestamptz default now()
```

#### `audit_log`
Auditoria de API (quem fez o quê).
```sql
id              uuid PK
tenant_id       uuid FK -> tenants(id)
ator_tipo       text                     -- usuario | api_key | sistema
ator_id         uuid
acao            text                     -- emit | cancel | consult | upload_cert
recurso_tipo    text
recurso_id      uuid
ip              inet
user_agent      text
metadata        jsonb
created_at      timestamptz default now()
```

#### `contador_rps` (deprecado em favor de SEQUENCE)
```sql
-- Em vez de tabela com SELECT FOR UPDATE, usar PostgreSQL SEQUENCE
CREATE SEQUENCE rps_seq_<empresa_id> START 1 INCREMENT 1;
-- Atômico nativamente, sem race condition.
```

### Row Level Security (RLS)

Obrigatório em todas as tabelas. Padrão:
```sql
CREATE POLICY tenant_isolation ON empresas
  USING (tenant_id = current_setting('app.tenant_id')::uuid);
```

---

## 5. Endpoints da API

### Autenticação

Todas as rotas (exceto `/v1/health` e `/v1/auth/*`) exigem um dos dois:
- **Header `Authorization: Bearer <jwt>`** — usuário humano via Supabase Auth
- **Header `X-API-Key: <key>`** — serviço/n8n/terceiro

A API valida o token, identifica `tenant_id`, e injeta em `current_setting('app.tenant_id')` para RLS.

### `POST /v1/nfse/emitir`

Emissão síncrona de 1 RPS (operação `GerarNfse`).

**Request:**
```json
{
  "empresa_id": "uuid",
  "rps": {
    "serie": "A1",
    "tipo": 1,
    "data_emissao": "2026-05-28T14:30:00-03:00",
    "natureza_operacao": 1,
    "regime_especial": null,
    "optante_simples": false,
    "incentivador_cultural": false
  },
  "servico": {
    "codigo_servico": "0107",
    "codigo_cnae": "6201500",
    "discriminacao": "Desenvolvimento de software sob encomenda",
    "codigo_municipio": "3136702",
    "valor_servicos": 5000.00,
    "valor_deducoes": 0,
    "valor_pis": 0,
    "valor_cofins": 0,
    "valor_inss": 0,
    "valor_ir": 0,
    "valor_csll": 0,
    "iss_retido": 2,
    "valor_iss": 250.00,
    "outras_retencoes": 0,
    "base_calculo": 5000.00,
    "aliquota": 0.05,
    "desconto_incondicionado": 0,
    "desconto_condicionado": 0
  },
  "tomador": {
    "tipo_doc": "cnpj",
    "documento": "12345678000190",
    "razao_social": "Empresa Tomadora LTDA",
    "inscricao_municipal": "12345",
    "endereco": {
      "logradouro": "Rua Halfeld",
      "numero": "100",
      "bairro": "Centro",
      "codigo_municipio": "3136702",
      "uf": "MG",
      "cep": "36010000"
    },
    "contato": {
      "telefone": "3232100000",
      "email": "contato@tomadora.com.br"
    }
  }
}
```

**Response 201:**
```json
{
  "nfse": {
    "id": "uuid",
    "numero": 1234567,
    "codigo_verificacao": "ABC123XY",
    "data_emissao": "2026-05-28T14:30:15-03:00",
    "url_pdf": "https://nfse.pjf.mg.gov.br/...",
    "status": "ativa"
  },
  "rps": {
    "numero": 42,
    "serie": "A1"
  }
}
```

**Response 422:** erro de validação Zod ou erro PJF mapeado (`{ codigo: "E287", mensagem: "...", original: "..." }`)

### `POST /v1/nfse/:id/cancelar`

```json
{
  "motivo": "Erro na emissão",
  "codigo_motivo": 1
}
```

### `GET /v1/nfse/por-rps`

Query params: `numero`, `serie`, `prestador_cnpj`.

Útil para recuperar emissão quando timeout/falha de rede impediu o registro local.

### `GET /v1/nfse/lote/:protocolo`

Consulta lote assíncrono (quando portal lento ou volume alto).

### `GET /v1/nfse/:id`

Consulta interna (sem chamar PJF), retorna NFSe + URL PDF + status.

### `GET /v1/health`

Healthcheck (DB + Storage + PJF ping opcional).

### Endpoints administrativos (futuro)

- `POST /v1/empresas` — cadastrar prestador
- `POST /v1/empresas/:id/certificado` — upload .pfx
- `POST /v1/api-keys` — gerar key para tenant
- `GET /v1/logs/webservice` — audit

---

## 6. Fluxo de emissão (sequência)

```
[Cliente]                 [API NFSe]              [Supabase]         [PJF Webservice]
   │                          │                       │                     │
   │ POST /v1/nfse/emitir     │                       │                     │
   ├─────────────────────────►│                       │                     │
   │                          │ Validate JWT/API Key  │                     │
   │                          │ Set tenant_id (RLS)   │                     │
   │                          │                       │                     │
   │                          │ SELECT empresa, cert  │                     │
   │                          ├──────────────────────►│                     │
   │                          │                       │                     │
   │                          │ Download .pfx Storage │                     │
   │                          ├──────────────────────►│                     │
   │                          │                       │                     │
   │                          │ Decrypt senha (KMS)   │                     │
   │                          │ Validate CNPJ cert    │                     │
   │                          │ NEXTVAL(rps_seq)      │                     │
   │                          ├──────────────────────►│                     │
   │                          │                       │                     │
   │                          │ Build XML RPS         │                     │
   │                          │ Sign (xml-crypto)     │                     │
   │                          │ Build SOAP envelope   │                     │
   │                          │                       │                     │
   │                          │ POST mTLS (axios+pfx) │                     │
   │                          ├───────────────────────┼────────────────────►│
   │                          │                       │                     │
   │                          │       XML response with NFSe                │
   │                          │◄──────────────────────┼─────────────────────┤
   │                          │                       │                     │
   │                          │ Parse fast-xml-parser │                     │
   │                          │ INSERT rps + nfse     │                     │
   │                          ├──────────────────────►│                     │
   │                          │ INSERT logs_webservice│                     │
   │                          ├──────────────────────►│                     │
   │                          │                       │                     │
   │                          │ Emit webhook → n8n    │                     │
   │                          │   (NFSeEmitida event) │                     │
   │   201 Created            │                       │                     │
   │◄─────────────────────────┤                       │                     │
```

---

## 7. Pontos críticos de implementação (resumo)

| Erro PJF | Causa | Mitigação |
|---|---|---|
| E1 — Assinatura do Hash | Formatação do XML após assinar; namespace errado; KeyInfo com X509SubjectName | Nunca pretty-print após sign; `inclusiveNamespacesPrefixList` correto; KeyInfo só `<X509Certificate>` |
| E10 — RPS duplicado | Race condition em SELECT FOR UPDATE | Usar `nextval(rps_seq_<empresa>)` (atômico) |
| E193 — Cadeia certificado incompleta | Lib não extraiu intermediários | `node-forge` extrai cadeia completa do .pfx |
| E287 — CNPJ certificado ≠ prestador | Cliente subiu cert errado | Comparar Subject do .pfx vs CNPJ XML ANTES de enviar |

### Parâmetros de assinatura (não negociar)

```javascript
{
  canonicalizationAlgorithm: "http://www.w3.org/TR/2001/REC-xml-c14n-20010315",
  signatureAlgorithm: "http://www.w3.org/2000/09/xmldsig#rsa-sha1",
  references: [{
    xpath: "//*[local-name(.)='InfRps']",
    digestAlgorithm: "http://www.w3.org/2000/09/xmldsig#sha1",
    transforms: [
      "http://www.w3.org/2000/09/xmldsig#enveloped-signature",
      "http://www.w3.org/TR/2001/REC-xml-c14n-20010315"
    ]
  }],
  keyInfoProvider: () => `<X509Data><X509Certificate>${certB64}</X509Certificate></X509Data>`
}
```

---

## 8. Roadmap MVP

| Fase | Duração | Entrega |
|---|---|---|
| 0 — Pré-requisitos | 1–2 dias | Cert A1, repo GitHub novo, Supabase configurado, secrets na Hostinger |
| 1 — Microsserviço base | 5–7 dias | `POST /v1/nfse/emitir` funcionando em homologação via curl |
| 2 — Persistência + multi-tenant | 4–5 dias | Schema completo, RLS, audit log, upload certificado AES-256 |
| 3 — Cancelar + Consultar | 3–4 dias | 3 endpoints restantes funcionais |
| 4 — Frontend Lovable | 5–7 dias | Login, cadastro empresa, upload cert, emissão, listagem |
| 5 — Produção | 2–3 dias | Validação cliente piloto, switch URLs homolog→prod, primeira nota real |
| 6 — Integração n8n | 3–5 dias | Webhooks de eventos + workflow exemplo (email/WhatsApp) |
| 7 — SDK + Electron | 5–7 dias | `@api-nfse/sdk` publicado, app Electron consome a nova API |

**Total: 28–40 dias úteis** (ajuste do detalhamento original que tinha 19–28).

---

## 9. Deploy e CI/CD

### Ambientes
- `develop` branch → Hostinger homologação (`PJF_AMBIENTE=homologacao`)
- `main` branch → Hostinger produção (`PJF_AMBIENTE=producao`)

### GitHub Actions pipeline
1. Lint (ESLint + Prettier)
2. Test (Vitest unit + integration mockando PJF)
3. Build (`tsc → dist/`)
4. Deploy via SSH/rsync para Hostinger
5. PM2 reload (zero downtime)

### Variáveis de ambiente
```
PJF_AMBIENTE=homologacao|producao
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
KMS_ENDPOINT=...          # para descriptografar senhas .pfx
KMS_KEY_ID=...
JWT_SECRET=...            # validação JWT Supabase
SENTRY_DSN=...            # opcional
LOG_LEVEL=info
```

---

## 10. Integração com app Electron API_NFSE (fase posterior)

Quando microsserviço estiver em produção e validado:

1. Publicar `@api-nfse/sdk` (cliente TypeScript tipado)
2. No `server/` do API_NFSE:
   - Adicionar rota `/api/emitir-nfse` que delega ao microsserviço via SDK
   - Manter rotas de scraping/extração existentes
3. No `web/` do API_NFSE (frontend Electron):
   - Nova tela "Emitir NFSe" consumindo o backend local
   - Tela existente "Buscar NFSe" continua usando scraping
4. Sincronizar empresas entre app local e VPS via API

---

## 11. Decisões fechadas vs em aberto

### Fechadas
- Stack: Node 22 + TS + Fastify + Zod
- Banco: Supabase
- Deploy: Hostinger VPS
- Auth: API Key (serviços) + JWT Supabase (usuários)
- Certificado: AES-256 no Storage da VPS
- Repo: separado (microsserviço) + branch atual (handoff doc)
- MVP: 4 operações (Emit, Cancel, ConsultarPorRps, ConsultarLote)

### Em aberto (próximas decisões)
- Nome do repo separado (sugestão: `nfse-emissor-jf` ou `pjf-nfse-api`)
- Plano Hostinger específico (Business Web Hosting confirmado pelo cliente)
- KMS específico: Supabase Vault (gratuito) ou serviço externo
- Provider de email/WhatsApp para n8n (Resend? Twilio? WhatsApp Cloud API?)
- Política de retry em falhas PJF (exponential backoff? circuit breaker?)
- Modelo de pricing/limites por plano de tenant

---

## 12. Referências externas

- ABRASF 2.02 — Manual técnico nacional NFSe
- Manual técnico Prefeitura de Juiz de Fora (411 códigos de erro)
- WSDL Homologação: https://nfse.homologacao.pjf.mg.gov.br:4432/WebService.asmx?wsdl
- WSDL Produção: https://nfse.pjf.mg.gov.br:4431/WebService.asmx?wsdl
- W3C xmldsig-core: https://www.w3.org/TR/xmldsig-core/
- C14N: https://www.w3.org/TR/2001/REC-xml-c14n-20010315
- Documento Word completo: `Especificacao_Tecnica_NFSe_JF.docx` (entrega separada)
