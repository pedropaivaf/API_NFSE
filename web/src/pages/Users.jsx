import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Key, Trash2, Shield, Loader2, RefreshCw, Copy, Check, Ban, CheckCircle, Clock } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function Users() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [copiedKey, setCopiedKey] = useState(null);

    // Adicionado 'plan_type' no formData
    const [formData, setFormData] = useState({ name: '', access_key: '', role: 'USER', plan_type: 'MENSAL' });
    const navigate = useNavigate();

    useEffect(() => {
        if (localStorage.getItem('userRole') !== 'ADMIN') {
            alert('Acesso negado.');
            navigate('/dashboard');
            return;
        }
        loadUsers();
        generateRandomKey();
    }, [navigate]);

    const loadUsers = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_URL}/users`);
            setUsers(res.data);
        } catch (err) {
            console.error("Erro ao carregar", err);
        } finally {
            setLoading(false);
        }
    };

    const generateRandomKey = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let key = 'MB-';
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 4; j++) {
                key += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            if (i < 2) key += '-';
        }
        setFormData(prev => ({ ...prev, access_key: key }));
    };

    const handleCopy = (key) => {
        navigator.clipboard.writeText(key);
        setCopiedKey(key);
        setTimeout(() => setCopiedKey(null), 2000);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await axios.post(`${API_URL}/users`, formData);
            loadUsers();
            generateRandomKey();
            setFormData(prev => ({ ...prev, name: '' }));
            alert('Licença gerada com sucesso!');
        } catch {
            alert("Erro ao criar chave.");
        } finally {
            setSubmitting(false);
        }
    };

    // Nova função: Bloquear/Desbloquear
    const handleToggleStatus = async (id, currentStatus) => {
        try {
            await axios.put(`${API_URL}/users/${id}/toggle-status`, { is_active: !currentStatus });
            loadUsers(); // Recarrega para mostrar o novo status
        } catch {
            alert("Erro ao atualizar status do cliente.");
        }
    };

    const handleDelete = async (id, name) => {
        if (confirm(`Revogar DEFINITIVAMENTE a chave de acesso do cliente: ${name}?`)) {
            try {
                await axios.delete(`${API_URL}/users/${id}`);
                loadUsers();
            } catch {
                alert("Erro ao revogar chave.");
            }
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <Key className="text-brand-600" />
                    Painel de Licenças
                </h2>
                <p className="text-slate-500">Gerencie o acesso, validade e bloqueios dos seus clientes.</p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                    <div className="md:col-span-3">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Cliente / Empresa</label>
                        <input
                            type="text"
                            required
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                            placeholder="Ex: Contabilidade MB"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>

                    <div className="md:col-span-3">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Chave Gerada</label>
                        <div className="flex relative">
                            <input
                                type="text"
                                readOnly
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-600"
                                value={formData.access_key}
                            />
                            <button type="button" onClick={generateRandomKey} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-brand-600" title="Gerar nova chave" aria-label="Gerar nova chave de acesso">
                                <RefreshCw size={18} />
                            </button>
                        </div>
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Assinatura</label>
                        <select
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                            value={formData.plan_type}
                            onChange={e => setFormData({ ...formData, plan_type: e.target.value })}
                        >
                            <option value="MENSAL">Mensal (30 dias)</option>
                            <option value="ILIMITADO">Ilimitado (Vitalício)</option>
                        </select>
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Permissão</label>
                        <select
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                            value={formData.role}
                            onChange={e => setFormData({ ...formData, role: e.target.value })}
                        >
                            <option value="USER">Cliente (Acesso Limitado)</option>
                            <option value="ADMIN">Administrador (Total)</option>
                        </select>
                    </div>

                    <div className="md:col-span-2">
                        <button type="submit" disabled={submitting || !formData.name} className="w-full py-2 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 transition disabled:opacity-50">
                            {submitting ? 'Gerando...' : 'Emitir Licença'}
                        </button>
                    </div>
                </form>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Cliente</th>
                            <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Chave de Acesso</th>
                            <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Plano & Validade</th>
                            <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase text-center">Status</th>
                            <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr><td colSpan="5" className="text-center py-6 text-slate-500"><Loader2 className="animate-spin inline mr-2" /> Carregando base...</td></tr>
                        ) : users.map((user) => (
                            <tr key={user.id} className={`hover:bg-slate-50 ${user.is_active === false ? 'opacity-60' : ''}`}>
                                <td className="px-6 py-4 font-medium text-slate-900">{user.name}</td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <code className={`px-2 py-1 rounded text-sm font-mono border ${user.is_active ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-red-50 text-red-700 border-red-200 line-through'}`}>
                                            {user.access_key}
                                        </code>
                                        <button onClick={() => handleCopy(user.access_key)} className="text-slate-400 hover:text-brand-600 p-1" title="Copiar Chave" aria-label="Copiar chave de acesso">
                                            {copiedKey === user.access_key ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                                        </button>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    {user.access_key === 'ADMIN-MASTER-KEY' ? (
                                        <span className="text-xs bg-slate-800 text-white px-2 py-1 rounded-full font-bold">SISTEMA</span>
                                    ) : (
                                        <div className="flex flex-col">
                                            <span className="font-medium text-sm text-slate-700">{user.plan_type}</span>
                                            {user.plan_type === 'MENSAL' && user.expires_at && (
                                                <span className={`text-xs flex items-center gap-1 mt-0.5 ${new Date(user.expires_at) < new Date() ? 'text-red-500 font-bold' : 'text-slate-500'}`}>
                                                    <Clock size={12} />
                                                    Vence: {new Date(user.expires_at).toLocaleDateString('pt-BR')}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-center">
                                    {user.access_key !== 'ADMIN-MASTER-KEY' && (
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${user.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {user.is_active ? <CheckCircle size={14} /> : <Ban size={14} />}
                                            {user.is_active ? 'Ativo' : 'Bloqueado'}
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    {user.access_key === 'ADMIN-MASTER-KEY' ? (
                                        <Shield size={18} className="text-slate-300 inline-block" title="Chave Mestre" />
                                    ) : (
                                        <div className="flex items-center justify-end gap-3">
                                            {/* Botão de Bloquear/Liberar */}
                                            <button
                                                onClick={() => handleToggleStatus(user.id, user.is_active)}
                                                className={`${user.is_active ? 'text-yellow-500 hover:text-yellow-600' : 'text-green-500 hover:text-green-600'} transition`}
                                                title={user.is_active ? "Bloquear Acesso" : "Liberar Acesso"}
                                                aria-label={user.is_active ? "Bloquear Acesso do Usuário" : "Liberar Acesso do Usuário"}
                                            >
                                                {user.is_active ? <Ban size={18} /> : <CheckCircle size={18} />}
                                            </button>

                                            {/* Botão de Apagar Definitivamente */}
                                            <button onClick={() => handleDelete(user.id, user.name)} className="text-slate-400 hover:text-red-600" title="Apagar do Sistema" aria-label="Apagar Usuário do Sistema">
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}