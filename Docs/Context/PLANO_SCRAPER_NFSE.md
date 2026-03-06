# Plano: Implementacao do Scraper NFSe Real

## Status: AGUARDANDO MAPEAMENTO DE REDE (fazer no escritorio)

---

## PRE-REQUISITO CRITICO — Fazer no Escritorio

Antes de qualquer codigo, executar esse passo na maquina do escritorio (que tem acesso ao portal):

1. Abrir Chrome
2. Pressionar `F12` → aba **Network** → marcar **"Preserve log"**
3. Acessar: `https://www.nfse.gov.br/EmissorNacional/Login`
4. Clicar em **"Acesso com Certificado Digital"** e fazer login normalmente com o certificado instalado
5. Apos logar, no DevTools → clicar com botao direito em qualquer requisicao → **"Save all as HAR with content"**
6. Compartilhar o arquivo `.har` ou anotar:
   - Todas as URLs visitadas (redirects em sequencia)
   - Cookies que aparecem apos o login (`document.cookie` no console)
   - Headers de resposta da requisicao final

> **Por que isso e necessario:** O portal usa o SSO do gov.br com certificado digital.
> O fluxo tem multiplos redirects (possivelmente via `sso.acesso.gov.br`).
> Sem saber as URLs exatas, nao e possivel replicar o login em Node.js/Axios.

---

## Contexto do Projeto

### O que existe hoje (incompleto/mock)
- `nfseService.js` — chama diretamente `adn.nfse.gov.br/contribuintes/DFe/0` via mTLS, sem filtro de data/tipo
- `nfseScraperService.js` — template Axios+Cheerio com **HTML MOCK** — nunca bate no gov.br de verdade
- IPC de certificados com caminho **hardcoded** para `C:\Users\pedro.paiva\Documents\Certificados`
- Schema do banco inconsistente: migration cria `nfs_docs`, codigo usa `nfs`

### O que o sistema deve fazer (objetivo final)
1. Listar .pfx de `%USERPROFILE%\Documents\Certificados`
2. Validar o certificado (senha, validade, extrair CNPJ/nome)
3. Logar no portal `nfse.gov.br/EmissorNacional` com esse certificado via mTLS
4. Selecionar: empresa de destino, tipo (emitidas/recebidas), periodo (datas)
5. Baixar todos os XMLs das notas listadas no portal
6. Salvar XMLs em `notas_processadas\{cnpj}\{tipo}\`
7. Persistir metadados no Supabase (tabela `nfs`)
8. Exibir as notas na pagina "Notas Fiscais" do app

---

## Fluxo Arquitetural

```
[BuscarNota.jsx]
       |
       |-- 1. IPC getLocalCertificates() --> lista .pfx de %USERPROFILE%\Documents\Certificados
       |-- 2. Usuario seleciona: empresa, cert, senha, tipo, periodo
       |
       v
[POST /scraper/validate-cert]   <-- NOVO ENDPOINT
       |  node-forge: valida pfx+senha, extrai CN/CNPJ/validade
       |  Frontend exibe: "Cert valido - EMPRESA (CNPJ) - vence DD/MM/YYYY"
       v
[POST /scraper/fetch-gov]       <-- ENDPOINT EXISTENTE (refatorar)
       |
       v
[nfseScraperService.js]         <-- REFATORAR COM FLUXO REAL
       |
       |-- PASSO 1: Carregar .pfx de os.homedir()\Documents\Certificados\{filename}
       |-- PASSO 2: https.Agent({ pfx: Buffer, passphrase })
       |-- PASSO 3: axios + CookieJar (axios-cookiejar-support dinamico)
       |-- PASSO 4: LOGIN PORTAL (URLs mapeadas do SSO gov.br)
       |-- PASSO 5: GET /EmissorNacional/Nota/{EmitidaIndex|RecebidaIndex}?dataInicio=...&dataFim=...
       |-- PASSO 6: Parse HTML com Cheerio (template ja existe)
       |-- PASSO 7: Download XML em lote (delay 300ms entre downloads)
       |-- PASSO 8: Salvar local + upsert Supabase tabela `nfs`
```

---

## Sprint 1 — Fundacao (pode fazer AGORA, sem mapeamento)

### 1. Instalar node-forge no server
```bash
cd server
npm install node-forge
```

### 2. Criar certificateService.js
`server/src/services/certificateService.js`
```javascript
'use strict';
const forge = require('node-forge');
const fs = require('fs');
const path = require('path');
const os = require('os');

function getCertDir() {
    return path.join(os.homedir(), 'Documents', 'Certificados');
}

