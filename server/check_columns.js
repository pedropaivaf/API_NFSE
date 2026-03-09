const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function checkSchema() {
    const { data: columns, error } = await supabase
        .from('companies')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching columns:', error);
        return;
    }

    if (columns && columns.length > 0) {
        console.log('Columns in companies table:', Object.keys(columns[0]));
    } else {
        console.log('No data in companies table, checking schema via SQL view if possible or inserting dummy...');
        // Try to get one company to see keys
        const { data: all } = await supabase.from('companies').select('*').limit(1);
        console.log('Sample data:', all);
    }
}

checkSchema();
