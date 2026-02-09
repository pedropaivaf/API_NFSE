
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';

export default function Login() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    const handleLogin = (e) => {
        e.preventDefault();
        setLoading(true);
        // Simulate login
        setTimeout(() => {
            setLoading(false);
            navigate('/dashboard');
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
                    <p className="text-slate-500">API NFSe SaaS Manager</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                        <input
                            type="email"
                            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                            placeholder="admin@antigravity.com"
                            defaultValue="admin@antigravity.com"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Senha</label>
                        <input
                            type="password"
                            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                            placeholder="••••••••"
                            defaultValue="123456"
                        />
                    </div>
                    <button
                        disabled={loading}
                        className="w-full py-3 bg-brand-600 text-white font-semibold rounded-lg hover:bg-brand-700 transition disabled:opacity-70"
                    >
                        {loading ? 'Entrando...' : 'Entrar'}
                    </button>
                </form>
            </div>
        </div>
    );
}
