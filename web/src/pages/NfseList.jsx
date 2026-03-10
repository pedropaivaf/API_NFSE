import { useState, useEffect } from 'react';
import axios from 'axios';
import {
    FileText, Search, Loader2, Download, AlertCircle, ChevronDown, ChevronRight,
    Building2, Archive, ExternalLink, Calendar, Trash2
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function NfseList() {
    const [groupedNfs, setGroupedNfs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedCompanies, setExpandedCompanies] = useState({});

    // Fetch grouped NFs
    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await axios.get(`${API_URL}/companies/grouped-nfs`);
            setGroupedNfs(res.data);

            // Auto-expand the first company if exists
            if (res.data.length > 0) {
                setExpandedCompanies({ [res.data[0].id]: true });
            }
        } catch (err) {
            console.error("Failed to fetch NFS", err);
            setError("Erro ao carregar notas fiscais do sistema.");
        } finally {
            setLoading(false);
        }
    };

    const toggleCompany = (id) => {
        setExpandedCompanies(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const handleDownloadZip = (companyId, companyName) => {
        const downloadUrl = `${API_URL}/companies/${companyId}/download-zip`;
        // Use hidden link instead of window.open to avoid spawning blank windows in Electron
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.setAttribute('download', `${companyName}_notas.zip`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleReset = async (companyId, companyName) => {
        if (!window.confirm(`Resetar todas as notas de "${companyName}"?\nEsta ação não pode ser desfeita.`)) return;
        try {
            await axios.delete(`${API_URL}/companies/${companyId}/nfs`);
            await fetchData();
        } catch (err) {
            console.error('Reset failed', err);
            alert('Erro ao resetar notas: ' + (err.response?.data?.error || err.message));
        }
    };

    const handleDownloadSingleXml = (xmlUrl) => {
        // No futuro, se xmlUrl for uma rota de download, abrimos
        alert(`Arquivo localizado em: ${xmlUrl}`);
    };

    const filteredGroups = groupedNfs.filter(group => {
        const term = searchTerm.toLowerCase();
        const matchesCompany = group.name.toLowerCase().includes(term) || group.cnpj.includes(term);
        const matchesNote = group.notes.some(n => n.access_key.toLowerCase().includes(term));
        return matchesCompany || matchesNote;
    });

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
                        placeholder="Buscar empresa ou chave..."
                        className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none w-full md:w-80 shadow-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {error && (
                <div className="p-4 bg-red-50 text-red-600 rounded-lg flex items-center gap-2 border border-red-100">
                    <AlertCircle size={20} />
                    {error}
                </div>
            )}

            {loading ? (
                <div className="py-20 text-center text-slate-400 flex flex-col items-center">
                    <Loader2 className="animate-spin mb-2" size={32} />
                    <p className="font-medium">Carregando base de notas...</p>
                </div>
            ) : filteredGroups.length === 0 ? (
                <div className="py-20 text-center text-slate-400 bg-white rounded-xl border border-dashed border-slate-300">
                    <Archive size={48} className="mx-auto mb-4 opacity-20" />
                    <p>{searchTerm ? 'Nenhuma nota encontrada para sua busca.' : 'Nenhuma empresa com notas fiscais processadas.'}</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredGroups.map((group) => (
                        <div key={group.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden transition-all">
                            {/* Company Header */}
                            <div
                                className={`px-6 py-4 flex items-center justify-between cursor-pointer transition ${expandedCompanies[group.id] ? 'bg-slate-50 border-b border-slate-200' : 'hover:bg-slate-50'}`}
                                onClick={() => toggleCompany(group.id)}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold">
                                        <Building2 size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-800 text-lg">{group.name}</h3>
                                        <div className="flex items-center gap-2 text-xs text-slate-500">
                                            <span>CNPJ: {group.cnpj}</span>
                                            <span className="h-1 w-1 rounded-full bg-slate-300"></span>
                                            <span className="font-medium text-brand-600">{group.notes.length} notas processadas</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                        <button
                                            onClick={() => handleDownloadZip(group.id, group.name)}
                                            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition shadow-md shadow-blue-100"
                                        >
                                            <Download size={16} />
                                            Baixar Tudo (ZIP)
                                        </button>
                                        <button
                                            onClick={() => handleReset(group.id, group.name)}
                                            className="flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 transition shadow-md shadow-red-100"
                                        >
                                            <Trash2 size={16} />
                                            Resetar
                                        </button>
                                    </div>
                                    <div className="w-px h-6 bg-slate-200 mx-1"></div>
                                    {expandedCompanies[group.id] ? <ChevronDown className="text-slate-400" /> : <ChevronRight className="text-slate-400" />}
                                </div>
                            </div>

                            {/* Company Notes List */}
                            {expandedCompanies[group.id] && (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="bg-slate-50/50 text-slate-500 font-semibold border-b border-slate-100">
                                                <th className="px-6 py-3 text-left">Chave de Acesso</th>
                                                <th className="px-6 py-3 text-left">Emissão</th>
                                                <th className="px-6 py-3 text-right">Valor</th>
                                                <th className="px-6 py-3 text-center">Status</th>
                                                <th className="px-6 py-3 text-right">Ação</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {group.notes.map((note) => (
                                                <tr key={note.id} className="hover:bg-slate-50/30 transition">
                                                    <td className="px-6 py-3 font-mono text-xs text-slate-500">
                                                        <span className="text-slate-900 font-medium">#{note.access_key.substring(0, 6)}</span>
                                                        {note.access_key.substring(6, 30)}...
                                                    </td>
                                                    <td className="px-6 py-3 text-slate-600">
                                                        <div className="flex items-center gap-1.5">
                                                            <Calendar size={14} className="text-slate-400" />
                                                            {new Date(note.issue_date).toLocaleDateString()}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-3 text-right font-semibold text-slate-900">
                                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(note.amount)}
                                                    </td>
                                                    <td className="px-6 py-3 text-center">
                                                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] uppercase font-bold ${note.status === 'processed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                                                            }`}>
                                                            {note.status === 'processed' ? 'Salvo' : 'Pendente'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-3 text-right">
                                                        <button
                                                            onClick={() => handleDownloadSingleXml(note.xml_url)}
                                                            className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition"
                                                            title="Ver XML"
                                                        >
                                                            <ExternalLink size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
