
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
    Lock
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function Companies() {
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form states
    const [formData, setFormData] = useState({
        name: '',
        cnpj: '',
        password: '',
        loginUser: '',
        loginPassword: '',
        localFilename: ''
    });
    const [uploadMode, setUploadMode] = useState('upload'); // 'upload' or 'local'
    const [file, setFile] = useState(null);
    const [localFiles, setLocalFiles] = useState([]);
    const [loadingFiles, setLoadingFiles] = useState(false);

    useEffect(() => {
        fetchCompanies();
        fetchLocalFiles();
    }, []);

    const fetchCompanies = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_URL}/companies`);
            setCompanies(res.data);
        } catch (err) {
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
        } catch (err) {
            setError("Erro ao excluir empresa");
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);
        setSuccess(null);

        try {
            const data = new FormData();
            data.append('name', formData.name);
            data.append('cnpj', formData.cnpj);
            data.append('password', formData.password);
            data.append('loginUser', formData.loginUser);
            data.append('loginPassword', formData.loginPassword);
            
            if (uploadMode === 'local') {
                data.append('localFilename', formData.localFilename);
            } else if (file) {
                data.append('certificate', file);
            }

            await axios.post(`${API_URL}/companies`, data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setSuccess("Empresa cadastrada com sucesso!");
            setIsModalOpen(false);
            resetForm();
            fetchCompanies();
        } catch (err) {
            setError(err.response?.data?.error || "Erro ao cadastrar empresa");
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
            localFilename: ''
        });
        setFile(null);
        setUploadMode('upload');
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Gerenciamento de Empresas</h2>
                    <p className="text-slate-500">Cadastre e gerencie os perfis de acesso das empresas.</p>
                </div>
                <button 
                    onClick={() => { resetForm(); setIsModalOpen(true); }}
                    className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition font-medium shadow-sm"
                >
                    <Plus size={20} />
                    Nova Empresa
                </button>
            </div>

            {error && (
                <div className="flex items-center gap-3 p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 animate-in fade-in slide-in-from-top-4">
                    <AlertCircle size={20} />
                    <p className="text-sm font-medium">{error}</p>
                    <button onClick={() => setError(null)} className="ml-auto"><X size={16} /></button>
                </div>
            )}

            {success && (
                <div className="flex items-center gap-3 p-4 bg-green-50 text-green-700 rounded-xl border border-green-100 animate-in fade-in slide-in-from-top-4">
                    <CheckCircle2 size={20} />
                    <p className="text-sm font-medium">{success}</p>
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
                        <div key={company.id} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition group overflow-hidden relative">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-slate-100 rounded-xl text-slate-600">
                                    <Building2 size={24} />
                                </div>
                                <button 
                                    onClick={() => handleDelete(company.id)}
                                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                            
                            <h3 className="font-bold text-slate-900 group-hover:text-brand-600 transition truncate">{company.name}</h3>
                            <p className="text-sm text-slate-500 font-mono mb-4">{company.cnpj}</p>
                            
                            <div className="flex flex-wrap gap-2 mt-auto">
                                {company.certificate_local_name || company.certificate_url ? (
                                    <span className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-[10px] uppercase font-bold">
                                        <ShieldCheck size={12} /> Certificado
                                    </span>
                                ) : null}
                                {company.login_user ? (
                                    <span className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 text-amber-700 rounded-md text-[10px] uppercase font-bold">
                                        <Key size={12} /> Usuário/Senha
                                    </span>
                                ) : null}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="col-span-full py-12 text-center bg-white rounded-2xl border-2 border-dashed border-slate-200">
                        <Building2 className="mx-auto text-slate-300 mb-4" size={48} />
                        <h3 className="text-lg font-medium text-slate-800">Nenhuma empresa cadastrada</h3>
                        <p className="text-slate-500">Cadastre a primeira empresa para começar as buscas.</p>
                    </div>
                )}
            </div>

            {/* Registration Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
                    <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl relative animate-in zoom-in-95 duration-200 my-auto">
                        <div className="flex items-center justify-between p-6 border-b border-slate-100">
                            <h3 className="text-xl font-bold text-slate-800">Nova Empresa</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <section className="space-y-4">
                                    <h4 className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-wider">
                                        <Building2 size={16} /> Dados Básicos
                                    </h4>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Razão Social</label>
                                        <input 
                                            required
                                            type="text"
                                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">CNPJ</label>
                                        <input 
                                            required
                                            type="text"
                                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none font-mono"
                                            placeholder="00.000.000/0001-00"
                                            value={formData.cnpj}
                                            onChange={e => setFormData({ ...formData, cnpj: e.target.value })}
                                        />
                                    </div>
                                </section>

                                <section className="space-y-4">
                                    <h4 className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-wider">
                                        <Key size={16} /> Credenciais Acesso
                                    </h4>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Usuário Login (Gov.br)</label>
                                        <div className="relative">
                                            <User size={16} className="absolute left-3 top-2.5 text-slate-400" />
                                            <input 
                                                type="text"
                                                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
                                                value={formData.loginUser}
                                                onChange={e => setFormData({ ...formData, loginUser: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Senha Login</label>
                                        <div className="relative">
                                            <Lock size={16} className="absolute left-3 top-2.5 text-slate-400" />
                                            <input 
                                                type="password"
                                                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
                                                value={formData.loginPassword}
                                                onChange={e => setFormData({ ...formData, loginPassword: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </section>
                            </div>

                            <hr className="border-slate-100" />

                            <section className="space-y-4">
                                <h4 className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-wider">
                                    <ShieldCheck size={16} /> Certificado Digital (A1)
                                </h4>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Senha do Certificado</label>
                                        <input 
                                            type="password"
                                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
                                            value={formData.password}
                                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Modo de Certificado</label>
                                        <div className="flex bg-slate-100 p-1 rounded-xl">
                                            <button 
                                                type="button"
                                                onClick={() => setUploadMode('upload')}
                                                className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-semibold rounded-lg transition ${uploadMode === 'upload' ? 'bg-white shadow-sm text-brand-600' : 'text-slate-500'}`}
                                            >
                                                <FileUp size={14} /> Upload
                                            </button>
                                            <button 
                                                type="button"
                                                onClick={() => setUploadMode('local')}
                                                className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-semibold rounded-lg transition ${uploadMode === 'local' ? 'bg-white shadow-sm text-brand-600' : 'text-slate-500'}`}
                                            >
                                                <HardDrive size={14} /> Servidor
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {uploadMode === 'upload' ? (
                                    <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center hover:bg-slate-50 transition relative">
                                        <input 
                                            type="file" 
                                            accept=".pfx"
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            onChange={e => setFile(e.target.files[0])}
                                        />
                                        <Upload className="mx-auto text-slate-300 mb-2" size={32} />
                                        <p className="text-sm font-medium text-slate-600">
                                            {file ? file.name : "Arraste ou clique para enviar o arquivo .pfx"}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <select 
                                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
                                            value={formData.localFilename}
                                            onChange={e => setFormData({ ...formData, localFilename: e.target.value })}
                                        >
                                            <option value="">Selecione o arquivo no drive V:...</option>
                                            {localFiles.map(f => <option key={f} value={f}>{f}</option>)}
                                        </select>
                                        {loadingFiles && <p className="text-[10px] text-slate-400 flex items-center gap-1"><Loader2 size={10} className="animate-spin" /> Carregando arquivos do servidor...</p>}
                                    </div>
                                )}
                            </section>

                            <div className="flex gap-4 pt-4">
                                <button 
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 px-6 py-3 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition font-bold"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 px-6 py-3 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <Plus size={20} />}
                                    {isSubmitting ? "Cadastrando..." : "Cadastrar Empresa"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
