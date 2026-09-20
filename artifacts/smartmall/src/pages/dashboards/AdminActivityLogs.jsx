import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Activity, Search, Filter, User, ShoppingCart, LogIn, Package, Plus, Trash2, Edit, RefreshCw, Clock, CalendarDays, Loader2, ChevronDown, Eye, X } from 'lucide-react';
import api from '../../api/axios';

const actionConfig = {
    logged_in: { label: 'تسجيل دخول', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: LogIn },
    login_failed: { label: 'فشل تسجيل دخول', color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20', icon: X },
    added_to_cart: { label: 'إضافة إلى السلة', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', icon: ShoppingCart },
    order_confirmed: { label: 'تأكيد طلب', color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', icon: Package },
    product_created: { label: 'إضافة منتج', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', icon: Plus },
    product_updated: { label: 'تحديث منتج', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20', icon: Edit },
    product_deleted: { label: 'حذف منتج', color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20', icon: Trash2 },
};
const defaultCfg = { label: 'إجراء', color: 'text-gray-400', bg: 'bg-white/5', border: 'border-white/10', icon: Activity };

const AdminActivityLogs = () => {
    const [filters, setFilters] = useState({ action: '', user_type: '', search: '', date_from: '', date_to: '' });
    const [page, setPage] = useState(1);
    const [expandedId, setExpandedId] = useState(null);
    const queryClient = useQueryClient();

    const filterKey = Object.entries(filters).filter(([,v]) => v).map(([k,v]) => `${k}:${v}`).join('|');

    const { data, isLoading } = useQuery({
        queryKey: ['admin-activity-logs', page, filterKey],
        queryFn: async () => {
            const params = new URLSearchParams({ page, per_page: '30' });
            Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
            const r = await api.get(`/admin/activity-logs?${params}`);
            return r.data;
        }
    });

    const { data: stats } = useQuery({
        queryKey: ['admin-activity-logs-stats'],
        queryFn: async () => (await api.get('/admin/activity-logs/stats')).data
    });

    const logs = data?.data || [];
    const lastPage = data?.last_page || 1;

    const getCfg = (action) => actionConfig[action] || defaultCfg;

    const clearAllMutation = useMutation({
        mutationFn: async () => await api.delete('/admin/activity-logs/clear-all'),
        onSuccess: () => {
            queryClient.invalidateQueries(['admin-activity-logs', 'admin-activity-logs-stats']);
        }
    });

    const deleteLogMutation = useMutation({
        mutationFn: async (id) => await api.delete(`/admin/activity-logs/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries(['admin-activity-logs', 'admin-activity-logs-stats']);
        }
    });

    return (
        <div className="space-y-8 pb-10 text-right">
            {/* Header */}
            <header className="flex items-start justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-extrabold flex items-center gap-3 text-white">
                        سجل النشاطات
                        <Activity className="w-8 h-8 text-indigo-400" />
                    </h2>
                    <p className="text-gray-400 mt-1">مراقبة جميع الحركات والإجراءات على المنصة</p>
                </div>
                <button
                    onClick={() => { if (window.confirm('هل أنت متأكد من مسح جميع السجلات؟')) clearAllMutation.mutate(); }}
                    disabled={clearAllMutation.isPending}
                    className="btn-danger !py-2.5 !px-5 shrink-0"
                >
                    <Trash2 className="w-4 h-4" />
                    {clearAllMutation.isPending ? 'جاري المسح...' : 'مسح الكل'}
                </button>
            </header>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="glass-card rounded-2xl p-4 border border-white/5">
                    <div className="text-2xl font-black text-indigo-400">{stats?.total_today ?? '—'}</div>
                    <div className="text-xs text-gray-500 font-bold mt-1">نشاط اليوم</div>
                </div>
                <div className="glass-card rounded-2xl p-4 border border-white/5">
                    <div className="text-2xl font-black text-emerald-400">{stats?.total_week ?? '—'}</div>
                    <div className="text-xs text-gray-500 font-bold mt-1">نشاط الأسبوع</div>
                </div>
                <div className="glass-card rounded-2xl p-4 border border-white/5">
                    <div className="text-2xl font-black text-amber-400">{stats?.recent_carts?.length ?? 0}</div>
                    <div className="text-xs text-gray-500 font-bold mt-1">إضافات للسلة (آخر 24 س)</div>
                </div>
                <div className="glass-card rounded-2xl p-4 border border-white/5">
                    <div className="text-2xl font-black text-rose-400">{stats?.recent_logins?.length ?? 0}</div>
                    <div className="text-xs text-gray-500 font-bold mt-1">تسجيل دخول (آخر 24 س)</div>
                </div>
            </div>

            {/* Carts without purchase alert */}
            {stats?.recent_carts?.length > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-3xl p-5">
                    <h3 className="text-sm font-bold text-amber-400 flex items-center gap-2 mb-3">
                        <ShoppingCart className="w-4 h-4" />
                        عملاء أضافوا منتجات إلى السلة دون تأكيد الشراء (آخر 24 ساعة)
                    </h3>
                    <div className="space-y-2">
                        {stats.recent_carts.map((log, i) => (
                            <div key={i} className="flex items-center justify-between text-xs text-gray-400 bg-black/30 rounded-xl px-4 py-2.5">
                                <span>{log.user?.name || 'زائر'} — {log.description}{log.mall ? ' | ' + log.mall.name_ar : ''}</span>
                                <span className="text-gray-600">{new Date(log.created_at).toLocaleTimeString('ar-EG')}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="glass-card rounded-3xl p-5 border border-white/5">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                            type="text" value={filters.search} onChange={e => { setFilters(f => ({ ...f, search: e.target.value })); setPage(1); }}
                            placeholder="بحث في الوصف..."
                            className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 pr-10 pl-4 text-sm text-white focus:outline-none focus:border-indigo-500/50"
                        />
                    </div>
                    <select value={filters.action} onChange={e => { setFilters(f => ({ ...f, action: e.target.value })); setPage(1); }}
                        className="bg-black/40 border border-white/10 rounded-xl py-2.5 px-4 text-sm text-white focus:outline-none focus:border-indigo-500/50">
                        <option value="">كل الإجراءات</option>
                        {Object.entries(actionConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                    <select value={filters.user_type} onChange={e => { setFilters(f => ({ ...f, user_type: e.target.value })); setPage(1); }}
                        className="bg-black/40 border border-white/10 rounded-xl py-2.5 px-4 text-sm text-white focus:outline-none focus:border-indigo-500/50">
                        <option value="">كل المستخدمين</option>
                        <option value="customer">زبون</option>
                        <option value="mall-owner">صاحب مول</option>
                        <option value="supermarket-owner">صاحب سوبرماركت</option>
                        <option value="super-admin">مشرف عام</option>
                        <option value="delivery-person">مندوب توصيل</option>
                        <option value="order-tracker">متابع طلبات</option>
                        <option value="guest">زائر</option>
                    </select>
                    <input type="date" value={filters.date_from} onChange={e => { setFilters(f => ({ ...f, date_from: e.target.value })); setPage(1); }}
                        className="bg-black/40 border border-white/10 rounded-xl py-2.5 px-4 text-sm text-white focus:outline-none focus:border-indigo-500/50" />
                    <input type="date" value={filters.date_to} onChange={e => { setFilters(f => ({ ...f, date_to: e.target.value })); setPage(1); }}
                        className="bg-black/40 border border-white/10 rounded-xl py-2.5 px-4 text-sm text-white focus:outline-none focus:border-indigo-500/50" />
                </div>
            </div>

            {/* Logs List */}
            <div className="space-y-2">
                {isLoading ? (
                    [...Array(8)].map((_, i) => <div key={i} className="h-16 rounded-2xl bg-white/5 shimmer" />)
                ) : logs.length === 0 ? (
                    <div className="text-center py-16 text-gray-500 glass-card rounded-3xl border border-white/5">
                        <Activity className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p className="font-bold">لا توجد نشاطات مسجلة</p>
                    </div>
                ) : (
                    logs.map((log) => {
                        const cfg = getCfg(log.action);
                        const Icon = cfg.icon;
                        const expanded = expandedId === log.id;
                        return (
                            <motion.div key={log.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                                className="glass-card rounded-2xl border border-white/5 overflow-hidden"
                            >
                                <button
                                    onClick={() => setExpandedId(expanded ? null : log.id)}
                                    className="w-full flex items-center gap-3 px-5 py-3.5 text-right group hover:bg-white/[0.02] transition-all"
                                >
                                    <div className={`w-9 h-9 rounded-xl ${cfg.bg} ${cfg.border} border flex items-center justify-center shrink-0`}>
                                        <Icon className={`w-4 h-4 ${cfg.color}`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                                            <span className="text-xs text-gray-400 truncate">{log.user?.name || 'زائر'}</span>
                                            {log.mall && <span className="text-[10px] text-gray-600 truncate">• {log.mall.name_ar}</span>}
                                        </div>
                                        <p className="text-xs text-gray-500 truncate mt-0.5">{log.description || '—'}</p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className="text-[10px] text-gray-600">{new Date(log.created_at).toLocaleString('ar-EG')}</span>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); if (window.confirm('حذف هذا السجل؟')) deleteLogMutation.mutate(log.id); }}
                                            disabled={deleteLogMutation.isPending}
                                            className="p-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all"
                                            title="حذف"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                        <ChevronDown className={`w-4 h-4 text-gray-600 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                                    </div>
                                </button>
                                {expanded && (
                                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} className="border-t border-white/5 px-5 py-4 space-y-3 text-xs bg-white/[0.01]">
                                        {/* User & Action Row */}
                                        <div className="flex flex-wrap items-center gap-3 pb-3 border-b border-white/5">
                                            <span className="px-3 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-300 font-bold">{log.user?.name || 'غير معروف'}</span>
                                            <span className="text-gray-500">•</span>
                                            <span className="text-gray-400">{log.user_type === 'guest' ? 'زائر' : log.user_type}</span>
                                            {log.mall && (
                                                <>
                                                    <span className="text-gray-500">•</span>
                                                    <span className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-300 font-bold">{log.mall.name_ar}</span>
                                                </>
                                            )}
                                        </div>

                                        {/* Details Grid */}
                                        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                            <div className="bg-black/20 rounded-xl p-3">
                                                <div className="text-gray-600 text-[10px] font-bold mb-1">الإجراء</div>
                                                <div className="text-white font-bold">{log.action_label || log.action}</div>
                                            </div>
                                            <div className="bg-black/20 rounded-xl p-3">
                                                <div className="text-gray-600 text-[10px] font-bold mb-1">التاريخ والوقت</div>
                                                <div className="text-gray-300">{new Date(log.created_at).toLocaleString('ar-EG')}</div>
                                            </div>
                                            {log.model_name && (
                                                <div className="bg-black/20 rounded-xl p-3">
                                                    <div className="text-gray-600 text-[10px] font-bold mb-1">العنصر المرتبط</div>
                                                    <div className="text-amber-300 font-bold">{log.model_name}</div>
                                                    {log.model_type && <div className="text-gray-600 text-[9px] mt-1 font-mono">{log.model_type} #{log.model_id}</div>}
                                                </div>
                                            )}
                                            {log.ip_address && (
                                                <div className="bg-black/20 rounded-xl p-3">
                                                    <div className="text-gray-600 text-[10px] font-bold mb-1">عنوان IP</div>
                                                    <div className="text-gray-300 font-mono text-[11px]">{log.ip_address}</div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Description */}
                                        {log.description && (
                                            <div className="bg-black/20 rounded-xl p-3">
                                                <div className="text-gray-600 text-[10px] font-bold mb-1">الوصف</div>
                                                <div className="text-gray-300">{log.description}</div>
                                            </div>
                                        )}

                                        {/* Metadata */}
                                        {log.metadata && Object.keys(log.metadata).length > 0 && (
                                            <div>
                                                <div className="text-gray-600 text-[10px] font-bold mb-1.5">بيانات إضافية</div>
                                                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
                                                    {Object.entries(log.metadata).map(([key, val]) => (
                                                        <div key={key} className="bg-black/30 rounded-xl px-3 py-2">
                                                            <div className="text-gray-600 text-[9px] font-bold">{key}</div>
                                                            <div className="text-gray-300 text-[11px] font-mono">{typeof val === 'object' ? JSON.stringify(val) : String(val)}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                            </motion.div>
                        );
                    })
                )}
            </div>

            {/* Pagination */}
            {lastPage > 1 && (
                <div className="flex items-center justify-center gap-1.5 flex-wrap">
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                        className="px-4 h-10 rounded-xl bg-white/5 text-sm font-bold text-gray-300 border border-white/10 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 transition-all">
                        السابق
                    </button>
                    {(() => {
                        const items = [];
                        const addPage = (p) => items.push(p);
                        const addDots = () => { if (items[items.length - 1] !== '...') items.push('...'); };
                        addPage(1);
                        if (page > 3) addDots();
                        for (let i = Math.max(2, page - 1); i <= Math.min(lastPage - 1, page + 1); i++) addPage(i);
                        if (page < lastPage - 2) addDots();
                        if (lastPage > 1) addPage(lastPage);
                        return items.map((p, i) =>
                            p === '...' ? (
                                <span key={`dots-${i}`} className="px-1 text-gray-600 text-sm select-none">•••</span>
                            ) : (
                                <button key={p} onClick={() => setPage(p)}
                                    className={`w-10 h-10 rounded-xl text-sm font-bold transition-all ${p === page ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30' : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'}`}>
                                    {p}
                                </button>
                            )
                        );
                    })()}
                    <span className="text-xs text-gray-500 mx-2">صفحة {page} من {lastPage}</span>
                    <button onClick={() => setPage(p => Math.min(lastPage, p + 1))} disabled={page === lastPage}
                        className="px-4 h-10 rounded-xl bg-white/5 text-sm font-bold text-gray-300 border border-white/10 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 transition-all">
                        التالي
                    </button>
                </div>
            )}
        </div>
    );
};

export default AdminActivityLogs;
