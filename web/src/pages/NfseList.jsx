import { useState, useEffect } from 'react';
import axios from 'axios';
import {
    FileText, Search, Loader2, Download, AlertCircle, ChevronDown, ChevronRight,
    Building2, Archive, ExternalLink, Calendar, Trash2, FolderOpen, Filter
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// ⚡ Bolt: Extract formatters to module-level to avoid re-instantiation on every render/loop
const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const dateFormatter = new Intl.DateTimeFormat('pt-BR');

export default function NfseList() {
    const [groupedNfs, setGroupedNfs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedCompanies, setExpandedCompanies] = useState({});
    const [expandedCompetences, setExpandedCompetences] = useState({});
    const [resetMsg, setResetMsg] = useState({ id: null, text: '' });

    // Filters
    const [filterCompany, setFilterCompany] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await axios.get(`${API_URL}/companies/grouped-nfs`);
            setGroupedNfs(res.data);

            if (res.data.length > 0) {
                const firstCompanyId = res.data[0].id;
                setExpandedCompanies({ [firstCompanyId]: true });
                if (res.data[0].competences?.length > 0) {
                    setExpandedCompetences({ [`${firstCompanyId}-${res.data[0].competences[0].period}`]: true });
                }
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

    const toggleCompetence = (companyId, period) => {
        const key = `${companyId}-${period}`;
        setExpandedCompetences(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleDownloadZip = (companyId, companyName, period = null) => {
        let downloadUrl = `${API_URL}/companies/${companyId}/download-zip`;
        if (period) {
            downloadUrl += `?period=${encodeURIComponent(period)}`;
        }
        const fileName = period ? `${companyName}_${period.replace('/', '_')}_notas.zip` : `${companyName}_notas.zip`;
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleReset = async (companyId, companyName) => {
        if (!window.confirm(`Resetar todas as notas de "${companyName}"?\nEsta ação não pode ser desfeita.`)) return;
        try {
            await axios.delete(`${API_URL}/companies/${companyId}/nfs`);
            setResetMsg({ id: companyId, text: 'Resetado com sucesso!' });
            setTimeout(() => setResetMsg({ id: null, text: '' }), 3000);
            await fetchData();
        } catch (err) {
            console.error('Reset failed', err);
            alert('Erro ao resetar notas: ' + (err.response?.data?.error || err.message));
        }
    };

    const handleOpenXml = async (basePath, xmlUrl) => {
        if (!xmlUrl) {
            alert("URL do arquivo não disponível.");
            return;
        }

        // Construct absolute path: basePath + xmlUrl
        const fullPath = basePath ? `${basePath}\\${xmlUrl.replace(/\//g, '\\')}` : xmlUrl;

        if (window.electronAPI?.openExplorer) {
            const result = await window.electronAPI.openExplorer(fullPath);
            if (result && !result.success) {
                alert(result.error || "Erro ao abrir pasta do arquivo.");
            }
        } else {
            alert(`Arquivo localizado em: ${fullPath}`);
        }
    };

    const handleOpenCompanyFolder = async (basePath, companyName) => {
        if (!basePath) {
            alert("Caminho de saída não configurado. Vá em Configurações para definir.");
            return;
        }

        // Sanitize company name same way as backend
        const safeName = companyName.replace(/[<>:"/\\|?*]/g, '').trim() || 'Empresa';
        const folderPath = `${basePath}\\${safeName}`;

        if (window.electronAPI?.openExplorer) {
            const result = await window.electronAPI.openExplorer(folderPath);
            if (result && !result.success) {
                alert("Pasta da empresa não encontrada. Execute uma sincronização primeiro para criar as pastas.");
            }
        } else {
            alert(`Pasta da empresa: ${folderPath}`);
        }
    };

    // Apply all filters
    const filteredGroups = groupedNfs
        .filter(group => filterCompany === 'all' || group.id === filterCompany)
        .filter(group => {
            const term = searchTerm.toLowerCase();
            if (!term) return true;
            const matchesCompany = group.name.toLowerCase().includes(term) || group.cnpj.includes(term);
            const matchesNote = group.competences.some(c =>
                c.notes.some(n => n.access_key.toLowerCase().includes(term))
            );
            return matchesCompany || matchesNote;
        })
        .map(group => ({
            ...group,
            competences: group.competences
                .map(comp => ({
                    ...comp,
                    notes: comp.notes.filter(note => {
                        if (filterStatus === 'mismatch') return note.competence_mismatch;
                        if (filterStatus === 'retroactive') return note.is_retroactive;
                        if (filterStatus === 'out_of_period') return note.is_out_of_period;
                        if (filterStatus === 'retained') return note.is_retained;
                        return true;
                    })
                }))
                .filter(comp => comp.notes.length > 0)
        }))
        .filter(group => group.competences.length > 0);

    // Count flags across all data for badge display
    const flagCounts = groupedNfs.reduce((acc, g) => {
        g.competences.forEach(c => c.notes.forEach(n => {
            if (n.competence_mismatch) acc.mismatch++;
            if (n.is_retroactive) acc.retroactive++;
            if (n.is_out_of_period) acc.out_of_period++;
            if (n.is_retained) acc.retained++;
            acc.total++;
        }));
        return acc;
    }, { total: 0, mismatch: 0, retroactive: 0, out_of_period: 0, retained: 0 });

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

            {/* Filter Bar */}
            <div className="flex flex-wrap items-center gap-3 p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase">
                    <Filter size={14} />
                    Filtros
                </div>

                <select
                    className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none bg-white"
                    value={filterCompany}
                    onChange={(e) => setFilterCompany(e.target.value)}
                >
                    <option value="all">Todas Empresas</option>
                    {groupedNfs.map(g => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                </select>

                <select
                    className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none bg-white"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                >
                    <option value="all">Todos os Status ({flagCounts.total})</option>
                    <option value="mismatch">Competência Divergente ({flagCounts.mismatch})</option>
                    <option value="retroactive">Retroativas ({flagCounts.retroactive})</option>
                    <option value="out_of_period">Fora do Período ({flagCounts.out_of_period})</option>
                    <option value="retained">Retidas ({flagCounts.retained})</option>
                </select>

                {(filterCompany !== 'all' || filterStatus !== 'all' || searchTerm) && (
                    <button
                        onClick={() => { setFilterCompany('all'); setFilterStatus('all'); setSearchTerm(''); }}
                        className="px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition"
                    >
                        Limpar Filtros
                    </button>
                )}
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
                    <p>{searchTerm || filterStatus !== 'all' ? 'Nenhuma nota encontrada para os filtros aplicados.' : 'Nenhuma empresa com notas fiscais processadas.'}</p>
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
                                            <span className="font-medium text-brand-600">{group.competences.reduce((acc, c) => acc + c.count, 0)} notas processadas</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                        <button
                                            onClick={() => handleOpenCompanyFolder(group.base_output_path, group.name)}
                                            className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-md text-sm font-medium hover:bg-blue-100 transition"
                                            title="Abrir pasta da empresa no Explorer"
                                        >
                                            <FolderOpen size={16} />
                                            Abrir Pasta
                                        </button>
                                        <button
                                            onClick={() => handleDownloadZip(group.id, group.name)}
                                            className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-md text-sm font-medium hover:bg-slate-200 transition"
                                        >
                                            <Download size={16} />
                                            Baixar Todas (ZIP)
                                        </button>
                                        <button
                                            onClick={() => handleReset(group.id, group.name)}
                                            className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-600 rounded-md text-sm font-medium hover:bg-red-100 transition"
                                        >
                                            <Trash2 size={16} />
                                            Resetar
                                        </button>
                                        {resetMsg.id === group.id && (
                                            <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded animate-pulse">
                                                {resetMsg.text}
                                            </span>
                                        )}
                                    </div>
                                    <div className="w-px h-6 bg-slate-200 mx-1"></div>
                                    {expandedCompanies[group.id] ? <ChevronDown className="text-slate-400" /> : <ChevronRight className="text-slate-400" />}
                                </div>
                            </div>

                            {/* Company Competences blocks */}
                            {expandedCompanies[group.id] && (
                                <div className="p-4 bg-slate-50/30 space-y-3">
                                    {group.competences.map((comp) => (
                                        <div key={comp.period} className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                                            {/* Competence Sub-Header */}
                                            <div
                                                className="px-4 py-2 bg-slate-100/50 flex items-center justify-between cursor-pointer hover:bg-slate-100 transition"
                                                onClick={() => toggleCompetence(group.id, comp.period)}
                                            >
                                                <div className="flex items-center gap-3">
                                                    {expandedCompetences[`${group.id}-${comp.period}`] ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
                                                    <span className="font-bold text-slate-700 uppercase text-xs tracking-wider flex items-center gap-2">
                                                        <Calendar size={14} className="text-brand-500" />
                                                        Competência: {comp.period}
                                                    </span>
                                                    <span className="text-[10px] bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full font-bold ml-2">
                                                        {comp.count} Notas
                                                    </span>
                                                    <span className="text-[10px] text-slate-500 font-medium italic">
                                                        Total: {currencyFormatter.format(comp.totalAmount)}
                                                    </span>
                                                </div>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDownloadZip(group.id, group.name, comp.period); }}
                                                    className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded text-xs font-bold hover:bg-blue-700 transition"
                                                >
                                                    <Download size={14} />
                                                    Baixar ZIP do Mês
                                                </button>
                                            </div>

                                            {/* Notes Table (Collapsible) */}
                                            {expandedCompetences[`${group.id}-${comp.period}`] && (
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-xs">
                                                        <thead>
                                                            <tr className="bg-white text-slate-500 font-semibold border-b border-slate-100">
                                                                <th className="px-6 py-2 text-left">Chave de Acesso</th>
                                                                <th className="px-6 py-2 text-left">Emissão</th>
                                                                <th className="px-6 py-2 text-right">Valor</th>
                                                                <th className="px-6 py-2 text-center">Status</th>
                                                                <th className="px-6 py-2 text-right">Ação</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-50">
                                                            {comp.notes.map((note) => (
                                                                <tr key={note.id} className={`hover:bg-slate-50/30 transition ${(note.is_out_of_period || note.competence_mismatch || note.is_retroactive) ? 'bg-amber-50/50' : ''}`}>
                                                                    <td className="px-6 py-2 font-mono text-[10px] text-slate-500">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-slate-900 font-medium">#{note.access_key.substring(0, 6)}</span>
                                                                            {note.access_key.substring(6, 30)}...
                                                                            {(note.is_out_of_period || note.competence_mismatch || note.is_retroactive) && (
                                                                                <div className="group relative">
                                                                                    <AlertCircle size={14} className="text-amber-500 cursor-help" />
                                                                                    <div className="absolute left-full ml-2 w-48 p-2 bg-slate-800 text-white text-[10px] rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                                                                        {note.is_out_of_period && "Emitida fora do período solicitado. "}
                                                                                        {note.competence_mismatch && "Mês da competência difere da emissão. "}
                                                                                        {note.is_retroactive && "Nota retroativa."}
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-6 py-2 text-slate-600">
                                                                        {dateFormatter.format(new Date(note.issue_date))}
                                                                    </td>
                                                                    <td className="px-6 py-2 text-right font-semibold text-slate-900">
                                                                        {currencyFormatter.format(note.amount)}
                                                                    </td>
                                                                    <td className="px-6 py-2 text-center">
                                                                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] uppercase font-bold ${note.status === 'processed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                                                            {note.status === 'processed' ? 'Salvo' : 'Pendente'}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-6 py-2 text-right">
                                                                        <button
                                                                            onClick={() => handleOpenXml(group.base_output_path, note.xml_url)}
                                                                            className="p-1 text-slate-400 hover:text-brand-600 rounded-lg transition"
                                                                            title="Abrir no Explorer"
                                                                        >
                                                                            <ExternalLink size={14} />
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
                    ))}
                </div>
            )}
        </div>
    );
}
