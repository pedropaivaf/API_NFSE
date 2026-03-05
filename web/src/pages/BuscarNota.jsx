import { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, ShieldCheck, Download, Calendar, CheckCircle2, AlertCircle, Loader2, Building2 } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function BuscarNota() {
    const [loading, setLoading] = useState(false);
    const [localFiles, setLocalFiles] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [loadingFiles, setLoadingFiles] = useState(false);
    const [loadingCompanies, setLoadingCompanies] = useState(false);

    const [formData, setFormData] = useState({
        companyId: '',
        certificateFilename: '',
        password: '',
        type: 'emitidas',
        period: 'atual',
        startDate: '',
        endDate: '',
        format: 'xml',
    });

    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoadingFiles(true);
            setLoadingCompanies(true);

            // Fetch Certificates
            if (window.electronAPI?.getLocalCertificates) {
                try {
                    const result = await window.electronAPI.getLocalCertificates();
                    if (result.error) {
                        setError(result.error);
                    } else {
                        setLocalFiles(result.files || []);
                    }
                } catch (err) {
                    console.error("IPC Error:", err);
                } finally {
                    setLoadingFiles(false);
                }
            }

            // Fetch Companies
            try {
                const res = await axios.get(`${API_URL}/companies`);
                setCompanies(res.data || []);
            } catch (err) {
                console.error("Fetch Companies Error:", err);
            } finally {
                setLoadingCompanies(false);
            }
        };

        fetchData();
    }, []);

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        setLoading(true);

        try {
            if (!formData.companyId) throw new Error("Selecione a Empresa de destino.");
            if (!formData.certificateFilename) throw new Error("Selecione um certificado digital A1.");
            if (!formData.password) throw new Error("A senha do certificado é obrigatória.");

            const res = await axios.post(`${API_URL}/scraper/fetch-gov`, formData);
            setSuccess(res.data);
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.error || err.message || "Erro ao conectar com o serviço Gov.br");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center text-brand-600">
                    <Download size={20} />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Busca em Lote (Gov.br)</h2>
                    <p className="text-slate-500 text-sm">Automação de extração direta do portal Nacional NFSe</p>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <form onSubmit={handleSubmit} className="p-8 space-y-8">
                    {/* Mensagens de Feedback */}
                    {error && (
                        <div className="p-4 bg-red-50 text-red-700 text-sm rounded-xl flex items-start gap-3 border border-red-100">
                            <AlertCircle size={20} className="shrink-0 mt-0.5" />
                            <div>{error}</div>
                        </div>
                    )}
                    {success && (
                        <div className="p-4 bg-green-50 text-green-700 text-sm rounded-xl flex items-start gap-3 border border-green-100">
                            <CheckCircle2 size={20} className="shrink-0 mt-0.5" />
                            <div>
                                <strong className="block font-semibold mb-1">Processo Finalizado/Iniciado com Sucesso!</strong>
                                {success.message || "O robô processou a extração com êxito."}
                                {success.count !== undefined && (
                                    <span className="block mt-1 font-medium italic">
                                        Total de {success.count} notas salvas no banco de dados.
                                    </span>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Bloco 0: Seleção de Empresa */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 border-b border-slate-100 pb-2 text-slate-800 font-semibold text-sm uppercase tracking-wider">
                            <Building2 size={18} className="text-brand-500" />
                            0. Destino dos Dados
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Empresa no Sistema</label>
                            <select
                                name="companyId"
                                value={formData.companyId}
                                onChange={handleChange}
                                className="w-full h-11 px-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none text-sm transition bg-white"
                                required
                            >
                                <option value="">Selecione a Empresa</option>
                                {companies.map(c => (
                                    <option key={c.id} value={c.id}>{c.name} ({c.cnpj})</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Bloco 1: Certificado Digital */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 border-b border-slate-100 pb-2 text-slate-800 font-semibold text-sm uppercase tracking-wider">
                            <ShieldCheck size={18} className="text-brand-500" />
                            1. Autenticação A1
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Certificado Digital (.pfx)</label>
                                {loadingFiles ? (
                                    <div className="flex items-center gap-2 h-11 px-3 border border-slate-200 rounded-xl text-slate-400 bg-slate-50 text-sm">
                                        <Loader2 className="animate-spin" size={16} /> Carregando do computador...
                                    </div>
                                ) : (
                                    <select
                                        name="certificateFilename"
                                        value={formData.certificateFilename}
                                        onChange={handleChange}
                                        className="w-full h-11 px-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none text-sm transition bg-white"
                                        required
                                    >
                                        <option value="">Selecione um Arquivo</option>
                                        {localFiles.map(f => (
                                            <option key={f} value={f}>{f}</option>
                                        ))}
                                    </select>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Senha do Certificado</label>
                                <input
                                    type="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    className="w-full h-11 px-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none text-sm transition"
                                    required
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Bloco 2: Filtros da Busca */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 border-b border-slate-100 pb-2 text-slate-800 font-semibold text-sm uppercase tracking-wider">
                            <Calendar size={18} className="text-brand-500" />
                            2. Parâmetros da Extração
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Nota</label>
                                <select
                                    name="type"
                                    value={formData.type}
                                    onChange={handleChange}
                                    className="w-full h-11 px-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none text-sm transition bg-white"
                                >
                                    <option value="emitidas">Notas Emitidas</option>
                                    <option value="recebidas">Notas Recebidas</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Período Rápido</label>
                                <select
                                    name="period"
                                    value={formData.period}
                                    onChange={handleChange}
                                    className="w-full h-11 px-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none text-sm transition bg-white"
                                >
                                    <option value="atual">Mês Atual</option>
                                    <option value="anterior">Mês Anterior</option>
                                    <option value="custom">Data Personalizada</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Formato Desejado</label>
                                <div className="flex items-center gap-2 h-11 overflow-hidden">
                                    <label className="flex-1 flex items-center justify-center gap-1 text-sm bg-slate-50 h-full rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-100 transition relative">
                                        <input type="radio" name="format" value="xml" checked={formData.format === 'xml'} onChange={handleChange} className="peer sr-only" />
                                        <div className="absolute inset-0 rounded-lg peer-checked:border-2 peer-checked:border-brand-500 peer-checked:bg-brand-50 transition pointer-events-none"></div>
                                        <span className="relative z-10 font-medium peer-checked:text-brand-700 text-slate-600">XML</span>
                                    </label>
                                    <label className="flex-1 flex items-center justify-center gap-1 text-sm bg-slate-50 h-full rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-100 transition relative">
                                        <input type="radio" name="format" value="pdf" checked={formData.format === 'pdf'} onChange={handleChange} className="peer sr-only" />
                                        <div className="absolute inset-0 rounded-lg peer-checked:border-2 peer-checked:border-brand-500 peer-checked:bg-brand-50 transition pointer-events-none"></div>
                                        <span className="relative z-10 font-medium peer-checked:text-brand-700 text-slate-600">PDF</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        {formData.period === 'custom' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Data Inicial</label>
                                    <input type="date" name="startDate" value={formData.startDate} onChange={handleChange} className="w-full h-11 px-3 border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Data Final</label>
                                    <input type="date" name="endDate" value={formData.endDate} onChange={handleChange} className="w-full h-11 px-3 border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500" required />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Botão Submit */}
                    <div className="pt-6 border-t border-slate-100">
                        <button
                            type="submit"
                            disabled={loading || loadingFiles}
                            className="w-full h-14 bg-slate-900 text-white rounded-xl hover:bg-slate-800 disabled:opacity-75 flex items-center justify-center gap-2 font-medium transition shadow-sm hover:shadow-md text-lg"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="animate-spin" size={24} />
                                    Extraindo e salvando notas...
                                </>
                            ) : (
                                <>
                                    <Search size={24} />
                                    Iniciar Extração Segura
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
