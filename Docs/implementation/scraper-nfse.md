# Implementação do Scraper NFSe

## Arquitetura Real (descoberta via debug HAR — 06/03/2026)

```
1. GET /EmissorNacional/Certificado  (mTLS pfx, TLSv1.2 forçado)
        → 302 → /EmissorNacional/Dashboard
2. GET /EmissorNacional/Dashboard
        → HTML com window.sessionStorage.setItem("accessToken", "eyJ...")
3. GET /EmissorNacional/Notas/{Recebidas|Emitidas}
        ?dataInicio=DD/MM/YYYY&dataFim=DD/MM/YYYY
        Authorization: Bearer {accessToken}
        → JSON ou HTML com tabela de notas
```

Servidor: Microsoft-IIS/10.0 + ASP.NET MVC 5.2

## URLs Confirmadas

| Endpoint        | URL                                                           |
|-----------------|---------------------------------------------------------------|
| Auth mTLS       | `https://www.nfse.gov.br/EmissorNacional/Certificado`         |
| Dashboard       | `https://www.nfse.gov.br/EmissorNacional/Dashboard`           |
| Notas Recebidas | `https://www.nfse.gov.br/EmissorNacional/Notas/Recebidas`     |
| Notas Emitidas  | `https://www.nfse.gov.br/EmissorNacional/Notas/Emitidas`      |

## Arquivos Principais

| Arquivo                                         | Status      |
|-------------------------------------------------|-------------|
| `server/src/services/certificateService.js`     | Concluído   |
| `server/src/services/nfseScraperService.js`     | Concluído   |
| `server/src/routes/scraper.js`                  | Concluído   |
| `web/electron/main.cjs`                         | Concluído   |
| `web/src/pages/BuscarNota.jsx`                  | Concluído   |

## Sprints

### Sprint 1 — CONCLUÍDO
- `certificateService.js` — valida pfx, extrai CN/CNPJ/validade (node-forge)
- `POST /scraper/validate-cert` — endpoint de validação
- `web/electron/main.cjs` — IPC cert path via `os.homedir()`
- `BuscarNota.jsx` — botão "Validar Certificado" com badge CN/CNPJ/vencimento

### Sprint 2+3 — CONCLUÍDO
- `nfseScraperService.js`: mTLS auth, extração JWT do Dashboard, parse Cheerio, upsert Supabase, download XML/PDF

## Histórico de Bugs e Correções

### v0.2.10 (10/03/2026)
- **Fix Download Window**: Substituído `window.open` por disparador de link oculto para evitar abertura de janelas em branco no Electron durante o download de ZIPs.

### v0.2.9 (10/03/2026)
- **Sucesso Resiliente**: Login agora aceita redirecionamentos tanto para `/EmissorNacional` quanto para `/Dashboard`.
- **Validação de Backup**: Adicionada checagem por `accessToken` no HTML caso o redirecionamento URL varie.
- **Diagnostics**: `debug_auth_redirect.html` agora salva o corpo da resposta em caso de falha.

### v0.2.8 (10/03/2026)
- **Formatação de CNPJ**: Campo de Inscrição agora aplica máscara `00.000.000/0000-00` automaticamente (exigência do portal).

### v0.2.7 (10/03/2026)
- **Browser Parity**: Headers atualizados para Chrome 145, `sec-ch-ua` formatado exatamente como o navegador.
- **Ordem de Campos**: `URLSearchParams` seguindo a ordem exata do FORM HTML (`token -> Inscricao -> Senha -> ReturnUrl`).

### v0.2.2 (09/03/2026)
- Período "Mês Atual" alterado para sempre usar últimos 30 dias
- Opção "Personalizado" com validação de intervalo máximo de 30 dias
- Erro de carregamento de empresas não-bloqueante com botão retry

### v0.2.1 (09/03/2026)
- Autenticação dupla: Certificado A1 + Usuário/Senha
- Prevenção de duplicatas, refinamentos de UI

### v0.1.1 (09/03/2026)
- `maxVersion: 'TLSv1.2'` forçado (IIS 10.0 bug com TLS 1.3)
- Fix auth check: `includes('dashboard')` era falso positivo
- Ordem da cadeia: leaf cert primeiro; fallback `keyBag`

### v0.1.0 (09/03/2026)
- Auth check: `pathname.endsWith('/dashboard')`
- Extração PEM via node-forge

### v0.0.9 (09/03/2026)
- URL corrigida: `/Nota/RecebidaIndex` → `/Notas/Recebidas`
- JWT extraído do HTML do Dashboard
- Suporte a resposta JSON da API SERPRO

### v0.0.8 (09/03/2026)
- `rejectUnauthorized: false` (cadeia ICP-Brasil fora do CA bundle do Node.js)

## Debug de Seletores Cheerio

Se retornar `0 notas encontradas`:

```javascript
// Em nfseScraperService.js, dentro de _continueExtraction():
require('fs').writeFileSync(`${os.homedir()}/Documents/debug_notas.html`, notasResp.data);
```
