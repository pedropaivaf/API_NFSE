
import { useState } from 'react';
import axios from 'axios';
import { X, Upload, Loader2, HardDrive, FileUp, Eye, EyeOff } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function AddCompanyModal({ isOpen, onClose, onSuccess }) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        cnpj: '',
        password: ''
    });
    const [file, setFile] = useState(null);
    const [error, setError] = useState(null);
    const [uploadMode, setUploadMode] = useState('upload'); // 'upload' | 'local'
    const [localFiles, setLocalFiles] = useState([]);
    const [selectedLocalFile, setSelectedLocalFile] = useState('');
    const [loadingFiles, setLoadingFiles] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    if (!isOpen) return null;

    // Fetch local files when switching to local mode
    const handleModeSwitch = async (mode) => {
        setUploadMode(mode);
        if (mode === 'local' && localFiles.length === 0) {
            setLoadingFiles(true);
            try {
                const res = await axios.get(`${API_URL}/companies/local-certificates`);
                setLocalFiles(res.data.files || []);
                if (res.data.error) setError(res.data.error);
            } catch (err) {
                console.error(err);
                setError("Erro ao buscar arquivos no servidor");
            } finally {
                setLoadingFiles(false);
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const data = new FormData();
            data.append('name', formData.name);
            data.append('cnpj', formData.cnpj);
            data.append('password', formData.password);

            if (uploadMode === 'upload') {
                if (!file) throw new Error("O arquivo do certificado (.pfx) é obrigatório");
                data.append('certificate', file);
            } else {
                if (!selectedLocalFile) throw new Error("Selecione um arquivo do servidor");
                data.append('localFilename', selectedLocalFile);
            }

            await axios.post(`${API_URL}/companies`, data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            onSuccess();
            onClose();
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.error || err.message || "Erro ao cadastrar empresa");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex bg-slate-100 overflow-hidden">
            <div className="bg-white w-full h-full relative flex flex-col">
                <div className="px-8 py-6 border-b border-slate-200 flex justify-between items-center bg-white flex-shrink-0 z-10 shadow-sm">
                    <h3 className="font-bold text-2xl text-slate-800">Nova Empresa</h3>
                        <button type="button" onClick={onClose} aria-label="Fechar" className="p-3 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    <div className="max-w-4xl mx-auto w-full p-8 md:p-10">
                        <form id="add-company-form" onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                        <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Razão Social</label>
                        <input
                            required
                            type="text"
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">CNPJ</label>
                            <input
                                required
                                type="text"
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                                placeholder="00000000000100"
                                value={formData.cnpj}
                                onChange={e => setFormData({ ...formData, cnpj: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Senha Certificado</label>
                            <div className="relative">
                                <input
                                    required
                                    type={showPassword ? "text" : "password"}
                                    className="w-full pl-3 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                />
                                <button
                                    type="button"
                                        aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 transition"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Certificado Digital (A1)</label>

                        <div className="flex bg-slate-100 p-1 rounded-lg mb-4">
                            <button
                                type="button"
                                onClick={() => handleModeSwitch('upload')}
                                className={`flex-1 py-1.5 text-sm font-medium rounded-md flex items-center justify-center gap-2 transition ${uploadMode === 'upload' ? 'bg-white shadow-sm text-brand-700' : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                <FileUp size={16} /> Upload do PC
                            </button>
                            <button
                                type="button"
                                onClick={() => handleModeSwitch('local')}
                                className={`flex-1 py-1.5 text-sm font-medium rounded-md flex items-center justify-center gap-2 transition ${uploadMode === 'local' ? 'bg-white shadow-sm text-brand-700' : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                <HardDrive size={16} /> Buscar no Servidor
                            </button>
                        </div>

                        {uploadMode === 'upload' ? (
                            <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:bg-slate-50 transition cursor-pointer relative">
                                <input
                                    type="file"
                                    accept=".pfx,.p12"
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    onChange={e => setFile(e.target.files[0])}
                                />
                                <div className="flex flex-col items-center pointer-events-none">
                                    <Upload className="text-slate-400 mb-2" size={24} />
                                    <span className="text-sm text-slate-600 font-medium">
                                        {file ? file.name : "Clique para selecionar o certificado"}
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <div className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                                {loadingFiles ? (
                                    <div className="flex items-center gap-2 text-slate-500 text-sm justify-center py-4">
                                        <Loader2 className="animate-spin" size={16} />
                                        Buscando arquivos...
                                    </div>
                                ) : localFiles.length > 0 ? (
                                    <select
                                        className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-sm outline-none focus:border-brand-500"
                                        value={selectedLocalFile}
                                        onChange={(e) => setSelectedLocalFile(e.target.value)}
                                    >
                                        <option value="">Selecione um arquivo...</option>
                                        {localFiles.map((f, i) => (
                                            <option key={i} value={f}>{f}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <div className="text-center text-sm text-slate-500 py-4">
                                        Nenhum arquivo .pfx encontrado na pasta do servidor.
                                        <br />
                                        <span className="text-xs text-slate-400">(V:\Certificado Digital)</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                        </form>
                    </div>
                </div>

                <div className="flex-shrink-0 border-t border-slate-200 bg-white p-6 px-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10">
                    <div className="flex gap-4 max-w-4xl mx-auto w-full justify-end">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-3 text-slate-600 border-2 border-slate-200 hover:bg-slate-100 rounded-xl font-black shadow-sm transition"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            form="add-company-form"
                            disabled={loading}
                            className="px-6 py-3 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition font-black shadow-md shadow-brand-200 disabled:opacity-50 flex items-center gap-3 ring-2 ring-brand-700"
                        >
                            {loading && <Loader2 className="animate-spin" size={20} />}
                            Salvar Empresa
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
