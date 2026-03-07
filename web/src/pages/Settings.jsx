import { useState } from 'react';
import { Key, ShieldCheck, Clock, CheckCircle, Ban, Code } from 'lucide-react';

export default function Settings() {
    // Carrega os dados salvos no momento do login
    // ⚡ Bolt: Use lazy initialization for state to prevent unnecessary double render on mount
    const [license] = useState(() => ({
        name: localStorage.getItem('userName') || 'Usuário',
        access_key: localStorage.getItem('userAccessKey') || 'Chave não encontrada',
        plan_type: localStorage.getItem('userPlan') || 'ILIMITADO',
        expires_at: localStorage.getItem('userExpiresAt') || '',
        is_active: localStorage.getItem('userIsActive') !== 'false'
    }));

    // Função para calcular os dias restantes
    const calculateRemainingDays = (expiresAt) => {
        if (!expiresAt) return 'Ilimitado';
        const today = new Date();
        const expirationDate = new Date(expiresAt);
        const diffTime = expirationDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays > 0) return `${diffDays} dias restantes`;
        if (diffDays === 0) return 'Vence hoje';
        return 'Expirada';
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <ShieldCheck className="text-brand-600" />
                    Configurações da Licença
                </h2>
                <p className="text-slate-500">Acompanhe o status e a validade da sua assinatura.</p>
            </div>

            {/* CARD 1: Detalhes da Licença */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                        <Key size={20} className="text-brand-600" />
                        Detalhes do Acesso
                    </h3>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <label className="block text-sm font-medium text-slate-500 mb-1">Empresa Licenciada</label>
                        <div className="text-slate-900 font-semibold text-lg">{license.name}</div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-500 mb-1">Chave de Acesso</label>
                        <div className="font-mono bg-slate-100 text-slate-700 px-3 py-1.5 rounded-md inline-block border border-slate-200 select-all">
                            {license.access_key}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-500 mb-2">Status da Conta</label>
                        <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold ${license.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {license.is_active ? <CheckCircle size={16} /> : <Ban size={16} />}
                            {license.is_active ? 'Licença Ativa' : 'Acesso Bloqueado'}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-500 mb-2">Validade ({license.plan_type})</label>
                        <div className="flex items-center gap-2 text-slate-800 font-medium bg-slate-50 px-3 py-1.5 rounded-md border border-slate-100 inline-flex">
                            <Clock size={18} className="text-brand-600" />
                            {license.plan_type === 'ILIMITADO' ? 'Vitalício (Ilimitado)' : calculateRemainingDays(license.expires_at)}
                        </div>
                    </div>
                </div>
            </div>

            {/* CARD 2: API Key (Em Breve) */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                        <Code size={20} className="text-slate-600" />
                        Integração Externa (API)
                    </h3>
                </div>
                <div className="p-6">
                    <label className="block text-sm font-medium text-slate-700 mb-1">API Key</label>
                    <p className="text-sm text-slate-500 mb-3">Chave para integração com outros sistemas de contabilidade (Disponível em breve).</p>
                    <input
                        type="text"
                        disabled
                        className="w-full px-4 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-400 font-mono cursor-not-allowed"
                        placeholder="sk_live_..."
                    />
                </div>
            </div>
        </div>
    );
}