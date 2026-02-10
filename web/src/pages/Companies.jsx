
import { useState, useEffect } from 'react';
import axios from 'axios';
import { Upload, Loader2, HardDrive, FileUp, Search } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function Companies() {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        cnpj: '',
        password: ''
    });
    const [file, setFile] = useState(null);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [uploadMode, setUploadMode] = useState('upload');
    const [localFiles, setLocalFiles] = useState([]);
    const [selectedLocalFile, setSelectedLocalFile] = useState('');
    const [loadingFiles, setLoadingFiles] = useState(false);

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
        setSuccess(null);
        setLoading(true);

        try {
            let certificateFilename = null;

            if (uploadMode === 'upload') {
                if (!file) throw new Error("O arquivo do certificado (.pfx) é obrigatório");
                // For upload mode, use FormData
                const data = new FormData();
                data.append('name', formData.name);
                data.append('cnpj', formData.cnpj);
                data.append('password', formData.password);
                data.append('certificate', file);

                const res = await axios.post(`${API_URL}/companies/fetch-notes`, data, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                setSuccess(res.data);
                return;
            } else {
                if (!selectedLocalFile) throw new Error("Selecione um arquivo do servidor");
                certificateFilename = selectedLocalFile;
            }

            const res = await axios.post(`${API_URL}/companies/fetch-notes`, {
                name: formData.name,
                cnpj: formData.cnpj,
                password: formData.password,
                certificateFilename
            });

            setSuccess(res.data);
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.error || err.message || "Erro ao buscar notas");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-lg mx-auto">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
                    <h3 className="font-bold text-lg text-slate-800">Buscar Nota (XML)</h3>
                    <p className="text-sm text-slate-500 mt-0.5">Informe os dados e o certificado para buscar notas na API do Governo</p>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="p-3 bg-green-50 text-green-700 text-sm rounded-lg border border-green-100">
                            ✅ {success.count > 0
                                ? `${success.count} nota(s) encontrada(s)!`
                                : 'Nenhuma nota nova encontrada.'
                            }
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Razão Social</label>
                        <input
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
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full px-4 py-2.5 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-70 flex items-center justify-center gap-2 font-medium transition"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="animate-spin" size={16} />
                                    Buscando notas...
                                </>
                            ) : (
                                <>
                                    <Search size={16} />
                                    Buscar Notas
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
