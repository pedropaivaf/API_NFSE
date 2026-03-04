const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// 1. LOGIN: Validações de Bloqueio e Vencimento
router.post('/login', async (req, res) => {
    const { access_key } = req.body;

    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('access_key', access_key)
        .single();

    if (error || !data) {
        return res.status(401).json({ error: 'Chave de acesso inválida ou não encontrada.' });
    }

    // Verifica se a chave foi bloqueada pelo Admin
    if (data.is_active === false) {
        return res.status(403).json({ error: 'Acesso bloqueado. Entre em contato com o administrador.' });
    }

    // Verifica se a licença mensal venceu
    if (data.plan_type === 'MENSAL' && data.expires_at) {
        const today = new Date();
        const expirationDate = new Date(data.expires_at);
        if (today > expirationDate) {
            return res.status(403).json({ error: 'Sua assinatura venceu. Renove sua licença.' });
        }
    }

    res.json({ user: data });
});

// 2. Listar clientes (Painel Admin)
router.get('/', async (req, res) => {
    const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: false });
    if (error) return res.status(400).json(error);
    res.json(data);
});

// 3. Criar nova chave com Plano (Mensal ou Ilimitado)
router.post('/', async (req, res) => {
    const { name, access_key, role, plan_type } = req.body;

    let expires_at = null;
    // Se for mensal, calcula a data de hoje + 30 dias
    if (plan_type === 'MENSAL') {
        const nextMonth = new Date();
        nextMonth.setDate(nextMonth.getDate() + 30);
        expires_at = nextMonth.toISOString();
    }

    const { error } = await supabase.from('users').insert([{
        name, access_key, role, plan_type, expires_at, is_active: true
    }]);

    if (error) return res.status(400).json({ error: "Erro ao gerar chave no banco." });
    res.json({ message: "Chave gerada" });
});

// 4. Bloquear / Liberar Acesso (Toggle)
router.put('/:id/toggle-status', async (req, res) => {
    const { is_active } = req.body;
    const { error } = await supabase.from('users').update({ is_active }).eq('id', req.params.id);
    if (error) return res.status(400).json({ error: "Erro ao alterar status." });
    res.json({ message: "Status atualizado" });
});

// 5. Revogar chave (Deletar permanentemente)
router.delete('/:id', async (req, res) => {
    const { error } = await supabase.from('users').delete().eq('id', req.params.id);
    if (error) return res.status(400).json(error);
    res.json({ message: "Chave revogada" });
});

module.exports = router;