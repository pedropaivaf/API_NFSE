import { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Loader2, AlertCircle, Building2, HardDrive, ShieldCheck, Calendar, CheckCircle, PlusCircle, FileCode } from 'lucide-react';

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

    const [authMethod, setAuthMethod] = useState('pfx'); // 'pfx' ou 'password'

    const [formData, setFormData] = useState({
        companyId: '',
        certificateFilename: '',
        password: '',
        loginCnpj: '',
        loginPassword: '',
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

    const [saveCredentials, setSaveCredentials] = useState(() => {
        const saved = localStorage.getItem('saveUserPassword');
        return saved !== null ? JSON.parse(saved) : true;
    });

    useEffect(() => {
        localStorage.setItem('saveUserPassword', JSON.stringify(saveCredentials));
    }, [saveCredentials]);

    const [logs, setLogs] = useState([]);
    const [showLogs, setShowLogs] = useState(false);

    useEffect(() => {
        let eventSource;
        if (showLogs) {
            eventSource = new EventSource(`${API_URL}/api/logs`);
            eventSource.onmessage = (e) => {
                const newLog = JSON.parse(e.data);
                setLogs(prev => [...prev.slice(-100), newLog]); // Keep last 100 logs
            };
            eventSource.onerror = (e) => {
                console.error("SSE Error:", e);
                eventSource.close();
            };
        }
        return () => {
            if (eventSource) eventSource.close();
        };
    }, [showLogs]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        const val = type === 'checkbox' ? checked : value;

        setFormData(prev => ({ ...prev, [name]: val }));

        if (name === 'certificateFilename' || name === 'password') {
            setCertInfo(null);
            setCompanyNotFound(false);
        }
    };

    const handleValidateCert = async () => {
        if (authMethod === 'pfx' && (!formData.certificateFilename || !formData.password)) {
            setError('Selecione o certificado e informe a senha para validar.');
            return;
        }
        if (authMethod === 'password' && (!formData.loginCnpj || !formData.loginPassword)) {
            setError('Informe o Usuário (CPF/CNPJ) e a senha para validar.');
            return;
        }

        setLoadingValidate(true);
        setCertInfo(null);
        setCompanyNotFound(false);
        setError(null);
        try {
            const res = await axios.post(`${API_URL}/scraper/validate-cert`, {
                method: authMethod,
                certificateFilename: formData.certificateFilename,
                password: formData.password,
                loginCnpj: formData.loginCnpj,
                loginPassword: formData.loginPassword
            });
            const info = res.data;
            setCertInfo(info);

            // Auto-link: buscar empresa pelo CNPJ do certificado
            if (info.cnpj) {
                const cnpjLimpo = info.cnpj.replace(/\D/g, '');
                const matched = companies.find(c => c.cnpj?.replace(/\D/g, '') === cnpjLimpo);
                if (matched) {
                    setFormData(prev => ({ ...prev, companyId: matched.id }));
                    console.log(`[DEBUG] Empresa identificada automaticamente: ${matched.name}`);
                } else {
                    // Se não existe, cria automaticamente
                    setLoadingQuickRegister(true);
                    try {
                        const quickRes = await axios.post(`${API_URL}/companies/quick`, {
                            name: info.cn,
                            cnpj: cnpjLimpo,
                        });
                        const novaEmpresa = quickRes.data;
                        setCompanies(prev => [...prev, novaEmpresa]);
                        setFormData(prev => ({ ...prev, companyId: novaEmpresa.id }));
                        console.log(`[DEBUG] Nova empresa cadastrada automaticamente: ${novaEmpresa.name}`);
                    } catch (err) {
                        console.error("Erro ao cadastrar empresa automática:", err);
                        setError("Certificado válido, mas erro ao registrar empresa no sistema.");
                    } finally {
                        setLoadingQuickRegister(false);
                    }
                }
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Erro ao validar autenticação.');
        } finally {
            setLoadingValidate(false);
        }
    };


    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        const payload = {
            ...formData,
            method: authMethod
        };

        if (!payload.companyId) {
            setError("Valide a autenticação para identificar a empresa antes de extrair.");
            return;
        }

        if (authMethod === 'pfx' && !formData.certificateFilename) {
            setError("Selecione um certificado digital A1.");
            return;
        }

        if (authMethod === 'password' && (!formData.loginCnpj || !formData.loginPassword)) {
            setError("Usuário (CPF/CNPJ) e senha são obrigatórios.");
            return;
        }

        setLoadingExtrair(true);
        setLogs([]);
        setShowLogs(true);

        try {
            // Se for password e estiver marcado para salvar
            if (authMethod === 'password' && saveCredentials) {
                try {
                    await axios.post(`${API_URL}/companies/${formData.companyId}/credentials`, {
                        loginUser: formData.loginCnpj,
                        loginPassword: formData.loginPassword
                    });
                } catch (e) {
                    console.warn("Erro ao salvar credenciais de usuário:", e.message);
                }
            }

            const res = await axios.post(`${API_URL}/scraper/fetch-gov`, payload);
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

                    {/* TABS DE AUTENTICAÇÃO */}
                    <div className="flex border-b border-slate-200">
                        <button
                            type="button"
                            onClick={() => { setAuthMethod('pfx'); setCertInfo(null); }}
                            className={`px-6 py-3 text-sm font-bold transition-all border-b-2 ${authMethod === 'pfx' ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                        >
                            <div className="flex items-center gap-2">
                                <ShieldCheck size={18} />
                                Certificado A1
                            </div>
                        </button>
                        <button
                            type="button"
                            onClick={() => { setAuthMethod('password'); setCertInfo(null); }}
                            className={`px-6 py-3 text-sm font-bold transition-all border-b-2 ${authMethod === 'password' ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                        >
                            <div className="flex items-center gap-2">
                                <Building2 size={18} />
                                Usuário / Senha
                            </div>
                        </button>
                    </div>

                    {/* 1. AUTENTICAÇÃO */}
                    <section className="space-y-4 pt-4">
                        <div className="flex items-center gap-2 text-slate-700 font-bold uppercase text-xs tracking-wider">
                            <ShieldCheck size={18} />
                            1. {authMethod === 'pfx' ? 'AUTENTICAÇÃO A1' : 'ACESSO COM USUÁRIO/SENHA'}
                        </div>

                        {authMethod === 'pfx' ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-300">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Certificado Digital (.pfx)</label>
                                    <div className="relative">
                                        <select
                                            name="certificateFilename"
                                            required={authMethod === 'pfx'}
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
                                        <HardDrive size={10} /> Buscando em certificados locais
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Senha do Certificado</label>
                                    <input
                                        name="password"
                                        required={authMethod === 'pfx'}
                                        type="password"
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                                        value={formData.password}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-300">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Usuário (CPF/CNPJ)</label>
                                    <input
                                        name="loginCnpj"
                                        required={authMethod === 'password'}
                                        placeholder="00.000.000/0000-00"
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                                        value={formData.loginCnpj}
                                        onChange={handleChange}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Senha de Acesso</label>
                                    <input
                                        name="loginPassword"
                                        required={authMethod === 'password'}
                                        type="password"
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                                        value={formData.loginPassword}
                                        onChange={handleChange}
                                    />
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id="saveUserPassword"
                                            checked={saveCredentials}
                                            onChange={(e) => setSaveCredentials(e.target.checked)}
                                            className="rounded text-brand-600 focus:ring-brand-500"
                                        />
                                        <label htmlFor="saveUserPassword" className="text-xs text-slate-500 cursor-pointer select-none">
                                            Salvar estas credenciais
                                        </label>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={handleValidateCert}
                                disabled={loadingValidate || (authMethod === 'pfx' && (!formData.certificateFilename || !formData.password)) || (authMethod === 'password' && (!formData.loginCnpj || !formData.loginPassword))}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loadingValidate ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                                {authMethod === 'pfx' ? 'Validar Certificado' : 'Validar Acesso'}
                            </button>
                            {certInfo?.valid && (
                                <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                                    <CheckCircle size={16} className="text-green-600 shrink-0" />
                                    <span>
                                        Identificado: <strong>{certInfo.cn}</strong>
                                        {certInfo.cnpj && <span className="ml-1 text-green-600">({certInfo.cnpj})</span>}
                                        {certInfo.notAfter && (
                                            <span className="ml-2 text-xs text-green-600">
                                                — vence {new Date(certInfo.notAfter).toLocaleDateString('pt-BR')}
                                            </span>
                                        )}
                                    </span>
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
                                <label className="block text-sm font-medium text-slate-700 mb-1">Período</label>
                                <select
                                    name="period"
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                                    value={formData.period}
                                    onChange={handleChange}
                                >
                                    <option value="atual">Mês Atual (até 30 dias)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Formato de Saída</label>
                                <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 flex items-center gap-2">
                                    <FileCode size={16} className="text-slate-400" />
                                    XML (Padrão Nacional)
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

            {showLogs && (
                <div className="bg-slate-900 rounded-xl shadow-2xl overflow-hidden border border-slate-800">
                    <div className="px-4 py-2 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="flex gap-1.5">
                                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                            </div>
                            <span className="text-xs font-mono text-slate-400 ml-2">rpa-monitor.log</span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-500 uppercase">Filtro: {formData.period === 'custom' ? `${formData.startDate} - ${formData.endDate}` : formData.period}</span>
                    </div>
                    <div className="p-4 h-64 overflow-y-auto font-mono text-[11px] space-y-1 bg-black/40 scrollbar-thin">
                        {logs.length === 0 && <div className="text-slate-600 italic">Aguardando início do processo...</div>}
                        {logs.map((l, i) => (
                            <div key={i} className="flex gap-2 whitespace-pre-wrap">
                                <span className="text-slate-500 shrink-0">{l.timestamp?.split('T')[1].split('.')[0]}</span>
                                <span className={`font-bold shrink-0 ${l.type === 'error' ? 'text-red-400' : l.type === 'warn' ? 'text-yellow-400' : 'text-blue-400'}`}>
                                    [{l.type?.toUpperCase()}]
                                </span>
                                <span className="text-slate-200">{l.message}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

        </div>
    );
}
