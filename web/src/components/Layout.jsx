
import { useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Search, Settings, FileText, LogOut, Users } from 'lucide-react';

export default function Layout() {
    const navigate = useNavigate();
    const userRole = localStorage.getItem('userRole');

    useEffect(() => {
        const isAuthenticated = localStorage.getItem('isAuthenticated');
        if (!isAuthenticated) {
            navigate('/');
        }
    }, [navigate]);

    const handleLogout = () => {
        localStorage.clear();
        navigate('/');
    };

    return (
        <div className="flex h-screen bg-slate-50">
            {/* Sidebar */}
            <aside className="w-64 bg-slate-900 text-white flex flex-col">
                <div className="p-6 border-b border-slate-800">
                    <h2 className="text-xl font-bold tracking-tight">API NFSe</h2>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    <NavItem to="/dashboard" end icon={<LayoutDashboard size={20} />}>Dashboard</NavItem>
                    <NavItem to="/dashboard/companies" icon={<Search size={20} />}>Buscar Nota</NavItem>
                    <NavItem to="/dashboard/nfs" icon={<FileText size={20} />}>Notas Fiscais</NavItem>
                    {userRole === 'ADMIN' && (
                        <NavItem to="/dashboard/users" icon={<Users size={20} />}>Usuários</NavItem>
                    )}
                    <NavItem to="/dashboard/settings" icon={<Settings size={20} />}>Configurações</NavItem>
                </nav>

                <div className="p-4 border-t border-slate-800">
                    <button onClick={handleLogout} className="flex items-center gap-3 w-full px-4 py-2 text-slate-400 hover:text-white transition">
                        <LogOut size={20} />
                        <span>Sair</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto">
                <header className="bg-white border-b border-slate-200 h-16 flex items-center px-8 justify-between sticky top-0 z-10">
                    <h1 className="text-lg font-semibold text-slate-800">Visão Geral</h1>
                    <div className="flex items-center gap-4">
                        <div className="px-3 py-1 bg-slate-100 rounded-full text-sm font-medium text-slate-600">
                            {localStorage.getItem('userName') || 'Usuário'}
                        </div>
                        <div className="w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center text-brand-700 font-bold">
                            {(localStorage.getItem('userName') || 'U').charAt(0)}
                        </div>
                    </div>
                </header>
                <div className="p-8">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}

function NavItem({ to, children, icon, end = false }) {
    return (
        <NavLink
            to={to}
            end={end}
            className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition ${isActive
                    ? 'bg-brand-600 text-white'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`
            }
        >
            {icon}
            <span className="font-medium">{children}</span>
        </NavLink>
    );
}
