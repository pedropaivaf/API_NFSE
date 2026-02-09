
import { Building2, FileCheck, AlertCircle } from 'lucide-react';

export default function DashboardHome() {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                    title="Empresas Ativas"
                    value="12"
                    icon={<Building2 className="text-brand-600" size={24} />}
                    color="bg-brand-50 border-brand-100"
                />
                <StatCard
                    title="Notas Baixadas (Hoje)"
                    value="1,240"
                    icon={<FileCheck className="text-green-600" size={24} />}
                    color="bg-green-50 border-green-100"
                />
                <StatCard
                    title="Erros de Sync"
                    value="3"
                    icon={<AlertCircle className="text-red-600" size={24} />}
                    color="bg-red-50 border-red-100"
                />
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Atividade Recente</h3>
                <div className="h-64 flex items-center justify-center text-slate-400">
                    Gráfico Placeholder
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, icon, color }) {
    return (
        <div className={`p-6 rounded-xl border ${color} shadow-sm`}>
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-slate-500 uppercase">{title}</span>
                {icon}
            </div>
            <p className="text-3xl font-bold text-slate-900">{value}</p>
        </div>
    );
}
