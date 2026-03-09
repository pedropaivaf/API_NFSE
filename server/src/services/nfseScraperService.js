const axios = require('axios');
const https = require('https');
const crypto = require('crypto');
const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const os = require('os');
const cheerio = require('cheerio');
const forge = require('node-forge');
const { HttpsCookieAgent } = require('http-cookie-agent/http');
const { CookieJar } = require('tough-cookie');
const supabase = require('../config/supabaseClient');

/**
 * SERVIÇO DE EXTRAÇÃO mTLS REAL — Portal NFSe Nacional (nfse.gov.br)
 *
 * Fluxo confirmado via HAR (06/03/2026) + debug (09/03/2026):
 * 1. GET /EmissorNacional/Certificado (mTLS) → 302 → /Dashboard
 * 2. GET /EmissorNacional/Dashboard → HTML com window.accessToken (JWT) + window.UrlRest (SERPRO)
 * 3. GET /EmissorNacional/Notas/Recebidas ou /Notas/Emitidas com Authorization: Bearer {token}
 *    → Resposta pode ser HTML (Cheerio) ou JSON (REST API SERPRO)
 */

const BASE_URL = 'https://www.nfse.gov.br/EmissorNacional';

class NfseScraperService {

    async runExtractionJob(config) {
        const { companyId, certificateFilename, password, type, period, format, startDate, endDate } = config;

        try {
            console.log(`[RPA] Iniciando Extração - EmpresaID: ${companyId} - Tipo: ${type}`);

            // 1. Carregar certificado do disco
            const certDir = process.env.LOCAL_CERT_PATH || path.join(os.homedir(), 'Documents', 'Certificados');
            const fullPath = path.join(certDir, certificateFilename);
            if (!fs.existsSync(fullPath)) {
                throw new Error(`Certificado não encontrado: ${fullPath}`);
            }
            const certBuffer = fs.readFileSync(fullPath);

            // 2. Configurar Cookie Jar e mTLS Agent
            // Usamos HttpsCookieAgent para garantir que cookies de afinidade (ARR) sejam mantidos durante os redirects
            const jar = new CookieJar();
            const httpsAgent = new HttpsCookieAgent({
                pfx: certBuffer,
                passphrase: password,
                rejectUnauthorized: false, // portal gov.br usa ICP-Brasil — fora do bundle CA do Node.js
                maxVersion: 'TLSv1.2',    // força TLS 1.2 para garantir CertificateRequest no handshake IIS
                secureOptions: crypto.constants.SSL_OP_LEGACY_SERVER_CONNECT, // melhor compatibilidade IIS
                cookies: { jar }
            });

            // 3. Cliente Axios com Cookie Support
            const apiClient = axios.create({
                httpsAgent,
                timeout: 30000,
                maxRedirects: 10,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'pt-BR,pt;q=0.9',
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache',
                },
            });

            // 4. Autenticação mTLS: GET /Certificado → 302 → Dashboard
            console.log('[RPA] Autenticando via mTLS em /Certificado...');
            const authResp = await apiClient.get(`${BASE_URL}/Certificado`, {
                headers: { 'Referer': `${BASE_URL}/Login?ReturnUrl=%2fEmissorNacional` },
            });

            const finalUrl = authResp.request?.res?.responseUrl || authResp.config?.url || '';
            console.log('[RPA] URL final após auth:', finalUrl);

            // Verificar que chegamos no Dashboard — a pathname deve terminar com /Dashboard
            // NÃO usar includes('dashboard') pois a login page tem ReturnUrl=.../Dashboard na query string
            let finalPathname = '';
            try { finalPathname = new URL(finalUrl).pathname.toLowerCase(); } catch (_) { finalPathname = finalUrl.toLowerCase(); }

            if (!finalPathname.endsWith('/dashboard')) {
                const debugLoginPath = path.join(os.homedir(), 'Documents', 'debug_auth_redirect.html');
                fs.writeFileSync(debugLoginPath, String(authResp.data || ''));
                throw new Error(`Autenticação mTLS falhou — servidor retornou página de login em vez do Dashboard. Verifique debug_auth_redirect.html em Documents. URL: ${finalUrl}`);
            }
            console.log('[RPA] Autenticado com sucesso. URL:', finalUrl);

            // 5. Extrair accessToken e UrlRest do HTML do Dashboard
            // O Dashboard injeta: window.sessionStorage.setItem("accessToken", '...') e window.UrlRest = "..."
            const dashHtml = authResp.data || '';
            const urlRestMatch = dashHtml.match(/window\.UrlRest\s*=\s*["']([^"']+)["']/);
            const tokenMatch = dashHtml.match(/window\.sessionStorage\.setItem\(\s*["']accessToken["']\s*,\s*["']([^"']+)["']\s*\)/);
            const urlRest = urlRestMatch?.[1] || null;
            const accessToken = tokenMatch?.[1] || null;

            console.log('[RPA] UrlRest:', urlRest || 'NÃO ENCONTRADO');
            console.log('[RPA] AccessToken:', accessToken ? accessToken.substring(0, 50) + '...' : 'NÃO ENCONTRADO');

            if (!accessToken) {
                const debugPath = path.join(os.homedir(), 'Documents', 'debug_dashboard.html');
                fs.writeFileSync(debugPath, dashHtml);
                throw new Error(`Token JWT não encontrado no Dashboard. Dashboard salvo em: ${debugPath}`);
            }

            // 5. Calcular período de datas
            const { dataInicio, dataFim } = this._calcularPeriodo(period, startDate, endDate);
            console.log(`[RPA] Período: ${dataInicio} → ${dataFim}`);

            // 6. Buscar notas — URL correta: /Notas/Recebidas ou /Notas/Emitidas (plural, sem "Index")
            const notasTipo = type === 'emitidas' ? 'Emitidas' : 'Recebidas';
            const notasUrl = `${BASE_URL}/Notas/${notasTipo}`;
            console.log(`[RPA] Consultando: ${notasUrl}`);

            const notasResp = await apiClient.get(notasUrl, {
                params: { dataInicio, dataFim },
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Referer': `${BASE_URL}/Dashboard`,
                },
            });

            const contentType = notasResp.headers?.['content-type'] || '';
            console.log('[RPA] Resposta recebida. Content-Type:', contentType, '| Tamanho:', String(notasResp.data || '').length, 'chars');

            // Salvar resposta para diagnóstico (remover quando seletores confirmados)
            const debugNotasPath = path.join(os.homedir(), 'Documents', 'debug_notas_response.json');
            fs.writeFileSync(debugNotasPath, JSON.stringify({
                status: notasResp.status,
                contentType,
                data: notasResp.data,
            }, null, 2));
            console.log('[RPA] Resposta de notas salva em:', debugNotasPath);

            // 7. Parse da resposta — JSON (REST API SERPRO) ou HTML (Cheerio)
            let objExtraido;
            if (contentType.includes('json')) {
                objExtraido = this.extrairDadosNotasJson(notasResp.data);
            } else {
                objExtraido = await this.extrairDadosNotasHtml(notasResp.data);
            }
            console.log(`[RPA] ${objExtraido.notas.length} notas encontradas.`);

            if (objExtraido.notas.length === 0) {
                console.warn('[RPA] Nenhuma nota encontrada. Verifique debug_notas_response.json em Documents.');
            }

            // 8. Persistência no Supabase
            // 8. Salvar no Banco (Supabase)
            let savedCount = 0;
            console.log(`[RPA-DB] Tentando salvar ${objExtraido.notas.length} notas...`);

            for (const nota of objExtraido.notas) {
                // Parsing de Valor: Remove pontos de milhar e substitui vírgula por ponto
                const valorStr = String(nota.valorServico || '0').trim();
                const valorLimpo = parseFloat(valorStr.replace(/\./g, '').replace(',', '.'));

                // Parsing de Data: Formato esperado "DD/MM/YYYY HH:MM" ou similar
                const dataStr = String(nota.dataGeracao || '').trim();
                let isoDate = null;

                if (dataStr) {
                    const [datePart, timePart] = dataStr.split(/\s+/);
                    const parts = (datePart || '').split('/');
                    if (parts.length === 3) {
                        isoDate = `${parts[2]}-${parts[1]}-${parts[0]}T${timePart || '00:00'}:00Z`;
                    }
                }

                if (!isoDate) {
                    isoDate = new Date().toISOString();
                }

                // UPSERT: CRITICAL - onConflict deve ser 'col1,col2' SEM ESPAÇO para o PostgREST
                const { error: upsertError } = await supabase
                    .from('nfs')
                    .upsert({
                        company_id: companyId,
                        access_key: nota.chaveTabela,
                        issue_date: isoDate,
                        amount: isNaN(valorLimpo) ? 0 : valorLimpo,
                        status: 'processed',
                        xml_url: `local_extract/${type}/${nota.chaveTabela}.xml`,
                    }, { onConflict: 'company_id,access_key' });

                if (upsertError) {
                    console.error(`[RPA-DB] Erro ao salvar ${nota.chaveTabela}:`, upsertError.message, upsertError.details || '');
                } else {
                    savedCount++;
                }
            }

            // 9. Downloads para disco
            const pastaDestino = path.join(os.homedir(), 'Documents', 'notas_processadas', type);
            await this.processarDownloadsNotas(apiClient, objExtraido.notas, pastaDestino, (format || 'xml').toLowerCase(), accessToken);

            return {
                success: true,
                message: `Extração concluída com sucesso.`,
                count: savedCount,
                details: `${objExtraido.notas.length} notas processadas. ${savedCount} persistidas no banco.`,
            };

        } catch (error) {
            console.error('[RPA-ERROR]', error.message);
            if (error.code === 'ERR_OSSL_PKCS12_MAC_VERIFY_FAILURE') {
                throw new Error('Senha do certificado A1 incorreta ou arquivo corrompido.');
            }
            if (error.response) {
                const debugPath = path.join(os.homedir(), 'Documents', 'debug_gov_response.html');
                fs.writeFileSync(debugPath, String(error.response.data || ''));
                console.error('[RPA-DEBUG] Resposta do governo salva em:', debugPath);
                if (error.response.status === 401 || error.response.status === 403) {
                    throw new Error('Gov.br negou acesso. Certificado pode estar revogado ou vencido.');
                }
                throw new Error(`Portal gov.br retornou status ${error.response.status}. Veja Documents/debug_gov_response.html para detalhes.`);
            }
            throw error;
        }
    }

    // Parse de resposta JSON da REST API SERPRO
    extrairDadosNotasJson(data) {
        const lista = Array.isArray(data) ? data : (data?.notas || data?.items || data?.result || data?.data || []);
        const notas = lista.map(item => ({
            chaveTabela: item.chaveAcesso || item.id || item.numeroNota || String(item.numero || ''),
            dataGeracao: item.dataEmissao || item.dataGeracao || item.dtEmissao || '',
            cnpjEmitente: item.cnpjPrestador || item.cnpjEmitente || '',
            nomeEmitente: item.nomePrestador || item.nomeEmitente || item.razaoSocial || '',
            competencia: item.competencia || item.mesCompetencia || '',
            valorServico: String(item.valorServico || item.valor || item.vlrServico || 0),
            linkDownloadXml: item.linkXml || item.urlXml || '',
            linkDownloadPdf: item.linkPdf || item.urlPdf || '',
        }));
        console.log('[RPA-JSON] Campos mapeados do primeiro item:', lista[0] ? Object.keys(lista[0]) : 'lista vazia');
        return { sessao: { token: null, urlRest: null }, notas };
    }

    // Parse de resposta HTML com Cheerio
    async extrairDadosNotasHtml(htmlString) {
        try {
            const $ = cheerio.load(htmlString);
            const notas = [];

            $('table.table-striped tbody tr').each((i, el) => {
                const tr = $(el);
                const chaveTabela = (tr.attr('data-chave') || '').trim();
                if (!chaveTabela) return;

                notas.push({
                    chaveTabela,
                    dataGeracao: tr.find('td.td-datahora').text().replace(/\s+/g, ' ').trim(),
                    cnpjEmitente: tr.find('td.td-texto-grande span.cnpj').text().trim(),
                    nomeEmitente: tr.find('td.td-texto-grande div').text().trim().split('-').slice(1).join('-').trim(),
                    competencia: tr.find('td.td-competencia').text().trim(),
                    valorServico: tr.find('td.td-valor').text().trim(),
                    linkVisualizar: tr.find("a:has(img[src*='op-visualizar.svg'])").attr('href') || '',
                    linkDownloadXml: tr.find("a:has(img[src*='op-xml.svg'])").attr('href') || '',
                    linkDownloadPdf: tr.find("a:has(img[src*='op-pdf.svg'])").attr('href') || '',
                });
            });

            return { sessao: { token: null, urlRest: null }, notas };
        } catch (error) {
            console.error('[RPA-PARSE] Erro no parse HTML:', error.message);
            throw error;
        }
    }

    // Mantido para compatibilidade retroativa
    async extrairDadosNotasRecebidas(htmlString) {
        return this.extrairDadosNotasHtml(htmlString);
    }

    _calcularPeriodo(period, startDate, endDate) {
        const now = new Date();
        const fmt = (d) =>
            `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

        if (period === 'custom' && startDate && endDate) {
            const [sy, sm, sd] = startDate.split('-');
            const [ey, em, ed] = endDate.split('-');
            return { dataInicio: `${sd}/${sm}/${sy}`, dataFim: `${ed}/${em}/${ey}` };
        }

        if (period === 'retroativo') {
            const inicio = new Date(now.getFullYear(), now.getMonth() - 3, 1);
            return { dataInicio: fmt(inicio), dataFim: fmt(now) };
        }

        if (period === 'ano') {
            const inicio = new Date(now.getFullYear(), 0, 1);
            return { dataInicio: fmt(inicio), dataFim: fmt(now) };
        }

        if (period === 'anterior') {
            const inicio = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const fim = new Date(now.getFullYear(), now.getMonth(), 0);
            return { dataInicio: fmt(inicio), dataFim: fmt(fim) };
        }

        // 'atual' — mês corrente
        const inicio = new Date(now.getFullYear(), now.getMonth(), 1);
        return { dataInicio: fmt(inicio), dataFim: fmt(now) };
    }

    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async descarregarFicheiroNfs(apiClient, urlRelativa, caminhoDestino, accessToken) {
        try {
            const urlAbsoluta = urlRelativa.startsWith('http')
                ? urlRelativa
                : `https://www.nfse.gov.br${urlRelativa}`;

            const headers = accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {};
            const response = await apiClient.get(urlAbsoluta, {
                responseType: 'arraybuffer',
                headers,
            });
            await fsPromises.writeFile(caminhoDestino, response.data);
            return true;
        } catch (error) {
            console.error(`[RPA-DOWNLOAD] Erro ao baixar ${urlRelativa}:`, error.message);
            return false;
        }
    }

    async processarDownloadsNotas(apiClient, notasExtraidas, pastaDestino, formatoDesejado = 'xml', accessToken = null) {
        try {
            await fsPromises.mkdir(pastaDestino, { recursive: true });

            let sucessoCount = 0;
            let falhaCount = 0;

            for (const nota of notasExtraidas) {
                if (formatoDesejado === 'xml' && nota.linkDownloadXml) {
                    const caminho = path.join(pastaDestino, `${nota.chaveTabela}.xml`);
                    const ok = await this.descarregarFicheiroNfs(apiClient, nota.linkDownloadXml, caminho, accessToken);
                    if (ok) sucessoCount++; else falhaCount++;
                } else if (formatoDesejado === 'pdf' && nota.linkDownloadPdf) {
                    const caminho = path.join(pastaDestino, `${nota.chaveTabela}.pdf`);
                    const ok = await this.descarregarFicheiroNfs(apiClient, nota.linkDownloadPdf, caminho, accessToken);
                    if (ok) sucessoCount++; else falhaCount++;
                }
                await this._delay(300);
            }

            console.log(`[RPA-BATCH] Downloads: ${sucessoCount} ok, ${falhaCount} falhas`);
            return { sucessoCount, falhaCount };

        } catch (error) {
            console.error('[RPA-BATCH] Erro no lote de downloads:', error.message);
            throw error;
        }
    }
}

module.exports = new NfseScraperService();
