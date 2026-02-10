
import { Settings as SettingsIcon, Save } from 'lucide-react';

export default function Settings() {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <SettingsIcon className="text-brand-600" />
                    Configurações
                </h2>
                <p className="text-slate-500">Gerencie as preferências da sua conta</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Perfil</h3>
                <div className="space-y-4 max-w-md">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Nome</label>
                        <input type="text" className="w-full px-3 py-2 border rounded-lg" defaultValue="Admin User" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                        <input type="email" className="w-full px-3 py-2 border rounded-lg" defaultValue="admin@antigravity.com" disabled />
                    </div>
                    <button className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 transition">
                        <Save size={18} />
                        Salvar Alterações
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">API Key</h3>
                <p className="text-sm text-slate-500 mb-2">Chave para integração externa (Em breve).</p>
                <code className="bg-slate-100 px-3 py-1 rounded text-slate-600 block w-full">sk_live_...</code>
            </div>
        </div>
    );
}
