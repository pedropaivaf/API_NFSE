
import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, RefreshCw, MoreVertical, ShieldCheck } from 'lucide-react';
import AddCompanyModal from '../components/AddCompanyModal';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function Companies() {
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [syncing, setSyncing] = useState({});

    const fetchCompanies = async () => {
        try {
            const res = await axios.get(`${API_URL}/companies`);
            setCompanies(res.data);
        } catch (err) {
            console.error("Failed to fetch companies", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCompanies();
    }, []);

    const handleSync = async (id) => {
        setSyncing(prev => ({ ...prev, [id]: true }));
        try {
            await axios.post(`${API_URL}/companies/${id}/sync`);
            alert("Sincronização iniciada com sucesso!");
        } catch (err) {
            alert("Erro ao sincronizar: " + (err.response?.data?.error || err.message));
        } finally {
            setSyncing(prev => ({ ...prev, [id]: false }));
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Gerenciar Empresas</h2>
                    <p className="text-slate-500">Cadastre e monitore os certificados digitais</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 transition shadow-sm"
                >
                    <Plus size={20} />
                    Nova Empresa
                </button>
            </div>

            {loading ? (
                <div className="text-center py-10 text-slate-500">Carregando...</div>
            ) : companies.length === 0 ? (
                <div className="bg-white rounded-xl p-10 text-center border dashed border-slate-300">
                    <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <ShieldCheck className="text-slate-400" size={32} />
                    </div>
                    <h3 className="text-lg font-medium text-slate-900">Nenhuma empresa cadastrada</h3>
                    <p className="text-slate-500 mb-6">Adicione sua primeira empresa para começar a baixar notas.</p>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="text-brand-600 font-medium hover:underline"
                    >
                        Cadastrar agora
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {companies.map(company => (
                        <div key={company.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition">
                            <div className="flex justify-between items-start mb-4">
                                <div className="bg-brand-50 p-2 rounded-lg">
                                    <ShieldCheck className="text-brand-600" size={24} />
                                </div>
                                <div className="relative group">
                                    <button className="text-slate-400 hover:text-slate-600">
                                        <MoreVertical size={20} />
                                    </button>
                                </div>
                            </div>

                            <h3 className="font-bold text-lg text-slate-900 mb-1">{company.name}</h3>
                            <p className="text-sm text-slate-500 mb-4">{company.cnpj}</p>

                            <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-50">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    Ativo
                                </span>

                                <button
                                    onClick={() => handleSync(company.id)}
                                    disabled={syncing[company.id]}
                                    className="flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-800 disabled:opacity-50"
                                >
                                    <RefreshCw size={16} className={syncing[company.id] ? "animate-spin" : ""} />
                                    {syncing[company.id] ? "Sincronizando..." : "Sincronizar"}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <AddCompanyModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={fetchCompanies}
            />
        </div>
    );
}
