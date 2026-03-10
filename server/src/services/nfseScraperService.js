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
const { log } = require('../utils/logger');

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

    async validateLogin(config) {
        const { method = 'pfx', certificateFilename, password, loginCnpj, loginPassword } = config;
        const settings = await this._getSettings();
        const jar = new CookieJar();
        let apiClient;

        if (method === 'pfx') {
            apiClient = await this._createMtlsClient(certificateFilename, password, settings.certificates_path, jar);
            console.log('[RPA-VAL] Validando via A1...');
            const authResp = await apiClient.get(`${BASE_URL}/Certificado`, {
                headers: { 'Referer': `${BASE_URL}/Login` },
            });
            await this._verifyAuthSuccess(authResp);
            const authData = this._extractAuthData(authResp.data);

            // Extrair CN do certificado para identificar a empresa
            const fullPath = path.join(settings.certificates_path || path.join(os.homedir(), 'Documents', 'Certificados'), certificateFilename);
            const pfxBuffer = fs.readFileSync(fullPath);
            const p12Asn1 = forge.asn1.fromDer(pfxBuffer.toString('binary'));
            const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);
            const bags = p12.getBags({ bagType: forge.pki.oids.certBag });
            const cert = bags[forge.pki.oids.certBag][0].cert;
            const subject = cert.subject.attributes.reduce((acc, attr) => {
                acc[attr.shortName || attr.name] = attr.value;
                return acc;
            }, {});

            return {
                valid: true,
                cn: subject.CN || 'Empresa Identificada',
                cnpj: subject.CN?.match(/\d{14}/)?.[0] || null,
                notAfter: cert.validity.notAfter
            };

        } else {
            apiClient = this._createStandardClient(jar);
            console.log('[RPA-VAL] Validando via Senha...');
            const authResp = await this._performPasswordLogin(apiClient, loginCnpj, loginPassword);
            await this._verifyAuthSuccess(authResp);

            // No Caso de senha, o Dashboard HTML pode não ter o CNPJ explicitamente fácil.
            // Mas vamos tentar extrair o que der ou retornar sucesso genérico.
            const { accessToken } = this._extractAuthData(authResp.data);

            return {
                valid: true,
                cn: loginCnpj,
                cnpj: loginCnpj.replace(/\D/g, ''),
                notAfter: null
            };
        }
    }

    async runExtractionJob(config, outputDirBase = null) {
        log(`[RPA] Iniciando trabalho para: ${config.companyId} | Método: ${config.method || 'pfx'}`);

        const { method = 'pfx', certificateFilename, password, loginCnpj, loginPassword } = config;
        const settings = await this._getSettings();
        const jar = new CookieJar();
        let apiClient;

        try {
            if (method === 'pfx') {
                apiClient = await this._createMtlsClient(certificateFilename, password, settings.certificates_path, jar);
                const authResp = await apiClient.get(`${BASE_URL}/Certificado`, {
                    headers: { 'Referer': `${BASE_URL}/Login` },
                });
                await this._verifyAuthSuccess(authResp);
                const authData = this._extractAuthData(authResp.data);
                return await this._continueExtraction(apiClient, authData, config, outputDirBase);
            } else {
                apiClient = this._createStandardClient(jar);
                const authResp = await this._performPasswordLogin(apiClient, loginCnpj, loginPassword);
                await this._verifyAuthSuccess(authResp);
                const authData = this._extractAuthData(authResp.data);
                return await this._continueExtraction(apiClient, authData, config, outputDirBase);
            }
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
                    throw new Error('Gov.br negou acesso. Verifique suas credenciais.');
                }
                throw new Error(`Portal gov.br retornou status ${error.response.status}. Veja Documents/debug_gov_response.html para detalhes.`);
            }
            throw error;
        }
    }

    async _getSettings() {
        const { data: dbSettings } = await supabase.from('app_settings').select('*');
        return (dbSettings || []).reduce((acc, curr) => {
            acc[curr.key] = curr.value;
            return acc;
        }, {});
    }

    async _createMtlsClient(certificateFilename, password, certDir, jar) {
        const fullPath = path.join(certDir || path.join(os.homedir(), 'Documents', 'Certificados'), certificateFilename);
        if (!fs.existsSync(fullPath)) {
            throw new Error(`Certificado não encontrado: ${fullPath}`);
        }

        const pfxBuffer = fs.readFileSync(fullPath);
        const httpsAgent = new HttpsCookieAgent({
            pfx: pfxBuffer,
            passphrase: password,
            rejectUnauthorized: false, // O portal as vezes tem problemas de cadeia
            cookies: { jar }
        });

        return axios.create({
            httpsAgent,
            timeout: 30000,
            maxRedirects: 10,
            headers: this._getCommonHeaders(),
        });
    }

    _createStandardClient(jar) {
        const httpsAgent = new HttpsCookieAgent({
            rejectUnauthorized: false,
            cookies: { jar }
        });

        return axios.create({
            httpsAgent,
            timeout: 30000,
            maxRedirects: 10,
            headers: this._getCommonHeaders(),
        });
    }

    _formatCpfCnpj(val) {
        const clean = (val || '').replace(/\D/g, '');
        if (clean.length === 11) {
            return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
        } else if (clean.length === 14) {
            return clean.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
        }
        return val;
    }

    _getCommonHeaders() {
        return {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'sec-ch-ua': '"Not:A-Brand";v="99", "Google Chrome";v="145", "Chromium";v="145"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'sec-fetch-dest': 'document',
            'sec-fetch-mode': 'navigate',
            'sec-fetch-site': 'same-origin',
            'sec-fetch-user': '?1',
            'upgrade-insecure-requests': '1',
        };
    }

    async _performPasswordLogin(apiClient, login, password) {
        const loginPage = await apiClient.get(`${BASE_URL}/Login`);
        const $ = cheerio.load(loginPage.data);
        const rvToken = $('input[name="__RequestVerificationToken"]').val();

        if (!rvToken) {
            console.warn('[RPA-LOGIN] CSRF Token não encontrado na página de login.');
        }

        const loginClean = (login || '').trim();
        const formattedLogin = this._formatCpfCnpj(loginClean);
        const params = new URLSearchParams();
        // Ordem exata do formulário no navegador: Token -> Inscricao -> Senha -> ReturnUrl
        if (rvToken) params.append('__RequestVerificationToken', rvToken);
        params.append('Inscricao', formattedLogin);
        params.append('Senha', (password || '').trim());
        params.append('ReturnUrl', '/EmissorNacional');

        // Log de Cookies para diagnóstico
        try {
            const cookies = await apiClient.defaults.httpsAgent.cookies.jar.getCookieString(BASE_URL);
            fs.writeFileSync(path.join(os.homedir(), 'Documents', 'debug_cookies.txt'), cookies || 'Sem cookies');
        } catch (e) { console.error('[DEBUG-COOKIES] Erro:', e.message); }

        return apiClient.post(`${BASE_URL}/Login?ReturnUrl=%2fEmissorNacional`, params.toString(), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Referer': `${BASE_URL}/Login?ReturnUrl=%2fEmissorNacional`,
                'Origin': 'https://www.nfse.gov.br',
            }
        });
    }

    async _verifyAuthSuccess(authResp) {
        const finalUrl = authResp.request?.res?.responseUrl || authResp.config?.url || '';
        let finalPathname = '';
        try { finalPathname = new URL(finalUrl).pathname.toLowerCase(); } catch (_) { finalPathname = finalUrl.toLowerCase(); }

        const isDashboardOrRoot = finalPathname.endsWith('/dashboard') || 
                                   finalPathname.endsWith('/emissornacional') || 
                                   finalPathname.endsWith('/emissornacional/');

        const hasAuthMarkers = typeof authResp.data === 'string' && 
                               (authResp.data.includes('window.UrlRest') || authResp.data.includes('accessToken'));

        if (!isDashboardOrRoot && !hasAuthMarkers) {
            const debugLoginPath = path.join(os.homedir(), 'Documents', 'debug_auth_redirect.html');
            fs.writeFileSync(debugLoginPath, String(authResp.data || ''));
            throw new Error(`Autenticação falhou — verifique se usuário/senha estão corretos. Detalhes em Documents/debug_auth_redirect.html.`);
        }
        console.log('[RPA] Autenticado com sucesso.');
        return true;
    }

    _extractAuthData(dashHtml) {
        const urlRestMatch = dashHtml.match(/window\.UrlRest\s*=\s*["']([^"']+)["']/);
        const tokenMatch = dashHtml.match(/window\.sessionStorage\.setItem\(\s*["']accessToken["']\s*,\s*["']([^"']+)["']\s*\)/);
        const urlRest = urlRestMatch?.[1] || null;
        const accessToken = tokenMatch?.[1] || null;

        if (!accessToken) {
            const debugPath = path.join(os.homedir(), 'Documents', 'debug_dashboard.html');
            fs.writeFileSync(debugPath, dashHtml);
            throw new Error(`Token JWT não encontrado no Dashboard. Detalhes em Documents/debug_dashboard.html`);
        }

        return { urlRest, accessToken };
    }

    async _continueExtraction(apiClient, authData, config, outputDirBase) {
        const { accessToken } = authData;
        const { companyId, type, period, format, startDate, endDate } = config;
        const outputDir = outputDirBase || path.join(os.homedir(), 'Documents', 'notas_processadas');

        try {
            // 5. Calcular período de datas
            const requestedPeriod = this._calcularPeriodo(period, startDate, endDate);
            
            // 6. Dividir em chunks de 30 dias se necessário (limite do portal)
            const chunks = this._splitPeriodIntoChunks(requestedPeriod.dataInicio, requestedPeriod.dataFim);
            log(`[RPA] Iniciando extração de ${chunks.length} períodos para cobrir o intervalo solicitado.`);

            let totalSaved = 0;
            let totalFound = 0;

            for (const chunk of chunks) {
                log(`[RPA] Processando intervalo: ${chunk.dataInicio} → ${chunk.dataFim}`);
                
                const notasTipo = type === 'emitidas' ? 'Emitidas' : 'Recebidas';
                const notasUrl = `${BASE_URL}/Notas/${notasTipo}`;

                const params = {
                    datainicio: chunk.dataInicio,
                    datafim: chunk.dataFim,
                    busca: '',
                    executar: '1'
                };

                const notasResp = await apiClient.get(notasUrl, {
                    params,
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Referer': `${BASE_URL}/Dashboard`,
                    },
                });

                const contentType = notasResp.headers?.['content-type'] || '';
                let objExtraido;
                if (contentType.includes('json')) {
                    objExtraido = this.extrairDadosNotasJson(notasResp.data);
                } else {
                    const htmlData = String(notasResp.data || '');
                    
                    // O portal tem um texto estático de ajuda: "O período informado não deve ser superior a 30 dias."
                    // O ERRO real é: "O período entre a data inicial e a data final não pode ser superior a 30 dias."
                    // Verificamos também a classe de validação do ASP.NET MVC.
                    const isErrorMsg = htmlData.includes('não pode ser superior a 30 dias') || 
                                     htmlData.includes('input-validation-error') ||
                                     htmlData.includes('field-validation-error');

                    if (isErrorMsg) {
                        log(`[RPA-LIMIT] O portal recusou o período ${chunk.dataInicio}-${chunk.dataFim}. Verifique as datas.`, 'warn');
                        await this._delay(1000);
                        continue;
                    }
                    objExtraido = await this.extrairDadosNotasHtml(htmlData);
                }

                totalFound += objExtraido.notas.length;
                log(`[RPA] ${objExtraido.notas.length} notas no intervalo atual.`);

                // 8. Salvar no Banco (Supabase) com Prevenção de Duplicatas e Competência
                for (const nota of objExtraido.notas) {
                    try {
                        if (nota.chaveTabela) {
                            const { data: existing } = await supabase
                                .from('nfs')
                                .select('access_key')
                                .eq('company_id', companyId)
                                .eq('access_key', nota.chaveTabela)
                                .maybeSingle();

                            if (existing) continue;
                        }

                        const valorStr = String(nota.valorServico || '0').trim();
                        const valorLimpo = parseFloat(valorStr.replace(/R\$\s*/g, '').replace(/\./g, '').replace(',', '.'));

                        const dataStr = String(nota.dataGeracao || '').trim();
                        let isoDate = null;
                        if (dataStr) {
                            const [datePart, timePart] = dataStr.split(/\s+/);
                            const parts = (datePart || '').split('/');
                            if (parts.length === 3) {
                                let ano = parts[2];
                                if (ano.length === 2) ano = `20${ano}`;
                                isoDate = `${ano}-${parts[1]}-${parts[0]}T${timePart || '00:00'}:00Z`;
                            }
                        }
                        if (!isoDate) isoDate = new Date().toISOString();

                        // Tratar Competência (MM/YYYY)
                        let competenceDate = null;
                        let competencePeriod = String(nota.competencia || '').trim();
                        if (competencePeriod.includes('/')) {
                            const [mm, yyyy] = competencePeriod.split('/');
                            competenceDate = `${yyyy}-${mm}-01`;
                        }

                        const insertData = {
                            company_id: companyId,
                            access_key: nota.chaveTabela,
                            issue_date: isoDate,
                            amount: isNaN(valorLimpo) ? 0 : valorLimpo,
                            status: 'processed',
                            xml_url: `local_extract/${type}/${nota.chaveTabela}.xml`,
                            competence_date: competenceDate,
                            competence_period: competencePeriod || null
                        };

                        const { error: upsertError } = await supabase
                            .from('nfs')
                            .upsert(insertData, { onConflict: 'company_id,access_key' });

                        if (!upsertError) totalSaved++;
                    } catch (e) {
                        log(`[RPA-DB] Falha na nota ${nota.chaveTabela}: ${e.message}`, 'error');
                    }
                }

                // 9. Downloads para disco (do intervalo atual)
                const pastaDestino = path.join(outputDir, type);
                await this.processarDownloadsNotas(apiClient, objExtraido.notas, pastaDestino, (format || 'xml').toLowerCase(), accessToken);
                
                // Delay curto entre chunks para evitar bloqueio
                if (chunks.length > 1) await this._delay(500);
            }

            return {
                success: true,
                message: `Extração concluída.`,
                count: totalSaved,
                details: `${totalFound} notas encontradas. ${totalSaved} novas notas persistidas.`,
            };

        } catch (error) {
            console.error('[RPA-ERROR]', error.message);
            throw error;
        }
    }

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
        return { sessao: { token: null, urlRest: null }, notas };
    }

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

    async extrairDadosNotasRecebidas(htmlString) {
        return this.extrairDadosNotasHtml(htmlString);
    }

    _calcularPeriodo(period, startDate, endDate) {
        const now = new Date();
        const fmt = (d) =>
            `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

        if (period === 'history') {
            const cincoAnosAtras = new Date();
            cincoAnosAtras.setFullYear(now.getFullYear() - 5);
            return { dataInicio: fmt(cincoAnosAtras), dataFim: fmt(now) };
        }

        if (period === 'custom' && startDate && endDate) {
            const [sy, sm, sd] = startDate.split('-');
            const [ey, em, ed] = endDate.split('-');
            return { dataInicio: `${sd}/${sm}/${sy}`, dataFim: `${ed}/${em}/${ey}` };
        }

        const trintaDiasAtras = new Date();
        trintaDiasAtras.setDate(now.getDate() - 30);

        if (period === 'retroativo' || period === 'ano') {
            return { dataInicio: fmt(trintaDiasAtras), dataFim: fmt(now) };
        }

        if (period === 'anterior') {
            const inicioMesAnterior = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const fimMesAnterior = new Date(now.getFullYear(), now.getMonth(), 0);
            return { dataInicio: fmt(inicioMesAnterior), dataFim: fmt(fimMesAnterior) };
        }

        // 'atual'
        return { dataInicio: fmt(trintaDiasAtras), dataFim: fmt(now) };
    }

    _splitPeriodIntoChunks(dataInicioStr, dataFimStr) {
        const parseDate = (dStr) => {
            const [d, m, y] = dStr.split('/');
            return new Date(y, m - 1, d);
        };
        const fmt = (d) =>
            `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

        let currentStart = parseDate(dataInicioStr);
        const finalEnd = parseDate(dataFimStr);
        const chunks = [];

        while (currentStart < finalEnd) {
            let nextEnd = new Date(currentStart);
            nextEnd.setDate(currentStart.getDate() + 27); // 28 dias no máximo (limite portal 30) para acelerar sem risco de bloqueio

            if (nextEnd > finalEnd) {
                nextEnd = finalEnd;
            }

            chunks.push({
                dataInicio: fmt(currentStart),
                dataFim: fmt(nextEnd)
            });

            currentStart = new Date(nextEnd);
            currentStart.setDate(nextEnd.getDate() + 1);
        }

        return chunks;
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
                // SÓ BAIXAR SE NÃO EXISTIR LOCALMENTE (Opcional, mas bom para performance)
                const ext = formatoDesejado === 'xml' ? 'xml' : 'pdf';
                const caminho = path.join(pastaDestino, `${nota.chaveTabela}.${ext}`);

                if (fs.existsSync(caminho)) {
                    // log(`[RPA-DOWNLOAD] Arquivo ${nota.chaveTabela}.${ext} já existe localmente. Pulando.`);
                    sucessoCount++;
                    continue;
                }

                if (formatoDesejado === 'xml' && nota.linkDownloadXml) {
                    const ok = await this.descarregarFicheiroNfs(apiClient, nota.linkDownloadXml, caminho, accessToken);
                    if (ok) sucessoCount++; else falhaCount++;
                } else if (formatoDesejado === 'pdf' && nota.linkDownloadPdf) {
                    const ok = await this.descarregarFicheiroNfs(apiClient, nota.linkDownloadPdf, caminho, accessToken);
                    if (ok) sucessoCount++; else falhaCount++;
                }
                await this._delay(100);
            }
            return { sucessoCount, falhaCount };
        } catch (error) {
            console.error('[RPA-BATCH] Erro no lote de downloads:', error.message);
            throw error;
        }
    }
}

module.exports = new NfseScraperService();
