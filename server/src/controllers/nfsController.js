const AdmZip = require('adm-zip');
const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY);

exports.downloadZippedNfse = async (req, res) => {
    const { id } = req.params; // companyId

    try {
        // 1. Get NFSe data from Supabase for this company
        const { data: nfs, error } = await supabase
            .from('nfs')
            .select('*, companies(name, cnpj)')
            .eq('company_id', id)
            .order('issue_date', { ascending: false });

        if (error) throw error;
        if (!nfs || nfs.length === 0) {
            return res.status(404).json({ error: 'Nenhuma nota encontrada para esta empresa.' });
        }

        // 2. Buscar configurações globais para o caminho de saída
        const { data: dbSettings } = await supabase.from('app_settings').select('*');
        const settingsMap = (dbSettings || []).reduce((acc, curr) => {
            acc[curr.key] = curr.value;
            return acc;
        }, {});

        const baseDir = settingsMap.output_path || path.join(process.env.USERPROFILE, 'Documents', 'notas_processadas');

        const companyName = nfs[0].companies?.name || 'Empresa';
        const zip = new AdmZip();

        let addedFiles = 0;
        for (const nota of nfs) {
            // O campo xml_url no banco está como "local_extract/recebidas/CHAVE.xml"
            // Vamos traduzir isso para o caminho real no disco
            if (!nota.xml_url) continue;

            const relativePath = nota.xml_url.replace('local_extract/', '');
            const fullPath = path.join(baseDir, relativePath);

            if (fs.existsSync(fullPath)) {
                zip.addLocalFile(fullPath);
                addedFiles++;
            }
        }

        if (addedFiles === 0) {
            return res.status(404).json({ error: 'Os arquivos XML físicos não foram encontrados no servidor/máquina local.' });
        }

        const safeCompanyName = (companyName || 'Empresa').replace(/[^a-z0-9]/gi, '_');
        const zipFileName = `Notas_${safeCompanyName}_${new Date().getTime()}.zip`;
        const buffer = zip.toBuffer();

        res.set('Content-Type', 'application/zip');
        res.set('Content-Disposition', `attachment; filename=${zipFileName}`);
        res.set('Content-Length', buffer.length);
        res.send(buffer);

    } catch (error) {
        console.error('ZIP Download Error:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.getGroupedNfs = async (req, res) => {
    try {
        // Fetch all NFs with company info
        const { data, error } = await supabase
            .from('nfs')
            .select('*, companies(id, name, cnpj)')
            .order('issue_date', { ascending: false });

        if (error) throw error;

        // Group by company
        const grouped = data.reduce((acc, note) => {
            const companyId = note.companies.id;
            if (!acc[companyId]) {
                acc[companyId] = {
                    id: companyId,
                    name: note.companies.name,
                    cnpj: note.companies.cnpj,
                    notes: []
                };
            }
            acc[companyId].notes.push(note);
            return acc;
        }, {});

        res.json(Object.values(grouped));
    } catch (error) {
        console.error('Grouped NFS Error:', error);
        res.status(500).json({ error: error.message });
    }
};
