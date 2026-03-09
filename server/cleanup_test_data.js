const supabase = require('./src/config/supabaseClient');

async function cleanup() {
    console.log('Iniciando limpeza de registros de teste...');
    try {
        const { data, error, count } = await supabase
            .from('nfs')
            .delete({ count: 'exact' })
            .or('access_key.ilike.%TEST_CONSTRAINTS%,status.eq.PENDENTE,amount.eq.0,issue_date.eq.1969-12-31');

        if (error) {
            console.error('Erro na limpeza:', error.message);
        } else {
            console.log(`Sucesso! Registros removidos: ${count}`);
        }
    } catch (e) {
        console.error('Falha crítica no script de limpeza:', e.message);
    }
}

cleanup();
