import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { KeyRound, Loader2, AlertCircle } from 'lucide-react';
import logo from '../assets/logo.png';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function Login() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [accessKey, setAccessKey] = useState('');
    const [error, setError] = useState(null);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        // 1. Acesso Fixo de Emergência (Se a internet cair, você ainda entra)
        if (accessKey === 'admin' || accessKey === 'ADMIN-MASTER-KEY') {
            localStorage.setItem('isAuthenticated', 'true');
            localStorage.setItem('userRole', 'ADMIN');
            localStorage.setItem('userName', 'Super Administrador');

            // --- AS LINHAS CORRIGIDAS ESTÃO AQUI ---
            localStorage.setItem('userAccessKey', 'ADMIN-MASTER-KEY');
            localStorage.setItem('userPlan', 'ILIMITADO');
            localStorage.setItem('userExpiresAt', '');
            localStorage.setItem('userIsActive', 'true');
            // ----------------------------------------

            navigate('/dashboard');
            return; // Termina a função aqui para não tentar ir no banco
        }

        // 2. Acesso via Banco de Dados
        try {
            const res = await axios.post(`${API_URL}/users/login`, { access_key: accessKey });
            const { user } = res.data;

            localStorage.setItem('isAuthenticated', 'true');
            localStorage.setItem('userRole', user.role || 'USER');
            localStorage.setItem('userName', user.name);
            localStorage.setItem('userAccessKey', user.access_key);
            localStorage.setItem('userPlan', user.plan_type);
            localStorage.setItem('userExpiresAt', user.expires_at || '');
            localStorage.setItem('userIsActive', user.is_active);

            navigate('/dashboard');

        } catch (err) {
            setError(err.response?.data?.error || 'Erro ao validar a chave com o servidor.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-brand-50">
            <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-xl border border-brand-100">
                <div className="flex flex-col items-center mb-8">
                    <div className="bg-transparent mb-4 shadow-lg border-2 border-brand-100 rounded-xl overflow-hidden">
                        <img src={logo} alt="API NFSe Logo" className="w-20 h-20 object-contain shadow-inner" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">Licença de Acesso</h1>
                    <p className="text-slate-500 text-center mt-1">Insira a sua chave de ativação para acessar o sistema.</p>
                </div>

                {error && (
                    <div id="login-error" role="alert" className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 flex items-center gap-2">
                        <AlertCircle size={18} aria-hidden="true" />
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label htmlFor="accessKey" className="block text-sm font-medium text-slate-700 mb-2">Chave de Acesso</label>
                        <input
                            id="accessKey"
                            type="text"
                            required
                            aria-invalid={error ? "true" : "false"}
                            aria-describedby={error ? "login-error" : undefined}
                            className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none font-mono text-center tracking-widest uppercase text-slate-800"
                            placeholder="XXXX-XXXX-XXXX"
                            value={accessKey}
                            onChange={(e) => setAccessKey(e.target.value.toUpperCase())}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-70"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="animate-spin" aria-hidden="true" />
                                <span>Acessando...</span>
                            </>
                        ) : 'Acessar Sistema'}
                    </button>
                </form>
            </div>
        </div>
    );
}