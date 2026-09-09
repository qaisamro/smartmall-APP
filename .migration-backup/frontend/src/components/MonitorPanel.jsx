import React from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    LineChart, Line, CartesianGrid
} from 'recharts';
import {
    Activity, Server, Database, AlertTriangle, Clock,
    TrendingUp, Users, ShoppingCart, BarChart3, Zap,
    CheckCircle, XCircle, RefreshCw, HardDrive
} from 'lucide-react';
import api from '../api/axios';

const MonitorPanel = () => {
    const { data: monitor, isLoading, refetch } = useQuery({
        queryKey: ['admin-monitor'],
        queryFn: async () => {
            const r = await api.get('/admin/monitor');
            return r.data;
        },
        refetchInterval: 60000, // auto-refresh every 60s
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-48">
                <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
            </div>
        );
    }

    const sys = monitor?.system ?? {};
    const counts = monitor?.counts ?? {};
    const charts = monitor?.charts ?? {};

    const statusCards = [
        {
            label: 'حالة قاعدة البيانات',
            value: sys.db_connected ? 'متصل' : 'منفصل',
            icon: Database,
            ok: sys.db_connected,
        },
        {
            label: 'وقت الاستجابة',
            value: `${sys.response_time_ms ?? '—'} ms`,
            icon: Zap,
            ok: (sys.response_time_ms ?? 0) < 500,
        },
        {
            label: 'مهام الانتظار',
            value: sys.queue_size ?? '—',
            icon: Clock,
            ok: (sys.queue_size ?? 0) < 50,
        },
        {
            label: 'المهام الفاشلة',
            value: sys.failed_jobs ?? '—',
            icon: XCircle,
            ok: (sys.failed_jobs ?? 0) === 0,
        },
        {
            label: 'الأخطاء الأخيرة',
            value: sys.recent_errors ?? '—',
            icon: AlertTriangle,
            ok: (sys.recent_errors ?? 0) < 10,
        },
        {
            label: 'نظام التخزين المؤقت',
            value: monitor?.cache?.driver ?? '—',
            icon: HardDrive,
            ok: monitor?.cache?.driver === 'redis',
        },
    ];

    const statCards = [
        { label: 'المستخدمون', value: counts.users ?? '—', icon: Users, color: 'text-purple-400' },
        { label: 'المولات', value: counts.malls ?? '—', icon: BarChart3, color: 'text-indigo-400' },
        { label: 'المنتجات', value: counts.products ?? '—', icon: ShoppingCart, color: 'text-emerald-400' },
        { label: 'طلبات اليوم', value: counts.orders_today ?? '—', icon: TrendingUp, color: 'text-amber-400' },
    ];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
        >
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold flex items-center gap-2">
                    <Activity className="w-5 h-5 text-rose-400" />
                    مراقبة الأداء
                </h2>
                <button
                    onClick={() => refetch()}
                    className="text-xs text-gray-400 hover:text-white flex items-center gap-1 transition-colors"
                >
                    <RefreshCw className="w-3.5 h-3.5" />
                    تحديث
                </button>
            </div>

            {/* Status Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
                {statusCards.map((card, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.05 }}
                        className="glass-card rounded-xl p-4 border border-white/5"
                    >
                        <div className="flex items-center justify-between mb-3">
                            <card.icon className={`w-4 h-4 ${card.ok ? 'text-emerald-400' : 'text-rose-400'}`} />
                            <div className={`w-2 h-2 rounded-full ${card.ok ? 'bg-emerald-500' : 'bg-rose-500'} animate-pulse`} />
                        </div>
                        <div className="text-lg font-bold">{card.value}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{card.label}</div>
                    </motion.div>
                ))}
            </div>

            {/* Counts */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {statCards.map((card, i) => (
                    <div key={i} className="glass-card rounded-xl p-4 border border-white/5">
                        <div className="flex items-center gap-2 mb-2">
                            <card.icon className={`w-4 h-4 ${card.color}`} />
                        </div>
                        <div className="text-2xl font-bold">{card.value}</div>
                        <div className="text-xs text-gray-400">{card.label}</div>
                    </div>
                ))}
            </div>

            {/* Charts */}
            <div className="grid md:grid-cols-2 gap-6">
                {/* Orders Chart */}
                <div className="glass-card rounded-2xl p-5 border border-white/5">
                    <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                        <ShoppingCart className="w-4 h-4 text-indigo-400" />
                        الطلبات (آخر 14 يوم)
                    </h3>
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={charts.orders ?? []}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                            <XAxis
                                dataKey="date"
                                tick={{ fill: '#9ca3af', fontSize: 11 }}
                                tickFormatter={(v) => v?.slice(5) ?? ''}
                            />
                            <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
                            <Tooltip
                                contentStyle={{
                                    background: '#1a1a24',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: 12,
                                    color: '#fff',
                                }}
                            />
                            <Bar dataKey="count" fill="#818cf8" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Revenue Chart */}
                <div className="glass-card rounded-2xl p-5 border border-white/5">
                    <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-emerald-400" />
                        الإيرادات (آخر 14 يوم)
                    </h3>
                    <ResponsiveContainer width="100%" height={220}>
                        <LineChart data={charts.orders ?? []}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                            <XAxis
                                dataKey="date"
                                tick={{ fill: '#9ca3af', fontSize: 11 }}
                                tickFormatter={(v) => v?.slice(5) ?? ''}
                            />
                            <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
                            <Tooltip
                                contentStyle={{
                                    background: '#1a1a24',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: 12,
                                    color: '#fff',
                                }}
                                formatter={(v) => `${Number(v).toLocaleString()} ₪`}
                            />
                            <Line
                                type="monotone"
                                dataKey="revenue"
                                stroke="#10b981"
                                strokeWidth={2}
                                dot={{ fill: '#10b981', r: 3 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* System Info */}
            <div className="glass-card rounded-2xl p-5 border border-white/5">
                <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                    <Server className="w-4 h-4 text-amber-400" />
                    معلومات النظام
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                    <div>
                        <span className="text-gray-400">PHP</span>
                        <p className="font-bold mt-0.5">{sys.php_version ?? '—'}</p>
                    </div>
                    <div>
                        <span className="text-gray-400">Laravel</span>
                        <p className="font-bold mt-0.5">{sys.laravel_version ?? '—'}</p>
                    </div>
                    <div>
                        <span className="text-gray-400">Queue Driver</span>
                        <p className="font-bold mt-0.5">{monitor?.cache?.queue_driver ?? '—'}</p>
                    </div>
                    <div>
                        <span className="text-gray-400">Cache Driver</span>
                        <p className="font-bold mt-0.5">{monitor?.cache?.driver ?? '—'}</p>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default MonitorPanel;
