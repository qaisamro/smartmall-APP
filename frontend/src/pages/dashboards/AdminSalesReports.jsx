import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios';
import { 
    ShoppingBag, Loader2, Store, Truck, Search, Download, FileText, BarChart3, X, Building2 
} from 'lucide-react';

const AdminSalesReports = () => {
    const [deliveryFilter, setDeliveryFilter] = useState('all');
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });
    const [search, setSearch] = useState('');
    const [expandedOrder, setExpandedOrder] = useState(null);

    const { data: allOrders, isLoading } = useQuery({
        queryKey: ['admin-all-orders', deliveryFilter, selectedMonth],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (deliveryFilter !== 'all') params.append('delivery_method', deliveryFilter);
            if (selectedMonth) params.append('month', selectedMonth);
            const r = await api.get(`/admin/orders/all?${params.toString()}`);
            return r.data;
        }
    });

    const list = Array.isArray(allOrders) ? allOrders : [];

    const filtered = useMemo(() => {
        if (!search) return list;
        const q = search.toLowerCase();
        return list.filter(o => 
            o.id.toString().includes(q) || 
            o.mall?.name_ar?.toLowerCase().includes(q) ||
            o.items?.some(i => i.product?.name_ar?.toLowerCase().includes(q))
        );
    }, [list, search]);

    const stats = useMemo(() => {
        return {
            total: list.reduce((s, o) => s + parseFloat(o.total_amount), 0),
            count: list.length,
            inMall: list.filter(o => o.delivery_method === 'in-mall').length,
            delivery: list.filter(o => o.delivery_method === 'delivery').length,
        };
    }, [list]);

    const exportCSV = () => {
        const headers = ['رقم الفاتورة', 'التاريخ', 'المول', 'النوع', 'القطع', 'المبلغ', 'الزبون'];
        const rows = filtered.map(o => [
            o.id,
            new Date(o.created_at).toLocaleDateString('ar-EG'),
            o.mall?.name_ar || '-',
            o.delivery_method === 'delivery' ? 'توصيل' : 'داخل المول',
            o.items?.reduce((s, i) => s + i.quantity, 0) || 0,
            o.total_amount,
            o.user?.name || 'زائر'
        ]);
        const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', `admin-sales-report-${selectedMonth}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const exportMonthlySummary = () => {
        const grouped = {};
        list.forEach(o => {
            const m = o.created_at?.substring(0, 7);
            if (!grouped[m]) grouped[m] = { count: 0, total: 0 };
            grouped[m].count++;
            grouped[m].total += parseFloat(o.total_amount);
        });
        const csv = [['الشهر', 'عدد الفواتير', 'الإجمالي'], ...Object.entries(grouped).map(([m, d]) => [m, d.count, d.total.toFixed(2)])].map(r => r.join(',')).join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', 'admin-monthly-summary.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-8 pb-10 text-right">
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl sm:text-3xl font-extrabold flex items-center gap-3">
                        تقارير المبيعات
                        <BarChart3 className="w-7 h-7 text-emerald-400" />
                    </h2>
                    <p className="text-gray-400 mt-1">عرض وتصدير تقارير المبيعات لجميع المولات</p>
                </div>
                <div className="flex items-center gap-2">
                    <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="input-field !py-2.5 !px-4 !w-auto" />
                </div>
            </header>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="glass-card p-5 rounded-3xl border border-white/5 text-center">
                    <div className="text-2xl font-black text-emerald-400">{stats.total.toFixed(2)} ₪</div>
                    <div className="text-gray-500 text-xs font-bold mt-1">إجمالي المبيعات</div>
                </div>
                <div className="glass-card p-5 rounded-3xl border border-white/5 text-center">
                    <div className="text-2xl font-black text-white">{stats.count}</div>
                    <div className="text-gray-500 text-xs font-bold mt-1">عدد الفواتير</div>
                </div>
                <div className="glass-card p-5 rounded-3xl border border-white/5 text-center">
                    <div className="text-2xl font-black text-indigo-400">{stats.inMall}</div>
                    <div className="text-gray-500 text-xs font-bold mt-1">داخل المول</div>
                </div>
                <div className="glass-card p-5 rounded-3xl border border-white/5 text-center">
                    <div className="text-2xl font-black text-amber-400">{stats.delivery}</div>
                    <div className="text-gray-500 text-xs font-bold mt-1">توصيل</div>
                </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap gap-2">
                    {[
                        { id: 'all', label: 'الكل' },
                        { id: 'in-mall', label: 'داخل المول', icon: Store },
                        { id: 'delivery', label: 'توصيل', icon: Truck },
                    ].map(tab => (
                        <button key={tab.id} onClick={() => setDeliveryFilter(tab.id)}
                            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${deliveryFilter === tab.id ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'bg-white/5 text-gray-400 hover:text-white border border-white/10'}`}
                        >
                            {tab.icon && <tab.icon className="w-4 h-4" />}{tab.label}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث..." className="input-field !py-2.5 !pr-10 !w-48" />
                    </div>
                    <button onClick={exportCSV} className="btn-secondary !py-2.5 !px-4 !text-xs flex items-center gap-2">
                        <Download className="w-4 h-4" /> CSV
                    </button>
                    <button onClick={exportMonthlySummary} className="btn-secondary !py-2.5 !px-4 !text-xs flex items-center gap-2">
                        <FileText className="w-4 h-4" /> تقرير شهري
                    </button>
                </div>
            </div>

            <div className="glass-card rounded-[2.5rem] border border-white/5 overflow-hidden">
                {isLoading ? (
                    <div className="py-20 flex items-center justify-center"><Loader2 className="w-12 h-12 animate-spin opacity-30" /></div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-right text-sm">
                            <thead className="bg-white/2">
                                <tr>
                                    <th className="px-4 py-4 font-bold text-gray-400">#</th>
                                    <th className="px-4 py-4 font-bold text-gray-400">التاريخ</th>
                                    <th className="px-4 py-4 font-bold text-gray-400">المول</th>
                                    <th className="px-4 py-4 font-bold text-gray-400">النوع</th>
                                    <th className="px-4 py-4 font-bold text-gray-400">الزبون</th>
                                    <th className="px-4 py-4 font-bold text-gray-400">القطع</th>
                                    <th className="px-4 py-4 font-bold text-gray-400">الإجمالي</th>
                                    <th className="px-4 py-4 font-bold text-gray-400 text-center">التفاصيل</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filtered.map(order => {
                                    const isExpanded = expandedOrder === order.id;
                                    return (
                                        <React.Fragment key={order.id}>
                                            <tr className="hover:bg-white/2 transition-colors">
                                                <td className="px-4 py-4 font-mono text-emerald-400">{order.pending_order_id ? `ORD-${order.pending_order_id}` : `#${order.id}`}</td>
                                                <td className="px-4 py-4 text-xs">{new Date(order.created_at).toLocaleDateString('ar-EG')}</td>
                                                <td className="px-4 py-4 text-xs text-indigo-400">{order.mall?.name_ar || '-'}</td>
                                                <td className="px-4 py-4">
                                                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${order.delivery_method === 'delivery' ? 'bg-amber-500/10 text-amber-400' : 'bg-indigo-500/10 text-indigo-400'}`}>
                                                        {order.delivery_method === 'delivery' ? 'توصيل' : 'داخل المول'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 text-xs text-gray-400">{order.user?.name || 'زائر'}</td>
                                                <td className="px-4 py-4 text-center text-xs">{order.items?.reduce((s, i) => s + i.quantity, 0) || 0}</td>
                                                <td className="px-4 py-4 font-bold">{order.total_amount} ₪</td>
                                                <td className="px-4 py-4 text-center">
                                                    <button onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                                                        className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl hover:bg-indigo-500/20 transition-all">
                                                        {isExpanded ? <X className="w-4 h-4" /> : <Search className="w-4 h-4" />}
                                                    </button>
                                                </td>
                                            </tr>
                                            {isExpanded && (
                                                <tr>
                                                    <td colSpan={8} className="px-6 py-4 bg-white/2">
                                                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-3">
                                                            {order.delivery_address && (
                                                                <div className="text-xs text-gray-400 bg-white/5 p-3 rounded-2xl">
                                                                    <span className="font-bold text-gray-300">العنوان:</span> {order.delivery_address}
                                                                </div>
                                                            )}
                                                            <div className="grid sm:grid-cols-2 gap-3">
                                                                {order.items?.map((item, idx) => (
                                                                     <div key={idx} className="flex items-center justify-between bg-white/5 p-3 rounded-2xl border border-white/5">
                                                                        <div className="text-right">
                                                                            <p className="font-bold text-sm">{item.product?.name_ar || 'منتج'}</p>
                                                                            <p className="text-[10px] text-gray-500">الكمية: {item.quantity}</p>
                                                                            {item.notes && <p className="text-[10px] text-amber-400/70 mt-0.5">{item.notes}</p>}
                                                                        </div>
                                                                        <div className="text-right">
                                                                            <span className="font-mono font-bold text-indigo-400">{(item.price_at_sale * item.quantity).toFixed(2)} ₪</span>
                                                                            <div className="text-[10px] text-gray-500">{item.price_at_sale} ₪ × {item.quantity}</div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </motion.div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                                {filtered.length === 0 && (
                                    <tr><td colSpan={8} className="py-20 text-center opacity-30">لا توجد فواتير</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminSalesReports;
