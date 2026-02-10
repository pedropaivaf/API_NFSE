import { useState } from 'react';
import { Building2, FileCheck, CircleDollarSign, Activity, TrendingUp, BarChart2, AlertOctagon } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Rectangle } from 'recharts';

const dataWeek = [
    { name: 'Seg', processadas: 40, erros: 2, valor: 4500 },
    { name: 'Ter', processadas: 30, erros: 1, valor: 3200 },
    { name: 'Qua', processadas: 20, erros: 3, valor: 2100 },
    { name: 'Qui', processadas: 27, erros: 0, valor: 2800 },
    { name: 'Sex', processadas: 18, erros: 1, valor: 1900 },
    { name: 'Sáb', processadas: 23, erros: 2, valor: 2400 },
    { name: 'Dom', processadas: 34, erros: 0, valor: 3600 },
];

const dataMonth = [
    { name: 'Sem 1', processadas: 150, erros: 12, valor: 15000 },
    { name: 'Sem 2', processadas: 180, erros: 8, valor: 18500 },
    { name: 'Sem 3', processadas: 120, erros: 15, valor: 12000 },
    { name: 'Sem 4', processadas: 200, erros: 5, valor: 21000 },
];

export default function DashboardHome() {
    const [period, setPeriod] = useState('week'); // 'week' | 'month'
    const [chartMode, setChartMode] = useState('volume'); // 'volume' | 'quality'

    const currentData = period === 'week' ? dataWeek : dataMonth;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Empresas Monitoradas"
                    value="0"
                    icon={<Building2 size={22} />}
                    trend="+0 novas"
                    trendUp={true}
                />
                <StatCard
                    title="Notas Processadas"
                    value="0"
                    icon={<FileCheck size={22} />}
                    trend={period === 'week' ? "Últimos 7 dias" : "Este Mês"}
                    trendUp={true}
                />
                <StatCard
                    title="Valor Transacionado"
                    value="R$ 0,00"
                    icon={<CircleDollarSign size={22} />}
                    trend="Acumulado"
                    trendUp={true}
                />
                <StatCard
                    title="Status do Sistema"
                    value="Online"
                    icon={<Activity size={22} />}
                    trend="Sincronização Ativa"
                    trendUp={true}
                    highlight={true}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Chart Area */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                {chartMode === 'volume' ? 'Volume de Emissões' : 'Controle de Qualidade (Erros)'}
                            </h3>
                            <div className="flex gap-2 mt-2">
                                <button
                                    onClick={() => setChartMode('volume')}
                                    className={`text-xs px-3 py-1 rounded-full border transition ${chartMode === 'volume'
                                            ? 'bg-brand-50 border-brand-200 text-brand-700 font-medium'
                                            : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                                        }`}
                                >
                                    Volume
                                </button>
                                <button
                                    onClick={() => setChartMode('quality')}
                                    className={`text-xs px-3 py-1 rounded-full border transition ${chartMode === 'quality'
                                            ? 'bg-red-50 border-red-200 text-red-700 font-medium'
                                            : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                                        }`}
                                >
                                    Erros vs Sucesso
                                </button>
                            </div>
                        </div>

                        <select
                            className="bg-slate-50 border-none text-sm font-semibold text-slate-600 rounded-lg px-3 py-2 outline-none cursor-pointer hover:bg-slate-100 transition"
                            value={period}
                            onChange={(e) => setPeriod(e.target.value)}
                        >
                            <option value="week">Últimos 7 dias</option>
                            <option value="month">Este Mês</option>
                        </select>
                    </div>

                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart
                                data={currentData}
                                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                            >
                                <defs>
                                    <linearGradient id="colorProcessadas" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorErros" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                                    dy={10}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                                />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    cursor={{ stroke: '#cbd5e1', strokeWidth: 1 }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="processadas"
                                    stroke="#0ea5e9"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorProcessadas)"
                                    name="Sucesso"
                                />
                                {chartMode === 'quality' && (
                                    <Area
                                        type="monotone"
                                        dataKey="erros"
                                        stroke="#ef4444"
                                        strokeWidth={3}
                                        fillOpacity={1}
                                        fill="url(#colorErros)"
                                        name="Erros"
                                    />
                                )}
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-slate-800">Receita Estimada</h3>
                    </div>
                    <div className="h-80 w-full flex-1">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={currentData}
                                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                                    dy={10}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                                    tickFormatter={(value) => `k${value / 1000}`}
                                />
                                <Tooltip
                                    cursor={{ fill: '#f1f5f9' }}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    formatter={(value) => [`R$ ${value}`, 'Receita']}
                                />
                                <Bar
                                    dataKey="valor"
                                    fill="#1e293b"
                                    radius={[4, 4, 0, 0]}
                                    activeBar={<Rectangle fill="#0ea5e9" stroke="#0ea5e9" />}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, icon, trend, trendUp, highlight }) {
    return (
        <div className="p-6 rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
                <div className={`p-2 rounded-lg ${highlight ? 'bg-green-50 text-green-600' : 'bg-slate-50 text-slate-600'}`}>
                    {icon}
                </div>
                {trend && (
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${trendUp ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'} flex items-center gap-1`}>
                        {trendUp ? <TrendingUp size={12} /> : null}
                        {trend}
                    </span>
                )}
            </div>
            <div>
                <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
                <h4 className="text-2xl font-bold text-slate-900 tracking-tight">{value}</h4>
            </div>
        </div>
    );
}
