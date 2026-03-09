const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gamhftfvbngrlorwnhxr.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdhbWhmdGZ2Ym5ncmxvcnduaHhyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjY0NDg4MiwiZXhwIjoyMDg4MjIwODgyfQ.aM5H6NWOjjoM2DkNJQAJXHgrh4J9r8LWlgW6V4naPxM';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSchema() {
    console.log('--- Checking NFS table ---');
    const { data, error } = await supabase
        .from('nfs')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching nfs:', error.message);
    } else {
        console.log('Columns in nfs:', data.length > 0 ? Object.keys(data[0]) : 'Empty table (columns unknown)');
    }

    console.log('\n--- Checking Constraints (via dummy upsert) ---');
    // Tentativa de upsert para ver se o erro de constraint persiste
    const { error: upsertError } = await supabase
        .from('nfs')
        .upsert({
            company_id: '00000000-0000-0000-0000-000000000000',
            access_key: 'test_key'
        }, { onConflict: 'company_id,access_key' });

    if (upsertError) {
        console.log('Upsert Error (Expected if no constraint):', upsertError.message);
        console.log('Full Error:', JSON.stringify(upsertError, null, 2));
    } else {
        console.log('Upsert success! Constraint exists.');
    }
}

checkSchema();
