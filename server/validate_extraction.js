const axios = require('axios');
const https = require('https');
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const crypto = require('crypto');
const { HttpsCookieAgent } = require('http-cookie-agent/http');
const { CookieJar } = require('tough-cookie');

const pfxPath = 'C:\\Users\\pedro.paiva\\Documents\\Certificados\\M B CONTABILIDADE_senha 21601471_venc 14-07-26.pfx';
const password = '21601471';
const baseUrl = 'https://www.nfse.gov.br/EmissorNacional';

async function validateFullExtraction() {
    console.log('--- VALIDATION: FULL EXTRACTION TEST (HTTP-COOKIE-AGENT) ---');

    const jar = new CookieJar();
    const pfxBuffer = fs.readFileSync(pfxPath);

    // Using HttpsCookieAgent to handle both cookies and mTLS
    const httpsAgent = new HttpsCookieAgent({
        pfx: pfxBuffer,
        passphrase: password,
        rejectUnauthorized: false,
        maxVersion: 'TLSv1.2',
        secureOptions: crypto.constants.SSL_OP_LEGACY_SERVER_CONNECT,
        cookies: { jar }
    });

    const client = axios.create({
        httpsAgent,
        maxRedirects: 10,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'pt-BR,pt;q=0.9'
        }
    });

    try {
        console.log('[1/4] Authenticating at /Certificado...');
        const authResp = await client.get(`${baseUrl}/Certificado`, {
            headers: { 'Referer': `${baseUrl}/Login?ReturnUrl=%2fEmissorNacional` }
        });

        const finalUrl = authResp.request?.res?.responseUrl || authResp.config?.url;
        console.log('Final URL:', finalUrl);

        if (!finalUrl.toLowerCase().endsWith('/dashboard')) {
            throw new Error(`Failed to reach Dashboard. Final URL: ${finalUrl}`);
        }
        console.log('SUCCESS: Dashboard reached.');

        const dashHtml = authResp.data;
        const urlRestMatch = dashHtml.match(/window\.UrlRest\s*=\s*["']([^"']+)["']/);
        const tokenMatch = dashHtml.match(/window\.sessionStorage\.setItem\(\s*["']accessToken["']\s*,\s*["']([^"']+)["']\s*\)/);
        const accessToken = tokenMatch?.[1];

        if (!accessToken) {
            throw new Error('JWT Token not found in Dashboard HTML.');
        }
        console.log('[2/4] Token extracted.');

        const today = new Date();
        const lastMonth = new Date();
        lastMonth.setMonth(today.getMonth() - 1);
        const fmt = (d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

        const dataInicio = fmt(lastMonth);
        const dataFim = fmt(today);

        console.log(`[3/4] Fetching notes from ${dataInicio} to ${dataFim}...`);
        const notasUrl = `${baseUrl}/Notas/Recebidas`;
        const notasResp = await client.get(notasUrl, {
            params: { dataInicio, dataFim },
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Referer': `${baseUrl}/Dashboard`
            }
        });

        console.log('[4/4] Parsing notes...');
        const $ = cheerio.load(notasResp.data);
        const notes = [];
        $('table.table-striped tbody tr').each((i, el) => {
            const tr = $(el);
            const chave = (tr.attr('data-chave') || '').trim();
            if (chave) notes.push({ chave });
        });

        console.log(`TOTAL NOTES FOUND: ${notes.length}`);
        if (notes.length > 0) {
            console.log('First note key:', notes[0].chave);
            console.log('--- VALIDATION SUCCESSFUL ---');
        } else {
            console.log('No notes found, but handshake and token worked.');
        }

    } catch (e) {
        console.error('VERIFICATION FAILED:', e.message);
        if (e.response) {
            console.error('Status:', e.response.status);
            fs.writeFileSync('C:\\tmp\\debug_final_error.html', e.response.data);
        }
    }
}

validateFullExtraction();
