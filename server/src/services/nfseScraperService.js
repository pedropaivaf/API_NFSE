'use strict';
const axios = require('axios');
const https = require('https');
const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const os = require('os');
const cheerio = require('cheerio');
const supabase = require('../config/supabaseClient');

/**
 * SERVIÇO DE EXTRAÇÃO mTLS REAL — Portal NFSe Nacional (nfse.gov.br)
 *
 * Fluxo confirmado via HAR (06/03/2026):
 * 1. GET /EmissorNacional/Certificado com https.Agent({ pfx, passphrase })
 *    → Servidor autentica pelo certificado TLS e responde 302 → Dashboard
 * 2. Sem cookies, sem OAuth, sem SSO externo — autenticação pura por mTLS
 * 3. Todos os requests subsequentes usam o mesmo httpsAgent
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

            // 2. Cliente Axios com mTLS
            // HAR confirmou: zero cookies, autenticação por certificado em cada request
            const httpsAgent = new https.Agent({
                pfx: certBuffer,
                passphrase: password,
                rejectUnauthorized: true,
            });
            const apiClient = axios.create({
                httpsAgent,
                timeout: 30000,
                maxRedirects: 5,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'pt-BR,pt;q=0.9',
                },
            });

            // 3. Autenticação mTLS: GET /Certificado → 302 → Dashboard
            console.log('[RPA] Autenticando via mTLS em /Certificado...');
            const authResp = await apiClient.get(`${BASE_URL}/Certificado`);
            const finalUrl = authResp.request?.res?.responseUrl || authResp.config?.url || '';
            if (!finalUrl.toLowerCase().includes('dashboard')) {
                throw new Error(`Autenticação mTLS falhou. URL final inesperada: ${finalUrl}`);
            }
            console.log('[RPA] Autenticado com sucesso. URL:', finalUrl);

            // 4. Calcular período de datas
            const { dataInicio, dataFim } = this._calcularPeriodo(period, startDate, endDate);
            console.log(`[RPA] Período: ${dataInicio} → ${dataFim}`);

            // 5. Buscar lista de notas
            const notaType = type === 'emitidas' ? 'EmitidaIndex' : 'RecebidaIndex';
            const notasUrl = `${BASE_URL}/Nota/${notaType}`;
            console.log(`[RPA] Consultando: ${notasUrl}`);

            const notasResp = await apiClient.get(notasUrl, {
                params: { dataInicio, dataFim },
            });
            console.log('[RPA] HTML recebido. Tamanho:', notasResp.data?.length || 0, 'chars');

            // 6. Parse HTML com Cheerio
            const objExtraido = await this.extrairDadosNotasRecebidas(notasResp.data);
            console.log(`[RPA] ${objExtraido.notas.length} notas encontradas no HTML.`);

            if (objExtraido.notas.length === 0) {
                console.warn('[RPA] Nenhuma nota encontrada. Verificar seletores CSS ou período selecionado.');
            }

            // 7. Persistência no Supabase
            let savedCount = 0;
            for (const nota of objExtraido.notas) {
                const valorLimpo = parseFloat(nota.valorServico.replace(/\./g, '').replace(',', '.'));
                const [datePart, timePart] = nota.dataGeracao.split(' ');
                const [day, month, year] = datePart.split('/');
                const isoDate = `${year}-${month}-${day}T${timePart || '00:00'}:00Z`;

                const { error: upsertError } = await supabase
                    .from('nfs')
                    .upsert({
                        company_id: companyId,
                        access_key: nota.chaveTabela,
                        issue_date: isoDate,
                        amount: isNaN(valorLimpo) ? 0 : valorLimpo,
                        status: 'processed',
                        xml_url: `local_extract/${type}/${nota.chaveTabela}.xml`,
                    }, { onConflict: 'company_id, access_key' });

                if (upsertError) {
                    console.error(`[RPA-DB] Erro ao salvar ${nota.chaveTabela}:`, upsertError.message);
                } else {
                    savedCount++;
                }
            }

            // 8. Downloads para disco
            const pastaDestino = path.join(process.cwd(), 'notas_processadas', type);
            await this.processarDownloadsNotas(apiClient, objExtraido.notas, pastaDestino, format.toLowerCase());

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
            if (error.response?.status === 401 || error.response?.status === 403) {
                throw new Error('Gov.br negou acesso. Certificado pode estar revogado ou vencido.');
            }
            throw error;
        }
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

    async descarregarFicheiroNfs(apiClient, urlRelativa, caminhoDestino) {
        try {
            const urlAbsoluta = urlRelativa.startsWith('http')
                ? urlRelativa
                : `https://www.nfse.gov.br${urlRelativa}`;

            const response = await apiClient.get(urlAbsoluta, {
                responseType: 'arraybuffer',
            });
            await fsPromises.writeFile(caminhoDestino, response.data);
            return true;
        } catch (error) {
            console.error(`[RPA-DOWNLOAD] Erro ao baixar ${urlRelativa}:`, error.message);
            return false;
        }
    }

    async processarDownloadsNotas(apiClient, notasExtraidas, pastaDestino, formatoDesejado = 'xml') {
        try {
            await fsPromises.mkdir(pastaDestino, { recursive: true });

            let sucessoCount = 0;
            let falhaCount = 0;

            for (const nota of notasExtraidas) {
                if (formatoDesejado === 'xml' && nota.linkDownloadXml) {
                    const caminho = path.join(pastaDestino, `${nota.chaveTabela}.xml`);
                    const ok = await this.descarregarFicheiroNfs(apiClient, nota.linkDownloadXml, caminho);
                    if (ok) sucessoCount++; else falhaCount++;
                } else if (formatoDesejado === 'pdf' && nota.linkDownloadPdf) {
                    const caminho = path.join(pastaDestino, `${nota.chaveTabela}.pdf`);
                    const ok = await this.descarregarFicheiroNfs(apiClient, nota.linkDownloadPdf, caminho);
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

    async extrairDadosNotasRecebidas(htmlString) {
        try {
            let urlRest = null;
            let accessToken = null;

            // Tentar extrair tokens JS se presentes (pode não existir com mTLS puro)
            const urlRestMatch = htmlString.match(/window\.UrlRest\s*=\s*["']([^"']+)["']/);
            if (urlRestMatch) urlRest = urlRestMatch[1];

            const tokenMatch = htmlString.match(/window\.sessionStorage\.setItem\(\s*["']accessToken["']\s*,\s*["']([^"']+)["']\s*\)/);
            if (tokenMatch) accessToken = tokenMatch[1];

            // Parse tabela de notas com Cheerio
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

            return { sessao: { token: accessToken, urlRest }, notas };

        } catch (error) {
            console.error('[RPA-PARSE] Erro no parse HTML:', error.message);
            throw error;
        }
    }
}

module.exports = new NfseScraperService();
