
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Eye, EyeOff, Loader2 } from 'lucide-react';

export default function Login() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleLogin = (e) => {
        e.preventDefault();
        setLoading(true);

        const email = e.target[0].value;
        const password = e.target[1].value;

        setTimeout(() => {
            // Admin hardcoded check
            if (email === 'admin' && password === 'adm1234') {
                localStorage.setItem('isAuthenticated', 'true');
                localStorage.setItem('userRole', 'ADMIN');
                localStorage.setItem('userName', 'Administrador');
                navigate('/dashboard');
                setLoading(false);
                return;
            }

            // Check for other users in localStorage
            const users = JSON.parse(localStorage.getItem('users') || '[]');
            const user = users.find(u => u.email === email && u.password === password);

            if (user) {
                localStorage.setItem('isAuthenticated', 'true');
                localStorage.setItem('userRole', user.role || 'USER');
                localStorage.setItem('userName', user.name);
                navigate('/dashboard');
            } else {
                alert('Credenciais inválidas!');
            }
            setLoading(false);
        }, 1000);
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-brand-50">
            <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-xl border border-brand-100">
                <div className="flex flex-col items-center mb-8">
                    <div className="bg-brand-100 p-3 rounded-full mb-4">
                        <ShieldCheck className="w-8 h-8 text-brand-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">Acesso ao Sistema</h1>
                    <p className="text-slate-500">API NFSe Manager</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Email ou Usuário</label>
                        <input
                            type="text"
                            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                            placeholder="admin"
                            defaultValue="admin"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Senha</label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:outline-none pr-10"
                                placeholder="••••••••"
                                defaultValue="adm1234"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-600 transition"
                            >
                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2 shadow-sm"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : 'Entrar'}
                    </button>
                </form>
            </div>
        </div>
    );
}
