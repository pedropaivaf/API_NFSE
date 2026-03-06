
import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { FileText, Search, Loader2, Download, AlertCircle, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function NfseList() {
    const [nfs, setNfs] = useState([]);
    const [loadingNfs, setLoadingNfs] = useState(false);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

    // Fetch all NFS on mount
    useEffect(() => {
        const fetchNfs = async () => {
            setLoadingNfs(true);
            setError(null);
            try {
                // Now fetching ALL NFs from all companies
                // Requires the backend to have this route implemented
                const res = await axios.get(`${API_URL}/companies/all-nfs`);
                setNfs(res.data);
            } catch (err) {
                console.error("Failed to fetch NFS", err);
                setError("Erro ao carregar notas fiscais do sistema.");
            } finally {
                setLoadingNfs(false);
            }
        };

        fetchNfs();
    }, []);

    const handleDownloadXml = (xmlUrl) => {
        alert(`Download do XML iniciado: ${xmlUrl}`);
        // window.open(xmlUrl, '_blank');
    };

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    // Memoize sorting and filtering to prevent O(N log N) + O(N) array iterations
    // on every re-render (e.g. when typing in the search box).
    const sortedNfs = useMemo(() => {
        return [...nfs].sort((a, b) => {
            if (!sortConfig.key) return 0;

            let aValue = a[sortConfig.key];
            let bValue = b[sortConfig.key];

            if (sortConfig.key === 'amount') {
                aValue = parseFloat(aValue);
                bValue = parseFloat(bValue);
            }

            if (aValue < bValue) {
                return sortConfig.direction === 'asc' ? -1 : 1;
            }
            if (aValue > bValue) {
                return sortConfig.direction === 'asc' ? 1 : -1;
            }
            return 0;
        });
    }, [nfs, sortConfig]);

    const filteredNfs = useMemo(() => {
        return sortedNfs.filter(note => {
            const term = searchTerm.toLowerCase();
            const companyName = note.companies?.name?.toLowerCase() || '';
            const accessKey = note.access_key?.toLowerCase() || '';
            const status = note.status?.toLowerCase() || '';

            return companyName.includes(term) || accessKey.includes(term) || status.includes(term);
        });
    }, [sortedNfs, searchTerm]);

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

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar por nome da empresa, chave..."
                        className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none w-full md:w-80"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
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
                    <div className="col-span-3">Empresa</div>
                    <div className="col-span-3">Chave de Acesso</div>
                    <div className="col-span-2">Emissão</div>
                    <div className="col-span-2 text-right cursor-pointer flex items-center justify-end gap-1 hover:text-brand-600" onClick={() => handleSort('amount')}>
                        Valor (R$)
                        {sortConfig.key === 'amount' && (
                            sortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                        )}
                        {sortConfig.key !== 'amount' && <ArrowUpDown size={14} className="opacity-50" />}
                    </div>
                    <div className="col-span-1">Status</div>
                    <div className="col-span-1 text-right">Ações</div>
                </div>

                {/* Table Body */}
                {loadingNfs ? (
                    <div className="py-20 text-center text-slate-400 flex flex-col items-center">
                        <Loader2 className="animate-spin mb-2" size={24} />
                        Carregando notas...
                    </div>
                ) : filteredNfs.length === 0 ? (
                    <div className="py-20 text-center text-slate-400">
                        {searchTerm ? 'Nenhuma nota encontrada para sua busca.' : 'Nenhuma nota fiscal encontrada no sistema.'}
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {filteredNfs.map((note) => (
                            <div key={note.id} className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-slate-50 transition text-sm">
                                <div className="col-span-3 text-slate-900 font-medium truncate" title={note.companies?.name}>
                                    {note.companies?.name || 'Empresa removida'}
                                </div>
                                <div className="col-span-3 font-mono text-xs text-slate-600 break-all" title={note.access_key}>
                                    {note.access_key.substring(0, 20)}...
                                </div>
                                <div className="col-span-2 text-slate-700">
                                    {new Date(note.issue_date).toLocaleDateString()}
                                </div>
                                <div className="col-span-2 text-right font-medium text-slate-900">
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(note.amount)}
                                </div>
                                <div className="col-span-1">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${note.status === 'processed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                        }`}>
                                        {note.status === 'processed' ? 'OK' : 'Pendente'}
                                    </span>
                                </div>
                                <div className="col-span-1 text-right">
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
