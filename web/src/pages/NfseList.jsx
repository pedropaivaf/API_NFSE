
import { useState, useEffect } from 'react';
import axios from 'axios';
import { FileText, Search, Loader2, Download, AlertCircle } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function NfseList() {
    const [companies, setCompanies] = useState([]);
    const [selectedCompanyId, setSelectedCompanyId] = useState('');
    const [nfs, setNfs] = useState([]);
    const [loadingCompanies, setLoadingCompanies] = useState(true);
    const [loadingNfs, setLoadingNfs] = useState(false);
    const [error, setError] = useState(null);

    // Fetch companies on mount
    useEffect(() => {
        const fetchCompanies = async () => {
            try {
                const res = await axios.get(`${API_URL}/companies`);
                setCompanies(res.data);
                if (res.data.length > 0) {
                    setSelectedCompanyId(res.data[0].id); // Auto-select first company
                }
            } catch (err) {
                console.error("Failed to fetch companies", err);
                setError("Erro ao carregar empresas.");
            } finally {
                setLoadingCompanies(false);
            }
        };
        fetchCompanies();
    }, []);

    // Fetch NFS when selected company changes
    useEffect(() => {
        if (!selectedCompanyId) return;

        const fetchNfs = async () => {
            setLoadingNfs(true);
            setError(null);
            try {
                const res = await axios.get(`${API_URL}/companies/${selectedCompanyId}/nfs`);
                setNfs(res.data);
            } catch (err) {
                console.error("Failed to fetch NFS", err);
                setError("Erro ao carregar notas fiscais.");
            } finally {
                setLoadingNfs(false);
            }
        };

        fetchNfs();
    }, [selectedCompanyId]);

    const handleDownloadXml = (xmlUrl) => {
        // In a real scenario, this would generate a signed URL from Supabase or proxy through backend
        alert(`Download do XML iniciado: ${xmlUrl}`);
        // window.open(xmlUrl, '_blank');
    };

    if (loadingCompanies) {
        return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-brand-600" size={32} /></div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <FileText className="text-brand-600" />
                        Notas Fiscais
                    </h2>
                    <p className="text-slate-500">Visualize e baixe os XMLs processados</p>
                </div>

                <div className="flex items-center gap-3 bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                    <span className="text-sm font-medium text-slate-600 pl-2">Empresa:</span>
                    <select
                        className="bg-transparent border-none text-sm font-semibold text-slate-900 focus:ring-0 cursor-pointer outline-none"
                        value={selectedCompanyId}
                        onChange={(e) => setSelectedCompanyId(e.target.value)}
                    >
                        {companies.map(company => (
                            <option key={company.id} value={company.id}>
                                {company.name} ({company.cnpj})
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-red-50 text-red-600 rounded-lg flex items-center gap-2">
                    <AlertCircle size={20} />
                    {error}
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {/* Table Header */}
                <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <div className="col-span-3">Chave de Acesso</div>
                    <div className="col-span-2">Emissão</div>
                    <div className="col-span-2 text-right">Valor (R$)</div>
                    <div className="col-span-3">Status</div>
                    <div className="col-span-2 text-right">Ações</div>
                </div>

                {/* Table Body */}
                {loadingNfs ? (
                    <div className="py-20 text-center text-slate-400 flex flex-col items-center">
                        <Loader2 className="animate-spin mb-2" size={24} />
                        Carregando notas...
                    </div>
                ) : nfs.length === 0 ? (
                    <div className="py-20 text-center text-slate-400">
                        Nenhuma nota fiscal encontrada para esta empresa.
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {nfs.map((note) => (
                            <div key={note.id} className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-slate-50 transition text-sm">
                                <div className="col-span-3 font-mono text-xs text-slate-600 break-all" title={note.access_key}>
                                    {note.access_key.substring(0, 20)}...
                                </div>
                                <div className="col-span-2 text-slate-700">
                                    {new Date(note.issue_date).toLocaleDateString()}
                                </div>
                                <div className="col-span-2 text-right font-medium text-slate-900">
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(note.amount)}
                                </div>
                                <div className="col-span-3">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${note.status === 'processed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                        }`}>
                                        {note.status === 'processed' ? 'Processada' : 'Pendente'}
                                    </span>
                                </div>
                                <div className="col-span-2 text-right">
                                    <button
                                        onClick={() => handleDownloadXml(note.xml_url)}
                                        className="text-brand-600 hover:text-brand-800 p-1 hover:bg-brand-50 rounded transition"
                                        title="Baixar XML"
                                    >
                                        <Download size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
