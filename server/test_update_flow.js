const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function run() {
    const { data: companies } = await supabase.from('companies').select('id, name').eq('name', 'M B CONTABILIDADE');
    if (!companies || companies.length === 0) {
        console.log('Company not found');
        return;
    }
    const id = companies[0].id;
    console.log(`Found ID for ${companies[0].name}: ${id}`);

    // Now try to update via REST to see if there's any error
    const axios = require('axios');
    const API_URL = 'http://localhost:3000';
    try {
        const res = await axios.post(`${API_URL}/companies/${id}/credentials`, {
            certificateLocalName: 'TEST_CERT.pfx',
            password: 'TEST_PASSWORD'
        });
        console.log('Update result:', res.data);

        // Check database again
        const { data: updated } = await supabase.from('companies').select('*').eq('id', id).single();
        console.log('Database after update:', {
            cert: updated.certificate_local_name,
            pwd: updated.certificate_password
        });
    } catch (e) {
        console.error('Update failed:', e.message, e.response?.data);
    }
}

run();
