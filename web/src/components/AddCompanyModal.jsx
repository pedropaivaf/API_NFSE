
import { useState } from 'react';
import axios from 'axios';
import { X, Upload, Loader2, HardDrive, FileUp } from 'lucide-react';

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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-lg text-slate-800">Nova Empresa</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
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
                            <input
                                required
                                type="password"
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                                value={formData.password}
                                onChange={e => setFormData({ ...formData, password: e.target.value })}
                            />
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

                    <div className="pt-4 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-70 flex items-center gap-2"
                        >
                            {loading && <Loader2 className="animate-spin" size={16} />}
                            Salvar Empresa
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
