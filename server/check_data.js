const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function checkData() {
    const { data: companies, error } = await supabase
        .from('companies')
        .select('id, name, cnpj, certificate_local_name, certificate_password');

    if (error) {
        console.error('Error fetching companies:', error);
        return;
    }

    console.log('Companies Data:');
    companies.forEach(c => {
        console.log(`- ${c.name} (${c.cnpj}): Cert=${c.certificate_local_name}, Pwd=${c.certificate_password ? '***' : 'EMPTY'}`);
    });
}

checkData();
