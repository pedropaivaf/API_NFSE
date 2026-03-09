import { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Loader2, AlertCircle, Building2, HardDrive, ShieldCheck, Calendar, CheckCircle, PlusCircle } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function BuscarNota() {
    const [loadingCompanies, setLoadingCompanies] = useState(false);
    const [companies, setCompanies] = useState([]);

    const [loadingFiles, setLoadingFiles] = useState(false);
    const [localFiles, setLocalFiles] = useState([]);

    const [loadingExtrair, setLoadingExtrair] = useState(false);
    const [loadingValidate, setLoadingValidate] = useState(false);
    const [certInfo, setCertInfo] = useState(null);
    const [companyNotFound, setCompanyNotFound] = useState(false);
    const [loadingQuickRegister, setLoadingQuickRegister] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const [formData, setFormData] = useState({
        companyId: '',
        certificateFilename: '',
        password: '',
        type: 'recebidas',
        period: 'atual',
        format: 'xml',
        startDate: '',
        endDate: ''
    });

    const fetchCompanies = async () => {
        setLoadingCompanies(true);
        try {
            const res = await axios.get(`${API_URL}/companies`);
            setCompanies(res.data || []);
            setError(null); // Clear previous errors if successful
        } catch (err) {
            console.error("Fetch Companies Error:", err);
            setError("Não foi possível carregar a lista de empresas. O backend está rodando?");
        } finally {
            setLoadingCompanies(false);
        }
    };

    useEffect(() => {
        const fetchFiles = async () => {
            setLoadingFiles(true);
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
                    setError("Não foi possível carregar os certificados locais.");
                } finally {
                    setLoadingFiles(false);
                }
            } else {
                setError("Funcionalidade de certificados locais não disponível (apenas no Electron).");
                setLoadingFiles(false);
            }
        };

        fetchCompanies();
        fetchFiles();
    }, []);

    const [saveCredentials, setSaveCredentials] = useState(true);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        const val = type === 'checkbox' ? checked : value;
        setFormData({ ...formData, [name]: val });

        if (name === 'certificateFilename' || name === 'password') {
            setCertInfo(null);
            setCompanyNotFound(false);
        }

        // Auto-load credentials when company is selected
        if (name === 'companyId' && value) {
            const company = companies.find(c => c.id === value);
            if (company) {
                setFormData(prev => ({
                    ...prev,
                    certificateFilename: company.certificate_local_name || prev.certificateFilename,
                    password: company.certificate_password || prev.password
                }));
            }
        }
    };

    const handleValidateCert = async () => {
        if (!formData.certificateFilename || !formData.password) {
            setError('Selecione o certificado e informe a senha para validar.');
            return;
        }
        setLoadingValidate(true);
        setCertInfo(null);
        setCompanyNotFound(false);
        setError(null);
        try {
            const res = await axios.post(`${API_URL}/scraper/validate-cert`, {
                certificateFilename: formData.certificateFilename,
                password: formData.password,
            });
            const info = res.data;
            setCertInfo(info);

            // Auto-link: buscar empresa pelo CNPJ do certificado
            if (info.cnpj) {
                const cnpjLimpo = info.cnpj.replace(/\D/g, '');
                const matched = companies.find(c => c.cnpj?.replace(/\D/g, '') === cnpjLimpo);
                if (matched) {
                    setFormData(prev => ({
                        ...prev,
                        companyId: matched.id,
                        certificateFilename: matched.certificate_local_name || prev.certificateFilename,
                        password: matched.certificate_password || prev.password
                    }));
                } else {
                    setCompanyNotFound(true);
                }
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Erro ao validar certificado.');
        } finally {
            setLoadingValidate(false);
        }
    };

    const handleQuickRegister = async () => {
        if (!certInfo) return;
        setLoadingQuickRegister(true);
        setError(null);
        try {
            const res = await axios.post(`${API_URL}/companies/quick`, {
                name: certInfo.cn,
                cnpj: certInfo.cnpj?.replace(/\D/g, ''),
            });
            const novaEmpresa = res.data;
            setCompanies(prev => [...prev, novaEmpresa]);
            setFormData(prev => ({ ...prev, companyId: novaEmpresa.id }));
            setCompanyNotFound(false);

            // Se solicitado, salvar credenciais imediatamente para a nova empresa
            if (saveCredentials) {
                await axios.post(`${API_URL}/companies/${novaEmpresa.id}/credentials`, {
                    certificateLocalName: formData.certificateFilename,
                    password: formData.password
                });
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Erro ao cadastrar empresa.');
        } finally {
            setLoadingQuickRegister(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        if (!formData.companyId) {
            setError("Selecione uma Empresa no Sistema para salvar as notas.");
            return;
        }
        if (!formData.certificateFilename) {
            setError("Selecione um certificado digital A1.");
            return;
        }
        if (!formData.password) {
            setError("A senha do certificado é obrigatória.");
            return;
        }

        setLoadingExtrair(true);

        try {
            // Salvar credenciais se solicitado
            if (saveCredentials) {
                await axios.post(`${API_URL}/companies/${formData.companyId}/credentials`, {
                    certificateLocalName: formData.certificateFilename,
                    password: formData.password
                }).catch(e => console.error("Falha ao salvar credenciais silenciosamente", e));
            }

            const res = await axios.post(`${API_URL}/scraper/fetch-gov`, formData);
            setSuccess(res.data);
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.error || "Erro na extração RPA. Verifique o certificado e senha.");
        } finally {
            setLoadingExtrair(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                    <div>
                        <h3 className="font-bold text-lg text-slate-800">Busca Massiva de NFSe (Portal Gov.br)</h3>
                        <p className="text-sm text-slate-500 mt-0.5">O robô usará o certificado mTLS para extrair as notas selecionadas</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-8">
                    {error && (
                        <div className="p-4 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 flex items-center gap-2">
                            <AlertCircle size={20} />
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="p-4 bg-green-50 text-green-700 text-sm rounded-lg border border-green-100">
                            <div className="font-bold text-lg flex items-center gap-2 mb-1">
                                <CheckCircle className="text-green-600" size={24} />
                                Extração RPA concluída!
                            </div>
                            <p>{success.message}</p>
                            <p className="mt-2 text-green-800 font-medium">{success.count || 0} notas foram salvas com sucesso no banco de dados.</p>
                            <div className="mt-1 text-xs text-green-600 italic">{success.details}</div>
                        </div>
                    )}

                    {/* 0. DESTINO DOS DADOS */}
                    <section className="space-y-2">
                        <div className="flex items-center gap-2 text-slate-700 font-bold uppercase text-xs tracking-wider">
                            <Building2 size={18} />
                            0. DESTINO DOS DADOS
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Empresa no Sistema</label>
                            <select
                                name="companyId"
                                required
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none disabled:bg-slate-50"
                                value={formData.companyId}
                                onChange={handleChange}
                                disabled={loadingCompanies}
                            >
                                <option value="">— Validar certificado para auto-selecionar —</option>
                                {companies.map(c => (
                                    <option key={c.id} value={c.id}>{c.name} ({c.cnpj})</option>
                                ))}
                            </select>
                        </div>
                        {loadingCompanies && <p className="text-xs text-brand-600 animate-pulse">Carregando empresas...</p>}
                    </section>

                    {/* 1. AUTENTICAÇÃO A1 */}
                    <section className="space-y-4">
                        <div className="flex items-center gap-2 text-slate-700 font-bold uppercase text-xs tracking-wider">
                            <ShieldCheck size={18} />
                            1. AUTENTICAÇÃO A1
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Certificado Digital (.pfx)</label>
                                <div className="relative">
                                    <select
                                        name="certificateFilename"
                                        required
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none appearance-none disabled:bg-slate-50"
                                        value={formData.certificateFilename}
                                        onChange={handleChange}
                                        disabled={loadingFiles}
                                    >
                                        <option value="">Selecione um arquivo...</option>
                                        {localFiles.map((f, i) => (
                                            <option key={i} value={f}>{f}</option>
                                        ))}
                                    </select>
                                    {loadingFiles && (
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                            <Loader2 size={16} className="animate-spin text-brand-600" />
                                        </div>
                                    )}
                                </div>
                                <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                                    <HardDrive size={10} /> Buscando em: %USERPROFILE%\Documents\Certificados
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Senha do Certificado</label>
                                <input
                                    name="password"
                                    required
                                    type="password"
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                                    value={formData.password}
                                    onChange={handleChange}
                                />
                                <div className="mt-2 flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="saveCredentials"
                                        checked={saveCredentials}
                                        onChange={(e) => setSaveCredentials(e.target.checked)}
                                        className="rounded text-brand-600 focus:ring-brand-500"
                                    />
                                    <label htmlFor="saveCredentials" className="text-xs text-slate-500 cursor-pointer select-none">
                                        Salvar estas credenciais para esta empresa
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={handleValidateCert}
                                disabled={loadingValidate || !formData.certificateFilename || !formData.password}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loadingValidate ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                                Validar Certificado
                            </button>
                            {certInfo?.valid && (
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                                        <CheckCircle size={16} className="text-green-600 shrink-0" />
                                        <span>
                                            <strong>{certInfo.cn}</strong>
                                            {certInfo.cnpj && <span className="ml-1 text-green-600">({certInfo.cnpj})</span>}
                                            <span className="ml-2 text-xs text-green-600">
                                                — vence {new Date(certInfo.notAfter).toLocaleDateString('pt-BR')}
                                            </span>
                                        </span>
                                    </div>
                                    {companyNotFound && (
                                        <button
                                            type="button"
                                            onClick={handleQuickRegister}
                                            disabled={loadingQuickRegister}
                                            className="flex items-center gap-2 px-3 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-100 transition text-sm font-medium disabled:opacity-50"
                                        >
                                            {loadingQuickRegister
                                                ? <Loader2 size={14} className="animate-spin" />
                                                : <PlusCircle size={14} />}
                                            Cadastrar "{certInfo.cn}" no sistema
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </section>

                    {/* 2. PARÂMETROS DA EXTRAÇÃO */}
                    <section className="space-y-4">
                        <div className="flex items-center gap-2 text-slate-700 font-bold uppercase text-xs tracking-wider">
                            <Calendar size={18} />
                            2. PARÂMETROS DA EXTRAÇÃO
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Nota</label>
                                <select
                                    name="type"
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                                    value={formData.type}
                                    onChange={handleChange}
                                >
                                    <option value="recebidas">Notas Recebidas</option>
                                    <option value="emitidas">Notas Emitidas</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Período Rápido</label>
                                <select
                                    name="period"
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                                    value={formData.period}
                                    onChange={handleChange}
                                >
                                    <option value="atual">Mês Atual</option>
                                    <option value="anterior">Mês Anterior</option>
                                    <option value="retroativo">3 Meses Atrás</option>
                                    <option value="ano">Ano Atual</option>
                                    <option value="custom">Personalizado</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Formato Desejado</label>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, format: 'xml' })}
                                        className={`flex-1 py-2 text-sm font-bold rounded-lg border transition ${formData.format === 'xml' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                                    >
                                        XML
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, format: 'pdf' })}
                                        className={`flex-1 py-2 text-sm font-bold rounded-lg border transition ${formData.format === 'pdf' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                                    >
                                        PDF
                                    </button>
                                </div>
                            </div>
                        </div>

                        {formData.period === 'custom' && (
                            <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg animate-in fade-in slide-in-from-top-2">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">DE</label>
                                    <input
                                        name="startDate"
                                        type="date"
                                        className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-brand-500"
                                        value={formData.startDate}
                                        onChange={handleChange}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">ATÉ</label>
                                    <input
                                        name="endDate"
                                        type="date"
                                        className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-brand-500"
                                        value={formData.endDate}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>
                        )}
                    </section>

                    <div className="pt-6">
                        <button
                            type="submit"
                            disabled={loadingExtrair}
                            className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition flex items-center justify-center gap-3 shadow-lg shadow-slate-200 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {loadingExtrair ? (
                                <>
                                    <Loader2 className="animate-spin" size={24} />
                                    Extraindo dados...
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
