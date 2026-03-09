# Plano: Implementacao do Scraper NFSe Real

## Status: v0.1.1 — Aguardando teste de autenticação mTLS

### Bugs corrigidos em v0.1.1 (09/03/2026)
- **TLS 1.3 vs IIS**: `maxVersion: 'TLSv1.2'` forçado — IIS 10.0 tem bugs com client cert (CertificateRequest) em TLS 1.3; Node.js negociava TLS 1.3 por padrão
- **Diagnóstico root cause**: mTLS nunca funcionou — `includes('dashboard')` era falso positivo desde v0.0.8 (login URL = `/Login?ReturnUrl=.../Dashboard`)
- **Ordem da cadeia**: leaf cert ordenado primeiro; fallback para `keyBag` além de `pkcs8ShroudedKeyBag`
- **Validação TLS context**: valida par cert+key antes de autenticar (detecta chave inválida cedo)
- **Log da cadeia**: imprime CN de cada cert para diagnóstico

### Bugs corrigidos em v0.1.0 (09/03/2026)
- Auth check: `pathname.endsWith('/dashboard')` em vez de `includes('dashboard')` (falso positivo)
- Extração PEM via node-forge em vez de pfx buffer direto

### Bugs corrigidos em v0.0.9 (09/03/2026)
- **URL errada**: `/Nota/RecebidaIndex` → `/Notas/Recebidas` (plural, sem "Index") — causava 500 MvcSiteMapProvider
- **Bearer token**: JWT extraído do HTML do Dashboard (`window.sessionStorage.setItem("accessToken", ...)`) e enviado em todas as requisições de notas
- **Suporte JSON**: resposta da API SERPRO pode ser JSON — handler `extrairDadosNotasJson` detecta por Content-Type
- **Debug em Documents**: arquivos de debug salvos em `~/Documents/` (acessível fora do app empacotado)
- **Downloads com token**: arquivos XML/PDF baixados com Bearer token no header

### Bugs corrigidos em v0.0.8 (09/03/2026)
- `rejectUnauthorized: false` — portal gov.br usa cadeia ICP-Brasil fora do bundle CA do Node.js
- Debug HTML salvo quando governo retorna erro HTTP

### Bugs corrigidos em v0.0.7 (06/03/2026)
- CN do certificado `NOME:CNPJ` agora é parseado corretamente — exibe só o nome
- CNPJ extraído do `rawCn` (antes do parse), não do `cn` já limpo
- Campo `status: 'active'` removido do insert em `createQuickCompany` e `createCompany` (coluna não existe no schema Supabase)

### Arquitetura real descoberta via debug (09/03/2026)
```
1. GET /EmissorNacional/Certificado (mTLS pfx) → 302 → Dashboard
2. GET /EmissorNacional/Dashboard → HTML com:
   - window.sessionStorage.setItem("accessToken", "eyJ...") ← JWT emitido pelo SERPRO
   - window.UrlRest = "https://restnfseprod.srv.cd.serpro"
3. GET /EmissorNacional/Notas/Recebidas?dataInicio=...&dataFim=...
   Authorization: Bearer {accessToken}
   → Resposta JSON ou HTML com notas
```

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
