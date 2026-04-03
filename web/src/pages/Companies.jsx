
import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    Building2, 
    Plus, 
    Trash2, 
    ShieldCheck, 
    Key, 
    Upload, 
    HardDrive, 
    FileUp, 
    Loader2, 
    AlertCircle, 
    CheckCircle2,
    X,
    User,
    Lock,
    Pencil,
    Eye,
    EyeOff
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function Companies() {
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingId, setEditingId] = useState(null);

    // Form states
    const [formData, setFormData] = useState({
        name: '',
        cnpj: '',
        password: '',
        loginUser: '',
        loginPassword: '',
        localFilename: '',
        custom_output_path: ''
    });
    const [uploadMode, setUploadMode] = useState('upload'); // 'upload' or 'local'
    const [file, setFile] = useState(null);
    const [localFiles, setLocalFiles] = useState([]);
    const [loadingFiles, setLoadingFiles] = useState(false);
    const [showLoginPassword, setShowLoginPassword] = useState(false);
    const [showCertPassword, setShowCertPassword] = useState(false);

    useEffect(() => {
        fetchCompanies();
        fetchLocalFiles();
    }, []);

    const fetchCompanies = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_URL}/companies`);
            setCompanies(res.data);
        } catch {
            setError("Erro ao carregar empresas");
        } finally {
            setLoading(false);
        }
    };

    const fetchLocalFiles = async () => {
        setLoadingFiles(true);
        try {
            const res = await axios.get(`${API_URL}/companies/local-certificates`);
            setLocalFiles(res.data.files || []);
        } catch (err) {
            console.error("Local files error:", err);
        } finally {
            setLoadingFiles(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("Tem certeza que deseja excluir esta empresa? Todas as notas vinculadas também poderão ser afetadas.")) return;
        
        try {
            await axios.delete(`${API_URL}/companies/${id}`);
            setSuccess("Empresa excluída!");
            fetchCompanies();
        } catch {
            setError("Erro ao excluir empresa");
        }
    };

    const handleEdit = (company) => {
        setEditingId(company.id);
        setFormData({
            name: company.name || '',
            cnpj: company.cnpj || '',
            password: company.certificate_password || '',
            loginUser: company.login_user || '',
            loginPassword: company.login_password || '',
            localFilename: company.certificate_local_name || '',
            custom_output_path: company.custom_output_path || ''
        });
        setUploadMode(company.certificate_local_name ? 'local' : 'upload');
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);
        setSuccess(null);

        try {
            if (editingId) {
                // Update existing
                await axios.put(`${API_URL}/companies/${editingId}`, formData);
                setSuccess("Empresa atualizada com sucesso!");
            } else {
                // Create new
                const data = new FormData();
                data.append('name', formData.name);
                data.append('cnpj', formData.cnpj);
                data.append('password', formData.password);
                data.append('loginUser', formData.loginUser);
                data.append('loginPassword', formData.loginPassword);
                data.append('custom_output_path', formData.custom_output_path);
                
                if (uploadMode === 'local') {
                    data.append('localFilename', formData.localFilename);
                } else if (file) {
                    data.append('certificate', file);
                }

                await axios.post(`${API_URL}/companies`, data, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                setSuccess("Empresa cadastrada com sucesso!");
            }

            setIsModalOpen(false);
            resetForm();
            fetchCompanies();
        } catch (err) {
            setError(err.response?.data?.error || "Erro ao processar empresa");
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            cnpj: '',
            password: '',
            loginUser: '',
            loginPassword: '',
            localFilename: '',
            custom_output_path: ''
        });
        setFile(null);
        setUploadMode('upload');
        setEditingId(null);
        setShowLoginPassword(false);
        setShowCertPassword(false);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Gerenciamento de Empresas</h2>
                    <p className="text-slate-500">Cadastre e gerencie os perfis de acesso das empresas.</p>
                </div>
                <button 
                    onClick={() => { resetForm(); setIsModalOpen(true); }}
                    className="flex items-center gap-2 px-6 py-2.5 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition font-bold shadow-md ring-1 ring-brand-700"
                >
                    <Plus size={20} className="stroke-[3]" />
                    Nova Empresa
                </button>
            </div>

            {error && (
                <div className="flex items-center gap-3 p-4 bg-red-50 text-red-700 rounded-xl border border-red-200 animate-in fade-in slide-in-from-top-4">
                    <AlertCircle size={20} />
                    <p className="text-sm font-bold">{error}</p>
                    <button onClick={() => setError(null)} className="ml-auto"><X size={16} /></button>
                </div>
            )}

            {success && (
                <div className="flex items-center gap-3 p-4 bg-green-50 text-green-700 rounded-xl border border-green-200 animate-in fade-in slide-in-from-top-4">
                    <CheckCircle2 size={20} />
                    <p className="text-sm font-bold">{success}</p>
                    <button onClick={() => setSuccess(null)} className="ml-auto"><X size={16} /></button>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    Array(3).fill(0).map((_, i) => (
                        <div key={i} className="bg-white rounded-2xl p-6 border border-slate-200 animate-pulse h-48" />
                    ))
                ) : companies.length > 0 ? (
                    companies.map((company) => (
                        <div key={company.id} className="bg-white rounded-2xl p-6 border-2 border-slate-200 shadow-sm hover:shadow-lg transition group overflow-hidden relative flex flex-col">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-slate-100 rounded-xl text-slate-700 border border-slate-200">
                                    <Building2 size={24} />
                                </div>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => handleEdit(company)}
                                        className="p-2 text-slate-500 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition border border-slate-100"
                                        title="Editar"
                                    >
                                        <Pencil size={18} />
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(company.id)}
                                        className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition border border-slate-100"
                                        title="Excluir"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                            
                            <h3 className="font-extrabold text-slate-900 group-hover:text-brand-700 transition truncate text-lg">
                                {company.name || "Sem Nome"}
                            </h3>
                            <p className="text-sm text-slate-600 font-bold font-mono mb-4 tracking-tight">
                                {company.cnpj}
                            </p>
                            
                            <div className="flex flex-wrap gap-2 mt-auto">
                                {company.certificate_local_name || company.certificate_url ? (
                                    <span className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-100 text-blue-800 rounded-md text-[10px] uppercase font-black border border-blue-200">
                                        <ShieldCheck size={12} /> Certificado
                                    </span>
                                ) : null}
                                {company.login_user ? (
                                    <span className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 text-amber-800 rounded-md text-[10px] uppercase font-black border border-amber-200">
                                        <Key size={12} /> Usuário/Senha
                                    </span>
                                ) : null}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="col-span-full py-20 text-center bg-white rounded-2xl border-2 border-dashed border-slate-300">
                        <Building2 className="mx-auto text-slate-400 mb-4 opacity-50" size={64} />
                        <h3 className="text-xl font-bold text-slate-900">Nenhuma empresa cadastrada</h3>
                        <p className="text-slate-500 font-medium">Cadastre a primeira empresa para começar as buscas.</p>
                    </div>
                )}
            </div>

            {/* Registration/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex bg-slate-100 overflow-hidden">
                    <div className="bg-white w-full h-full relative animate-in zoom-in-95 duration-200 flex flex-col">
                        <div className="flex flex-shrink-0 items-center justify-between p-6 px-10 border-b border-slate-200 bg-white z-10 shadow-sm">
                            <div>
                                <h3 className="text-2xl font-black text-slate-900">{editingId ? "Editar Empresa" : "Nova Empresa"}</h3>
                                <p className="text-slate-500 text-sm font-medium">Preencha as informações de acesso da empresa.</p>
                            </div>
                            <button type="button" onClick={() => setIsModalOpen(false)} className="p-3 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition"><X size={28} /></button>
                        </div>

                        <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                            <form id="company-form" onSubmit={handleSubmit} className="flex flex-col p-8 md:p-10 space-y-6 max-w-5xl mx-auto w-full">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <section className="space-y-4">
                                    <h4 className="flex items-center gap-2 text-xs font-black text-slate-900 uppercase tracking-widest opacity-60">
                                        <Building2 size={16} /> Dados Básicos
                                    </h4>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-900 mb-1.5">Razão Social</label>
                                        <input 
                                            required
                                            type="text"
                                            className="w-full px-4 py-3 bg-slate-100 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-brand-500/10 focus:border-brand-600 outline-none transition font-medium text-slate-900"
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-900 mb-1.5">CNPJ</label>
                                        <input 
                                            required
                                            type="text"
                                            className="w-full px-4 py-3 bg-slate-100 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-brand-500/10 focus:border-brand-600 outline-none font-black text-slate-900"
                                            placeholder="00.000.000/0001-00"
                                            value={formData.cnpj}
                                            onChange={e => setFormData({ ...formData, cnpj: e.target.value })}
                                        />
                                    </div>
                                </section>

                                <section className="space-y-4">
                                    <h4 className="flex items-center gap-2 text-xs font-black text-slate-900 uppercase tracking-widest opacity-60">
                                        <Key size={16} /> Credenciais Acesso
                                    </h4>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-900 mb-1.5">Usuário Login (Gov.br)</label>
                                        <div className="relative">
                                            <User size={18} className="absolute left-4 top-3.5 text-slate-500" />
                                            <input 
                                                type="text"
                                                className="w-full pl-12 pr-4 py-3 bg-slate-100 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-brand-500/10 focus:border-brand-600 outline-none transition font-medium text-slate-900"
                                                value={formData.loginUser}
                                                onChange={e => setFormData({ ...formData, loginUser: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-900 mb-1.5">Senha Login</label>
                                        <div className="relative">
                                            <Lock size={18} className="absolute left-4 top-3.5 text-slate-500" />
                                            <input 
                                                type={showLoginPassword ? "text" : "password"}
                                                className="w-full pl-12 pr-12 py-3 bg-slate-100 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-brand-500/10 focus:border-brand-600 outline-none transition font-medium text-slate-900"
                                                value={formData.loginPassword}
                                                onChange={e => setFormData({ ...formData, loginPassword: e.target.value })}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowLoginPassword(!showLoginPassword)}
                                                className="absolute right-4 top-3.5 text-slate-400 hover:text-slate-600 transition"
                                            >
                                                {showLoginPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                    </div>
                                </section>
                            </div>

                            <hr className="border-slate-100" />

                            <section className="space-y-5">
                                <h4 className="flex items-center gap-2 text-xs font-black text-slate-900 uppercase tracking-widest opacity-60">
                                    <ShieldCheck size={16} /> Certificado Digital (A1)
                                </h4>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-900 mb-1.5">Senha do Certificado</label>
                                        <div className="relative">
                                            <input 
                                                type={showCertPassword ? "text" : "password"}
                                                className="w-full pl-4 pr-12 py-3 bg-slate-100 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-brand-500/10 focus:border-brand-600 outline-none transition font-medium text-slate-900"
                                                value={formData.password}
                                                onChange={e => setFormData({ ...formData, password: e.target.value })}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowCertPassword(!showCertPassword)}
                                                className="absolute right-4 top-3.5 text-slate-400 hover:text-slate-600 transition"
                                            >
                                                {showCertPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-900 mb-1.5">Modo de Certificado</label>
                                        <div className="flex bg-slate-200 p-1 rounded-2xl">
                                            <button 
                                                type="button"
                                                onClick={() => setUploadMode('upload')}
                                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-black rounded-xl transition ${uploadMode === 'upload' ? 'bg-white shadow-md text-brand-700' : 'text-slate-600'} hover:bg-white/50`}
                                            >
                                                <FileUp size={14} /> Upload
                                            </button>
                                            <button 
                                                type="button"
                                                onClick={() => setUploadMode('local')}
                                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-black rounded-xl transition ${uploadMode === 'local' ? 'bg-white shadow-md text-brand-700' : 'text-slate-600'} hover:bg-white/50`}
                                            >
                                                <HardDrive size={14} /> Servidor
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {uploadMode === 'upload' ? (
                                    <div className={`border-2 border-dashed ${file ? 'border-brand-400 bg-brand-50' : 'border-slate-300'} rounded-2xl p-8 text-center hover:bg-slate-50 transition relative group`}>
                                        <input 
                                            type="file" 
                                            accept=".pfx"
                                            disabled={!!editingId}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                                            onChange={e => setFile(e.target.files[0])}
                                        />
                                        <Upload className={`mx-auto mb-3 transition-colors ${file ? 'text-brand-600' : 'text-slate-400 group-hover:text-slate-600'}`} size={40} />
                                        <p className={`text-sm font-black ${file ? 'text-brand-700' : 'text-slate-600'}`}>
                                            {file ? file.name : editingId ? "Certificado já vinculado (não pode ser alterado aqui)" : "Arraste ou clique para enviar o arquivo .pfx"}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <select 
                                            className="w-full px-4 py-3 bg-slate-100 border-2 border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-600 font-bold text-slate-900 transition"
                                            value={formData.localFilename}
                                            onChange={e => setFormData({ ...formData, localFilename: e.target.value })}
                                        >
                                            <option value="">Selecione o arquivo no drive V:...</option>
                                            {localFiles.map(f => <option key={f} value={f}>{f}</option>)}
                                        </select>
                                        {loadingFiles && <p className="text-[10px] text-slate-500 flex items-center gap-1.5 font-bold"><Loader2 size={12} className="animate-spin text-brand-600" /> Carregando lista de arquivos...</p>}
                                    </div>
                                )}
                            </section>

                            <hr className="border-slate-100" />

                            <section className="space-y-4">
                                <h4 className="flex items-center gap-2 text-xs font-black text-slate-900 uppercase tracking-widest opacity-60">
                                    <HardDrive size={16} /> Configurações de Arquivos
                                </h4>
                                <div>
                                    <label className="block text-sm font-bold text-slate-900 mb-1.5">Caminho de Saída Customizado (Opcional)</label>
                                    <div className="relative">
                                        <HardDrive size={18} className="absolute left-4 top-3.5 text-slate-500" />
                                        <input 
                                            type="text"
                                            className="w-full pl-12 pr-4 py-3 bg-slate-100 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-brand-500/10 focus:border-brand-600 outline-none transition font-medium text-slate-900"
                                            placeholder="Ex: C:\Notas\Empresa_A (Deixe vazio para usar o padrão)"
                                            value={formData.custom_output_path}
                                            onChange={e => setFormData({ ...formData, custom_output_path: e.target.value })}
                                        />
                                    </div>
                                    <p className="mt-1.5 text-[10px] text-slate-500 font-bold">
                                        Se definido, este caminho substituirá a configuração global para esta empresa.
                                    </p>
                                </div>
                            </section>

                            </form>
                        </div>

                        <div className="flex-shrink-0 border-t border-slate-200 bg-white p-6 px-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10">
                            <div className="flex gap-4 max-w-5xl mx-auto w-full">
                                <button 
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 px-6 py-3 border-2 border-slate-200 text-slate-900 rounded-xl hover:bg-slate-100 transition font-black shadow-sm"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    type="submit"
                                    form="company-form"
                                    disabled={isSubmitting}
                                    className="flex-1 px-6 py-3 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition font-black flex items-center justify-center gap-3 shadow-md shadow-brand-200 disabled:opacity-50 ring-2 ring-brand-700"
                                >
                                    {isSubmitting ? <Loader2 size={24} className="animate-spin" /> : editingId ? <CheckCircle2 size={24} /> : <Plus size={24} className="stroke-[3]" />}
                                    {isSubmitting ? "Processando..." : editingId ? "Salvar" : "Cadastrar"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
