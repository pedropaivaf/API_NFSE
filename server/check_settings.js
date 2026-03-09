const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function checkSettings() {
    const { data, error } = await supabase
        .from('settings')
        .select('*')
        .limit(1);

    if (error) {
        if (error.code === 'PGRST116' || error.message.includes('relation "settings" does not exist')) {
            console.log('Settings table does NOT exist.');
        } else {
            console.error('Error checking settings table:', error);
        }
    } else {
        console.log('Settings table exists. Rows:', data.length);
    }
}

checkSettings();
