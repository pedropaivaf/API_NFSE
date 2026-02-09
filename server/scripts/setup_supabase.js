
const supabase = require('../src/config/supabaseClient');

async function setup() {
    console.log("🛠️  Iniciando Setup do Supabase...");

    // 1. Verificar Conexão e Tabelas
    console.log("\n📡 Verificando conexão com Banco de Dados...");
    const { data, error } = await supabase.from('companies').select('count', { count: 'exact', head: true });

    if (error) {
        if (error.code === '42P01') { // undefined_table
            console.error("❌ A tabela 'companies' não existe.");
            console.warn("⚠️  POR FAVOR: Rode o script SQL em 'supabase/migrations/00_init_schema.sql' no SQL Editor do Supabase.");
        } else {
            console.error("❌ Erro ao conectar no banco:", error.message);
        }
    } else {
        console.log("✅ Conexão com Banco de Dados OK.");
    }

    // 2. Criar Buckets
    console.log("\n🗄️  Verificando/Criando Buckets de Storage...");

    const buckets = ['certificates', 'xmls'];

    for (const bucket of buckets) {
        const { data: existing, error: checkError } = await supabase.storage.getBucket(bucket);

        if (checkError && checkError.message.includes('not found')) {
            console.log(`   Criando bucket '${bucket}'...`);
            const { data, error: createError } = await supabase.storage.createBucket(bucket, {
                public: false,
                fileSizeLimit: bucket === 'xmls' ? 10485760 : 5242880, // 10MB or 5MB
                allowedMimeTypes: bucket === 'xmls' ? ['text/xml', 'application/xml'] : ['application/x-pkcs12']
            });

            if (createError) console.error(`   ❌ Falha ao criar '${bucket}':`, createError.message);
            else console.log(`   ✅ Bucket '${bucket}' criado com sucesso.`);

        } else if (existing) {
            console.log(`   ✅ Bucket '${bucket}' já existe.`);
        } else {
            console.error(`   ❌ Erro ao verificar bucket '${bucket}':`, checkError?.message);
        }
    }

    console.log("\n🏁 Setup finalizado.");
}

setup();
