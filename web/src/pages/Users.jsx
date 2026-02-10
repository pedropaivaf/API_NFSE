import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, User, Shield, AlertTriangle, Eye, EyeOff } from 'lucide-react';

export default function Users() {
    const [users, setUsers] = useState([]);
    const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'USER' });
    const [showPassword, setShowPassword] = useState(false);

    const navigate = useNavigate();

    useEffect(() => {
        const role = localStorage.getItem('userRole');
        if (role !== 'ADMIN') {
            alert('Acesso negado: Apenas administradores podem acessar esta página.');
            navigate('/dashboard');
        }
        loadUsers();
    }, [navigate]);

    const loadUsers = () => {
        const storedUsers = JSON.parse(localStorage.getItem('users') || '[]');
        setUsers(storedUsers);
    };

    const handleDelete = (email) => {
        if (confirm('Tem certeza que deseja excluir este usuário?')) {
            const newUsers = users.filter(u => u.email !== email);
            localStorage.setItem('users', JSON.stringify(newUsers));
            setUsers(newUsers);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        // Basic validation
        if (!formData.name || !formData.email || !formData.password) {
            alert('Preencha todos os campos!');
            return;
        }

        if (users.some(u => u.email === formData.email)) {
            alert('Email já cadastrado!');
            return;
        }

        const newUsers = [...users, formData];
        localStorage.setItem('users', JSON.stringify(newUsers));
        setUsers(newUsers);
        setFormData({ name: '', email: '', password: '', role: 'USER' });
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <User className="text-brand-600" />
                        Gerenciar Usuários
                    </h2>
                    <p className="text-slate-500">Controle de acesso ao sistema</p>
                </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-8">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Plus className="text-brand-600" size={20} />
                    Cadastrar Novo Usuário
                </h3>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Nome</label>
                        <input
                            type="text"
                            required
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none"
                            placeholder="Ex: João Silva"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Login (Email)</label>
                        <input
                            type="text"
                            required
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none"
                            placeholder="Ex: joao"
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Senha</label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                required
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none pr-10"
                                placeholder="******"
                                value={formData.password}
                                onChange={e => setFormData({ ...formData, password: e.target.value })}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-600 transition"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Permissão</label>
                        <select
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none"
                            value={formData.role}
                            onChange={e => setFormData({ ...formData, role: e.target.value })}
                        >
                            <option value="USER">Usuário Padrão</option>
                            <option value="ADMIN">Administrador</option>
                        </select>
                    </div>
                    <div className="md:col-span-2 mt-4 flex justify-center">
                        <button
                            type="submit"
                            className="bg-slate-900 text-white font-bold py-2 px-6 rounded-lg hover:bg-slate-800 transition flex items-center gap-2 shadow-sm"
                        >
                            <Plus size={18} />
                            Adicionar Usuário
                        </button>
                    </div>
                </form>
            </div>

            {/* Users List */}
            <h3 className="text-lg font-bold text-slate-800 mb-2">Usuários Cadastrados</h3>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Nome</th>
                            <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Login</th>
                            <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Permissão</th>
                            <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {users.length === 0 ? (
                            <tr>
                                <td colSpan="4" className="px-6 py-8 text-center text-slate-500">
                                    Nenhum usuário cadastrado além do Admin.
                                </td>
                            </tr>
                        ) : (
                            users.map((user) => (
                                <tr key={user.email} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 font-medium text-slate-900">{user.name}</td>
                                    <td className="px-6 py-4 text-slate-600">{user.email}</td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'
                                            }`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => handleDelete(user.email)}
                                            className="text-slate-400 hover:text-red-600 transition"
                                            title="Excluir Usuário"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                        {/* Always show Admin hardcoded info for clarity */}
                        <tr className="bg-brand-50/50">
                            <td className="px-6 py-4 font-medium text-slate-900">Administrador (Sistema)</td>
                            <td className="px-6 py-4 text-slate-600">admin</td>
                            <td className="px-6 py-4">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand-100 text-brand-800">
                                    SUPER ADMIN
                                </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                                <Shield size={18} className="text-brand-400 inline-block" />
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}
