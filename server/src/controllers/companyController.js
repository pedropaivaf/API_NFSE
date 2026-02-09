
const supabase = require('../config/supabaseClient');
const nfseService = require('../services/nfseService');

exports.createCompany = async (req, res) => {
    try {
        const { name, cnpj, password } = req.body;
        const certificateFile = req.file;

        if (!name || !cnpj || !password || !certificateFile) {
            return res.status(400).json({ error: 'Missing required fields or certificate file' });
        }

        // 1. Upload Certificate to Supabase Storage
        const fileExt = certificateFile.originalname.split('.').pop();
        const fileName = `${cnpj}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('certificates')
            .upload(filePath, certificateFile.buffer, {
                contentType: certificateFile.mimetype,
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
                    certificate_password: password, // In production, encrypt this!
                    certificate_url: filePath,
                    status: 'active'
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

exports.getNfs = async (req, res) => {
    const { id } = req.params; // companyId

    // Check if ID is provided
    if (!id) return res.status(400).json({ error: 'Company ID is required' });

    const { data, error } = await supabase
        .from('nfs_docs')
        .select('*')
        .eq('company_id', id)
        .order('issue_date', { ascending: false });

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    res.json(data);
};
