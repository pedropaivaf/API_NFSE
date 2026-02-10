
import { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, HardDrive, Loader2, FileText, Download, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function BuscarNota() {
    // Form state
    const [formData, setFormData] = useState({
        name: '',
        cnpj: '',
        password: ''
    });
    const [selectedFile, setSelectedFile] = useState('');
    const [localFiles, setLocalFiles] = useState([]);
    const [loadingFiles, setLoadingFiles] = useState(false);
    const [fileError, setFileError] = useState(null);

    // Search state
    const [searching, setSearching] = useState(false);
    const [results, setResults] = useState(null);
    const [error, setError] = useState(null);

    // Fetch certificates from local server path
    useEffect(() => {
        fetchLocalCertificates();
    }, []);

    const fetchLocalCertificates = async () => {
        setLoadingFiles(true);
        setFileError(null);
        try {
            const res = await axios.get(`${API_URL}/companies/local-certificates`);
            setLocalFiles(res.data.files || []);
            if (res.data.error) setFileError(res.data.error);
        } catch (err) {
            console.error(err);
            setFileError("Erro ao buscar certificados no servidor");
        } finally {
            setLoadingFiles(false);
        }
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        setError(null);
        setResults(null);
        setSearching(true);

        try {
            if (!selectedFile) throw new Error("Selecione um certificado");
            if (!formData.cnpj) throw new Error("Informe o CNPJ");
            if (!formData.password) throw new Error("Informe a senha do certificado");

            const res = await axios.post(`${API_URL}/companies/fetch-notes`, {
                name: formData.name || formData.cnpj,
                cnpj: formData.cnpj,
                password: formData.password,
                certificateFilename: selectedFile
            });

            setResults(res.data);
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.error || err.message || "Erro ao buscar notas");
        } finally {
            setSearching(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                    <Search className="text-brand-600" size={28} />
                    Buscar Nota (XML)
                </h2>
                <p className="text-slate-500 mt-1">
                    Selecione o certificado digital e busque as notas fiscais de serviço diretamente da API do Governo.
                </p>
            </div>

            {/* Form Card */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <form onSubmit={handleSearch} className="space-y-5">
                    {/* Certificate Selection */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                            <HardDrive size={16} className="text-brand-500" />
                            Certificado Digital (.pfx)
                        </label>
                        {loadingFiles ? (
                            <div className="flex items-center gap-2 text-slate-500 text-sm py-4 bg-slate-50 rounded-lg justify-center">
                                <Loader2 className="animate-spin" size={16} />
                                Buscando certificados no servidor...
                            </div>
                        ) : fileError ? (
                            <div className="flex items-center gap-2 text-amber-600 text-sm py-3 px-4 bg-amber-50 rounded-lg border border-amber-200">
                                <AlertCircle size={16} />
                                {fileError}
                                <button
                                    type="button"
                                    onClick={fetchLocalCertificates}
                                    className="ml-auto text-amber-700 hover:text-amber-900"
                                >
                                    <RefreshCw size={14} />
                                </button>
                            </div>
                        ) : localFiles.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {localFiles.map((file, i) => (
                                    <label
                                        key={i}
                                        className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition ${selectedFile === file
                                                ? 'border-brand-500 bg-brand-50 text-brand-800'
                                                : 'border-slate-200 hover:border-slate-300 bg-white'
                                            }`}
                                    >
                                        <input
                                            type="radio"
                                            name="certificate"
                                            value={file}
                                            checked={selectedFile === file}
                                            onChange={() => setSelectedFile(file)}
                                            className="accent-brand-600"
                                        />
                                        <FileText size={16} className={selectedFile === file ? 'text-brand-600' : 'text-slate-400'} />
                                        <span className="text-sm font-medium truncate">{file}</span>
                                    </label>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center text-sm text-slate-500 py-6 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                                Nenhum arquivo .pfx encontrado no servidor.
                                <br />
                                <span className="text-xs text-slate-400">Verifique se a pasta de certificados está configurada.</span>
                            </div>
                        )}
                    </div>

                    {/* Company Details */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Nome / Razão Social</label>
                            <input
                                type="text"
                                placeholder="Ex: Minha Empresa LTDA"
                                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">CNPJ <span className="text-red-500">*</span></label>
                            <input
                                required
                                type="text"
                                placeholder="00000000000100"
                                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition"
                                value={formData.cnpj}
                                onChange={e => setFormData({ ...formData, cnpj: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Senha do Certificado <span className="text-red-500">*</span></label>
                            <input
                                required
                                type="password"
                                placeholder="••••••••"
                                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition"
                                value={formData.password}
                                onChange={e => setFormData({ ...formData, password: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg border border-red-200 text-sm">
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}

                    {/* Submit Button */}
                    <div className="flex justify-end pt-2">
                        <button
                            type="submit"
                            disabled={searching || !selectedFile}
                            className="flex items-center gap-2 bg-brand-600 text-white px-6 py-3 rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm font-medium"
                        >
                            {searching ? (
                                <>
                                    <Loader2 className="animate-spin" size={18} />
                                    Buscando na API do Governo...
                                </>
                            ) : (
                                <>
                                    <Search size={18} />
                                    Buscar Notas
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>

            {/* Results */}
            {results && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="text-green-600" size={20} />
                            <h3 className="font-semibold text-slate-800">
                                {results.count > 0
                                    ? `${results.count} nota(s) encontrada(s)`
                                    : 'Nenhuma nota nova encontrada'
                                }
                            </h3>
                        </div>
                        {results.status && (
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-medium">
                                {results.status}
                            </span>
                        )}
                    </div>

                    {results.notes && results.notes.length > 0 && (
                        <div className="divide-y divide-slate-100">
                            {results.notes.map((note, i) => (
                                <div key={i} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition">
                                    <div className="flex items-center gap-4">
                                        <div className="bg-brand-50 p-2 rounded-lg">
                                            <FileText className="text-brand-600" size={20} />
                                        </div>
                                        <div>
                                            <p className="font-medium text-slate-800 text-sm">{note.accessKey || note.ChaveAcesso}</p>
                                            <p className="text-xs text-slate-500">
                                                {note.issueDate || 'Data não disponível'}
                                                {note.amount ? ` • R$ ${Number(note.amount).toFixed(2)}` : ''}
                                            </p>
                                        </div>
                                    </div>
                                    {note.xmlUrl && (
                                        <button
                                            onClick={() => window.open(`${API_URL}/download?path=${encodeURIComponent(note.xmlUrl)}`, '_blank')}
                                            className="flex items-center gap-1 text-sm text-brand-600 hover:text-brand-800 transition"
                                        >
                                            <Download size={16} />
                                            XML
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
