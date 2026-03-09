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

exports.resetCompanyNfs = async (req, res) => {
    const { id } = req.params;
    try {
        const { error } = await supabase.from('nfs').delete().eq('company_id', id);
        if (error) throw error;
        res.json({ message: 'Notas resetadas com sucesso.' });
    } catch (error) {
        console.error('Reset NFS Error:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.getDashboardStats = async (req, res) => {
    try {
        // Contagem de empresas
        const { count: companiesCount } = await supabase
            .from('companies')
            .select('*', { count: 'exact', head: true });

        // Total de notas e soma de valor
        const { data: nfsData, error: nfsError } = await supabase
            .from('nfs')
            .select('issue_date, amount');

        if (nfsError) throw nfsError;

        const totalNotes = nfsData.length;
        const totalAmount = nfsData.reduce((sum, n) => sum + (parseFloat(n.amount) || 0), 0);

        // Agrupar por dia para série semanal (últimos 7 dias)
        const now = new Date();
        const seriesWeek = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            const dayStr = d.toISOString().slice(0, 10);
            const dayNotes = nfsData.filter(n => n.issue_date && n.issue_date.slice(0, 10) === dayStr);
            const shortName = d.toLocaleDateString('pt-BR', { weekday: 'short' });
            seriesWeek.push({
                name: shortName.charAt(0).toUpperCase() + shortName.slice(1).replace('.', ''),
                processadas: dayNotes.length,
                valor: dayNotes.reduce((s, n) => s + (parseFloat(n.amount) || 0), 0)
            });
        }

        // Agrupar por semana para série mensal (últimas 4 semanas)
        const seriesMonth = [];
        for (let i = 3; i >= 0; i--) {
            const weekEnd = new Date(now);
            weekEnd.setDate(weekEnd.getDate() - i * 7);
            const weekStart = new Date(weekEnd);
            weekStart.setDate(weekStart.getDate() - 6);
            const weekNotes = nfsData.filter(n => {
                if (!n.issue_date) return false;
                const d = new Date(n.issue_date);
                return d >= weekStart && d <= weekEnd;
            });
            seriesMonth.push({
                name: `Sem ${4 - i}`,
                processadas: weekNotes.length,
                valor: weekNotes.reduce((s, n) => s + (parseFloat(n.amount) || 0), 0)
            });
        }

        res.json({ companies: companiesCount || 0, totalNotes, totalAmount, seriesWeek, seriesMonth });
    } catch (error) {
        console.error('Dashboard Stats Error:', error);
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
