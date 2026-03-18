import { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Key, ShieldCheck, Clock, CheckCircle, Ban, Code,
    FolderOpen, Save, Loader2, HardDrive
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function Settings() {
    const [license, setLicense] = useState({
        name: '',
        access_key: '',
        plan_type: '',
        expires_at: '',
        is_active: true
    });

    const [globalSettings, setGlobalSettings] = useState({
        output_path: '',
        certificates_path: ''
    });
    const [loadingSettings, setLoadingSettings] = useState(false);
    const [savingSettings, setSavingSettings] = useState(false);
    const [msg, setMsg] = useState({ type: '', text: '' });

    // Carrega os dados salvos no momento do login e do backend
    useEffect(() => {
        setLicense({
            name: localStorage.getItem('userName') || 'Usuário',
            access_key: localStorage.getItem('userAccessKey') || 'Chave não encontrada',
            plan_type: localStorage.getItem('userPlan') || 'ILIMITADO',
            expires_at: localStorage.getItem('userExpiresAt') || '',
            is_active: localStorage.getItem('userIsActive') !== 'false'
        });

        fetchGlobalSettings();
    }, []);

    const fetchGlobalSettings = async () => {
        setLoadingSettings(true);
        try {
            const res = await axios.get(`${API_URL}/api/settings`);
            setGlobalSettings({
                output_path: res.data.output_path || '',
                certificates_path: res.data.certificates_path || ''
            });
        } catch (err) {
            console.error("Erro ao buscar settings:", err);
        } finally {
            setLoadingSettings(false);
        }
    };

    const handleSaveSettings = async () => {
        setSavingSettings(true);
        setMsg({ type: '', text: '' });
        try {
            await axios.post(`${API_URL}/api/settings`, globalSettings);
            setMsg({ type: 'success', text: 'Configurações salvas com sucesso!' });
            setTimeout(() => setMsg({ type: '', text: '' }), 5000);
        } catch {
            setMsg({ type: 'error', text: 'Erro ao salvar configurações.' });
        } finally {
            setSavingSettings(false);
        }
    };

    const handleSelectDirectory = async (field) => {
        if (!window.electronAPI?.selectDirectory) return;

        try {
            const path = await window.electronAPI.selectDirectory();
            if (path) {
                setGlobalSettings(prev => ({ ...prev, [field]: path }));
            }
        } catch (err) {
            console.error("Erro ao selecionar diretório:", err);
        }
    };

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
                    Configurações do Sistema
                </h2>
                <p className="text-slate-500">Gerencie sua licença e caminhos de arquivos.</p>
            </div>

            {/* CARD: Configurações Globais */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                        <FolderOpen size={20} className="text-brand-600" />
                        Caminhos de Arquivos (Locais)
                    </h3>
                    {msg.text && (
                        <span className={`text-xs font-bold px-2 py-1 rounded ${msg.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {msg.text}
                        </span>
                    )}
                </div>

                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                                <HardDrive size={14} className="text-slate-400" />
                                Pasta de Saída (Notas XML)
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
                                    placeholder="C:\Caminho\Para\Notas"
                                    value={globalSettings.output_path}
                                    onChange={(e) => setGlobalSettings({ ...globalSettings, output_path: e.target.value })}
                                    disabled={loadingSettings}
                                />
                                <button
                                    onClick={() => handleSelectDirectory('output_path')}
                                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-200 transition flex items-center gap-1 text-sm font-medium"
                                    title="Selecionar Pasta"
                                >
                                    <FolderOpen size={16} />
                                    Selecionar
                                </button>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1 italic">Pasta onde o robô salvará as notas extraídas.</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                                <Key size={14} className="text-slate-400" />
                                Pasta de Certificados A1
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
                                    placeholder="C:\Caminho\Para\Certificados"
                                    value={globalSettings.certificates_path}
                                    onChange={(e) => setGlobalSettings({ ...globalSettings, certificates_path: e.target.value })}
                                    disabled={loadingSettings}
                                />
                                <button
                                    onClick={() => handleSelectDirectory('certificates_path')}
                                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-200 transition flex items-center gap-1 text-sm font-medium"
                                    title="Selecionar Pasta"
                                >
                                    <FolderOpen size={16} />
                                    Selecionar
                                </button>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1 italic">Onde o sistema deve buscar os arquivos .pfx.</p>
                        </div>
                    </div>

                    <div className="flex justify-end pt-2 border-t border-slate-50">
                        <button
                            onClick={handleSaveSettings}
                            disabled={savingSettings || loadingSettings}
                            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition shadow-md shadow-blue-100 disabled:opacity-50"
                        >
                            {savingSettings ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                            Salvar Caminhos
                        </button>
                    </div>
                </div>
            </div>

            {/* CARD 1: Detalhes da Licença */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                        <ShieldCheck size={20} className="text-brand-600" />
                        Detalhes da Licença
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
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden opacity-60">
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
