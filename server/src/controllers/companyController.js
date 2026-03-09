
const supabase = require('../config/supabaseClient');
const nfseService = require('../services/nfseService');

exports.createQuickCompany = async (req, res) => {
    const { name, cnpj } = req.body;
    if (!name || !cnpj) {
        return res.status(400).json({ error: 'Nome e CNPJ são obrigatórios.' });
    }
    try {
        const { data, error } = await supabase
            .from('companies')
            .insert([{ name, cnpj }])
            .select()
            .single();
        if (error) throw error;
        res.status(201).json(data);
    } catch (error) {
        console.error('Quick Company Error:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.listCompanies = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('companies')
            .select('*')
            .order('name', { ascending: true });

        if (error) throw error;

        res.json(data);
    } catch (error) {
        console.error('List Companies Error:', error);
        res.status(500).json({ error: error.message });
    }
};

const fs = require('fs');
const path = require('path');

exports.listLocalCertificates = async (req, res) => {
    const localPath = process.env.LOCAL_CERT_PATH || 'V:\\Certificado Digital';

    try {
        if (!fs.existsSync(localPath)) {
            // For dev environment fallback or clear error
            return res.json({
                path: localPath,
                files: [],
                error: 'Diretório não encontrado. Verifique se o drive V: está mapeado.'
            });
        }

        const files = fs.readdirSync(localPath)
            .filter(file => file.toLowerCase().endsWith('.pfx'));

        res.json({ path: localPath, files });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.createCompany = async (req, res) => {
    try {
        const { name, cnpj, password, localFilename } = req.body;
        const certificateFile = req.file;

        if (!name || !cnpj || !password || (!certificateFile && !localFilename)) {
            return res.status(400).json({ error: 'Missing required fields or certificate' });
        }

        let certificateBuffer;
        let fileExt;

        if (localFilename) {
            const localPath = process.env.LOCAL_CERT_PATH || 'V:\\Certificado Digital';
            const fullPath = path.join(localPath, localFilename);

            if (!fs.existsSync(fullPath)) {
                return res.status(400).json({ error: `Arquivo não encontrado no servidor: ${localFilename}` });
            }

            certificateBuffer = fs.readFileSync(fullPath);
            fileExt = localFilename.split('.').pop();
        } else {
            certificateBuffer = certificateFile.buffer;
            fileExt = certificateFile.originalname.split('.').pop();
        }

        // 1. Upload Certificate to Supabase Storage
        const fileName = `${cnpj}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('certificates')
            .upload(filePath, certificateBuffer, {
                contentType: 'application/x-pkcs12',
                upsert: true
            });

        if (uploadError) {
            throw new Error(`Certificate upload failed: ${uploadError.message}`);
        }

        // 2. Insert Company into Database
        const { data, error: insertError } = await supabase
            .from('companies')
            .insert([
                {
                    name,
                    cnpj,
                    certificate_password: password,
                    certificate_url: filePath,
                    certificate_local_name: localFilename || null
                }
            ])
            .select()
            .single();

        if (insertError) {
            // Rollback: delete uploaded file? (Optional implementation)
            throw new Error(`Database insert failed: ${insertError.message}`);
        }

        res.status(201).json(data);
    } catch (error) {
        console.error('Create Company Error:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.syncCompany = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await nfseService.syncNfse(id);
        res.json({ message: 'Sync completed', ...result });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateCompanyCredentials = async (req, res) => {
    const { id } = req.params;
    const { certificateLocalName, password } = req.body;
    const { log } = require('../utils/logger');

    console.log(`[CREDENTIALS] Solicitado salvamento para empresa ${id}`);
    log(`[CREDENTIALS] Atualizando: Cert=${certificateLocalName}, Senha=${password ? '***' : 'VAZIA'}`);

    try {
        const { data, error } = await supabase
            .from('companies')
            .update({
                certificate_local_name: certificateLocalName,
                certificate_password: password
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('[CREDENTIALS] Erro Supabase:', error);
            throw error;
        }

        console.log(`[CREDENTIALS] Sucesso para empresa ${id}`);
        res.json(data);
    } catch (error) {
        console.error('Update Credentials Error:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.getAllNfs = async (req, res) => {
    try {
        // Fetch all NFs joined with company info
        const { data, error } = await supabase
            .from('nfs')
            .select('*, companies(name, cnpj)')
            .order('issue_date', { ascending: false });

        if (error) throw error;

        res.json(data);
    } catch (error) {
        console.error('List All NFS Error:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.getNfs = async (req, res) => {
    const { id } = req.params; // companyId

    // Check if ID is provided
    if (!id) return res.status(400).json({ error: 'Company ID is required' });

    const { data, error } = await supabase
        .from('nfs')
        .select('*')
        .eq('company_id', id)
        .order('issue_date', { ascending: false });

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    res.json(data);
};

/**
 * POST /companies/fetch-notes
 * On-demand: read local certificate, hit government API, return results
 */
exports.fetchNotes = async (req, res) => {
    const { name, cnpj, password, certificateFilename } = req.body;
    const axios = require('axios');
    const https = require('https');
    const zlib = require('zlib');

    try {
        if (!certificateFilename || !cnpj || !password) {
            return res.status(400).json({ error: 'Certificado, CNPJ e senha são obrigatórios.' });
        }

        // 1. Read certificate from local path
        const localPath = process.env.LOCAL_CERT_PATH || 'V:\\Certificado Digital';
        const fullPath = path.join(localPath, certificateFilename);

        if (!fs.existsSync(fullPath)) {
            return res.status(400).json({ error: `Arquivo não encontrado: ${certificateFilename}` });
        }

        const certificateBuffer = fs.readFileSync(fullPath);

        // 2. Create HTTPS agent with the certificate
        const agent = new https.Agent({
            pfx: certificateBuffer,
            passphrase: password,
            rejectUnauthorized: true
        });

        const api = axios.create({ httpsAgent: agent });

        // 3. Call Government API
        const URL_API = process.env.URL_API_PRODUCAO || 'https://adn.nfse.gov.br/contribuintes/DFe/0';
        console.log(`📡 Buscando notas para ${name || cnpj} (${cnpj})...`);

        const response = await api.get(URL_API);
        const data = response.data;

        // 4. Process results
        if (data.StatusProcessamento === 'DOCUMENTOS_LOCALIZADOS' && data.LoteDFe?.length > 0) {
            const notes = data.LoteDFe.map(item => {
                let issueDate = null;
                let amount = 0;

                // Try to extract metadata from XML
                if (item.ArquivoXml) {
                    try {
                        const xmlBuffer = zlib.gunzipSync(Buffer.from(item.ArquivoXml, 'base64'));
                        const xmlString = xmlBuffer.toString('utf-8');

                        const dateMatch = xmlString.match(/<DhEmi>(.*?)<\/DhEmi>/) || xmlString.match(/dhemi="(.*?)"/i);
                        if (dateMatch) issueDate = dateMatch[1];

                        const amountMatch = xmlString.match(/<VlServicos>(.*?)<\/VlServicos>/);
                        if (amountMatch) amount = parseFloat(amountMatch[1]);
                    } catch (e) {
                        // If decompression fails, still return the note
                    }
                }

                return {
                    accessKey: item.ChaveAcesso,
                    issueDate,
                    amount,
                    hasXml: !!item.ArquivoXml
                };
            });

            console.log(`✅ ${notes.length} notas encontradas para ${name || cnpj}`);

            res.json({
                success: true,
                status: data.StatusProcessamento,
                count: notes.length,
                notes
            });
        } else {
            console.log(`ℹ️ Nenhuma nota nova para ${name || cnpj}`);
            res.json({
                success: true,
                status: data.StatusProcessamento || 'SEM_DOCUMENTOS',
                count: 0,
                notes: []
            });
        }

    } catch (error) {
        console.error('❌ Fetch Notes Error:', error.message);

        let errorMsg = error.message;
        if (error.response) {
            errorMsg = `API Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`;
        }
        if (error.code === 'ERR_OSSL_PKCS12_MAC_VERIFY_FAILURE') {
            errorMsg = 'Senha do certificado incorreta.';
        }

        res.status(500).json({ error: errorMsg });
    }
};
