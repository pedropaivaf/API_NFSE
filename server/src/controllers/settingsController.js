const path = require('path');
const os = require('os');
const supabase = require('../config/supabaseClient');

const DEFAULT_OUTPUT_PATH = path.join(os.homedir(), 'Documents', "XML's");
const DEFAULT_CERTIFICATES_PATH = path.join(os.homedir(), 'Documents', 'Certificados');

exports.getSettings = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('app_settings')
            .select('*');

        if (error) throw error;

        // Convert array to key-value object
        const settings = data.reduce((acc, curr) => {
            acc[curr.key] = curr.value;
            return acc;
        }, {});

        // Provide defaults for empty/missing paths
        if (!settings.output_path) settings.output_path = DEFAULT_OUTPUT_PATH;
        if (!settings.certificates_path) settings.certificates_path = DEFAULT_CERTIFICATES_PATH;

        res.json(settings);
    } catch (error) {
        console.error('Get Settings Error:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.updateSettings = async (req, res) => {
    const settings = req.body; // { key: value, ... }

    try {
        const promises = Object.entries(settings).map(([key, value]) => {
            return supabase
                .from('app_settings')
                .upsert({ key, value, updated_at: new Date() }, { onConflict: 'key' });
        });

        const results = await Promise.all(promises);
        const errors = results.filter(r => r.error).map(r => r.error);

        if (errors.length > 0) {
            throw new Error(errors.map(e => e.message).join(', '));
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Update Settings Error:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.clearNfs = async (req, res) => {
    try {
        const { error } = await supabase
            .from('nfs')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all works with a filter

        if (error) throw error;

        res.json({ success: true, message: 'Todas as notas foram excluídas com sucesso.' });
    } catch (error) {
        console.error('Clear NFS Error:', error);
        res.status(500).json({ error: error.message });
    }
};
