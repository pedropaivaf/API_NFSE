const supabase = require('../config/supabaseClient');

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
