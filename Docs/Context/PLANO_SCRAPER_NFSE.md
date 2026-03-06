# Plano: Implementacao do Scraper NFSe Real

## Status: v0.0.7 PRONTO — Aguardando teste completo em producao

### Bugs corrigidos em v0.0.7 (06/03/2026)
- CN do certificado `NOME:CNPJ` agora é parseado corretamente — exibe só o nome
- CNPJ extraído do `rawCn` (antes do parse), não do `cn` já limpo
- Campo `status: 'active'` removido do insert em `createQuickCompany` e `createCompany` (coluna não existe no schema Supabase)

---

## Resultado do Mapeamento HAR (06/03/2026)

HAR coletado em `www.nfse.gov.br.har`. Conclusoes:

| Hipotese inicial | Realidade confirmada |
|---|---|
| SSO gov.br + OAuth/SAML | NAO EXISTE nesse portal |
| Cookies de sessao | ZERO cookies no fluxo |
| axios-cookiejar-support necessario | Removido |
| Redirects complexos | Apenas 1 redirect: /Certificado → /Dashboard |

**Fluxo real:**
```
GET /EmissorNacional/Certificado  (com pfx no https.Agent)
  → 302 → /EmissorNacional/Dashboard   ← autenticado
GET /EmissorNacional/Nota/RecebidaIndex?dataInicio=DD/MM/YYYY&dataFim=DD/MM/YYYY
  → HTML com tabela de notas
```

Servidor: Microsoft-IIS/10.0 + ASP.NET MVC 5.2
Autenticacao: mTLS puro — o certificado e apresentado no handshake TLS de cada request.

---

## O que foi implementado (Sprint 1 + 2 + 3)

### Sprint 1 — CONCLUIDO
- `server/src/services/certificateService.js` — valida pfx, extrai CN/CNPJ/validade (node-forge)
- `POST /scraper/validate-cert` — endpoint de validacao
- `web/electron/main.cjs` — IPC cert path via `os.homedir()` (era hardcoded)
- `web/src/pages/BuscarNota.jsx` — botao "Validar Certificado" com badge CN/CNPJ/vencimento
- `server/supabase/migrations/01_fix_nfs_table.sql` — fix schema nfs_docs -> nfs

### Sprint 2+3 — CONCLUIDO
- `server/src/services/nfseScraperService.js` — implementacao real:
  - mTLS auth via `https.Agent({ pfx, passphrase })`
  - `GET /EmissorNacional/Certificado` → verifica redirect para Dashboard
  - `GET /Nota/{EmitidaIndex|RecebidaIndex}?dataInicio&dataFim`
  - Parse HTML com Cheerio (seletores: `table.table-striped tbody tr[data-chave]`)
  - Upsert Supabase tabela `nfs`
  - Download XML/PDF para `notas_processadas/{tipo}/`

---

## Contexto do Projeto

### Objetivo final
1. Listar .pfx de `%USERPROFILE%\Documents\Certificados`
2. Validar o certificado (senha, validade, extrair CNPJ/nome)
3. Logar no portal via mTLS (GET /Certificado com pfx)
4. Selecionar: empresa de destino, tipo (emitidas/recebidas), periodo
5. Baixar XMLs das notas listadas
6. Salvar em `notas_processadas\{tipo}\`
7. Persistir metadados no Supabase (tabela `nfs`)
8. Exibir notas na pagina "Notas Fiscais" do app

---

## Arquivos Principais

| Arquivo | Status |
|---|---|
| `server/src/services/certificateService.js` | CONCLUIDO |
| `server/src/services/nfseScraperService.js` | CONCLUIDO (mTLS real) |
| `server/src/routes/scraper.js` | CONCLUIDO |
| `web/electron/main.cjs` | CONCLUIDO (os.homedir) |
| `web/src/pages/BuscarNota.jsx` | CONCLUIDO (validacao visual) |
| `server/supabase/migrations/01_fix_nfs_table.sql` | CONCLUIDO |

---

## Verificacao Final

1. `POST /scraper/validate-cert` com .pfx real → retorna CN/CNPJ/validade ← **testar**
2. `POST /scraper/fetch-gov` → log `[RPA] Autenticado com sucesso` ← **testar**
3. Se `0 notas encontradas`: ajustar seletores Cheerio com HTML real da pagina
4. XMLs salvos em `notas_processadas/{tipo}/`
5. Notas visiveis em Supabase tabela `nfs`

---

## Se os seletores Cheerio precisarem ajuste

Adicionar ao `runExtractionJob` apos receber o HTML:
```javascript
// Salvar HTML para debug
require('fs').writeFileSync('debug_notas.html', notasResp.data);
```
Abrir o arquivo e verificar as classes CSS reais da tabela de notas.

---

## URLs confirmadas pelo HAR

| Endpoint | URL |
|---|---|
| Login (visual) | `https://www.nfse.gov.br/EmissorNacional/Login?ReturnUrl=%2fEmissorNacional` |
| Auth mTLS | `https://www.nfse.gov.br/EmissorNacional/Certificado` |
| Dashboard | `https://www.nfse.gov.br/EmissorNacional/Dashboard` |
| Notas Recebidas | `https://www.nfse.gov.br/EmissorNacional/Nota/RecebidaIndex` |
| Notas Emitidas | `https://www.nfse.gov.br/EmissorNacional/Nota/EmitidaIndex` |

Params de data (a confirmar): `?dataInicio=DD/MM/YYYY&dataFim=DD/MM/YYYY`
