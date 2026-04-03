import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Search, Loader2, AlertCircle, Building2, HardDrive, ShieldCheck, Calendar, CheckCircle, FileCode, ChevronDown, ChevronRight, Layers, ArrowDown, ArrowUp, Database, RefreshCcw, Info, RotateCcw } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function BuscarNota() {
    const [companies, setCompanies] = useState([]);
    const [companiesError, setCompaniesError] = useState(null);

    const [loadingFiles, setLoadingFiles] = useState(false);
    const [localFiles, setLocalFiles] = useState([]);

    const [loadingExtrair, setLoadingExtrair] = useState(false);
    const [loadingValidate, setLoadingValidate] = useState(false);
    const [certInfo, setCertInfo] = useState(null);
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
        endDate: '',
        syncMonth: new Date().toISOString().substring(0, 7) // YYYY-MM
    });
    const [isBulkSync, setIsBulkSync] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirmAction, setConfirmAction] = useState(null);
    const [bulkProgress, setBulkProgress] = useState({ total: 0, current: 0, currentName: '' });
    const [bulkResults, setBulkResults] = useState(null);
    const [isResetting, setIsResetting] = useState(false);
    
    // Custom Select State
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const dropdownRef = useRef(null);
    const searchTimeoutRef = useRef(null);
    
    // Novas seções recolhíveis com persistência
    const [expandedSections, setExpandedSections] = useState({
        auth: false,
        params: false
    });

    // Auto-hide para o progresso em lote após conclusão
    useEffect(() => {
        if (isBulkSync && bulkProgress.current > 0 && bulkProgress.current === bulkProgress.total) {
            const timer = setTimeout(() => {
                setIsBulkSync(false);
            }, 5000); // 5 segundos após concluir
            return () => clearTimeout(timer);
        }
    }, [isBulkSync, bulkProgress]);


    const toggleSection = (section) => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    const topRef = useRef(null);
    const logContainerRef = useRef(null);
    const logSectionRef = useRef(null);

    const fetchCompanies = async () => {
        setCompaniesError(null);
        try {
            const res = await axios.get(`${API_URL}/companies`);
            setCompanies(res.data || []);
        } catch (err) {
            console.error("Fetch Companies Error:", err);
            setCompaniesError("Não foi possível carregar empresas. Verifique se o backend está rodando.");
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

    // Auto-scroll log container to bottom on new logs
    useEffect(() => {
        if (logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
    }, [logs]);

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

        if (name === 'companyId' && value) {
            const selected = companies.find(c => c.id === value);
            if (selected) {
                setFormData(prev => ({
                    ...prev,
                    companyId: value,
                    certificateFilename: selected.certificate_local_name || prev.certificateFilename,
                    password: selected.certificate_password || prev.password,
                    loginCnpj: selected.login_user || selected.cnpj || prev.loginCnpj,
                    loginPassword: selected.login_password || prev.loginPassword
                }));
                if (selected.certificate_local_name || selected.certificate_url) {
                    setAuthMethod('pfx');
                } else if (selected.login_user) {
                    setAuthMethod('password');
                }
            }
        }

        if (name === 'certificateFilename' || name === 'password') {
            setCertInfo(null);
        }
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelectCompany = (company) => {
        setFormData(prev => ({ ...prev, companyId: company.id }));
        setDropdownOpen(false);
        setSearchTerm('');
    };

    const handleDropdownKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setDropdownOpen(!dropdownOpen);
            return;
        }

        if (e.key === 'Escape' || e.key === 'Tab') {
            setDropdownOpen(false);
            return;
        }

        if (e.key.length === 1) {
            const newTerm = (searchTerm + e.key).toLowerCase();
            setSearchTerm(newTerm);
            
            // Re-clear timeout
            if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
            searchTimeoutRef.current = setTimeout(() => {
                setSearchTerm('');
            }, 1000);

            // Find matching company
            const match = companies.find(c => 
                c.name.toLowerCase().includes(newTerm) || 
                c.cnpj.includes(newTerm)
            );
            
            if (match) {
                setFormData(prev => ({ ...prev, companyId: match.id }));
            }
        } else if (e.key === 'Backspace') {
            setSearchTerm(prev => prev.slice(0, -1));
        }
    };

    const handleReset = async () => {
        setIsResetting(true);
        setFormData({
            companyId: '',
            certificateFilename: '',
            password: '',
            loginCnpj: '',
            loginPassword: '',
            type: 'recebidas',
            period: 'atual',
            format: 'xml',
            startDate: '',
            endDate: '',
            syncMonth: new Date().toISOString().substring(0, 7)
        });
        setSuccess(null);
        setError(null);
        setBulkResults(null);
        setLogs([]);
        setShowLogs(false);
        setCertInfo(null);
        
        await fetchCompanies();
        
        setTimeout(() => {
            setIsResetting(false);
            topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 300);
    };

    const validateCertificate = async () => {
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

        if (formData.period === 'custom') {
            if (!formData.startDate || !formData.endDate) {
                setError("Informe as datas de início e fim para o período personalizado.");
                return;
            }
            const start = new Date(formData.startDate);
            const end = new Date(formData.endDate);
            if (end < start) {
                setError("A data de fim não pode ser anterior à data de início.");
                return;
            }
            const diffDays = (end - start) / (1000 * 60 * 60 * 24);
            if (diffDays > 30) {
                setError("O intervalo personalizado não pode exceder 30 dias (limite do portal NFSe).");
                return;
            }
        }

        setLoadingExtrair(true);
        setLogs([]);
        setShowLogs(true);
        // Auto-scroll page to the log terminal section
        setTimeout(() => {
            if (logSectionRef.current) {
                logSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 100);

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

    const handleBulkSync = async () => {
        setConfirmAction(() => async () => {
            setLoadingExtrair(true);
            setIsBulkSync(true);
            setBulkProgress({ total: companies.length, current: 0, currentName: 'Iniciando sincronização...' });
            setError(null);
            setSuccess(null);
            setBulkResults(null);
            setLogs([]);
            setShowLogs(true);

            // Scroll para o topo absoluto do componente ao iniciar
            setTimeout(() => {
                topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);

            try {
                const res = await axios.post(`${API_URL}/scraper/bulk-sync`, {
                    month: formData.syncMonth,
                    type: formData.type,
                }, { timeout: 0 });

                const { total, totalSaved, totalFound, totalSkipped, totalRetained, totalMismatch, totalRetroactive, totalErrors, results } = res.data;
                setBulkProgress({ total, current: total, currentName: 'Concluído' });
                setBulkResults(results || []);
                setSuccess({
                    message: `Lote concluído! ${total} empresa(s)`,
                    count: totalSaved,
                    found: totalFound,
                    skipped: totalSkipped,
                    retained: totalRetained,
                    mismatch: totalMismatch,
                    retroactive: totalRetroactive,
                    errors: totalErrors
                });

                // Scroll para o topo absoluto do componente após conclusão
                setTimeout(() => {
                    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 500);

            } catch (err) {
                console.error('Bulk sync error:', err);
                setError(err.response?.data?.error || 'Erro na sincronização em lote.');
            } finally {
                setLoadingExtrair(false);
                setIsBulkSync(false);
            }
        });
        setShowConfirmModal(true);
    };

    return (
        <div ref={topRef} className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                    <div>
                        <h3 className="font-bold text-lg text-slate-800">Busca NFSe (Portal Gov.br)</h3>
                        <p className="text-sm text-slate-500 mt-0.5">O robô usará o certificado mTLS ou credenciais de usuário e senha para extrair as notas do período selecionado</p>
                    </div>
                    <button
                        type="button"
                        onClick={handleReset}
                        disabled={isResetting}
                        title="Resetar Página"
                        className={`p-2 rounded-full transition-all ${isResetting ? 'bg-slate-100 text-slate-400' : 'bg-blue-50 text-blue-600 hover:bg-blue-100 hover:rotate-[-180deg] active:scale-95'} border border-blue-100 shadow-sm`}
                    >
                        <RotateCcw size={18} className={isResetting ? 'animate-spin' : ''} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-8">
                    {companiesError && (
                        <div className="p-3 bg-amber-50 text-amber-700 text-xs rounded-lg border border-amber-200 flex items-center justify-between gap-2">
                            <span className="flex items-center gap-2">
                                <AlertCircle size={14} className="shrink-0" />
                                {companiesError}
                            </span>
                            <button
                                type="button"
                                onClick={fetchCompanies}
                                className="text-xs font-semibold underline hover:text-amber-900 shrink-0"
                            >
                                Tentar novamente
                            </button>
                        </div>
                    )}

                    {error && (
                        <div className="p-4 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 flex items-center gap-2">
                            <AlertCircle size={20} />
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className={`p-5 rounded-xl border-2 ${success.errors > 0 ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}`}>
                            <div className="font-bold text-lg flex items-center gap-2 mb-3 text-slate-800">
                                <CheckCircle className={success.count > 0 ? 'text-green-600' : 'text-amber-500'} size={24} />
                                {success.count > 0 ? 'Extração concluída com sucesso!' : 'Extração concluída'}
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                <div className="bg-white rounded-lg p-3 border border-slate-100 text-center">
                                    <div className="text-2xl font-black text-slate-800">{success.found ?? success.count ?? 0}</div>
                                    <div className="text-xs font-semibold text-slate-500 mt-0.5">📄 Encontradas</div>
                                </div>
                                <div className="bg-white rounded-lg p-3 border border-green-100 text-center">
                                    <div className="text-2xl font-black text-green-700">{success.count ?? 0}</div>
                                    <div className="text-xs font-semibold text-slate-500 mt-0.5">💾 Novas Salvas</div>
                                </div>
                                <div className="bg-white rounded-lg p-3 border border-slate-100 text-center">
                                    <div className="text-2xl font-black text-slate-500">{success.skipped ?? 0}</div>
                                    <div className="text-xs font-semibold text-slate-500 mt-0.5">⏭️ Duplicadas</div>
                                </div>
                                {(success.retained ?? 0) > 0 && (
                                    <div className="bg-amber-50 rounded-lg p-3 border border-amber-100 text-center">
                                        <div className="text-2xl font-black text-amber-600">{success.retained}</div>
                                        <div className="text-xs font-semibold text-amber-700 mt-0.5">📌 Retidas</div>
                                    </div>
                                )}
                                {(success.mismatch ?? 0) > 0 && (
                                    <div className="bg-purple-50 rounded-lg p-3 border border-purple-100 text-center">
                                        <div className="text-2xl font-black text-purple-600">{success.mismatch}</div>
                                        <div className="text-xs font-semibold text-purple-700 mt-0.5">⚠️ Compet. Divergente</div>
                                    </div>
                                )}
                                {(success.retroactive ?? 0) > 0 && (
                                    <div className="bg-blue-50 rounded-lg p-3 border border-blue-100 text-center">
                                        <div className="text-2xl font-black text-blue-600">{success.retroactive}</div>
                                        <div className="text-xs font-semibold text-blue-700 mt-0.5">🕒 Retroativas</div>
                                    </div>
                                )}
                                {(success.errors ?? 0) > 0 && (
                                    <div className="bg-red-50 rounded-lg p-3 border border-red-100 text-center">
                                        <div className="text-2xl font-black text-red-600">{success.errors}</div>
                                        <div className="text-xs font-semibold text-red-700 mt-0.5">❌ Erros</div>
                                    </div>
                                )}
                            </div>
                            {success.message && (
                                <div className="mt-4 flex items-center justify-between bg-white/50 p-3 rounded-lg border border-slate-200/50">
                                    <p className="text-sm font-bold text-slate-600 uppercase tracking-tight">{success.message}</p>
                                    {showLogs && (
                                        <button 
                                            type="button"
                                            onClick={() => logSectionRef.current?.scrollIntoView({ behavior: 'smooth' })}
                                            className="bg-slate-900 border border-slate-700 text-white hover:bg-slate-800 text-[10px] font-black flex items-center gap-1.5 transition uppercase tracking-widest px-3 py-1.5 rounded-lg shadow-md ring-2 ring-slate-700"
                                        >
                                            <ArrowDown size={14} className="animate-bounce" /> Ver Terminal
                                        </button>
                                    )}
                                </div>
                            )}
                            {success.details && (
                                <p className="mt-1 text-xs text-slate-400 font-mono">{success.details}</p>
                            )}
                        </div>
                    )}


                    {/* 0. SELEÇÃO DE EMPRESA E SINCRONIZAÇÃO EM LOTE (LADO A LADO) */}
                    <section className="pb-6 border-b border-slate-100">
                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
                            {/* Lado Esquerdo: Seleção Individual */}
                            <div className="lg:col-span-3 space-y-3">
                                <div className="flex items-center gap-2 text-slate-700 font-bold uppercase text-[11px] tracking-wider">
                                    <Building2 size={16} />
                                    Selecionar Empresa Cadastrada
                                </div>
                                <div className="relative" ref={dropdownRef}>
                                    <div 
                                        tabIndex={0}
                                        onClick={() => setDropdownOpen(!dropdownOpen)}
                                        onKeyDown={handleDropdownKeyDown}
                                        className={`w-full px-4 py-2.5 border-2 rounded-xl bg-white text-sm cursor-pointer transition-all flex items-center justify-between group ${dropdownOpen ? 'border-slate-900 ring-4 ring-slate-100 shadow-lg' : 'border-slate-200 hover:border-slate-400 shadow-sm'}`}
                                    >
                                        <div className="flex flex-col overflow-hidden">
                                            {formData.companyId ? (
                                                <>
                                                    <span className="font-bold text-slate-900 truncate">
                                                        {companies.find(c => c.id === formData.companyId)?.name}
                                                    </span>
                                                    <span className="text-[10px] text-slate-500 font-mono">
                                                        {companies.find(c => c.id === formData.companyId)?.cnpj}
                                                    </span>
                                                </>
                                            ) : (
                                                <span className="text-slate-400 italic">--- Escolha uma empresa ---</span>
                                            )}
                                        </div>
                                        <ChevronDown size={18} className={`text-slate-400 transition-transform duration-300 ${dropdownOpen ? 'rotate-180' : ''}`} />
                                    </div>

                                    {dropdownOpen && (
                                        <div className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                            {searchTerm && (
                                                <div className="px-4 py-2 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-between">
                                                    <span>Buscando: {searchTerm}</span>
                                                    <Loader2 size={10} className="animate-spin" />
                                                </div>
                                            )}
                                            <div className="max-h-64 overflow-y-auto py-2 custom-scrollbar">
                                                {companies.length === 0 ? (
                                                    <div className="px-4 py-8 text-center text-slate-400 italic">Nenhuma empresa encontrada</div>
                                                ) : (
                                                    companies
                                                        .filter(c => !searchTerm || c.name.toLowerCase().includes(searchTerm) || c.cnpj.includes(searchTerm))
                                                        .map((c) => (
                                                            <div
                                                                key={c.id}
                                                                onClick={() => handleSelectCompany(c)}
                                                                className={`px-4 py-3 cursor-pointer transition-colors flex flex-col hover:bg-slate-50 border-l-4 ${formData.companyId === c.id ? 'bg-slate-50 border-slate-900' : 'border-transparent'}`}
                                                            >
                                                                <span className={`text-sm ${formData.companyId === c.id ? 'font-bold text-slate-900' : 'text-slate-700'}`}>
                                                                    {c.name}
                                                                </span>
                                                                <span className="text-[10px] text-slate-500 font-mono mt-0.5">{c.cnpj}</span>
                                                            </div>
                                                        ))
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <p className="text-[10px] text-slate-400 italic">
                                    Preenche automaticamente os dados de login e certificado salvos.
                                </p>
                            </div>

                            {/* Lado Direito: Sincronização em Lote (Mais enxuto) */}
                            <div className="lg:col-span-2">
                                <div className="p-4 bg-brand-50/50 rounded-2xl border border-brand-100/50 space-y-3">
                                    <div className="flex items-center gap-2 text-brand-700 font-bold uppercase text-[11px] tracking-wider">
                                        <Database size={16} />
                                        Sincronização em Lote (Mensal)
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input 
                                            type="month"
                                            name="syncMonth"
                                            className="flex-1 min-w-0 px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                                            value={formData.syncMonth}
                                            onChange={handleChange}
                                        />
                                        <button
                                            type="button"
                                            onClick={handleBulkSync}
                                            disabled={loadingExtrair || companies.length === 0}
                                            className="whitespace-nowrap px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 font-bold text-xs shadow-sm transition flex items-center gap-2"
                                        >
                                            {loadingExtrair ? <Loader2 size={12} className="animate-spin" /> : <RefreshCcw size={12} />}
                                            Sincronizar ({companies.length})
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-brand-600 leading-tight">Busca notas de todas as empresas para o mês selecionado.</p>
                                </div>
                            </div>
                        </div>

                        {bulkResults && bulkResults.length > 0 && (
                            <div className="mt-4 bg-white rounded-xl border border-slate-200 overflow-hidden">
                                <div className="px-4 py-2 bg-slate-50 border-b border-slate-200">
                                    <span className="text-xs font-bold text-slate-700 uppercase">Resultado por Empresa</span>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="text-slate-500 font-semibold border-b border-slate-100">
                                                <th className="px-4 py-2 text-left">Empresa</th>
                                                <th className="px-4 py-2 text-center">Status</th>
                                                <th className="px-4 py-2 text-right">Notas Salvas</th>
                                                <th className="px-4 py-2 text-right">Encontradas</th>
                                                <th className="px-4 py-2 text-left">Detalhe</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {bulkResults.map((r, i) => (
                                                <tr key={i} className={r.success ? '' : 'bg-red-50/50'}>
                                                    <td className="px-4 py-3 font-medium text-slate-800">{r.company}</td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] uppercase font-bold ${r.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                            {r.success ? 'OK' : 'Erro'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-bold text-slate-800">{r.count ?? '-'}</td>
                                                    <td className="px-4 py-3 text-right text-slate-500">{r.found ?? '-'}</td>
                                                    <td className="px-4 py-3 text-center">
                                                        <button 
                                                            type="button"
                                                            title={r.error || r.details || 'Sem detalhes'}
                                                            onClick={() => alert(`Detalhes de ${r.company}:\n\n${r.error || r.details || 'Processamento concluído com sucesso.'}`)}
                                                            className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition"
                                                        >
                                                            <Info size={14} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </section>

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
                    {/* 1. SEÇÃO DE ACESSO (RECOLHÍVEL) */}
                    <section className="space-y-4 pt-4">
                        <div 
                            className="flex items-center justify-between cursor-pointer group pb-2 border-b border-slate-100"
                            onClick={() => toggleSection('auth')}
                        >
                            <div className="flex items-center gap-2">
                                <ShieldCheck className="text-slate-400 group-hover:text-slate-600 transition" size={18} />
                                <h4 className="font-bold text-slate-700 uppercase tracking-wider text-xs flex items-center gap-2">
                                    1. {authMethod === 'pfx' ? 'Autenticação A1' : 'Acesso com Usuário/Senha'}
                                    {!expandedSections.auth && (
                                        <span className="text-[10px] font-normal text-slate-400 normal-case bg-slate-100 px-2 py-0.5 rounded-full">
                                            {authMethod === 'pfx' ? 'Usando Certificado' : `${formData.loginCnpj.substring(0, 5)}***`}
                                        </span>
                                    )}
                                </h4>
                            </div>
                            {expandedSections.auth ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
                        </div>

                        {expandedSections.auth && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                                {authMethod === 'pfx' ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Certificado Digital (.pfx)</label>
                                            <div className="relative">
                                                <select
                                                    name="certificateFilename"
                                                    required={authMethod === 'pfx'}
                                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-slate-900 outline-none appearance-none disabled:bg-slate-50"
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
                                                        <Loader2 size={16} className="animate-spin text-slate-600" />
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
                                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-slate-900 outline-none"
                                                value={formData.password}
                                                onChange={handleChange}
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Usuário (CPF/CNPJ)</label>
                                            <input
                                                name="loginCnpj"
                                                required={authMethod === 'password'}
                                                placeholder="00.000.000/0000-00"
                                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-slate-900 outline-none"
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
                                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-slate-900 outline-none"
                                                value={formData.loginPassword}
                                                onChange={handleChange}
                                            />
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    id="saveUserPassword"
                                                    checked={saveCredentials}
                                                    onChange={(e) => setSaveCredentials(e.target.checked)}
                                                    className="rounded text-slate-900 focus:ring-slate-900"
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
                                        onClick={validateCertificate}
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
                            </div>
                        )}
                    </section>

                    {/* 2. PARÂMETROS DA EXTRAÇÃO (RECOLHÍVEL) */}
                    <section className="space-y-4 pt-2">
                        <div 
                            className="flex items-center justify-between cursor-pointer group pb-2 border-b border-slate-100"
                            onClick={() => toggleSection('params')}
                        >
                            <div className="flex items-center gap-2">
                                <Calendar className="text-slate-400 group-hover:text-slate-600 transition" size={18} />
                                <h4 className="font-bold text-slate-700 uppercase tracking-wider text-xs">2. Parâmetros da Extração</h4>
                            </div>
                            {expandedSections.params ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
                        </div>

                        {expandedSections.params && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-300">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1">Tipo de Nota</label>
                                        <select
                                            name="type"
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-slate-900 outline-none"
                                            value={formData.type}
                                            onChange={handleChange}
                                        >
                                            <option value="recebidas">Notas Recebidas</option>
                                            <option value="emitidas">Notas Emitidas</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1">Período</label>
                                        <select
                                            name="period"
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-slate-900 outline-none"
                                            value={formData.period}
                                            onChange={handleChange}
                                        >
                                            <option value="atual">Mês Atual (últimos 30 dias)</option>
                                            <option value="history">Todo o Histórico (Últimos 5 Anos)</option>
                                            <option value="custom">Personalizado</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1">Formato de Saída</label>
                                        <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 flex items-center gap-2">
                                            <FileCode size={14} className="text-slate-400" />
                                            XML (Padrão Nacional)
                                        </div>
                                    </div>
                                </div>

                                {formData.period === 'custom' && (
                                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 animate-in fade-in slide-in-from-top-2 space-y-3">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">DE</label>
                                                <input
                                                    name="startDate"
                                                    type="date"
                                                    max={new Date().toISOString().split('T')[0]}
                                                    className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-slate-900"
                                                    value={formData.startDate}
                                                    onChange={handleChange}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">ATÉ</label>
                                                <input
                                                    name="endDate"
                                                    type="date"
                                                    min={formData.startDate || undefined}
                                                    max={formData.startDate
                                                        ? new Date(new Date(formData.startDate).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                                                        : new Date().toISOString().split('T')[0]}
                                                    className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-slate-900"
                                                    value={formData.endDate}
                                                    onChange={handleChange}
                                                />
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-amber-600 font-bold flex items-center gap-1">
                                            <AlertCircle size={10} />
                                            Intervalo máximo de 30 dias (limite do portal NFSe Gov.br)
                                        </p>
                                    </div>
                                )}
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

                {/* PROGRESSO EM LOTE — NOVO DESIGN PREMIUM */}
                {isBulkSync && (
                    <div className="bg-slate-900 rounded-3xl p-8 mb-8 shadow-2xl shadow-brand-200/20 text-white relative overflow-hidden border border-slate-800">
                        {/* Background subtle decoration */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-600/10 blur-[100px] rounded-full pointer-events-none"></div>
                        <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-600/10 blur-[80px] rounded-full pointer-events-none"></div>

                        <div className="relative z-10">
                            <div className="flex justify-between items-center mb-8">
                                <div className="flex items-center gap-4">
                                    <div className="bg-brand-600 p-3 rounded-2xl shadow-lg ring-4 ring-brand-600/20">
                                        <Layers className="animate-pulse" size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black tracking-tight text-white uppercase font-sans">Sincronização em Lote</h3>
                                        <p className="text-slate-400 text-sm font-medium">Processando {bulkProgress.total} empresas para {formData.syncMonth}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-3xl font-black text-brand-400 leading-none">
                                        {Math.round((bulkProgress.current / bulkProgress.total) * 100)}%
                                    </div>
                                    <div className="text-xs font-bold text-slate-500 uppercase mt-1 tracking-widest">
                                        {bulkProgress.current} de {bulkProgress.total} concluído
                                    </div>
                                </div>
                            </div>

                            {/* Barra de Progresso High-End */}
                            <div className="h-4 bg-slate-800 rounded-full mb-6 relative overflow-hidden ring-1 ring-white/5 p-1">
                                <div 
                                    className="h-full bg-gradient-to-r from-brand-600 via-brand-400 to-emerald-400 rounded-full transition-all duration-700 ease-out relative"
                                    style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}
                                >
                                    <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.2)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.2)_50%,rgba(255,255,255,0.2)_75%,transparent_75%,transparent)] bg-[length:20px_20px] animate-[progress-stripe_1s_linear_infinite]"></div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 bg-white/5 p-4 rounded-2xl border border-white/5">
                                <Loader2 className="animate-spin text-brand-400" size={18} />
                                <span className="text-slate-300 font-medium">
                                    {bulkProgress.currentName}
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {showLogs && (
                    <div ref={logSectionRef} className="bg-slate-900 rounded-xl shadow-2xl overflow-hidden border border-slate-800 relative group">
                        {/* Botão flutuante 'Voltar ao Topo' acima do terminal */}
                        <div className="absolute -top-12 left-0 right-0 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            <button 
                                onClick={() => topRef.current?.scrollIntoView({ behavior: 'smooth' })}
                                className="bg-white text-slate-900 px-4 py-1.5 rounded-full shadow-2xl border border-slate-200 text-xs font-black uppercase tracking-widest flex items-center gap-2 pointer-events-auto hover:bg-slate-50 active:scale-95 transition"
                            >
                                <ArrowUp size={14} /> Voltar ao Topo
                            </button>
                        </div>

                        <div className="px-4 py-2 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="flex gap-1.5">
                                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                </div>
                                <span className="text-xs font-mono text-slate-400 ml-2">rpa-monitor.log</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-[10px] font-mono text-slate-500 uppercase">Filtro: {formData.period === 'custom' ? `${formData.startDate} - ${formData.endDate}` : formData.period}</span>
                                <button 
                                    onClick={() => topRef.current?.scrollIntoView({ behavior: 'smooth' })}
                                    className="p-1 px-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition flex items-center gap-1.5 text-[10px] uppercase font-bold border border-slate-700"
                                >
                                    <ArrowUp size={10} /> Voltar ao Topo
                                </button>
                            </div>
                        </div>
                        <div ref={logContainerRef} className="p-4 h-64 overflow-y-auto font-mono text-[11px] space-y-1 bg-black/40 scrollbar-thin">
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

                <ConfirmModal
                    isOpen={showConfirmModal}
                    onClose={() => setShowConfirmModal(false)}
                    onConfirm={confirmAction}
                    title="Iniciar Sincronização?"
                    message={`Deseja iniciar a sincronização de ${companies.length} empresa(s) para o mês ${formData.syncMonth}?`}
                    confirmText="Iniciar Lote"
                    cancelText="Voltar"
                />
            </div>
    );
}
