
const cron = require('node-cron');
const supabase = require('../config/supabaseClient');
const nfseService = require('./nfseService');

exports.startScheduler = () => {
    // Run every hour: '0 * * * *'
    // For testing, run every 5 minutes: '*/5 * * * *'
    console.log('⏰ Scheduler started (Running every hour)');

    cron.schedule('0 * * * *', async () => {
        console.log('🔄 Running scheduled sync...');
        try {
            // Fetch active companies
            const { data: companies, error } = await supabase
                .from('companies')
                .select('id, name')
                .eq('status', 'active');

            if (error) throw error;

            console.log(`Found ${companies.length} active companies to sync.`);

            for (const company of companies) {
                try {
                    await nfseService.syncNfse(company.id);
                } catch (err) {
                    console.error(`Failed to sync company ${company.name}:`, err.message);
                }
            }
        } catch (err) {
            console.error('Scheduler Error:', err.message);
        }
    });
};