function validateCertificate(filename, password) {
    const pfxPath = path.join(getCertDir(), filename);
    const pfxBuffer = fs.readFileSync(pfxPath);
    const p12Asn1 = forge.asn1.fromDer(pfxBuffer.toString('binary'));
    // Lanca excecao se senha errada
    const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, password);

    // Extrair certificado
    const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
    const certBag = certBags[forge.pki.oids.certBag]?.[0];
    if (!certBag) throw new Error('Certificado nao encontrado no .pfx');

    const cert = certBag.cert;
    const subject = cert.subject.attributes;
    const cn = subject.find(a => a.shortName === 'CN')?.value || '';
    // CNPJ geralmente esta no CN ou em extensao OID 2.16.76.1.3.3
    const cnpjMatch = cn.match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}|\d{14}/);
    const cnpj = cnpjMatch ? cnpjMatch[0] : null;
    const notBefore = cert.validity.notBefore;
    const notAfter = cert.validity.notAfter;
    const now = new Date();

    if (now < notBefore) throw new Error('Certificado ainda nao e valido');
    if (now > notAfter) throw new Error('Certificado expirado em ' + notAfter.toLocaleDateString('pt-BR'));

    return { valid: true, cn, cnpj, notBefore, notAfter };
}

module.exports = { validateCertificate, getCertDir };
```

### 3. Adicionar rota POST /scraper/validate-cert
`server/src/routes/scraper.js` — adicionar:
```javascript
router.post('/validate-cert', async (req, res) => {
    const { certificateFilename, password } = req.body;
    try {
        const result = require('../services/certificateService').validateCertificate(certificateFilename, password);
        res.json({ success: true, ...result });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});
```

### 4. Fix IPC cert path (main.cjs)
`web/electron/main.cjs` — no handler `get-local-certificates`:
```javascript
const os = require('os');
// Trocar o caminho hardcoded por:
const certDir = path.join(os.homedir(), 'Documents', 'Certificados');
```

### 5. BuscarNota.jsx — Adicionar step de validacao visual
Antes do submit: chamar `POST /scraper/validate-cert` e exibir:
"Certificado valido — EMPRESA X (99.999.999/0001-99) — vence em DD/MM/YYYY"

### 6. Migration fix tabela nfs
`server/supabase/migrations/01_fix_nfs_table.sql`:
```sql
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'nfs_docs')
     AND NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'nfs') THEN
    ALTER TABLE public.nfs_docs RENAME TO nfs;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.nfs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade not null,
  access_key text not null,
  issue_date timestamp with time zone,
  amount numeric(15, 2),
  xml_url text,
  status text default 'processed',
  created_at timestamp with time zone default now(),
  unique(company_id, access_key)
);
ALTER TABLE IF EXISTS public.nfs ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Allow all nfs" ON public.nfs FOR ALL USING (true);
```

---

## Sprint 2 — Login Real (fazer APOS mapear o fluxo no escritorio)

Com o HAR / URLs mapeadas em maos, implementar em `nfseScraperService.js`:

```javascript
// Substituir o bloco do FLUXO SSO GOV.BR pelo fluxo real mapeado
// Exemplo (URLs hipoteticas — substituir pelas reais do HAR):
const loginResponse = await apiClient.get('https://www.nfse.gov.br/EmissorNacional/Login');
// ... seguir redirects ... SSO autentica via mTLS automaticamente ...
// Verificar se chegou na pagina autenticada (checar URL final ou elemento HTML esperado)
```

---

## Sprint 3 — Scraping Real (apos login funcionando)

Substituir o `htmlStringMock` por:
```javascript
const response = await apiClient.get(
    `https://www.nfse.gov.br/EmissorNacional/Nota/${type === 'emitidas' ? 'EmitidaIndex' : 'RecebidaIndex'}`,
    { params: { dataInicio: startDate, dataFim: endDate } }
);
const htmlReal = response.data; // <-- HTML real do portal
const objExtraido = await this.extrairDadosNotasRecebidas(htmlReal);
```

---

## Arquivos Principais

| Arquivo | Acao |
|---|---|
| `server/src/services/certificateService.js` | CRIAR (Sprint 1) |
| `server/src/routes/scraper.js` | MODIFICAR - add /validate-cert (Sprint 1) |
| `web/electron/main.cjs` | MODIFICAR - cert path dinamico (Sprint 1) |
| `web/src/pages/BuscarNota.jsx` | MODIFICAR - validacao visual (Sprint 1) |
| `server/supabase/migrations/01_fix_nfs_table.sql` | CRIAR (Sprint 1) |
| `server/src/services/nfseScraperService.js` | MODIFICAR - login + scraping reais (Sprint 2+3) |

---

## Verificacao Final

1. `POST /scraper/validate-cert` com .pfx real → retorna CN/CNPJ/validade
2. IPC lista certs de `%USERPROFILE%\Documents\Certificados`
3. Login SSO real → log "Sessao capturada com sucesso"
4. `POST /scraper/fetch-gov` → "X notas mapeadas, X XMLs baixados"
5. XMLs salvos em `notas_processadas\{cnpj}\{tipo}\`
6. Notas visiveis em `GET /companies/all-nfs` e na pagina "Notas Fiscais"
