
const axios = require('axios');
const https = require('https');
const zlib = require('zlib');
const supabase = require('../config/supabaseClient');

const URL_API_PRODUCAO = process.env.URL_API_PRODUCAO || 'https://adn.nfse.gov.br/contribuintes/DFe/0';

/**
 * Service to handle NFSe crawling and data persistence
 */
exports.syncNfse = async (companyId) => {
    let logId = null;

    try {
        // 1. Fetch Company Details
        const { data: company, error: companyError } = await supabase
            .from('companies')
            .select('*')
            .eq('id', companyId)
            .single();

        if (companyError || !company) throw new Error(`Company not found: ${companyError?.message}`);

        // 2. Create Sync Log (Started)
        const { data: log, error: logError } = await supabase
            .from('sync_logs')
            .insert([{ company_id: companyId, status: 'running', docs_found: 0 }])
            .select()
            .single();

        if (log) logId = log.id;

        // 3. Download Certificate from Storage
        const { data: certData, error: certError } = await supabase.storage
            .from('certificates')
            .download(company.certificate_url);

        if (certError) throw new Error(`Failed to download certificate: ${certError.message}`);

        const certificateBuffer = Buffer.from(await certData.arrayBuffer());

        // 4. Configure HTTPS Agent
        const agent = new https.Agent({
            pfx: certificateBuffer,
            passphrase: company.certificate_password,
            rejectUnauthorized: true
        });

        const api = axios.create({ httpsAgent: agent });

        // 5. Fetch from Government API
        console.log(`📡 Connecting to Government API for ${company.name} (${company.cnpj})...`);
        const response = await api.get(URL_API_PRODUCAO);
        const data = response.data; // The API returns JSON directly? Based on original script yes.

        let docsCount = 0;

        if (data.StatusProcessamento === "DOCUMENTOS_LOCALIZADOS" && data.LoteDFe?.length > 0) {
            docsCount = data.LoteDFe.length;
            console.log(`✅ ${docsCount} documents found.`);

            for (const item of data.LoteDFe) {
                await processNfse(item, company);
            }
        } else {
            console.log('ℹ️ No new documents found.');
        }

        // 6. Update Log (Success)
        if (logId) {
            await supabase.from('sync_logs').update({
                status: 'success',
                docs_found: docsCount,
                error_message: null
            }).eq('id', logId);
        }

        return { success: true, count: docsCount };

    } catch (error) {
        console.error('❌ Sync Error:', error.message);

        let errorMsg = error.message;
        if (error.response) {
            errorMsg = `API Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`;
        }

        // Update Log (Error)
        if (logId) {
            await supabase.from('sync_logs').update({
                status: 'error',
                error_message: errorMsg
            }).eq('id', logId);
        }

        throw new Error(errorMsg);
    }
};

async function processNfse(item, company) {
    try {
        if (!item.ArquivoXml) return;

        const chave = item.ChaveAcesso;

        // 1. Decode & Decompress
        const bufferBase64 = Buffer.from(item.ArquivoXml, 'base64');
        const xmlBuffer = zlib.gunzipSync(bufferBase64);
        const xmlString = xmlBuffer.toString('utf-8');

        // 2. Upload XML to Storage
        const storagePath = `xmls/${company.cnpj}/${chave}.xml`;
        const { error: uploadError } = await supabase.storage
            .from('xmls')
            .upload(storagePath, xmlBuffer, {
                contentType: 'text/xml',
                upsert: true
            });

        if (uploadError) console.error(`Failed to upload XML ${chave}:`, uploadError.message);

        // 3. Extract basic metadata (Regex for simplicity, or use XML parser if needed)
        // Simple regex to find content (This is fragile, ideally use xml2js)
        const issueDateMatch = xmlString.match(/<DhEmi>(.*?)<\/DhEmi>/) || xmlString.match(/dhemi="(.*?)"/i);
        const issueDate = issueDateMatch ? issueDateMatch[1] : new Date();

        const amountMatch = xmlString.match(/<VlServicos>(.*?)<\/VlServicos>/);
        const amount = amountMatch ? parseFloat(amountMatch[1]) : 0;

        // 4. Upsert into Database
        await supabase.from('nfs_docs').upsert({
            company_id: company.id,
            access_key: chave,
            issue_date: issueDate,
            amount: amount,
            xml_url: storagePath,
            status: 'processed'
        }, { onConflict: 'company_id, access_key' });

    } catch (err) {
        console.error(`Error processing note ${item.ChaveAcesso}:`, err.message);
    }
}
