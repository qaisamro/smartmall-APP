import React, { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../api/axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, Search, Clock, CheckCircle, Truck, Package, AlertTriangle, Timer, X, XCircle, Store, User, MapPin, Phone, Mail, Calendar, Filter, List, BarChart3, Hash, ShoppingBag, ChevronDown, Loader2, Archive, UserCheck } from 'lucide-react';

const PrepCountdown = ({ approvedAt, prepMinutes }) => {
    const [remaining, setRemaining] = useState(null);
    useEffect(() => {
        if (!approvedAt || !prepMinutes) return;
        const end = new Date(approvedAt).getTime() + prepMinutes * 60000;
        const tick = () => {
            const diff = end - Date.now();
            setRemaining(diff > 0 ? Math.ceil(diff / 60000) : 0);
        };
        tick();
        const id = setInterval(tick, 10000);
        return () => clearInterval(id);
    }, [approvedAt, prepMinutes]);
    if (remaining === null) return null;
    return (
        <span className={`flex items-center gap-1 text-[10px] font-bold ${remaining > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
            <Timer className="w-3 h-3" />
            {remaining > 0 ? `${remaining} د` : '✅'}
        </span>
    );
};

const TrackerDashboard = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [mode, setMode] = useState(() => searchParams.get('mode') === 'search' ? 'search' : 'dashboard');

    useEffect(() => {
        setMode(searchParams.get('mode') === 'search' ? 'search' : 'dashboard');
    }, [searchParams]);
    const [orderType, setOrderType] = useState('all');
    const [viewMode, setViewMode] = useState('today');
    const [filterFrom, setFilterFrom] = useState('');
    const [filterTo, setFilterTo] = useState('');
    const [selectedDriverId, setSelectedDriverId] = useState('');
    const [driverSearch, setDriverSearch] = useState('');
    const [showDriverDropdown, setShowDriverDropdown] = useState(false);
    const [statsModal, setStatsModal] = useState(null);
    const [personModal, setPersonModal] = useState(null);
    const [mallModal, setMallModal] = useState(null);

    const [sId, setSId] = useState('');
    const [sMallId, setSMallId] = useState('');
    const [sType, setSType] = useState('all');
    const [sFrom, setSFrom] = useState('');
    const [sTo, setSTo] = useState('');
    const [sResults, setSResults] = useState(null);
    const [sLoading, setSLoading] = useState(false);
    const [sError, setSError] = useState('');
    const [sSearched, setSSearched] = useState(false);
    const [sMallSearch, setSMallSearch] = useState('');
    const [sShowMallDropdown, setSShowMallDropdown] = useState(false);
    const [detailModal, setDetailModal] = useState(null);

    const { data: orders, isLoading } = useQuery({
        queryKey: ['tracker-orders', filterFrom, filterTo, selectedDriverId, viewMode],
        queryFn: async () => {
            const params = { view: viewMode };
            if (filterFrom) params.from = filterFrom;
            if (filterTo) params.to = filterTo;
            if (selectedDriverId) params.delivery_person_id = selectedDriverId;
            const r = await api.get('/tracker/orders', { params });
            return r.data;
        },
        refetchInterval: 10000,
    });

    const { data: stats } = useQuery({
        queryKey: ['delivery-stats'],
        queryFn: async () => {
            const r = await api.get('/tracker/stats');
            return r.data;
        },
        refetchInterval: 10000,
    });

    const { data: drivers } = useQuery({
        queryKey: ['delivery-persons'],
        queryFn: async () => {
            const r = await api.get('/tracker/delivery-persons');
            return r.data;
        },
    });

    const { data: malls } = useQuery({
        queryKey: ['tracker-malls'],
        queryFn: async () => {
            const r = await api.get('/tracker/malls');
            return r.data;
        },
    });

    const { data: driverDetail } = useQuery({
        queryKey: ['delivery-person-detail', personModal?.id],
        queryFn: async () => {
            const r = await api.get(`/tracker/delivery-persons/${personModal.id}`);
            return r.data;
        },
        enabled: !!personModal?.id,
    });

    const getStatusInfo = (order) => {
        const isPickup = order.delivery_method === 'pickup';
        if (order.delivery_status === 'delivered') return { label: isPickup ? 'تم الاستلام' : 'تم التسليم', cls: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30', icon: <CheckCircle className="w-3 h-3" /> };
        if (order.delivery_status === 'ready') return { label: 'جاهز للاستلام', cls: 'bg-violet-500/15 text-violet-300 border border-violet-500/30', icon: <CheckCircle className="w-3 h-3" /> };
        if (order.delivery_status === 'failed') return { label: 'ملغي', cls: 'bg-slate-500/15 text-slate-300 border border-slate-500/30', icon: <XCircle className="w-3 h-3" /> };
        if (order.delivery_status === 'delivering') return { label: 'جاري التوصيل', cls: 'bg-purple-500/15 text-purple-300 border border-purple-500/30', icon: <Truck className="w-3 h-3" /> };
        if (order.delivery_status === 'accepted') return { label: 'تم القبول من المندوب', cls: 'bg-blue-500/15 text-blue-300 border border-blue-500/30', icon: <Clock className="w-3 h-3" /> };
        if (order.delivery_status === 'preparing') return { label: 'قيد التجهيز', cls: 'bg-sky-500/15 text-sky-300 border border-sky-500/30', icon: <Timer className="w-3 h-3" /> };
        if (order.delivery_status === 'pending') return { label: 'بانتظار الاعتماد', cls: 'bg-amber-500/15 text-amber-300 border border-amber-500/30 animate-pulse', icon: <AlertTriangle className="w-3 h-3" /> };
        const completed = order.status === 'completed';
        return { label: completed ? 'مكتمل' : order.status === 'cancelled' ? 'ملغي' : 'قيد الانتظار', cls: completed ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-white/5 text-gray-400 border border-white/10', icon: completed ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" /> };
    };

    const filteredDrivers = drivers?.filter(d => d.name.includes(driverSearch)) || [];

    const filteredOrders = (orders || []).filter(o => {
        if (orderType === 'all') return true;
        if (orderType === 'delivery') return o.delivery_method === 'delivery';
        if (orderType === 'pickup') return o.delivery_method === 'pickup';
        return o.delivery_method !== 'delivery' && o.delivery_method !== 'pickup';
    });

    const filteredMalls = malls?.filter(m => m.name_ar.includes(sMallSearch) || (m.name_en || '').includes(sMallSearch)) || [];

    const handleSearch = useCallback(async () => {
        if (!sId && !sMallId && !sFrom && !sTo) {
            setSError('يرجى إدخال رقم الفاتورة أو تحديد فلتر');
            return;
        }
        setSLoading(true);
        setSError('');
        setSResults(null);
        setSSearched(true);
        try {
            const params = {};
            if (sId) params.order_id = sId;
            if (sMallId) params.mall_id = sMallId;
            if (sType !== 'all') params.delivery_method = sType;
            if (sFrom) params.from = sFrom;
            if (sTo) params.to = sTo;
            const r = await api.get('/tracker/search', { params });
            setSResults(r.data);
        } catch (e) {
            setSError(e.response?.data?.message || 'حدث خطأ أثناء البحث');
        } finally {
            setSLoading(false);
        }
    }, [sId, sMallId, sType, sFrom, sTo]);

    return (
        <div className="space-y-8 pb-10 text-right">
            <header className="flex flex-col sm:flex-row justify-between items-end gap-4">
                <div className="order-last sm:order-first">
                    <h2 className="text-3xl font-extrabold flex items-center gap-3 justify-start">
                        تتبع الطلبات العام
                        <Search className="w-8 h-8 text-blue-400" />
                    </h2>
                    <p className="text-gray-400 mt-1">مراقبة حركة كافة الطلبات بين المولات والمناديب والزبائن</p>
                </div>
            </header>

            {mode === 'dashboard' ? (
                <>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {(() => {
                            const boxes = [
                                { label: 'إجمالي مبيعات التوصيل', value: `${stats?.total_delivery_sales || 0} ₪`, color: 'text-white', orders: filteredOrders.filter(o => o.delivery_status === 'delivered') },
                                { label: 'بانتظار الاعتماد', value: stats?.pending_count || 0, color: 'text-rose-400', orders: filteredOrders.filter(o => o.delivery_status === 'pending') },
                                { label: 'قيد التجهيز', value: stats?.preparing_count || 0, color: 'text-sky-400', orders: filteredOrders.filter(o => o.delivery_status === 'preparing') },
                                { label: 'قيد التوصيل', value: stats?.active_count || 0, color: 'text-amber-400', orders: filteredOrders.filter(o => ['accepted', 'delivering'].includes(o.delivery_status)) },
                                { label: 'تم تسليمها', value: stats?.delivered_count || 0, color: 'text-emerald-400', orders: filteredOrders.filter(o => o.delivery_status === 'delivered') },
                            ];
                            return boxes.map(box => (
                                <button key={box.label} onClick={() => setStatsModal(box)} className="glass-card p-4 rounded-3xl border border-white/5 text-right text-start hover:bg-white/[0.04] transition-all">
                                    <p className="text-gray-400 text-xs">{box.label}</p>
                                    <p className={`text-xl font-bold mt-1 ${box.color}`}>{box.value}</p>
                                </button>
                            ));
                        })()}
                    </div>

                    <div className="flex flex-wrap items-end gap-3">
                        <div className="relative">
                            <label className="block text-xs text-gray-400 mb-1">المندوب</label>
                            <div className="relative">
                                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                                <input type="text" placeholder="ابحث عن مندوب..." value={driverSearch}
                                    onFocus={() => setShowDriverDropdown(true)}
                                    onChange={e => { setDriverSearch(e.target.value); setShowDriverDropdown(true); }}
                                    onBlur={() => setTimeout(() => setShowDriverDropdown(false), 200)}
                                    className="input-field !py-2 !pr-9 text-xs w-44 bg-white/5 border-white/10" />
                            </div>
                            {showDriverDropdown && (
                                <div className="absolute z-20 mt-1 w-full max-h-40 overflow-y-auto rounded-xl bg-gray-900 border border-white/10 shadow-2xl">
                                    <button onMouseDown={() => { setSelectedDriverId(''); setDriverSearch(''); setShowDriverDropdown(false); }}
                                        className={`w-full text-right px-3 py-2 text-xs transition-colors hover:bg-white/5 ${!selectedDriverId ? 'text-indigo-400 bg-indigo-500/10' : 'text-gray-400'}`}>
                                        الكل
                                    </button>
                                    {drivers && filteredDrivers.length === 0 ? (
                                        <div className="p-3 text-center text-xs text-gray-500">لا يوجد مندوبين</div>
                                    ) : (
                                        filteredDrivers.map(d => (
                                            <button key={d.id} onMouseDown={() => { setSelectedDriverId(d.id); setDriverSearch(d.name); setShowDriverDropdown(false); }}
                                                className={`w-full text-right px-3 py-2 text-xs transition-colors hover:bg-white/5 ${selectedDriverId === d.id ? 'text-indigo-400 bg-indigo-500/10' : 'text-gray-300'}`}>
                                                {d.name}
                                            </button>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">من</label>
                            <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)}
                                className="input-field !py-2 !px-3 text-xs w-36 bg-white/5 border-white/10" />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">إلى</label>
                            <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)}
                                className="input-field !py-2 !px-3 text-xs w-36 bg-white/5 border-white/10" />
                        </div>
                        {(filterFrom || filterTo || selectedDriverId) && (
                            <button onClick={() => { setFilterFrom(''); setFilterTo(''); setSelectedDriverId(''); setDriverSearch(''); }}
                                className="text-xs text-rose-400 hover:text-rose-300 transition-colors font-bold">
                                إلغاء الفلتر
                            </button>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-3">
                        <div className="flex gap-2">
                            {[
                                { key: 'today', label: 'طلبات اليوم', icon: Clock },
                                { key: 'archive', label: 'أرشيف الأيام السابقة', icon: Archive },
                            ].map(tab => (
                                <button key={tab.key} onClick={() => setViewMode(tab.key)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                                        viewMode === tab.key
                                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                                    }`}>
                                    <tab.icon className="w-4 h-4" />
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                        {viewMode === 'archive' && (
                            <span className="text-[11px] text-gray-500">كل طلبات الأيام السابقة مؤرشفة هنا — استخدم فلاتر التاريخ للرجوع ليوم محدد</span>
                        )}
                    </div>

                    <div className="flex flex-wrap justify-start gap-3 border-b border-white/5 pb-2">
                        {[
                            { key: 'all', label: 'الكل', icon: List },
                            { key: 'delivery', label: 'توصيل منزلي', icon: Truck },
                            { key: 'pickup', label: 'استلام شخصي', icon: UserCheck },
                            { key: 'in-mall', label: 'داخل المول', icon: Store },
                        ].map(tab => {
                            const count = (orders || []).filter(o =>
                                tab.key === 'all' ? true :
                                tab.key === 'delivery' ? o.delivery_method === 'delivery' :
                                tab.key === 'pickup' ? o.delivery_method === 'pickup' :
                                o.delivery_method !== 'delivery' && o.delivery_method !== 'pickup'
                            ).length;
                            return (
                                <button key={tab.key} onClick={() => setOrderType(tab.key)}
                                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                                        orderType === tab.key
                                            ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                                    }`}>
                                    <tab.icon className="w-4 h-4" />
                                    {tab.label}
                                    <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded-full">{count}</span>
                                </button>
                            );
                        })}
                    </div>

                    <div className="glass-card rounded-3xl overflow-hidden border border-white/5">
                        <div className="overflow-x-auto">
                            <table className="data-table min-w-[1150px]">
                                <thead>
                                    <tr className="bg-white/5">
                                        <th className="rounded-tr-3xl">رقم الطلب</th>
                                        <th>المول / المتجر</th>
                                        <th>الحالة</th>
                                        <th>هاتف الزبون</th>
                                        <th>المجموع</th>
                                        <th>تاريخ ووقت الطلب</th>
                                        <th>التجهيز</th>
                                        <th>المندوب</th>
                                        <th className="rounded-tl-3xl">التفاصيل</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {isLoading ? (
                                        [...Array(6)].map((_, i) => (
                                            <tr key={i}>
                                                <td colSpan="9" className="p-4"><div className="h-10 bg-white/5 rounded-xl shimmer" /></td>
                                            </tr>
                                        ))
                                    ) : filteredOrders?.length > 0 ? (
                                        filteredOrders.map(order => {
                                            const status = getStatusInfo(order);
                                            const d = new Date(order.created_at);
                                            return (
                                                <tr key={order.id}>
                                                    <td className="font-mono text-indigo-400 font-bold whitespace-nowrap">ORD-{order.pending_order_id ?? order.id}</td>
                                                    <td>
                                                        {order.mall ? (
                                                            <button onClick={() => setMallModal(order.mall)}
                                                                className="text-gray-300 font-medium hover:text-indigo-400 transition-colors underline underline-offset-2 decoration-white/20">
                                                                {order.mall.name_ar}
                                                            </button>
                                                        ) : (
                                                            <span className="text-gray-600">—</span>
                                                        )}
                                                    </td>
                                                    <td>
                                                        <span className={`${status.cls} flex items-center gap-1.5 w-fit px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap`}>
                                                            {status.icon}
                                                            {status.label}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        {(order.delivery_phone || order.user?.phone) ? (
                                                            <a href={`tel:${order.delivery_phone || order.user.phone}`} className="text-emerald-400 font-bold text-xs hover:underline flex items-center gap-1 w-fit" dir="ltr" title="رقم هاتف الطلب من السلة">
                                                                <Phone className="w-3 h-3" />
                                                                {order.delivery_phone || order.user.phone}
                                                            </a>
                                                        ) : (
                                                            <span className="text-gray-600 text-xs">—</span>
                                                        )}
                                                    </td>
                                                    <td className="font-bold text-white whitespace-nowrap">{order.total_amount} ₪</td>
                                                    <td className="whitespace-nowrap">
                                                        <div className="text-gray-300 text-xs font-medium">{d.toLocaleDateString('ar-EG', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                                                        <div className="text-gray-500 text-[11px] font-mono">{d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</div>
                                                    </td>
                                                    <td>
                                                        {order.approved_at && order.preparation_time ? (
                                                            <PrepCountdown approvedAt={order.approved_at} prepMinutes={order.preparation_time} />
                                                        ) : (
                                                            <span className="text-gray-600 text-xs">—</span>
                                                        )}
                                                    </td>
                                                    <td>
                                                        {order.delivery_person ? (
                                                            <button onClick={() => setPersonModal(order.delivery_person)}
                                                                className="text-white font-medium hover:text-indigo-400 transition-colors underline underline-offset-2 decoration-white/20">
                                                                {order.delivery_person.name}
                                                            </button>
                                                        ) : (
                                                            <span className="text-gray-600">—</span>
                                                        )}
                                                    </td>
                                                    <td className="text-center">
                                                        <button onClick={() => navigate(`/orders/${order.id}`)} className="p-2 rounded-xl bg-white/5 text-gray-400 hover:bg-white/10 transition-all" title="تفاصيل الطلب">
                                                            <Eye className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan={"9"} className={"py-20 text-center text-gray-500"}>{viewMode === 'archive' ? 'الأرشيف فارغ لهذه الفلاتر' : 'لا توجد طلبات لعرضها اليوم'}</td>
                                        </tr>
                                    )}
                                </tbody>
                    </table>
                </div>
            </div>
                </>
            ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                    <div className="relative group">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-indigo-500/20 rounded-3xl blur opacity-0 group-hover:opacity-100 transition-all duration-500" />
                        <div className="relative glass-card p-6 sm:p-8 rounded-3xl border border-white/10 bg-gradient-to-br from-gray-900/90 to-gray-950/90 backdrop-blur-xl">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                    <Search className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white text-xl">بحث متقدم في الطلبات</h3>
                                    <p className="text-xs text-gray-400 mt-0.5">ابحث عن طلبات برقم الفاتورة، المول، النطاق الزمني — مع تحكم كامل</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
                                <div>
                                    <label className="block text-xs text-gray-400 mb-2 font-bold">رقم الفاتورة</label>
                                    <div className="relative group/input">
                                        <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-xl blur opacity-0 group-focus-within/input:opacity-100 transition-all duration-300" />
                                        <div className="relative flex items-center">
                                            <Hash className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                            <input type="text" placeholder="مثال: 68 أو ORD-68" value={sId}
                                                onChange={e => setSId(e.target.value)}
                                                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                                                className="w-full bg-white/[0.04] border border-white/10 rounded-xl py-3 pr-10 pl-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.06] transition-all duration-200" />
                                        </div>
                                    </div>
                                </div>
                                <div className="relative">
                                    <label className="block text-xs text-gray-400 mb-2 font-bold">المول / السوبر ماركت</label>
                                    <div className="relative group/input">
                                        <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-xl blur opacity-0 group-focus-within/input:opacity-100 transition-all duration-300" />
                                        <div className="relative flex items-center">
                                            <Store className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                            <input type="text" placeholder="ابحث عن مول..." value={sMallSearch}
                                                onFocus={() => setSShowMallDropdown(true)}
                                                onChange={e => { setSMallSearch(e.target.value); setSShowMallDropdown(true); }}
                                                onBlur={() => setTimeout(() => setSShowMallDropdown(false), 200)}
                                                className="w-full bg-white/[0.04] border border-white/10 rounded-xl py-3 pr-10 pl-9 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.06] transition-all duration-200" />
                                            {!sMallId && <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />}
                                            {sMallId && (
                                                <button onClick={() => { setSMallId(''); setSMallSearch(''); }}
                                                    className="absolute left-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-rose-500/20 flex items-center justify-center hover:bg-rose-500/30 transition-colors">
                                                    <X className="w-3 h-3 text-rose-400" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    {sShowMallDropdown && (
                                        <div className="absolute z-20 mt-1.5 w-full max-h-48 overflow-y-auto rounded-xl bg-gray-900/95 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/50">
                                            <button onMouseDown={() => { setSMallId(''); setSMallSearch(''); setSShowMallDropdown(false); }}
                                                className={`w-full text-right px-3 py-2.5 text-sm transition-colors hover:bg-white/5 ${!sMallId ? 'text-indigo-400 bg-indigo-500/10' : 'text-gray-400'}`}>
                                                الكل
                                            </button>
                                            {malls && filteredMalls.length === 0 ? (
                                                <div className="p-3 text-center text-xs text-gray-500">لا يوجد مولات</div>
                                            ) : (
                                                filteredMalls.map(m => (
                                                    <button key={m.id} onMouseDown={() => { setSMallId(String(m.id)); setSMallSearch(m.name_ar); setSShowMallDropdown(false); }}
                                                        className={`w-full text-right px-3 py-2.5 text-sm transition-colors hover:bg-white/5 ${sMallId === String(m.id) ? 'text-indigo-400 bg-indigo-500/10' : 'text-gray-300'}`}>
                                                        <span>{m.name_ar}</span>
                                                        <span className={`mr-2 text-[10px] px-2 py-0.5 rounded-full ${m.type === 'mall' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                                                            {m.type === 'mall' ? 'مول' : 'سوبر ماركت'}
                                                        </span>
                                                    </button>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-400 mb-2 font-bold">طريقة الطلب</label>
                                    <div className="flex gap-1.5 bg-white/[0.04] rounded-xl p-1 border border-white/5">
                                        {[
                                            { key: 'all', label: 'الكل' },
                                            { key: 'delivery', label: 'توصيل' },
                                            { key: 'in-mall', label: 'داخل المول' },
                                        ].map(t => (
                                            <button key={t.key} onClick={() => setSType(t.key)}
                                                className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                                                    sType === t.key
                                                        ? 'bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-indigo-300 shadow-sm'
                                                        : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.02]'
                                                }`}>
                                                {t.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-400 mb-2 font-bold">الفترة الزمنية</label>
                                    <div className="flex items-center gap-2">
                                        <input type="date" value={sFrom} onChange={e => setSFrom(e.target.value)}
                                            className="w-full bg-white/[0.04] border border-white/10 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.06] transition-all duration-200 [color-scheme:dark]" />
                                        <span className="text-gray-600 text-xs shrink-0 font-bold">إلى</span>
                                        <input type="date" value={sTo} onChange={e => setSTo(e.target.value)}
                                            className="w-full bg-white/[0.04] border border-white/10 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.06] transition-all duration-200 [color-scheme:dark]" />
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-5 border-t border-white/[0.06]">
                                <div className="flex items-center gap-2.5 text-xs text-gray-500">
                                    <div className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                                        <Filter className="w-3.5 h-3.5 text-indigo-400" />
                                    </div>
                                    <span>يمكنك البحث برقم الفاتورة فقط أو باستخدام الفلاتر المتقدمة</span>
                                </div>
                                <div className="flex items-center gap-3 w-full sm:w-auto">
                                    {sSearched && sResults && (
                                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 font-bold whitespace-nowrap">
                                            {sResults.length} نتيجة
                                        </motion.div>
                                    )}
                                    {(sSearched || sId || sMallId || sFrom || sTo) && (
                                        <button onClick={() => { setSId(''); setSMallId(''); setSMallSearch(''); setSFrom(''); setSTo(''); setSType('all'); setSResults(null); setSSearched(false); setSError(''); }}
                                            className="px-4 py-2.5 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all duration-200 whitespace-nowrap">
                                            إعادة تعيين
                                        </button>
                                    )}
                                    <button onClick={handleSearch} disabled={sLoading}
                                        className="relative group/btn px-8 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-bold shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2.5 whitespace-nowrap">
                                        {sLoading ? (
                                            <><Loader2 className="w-4 h-4 animate-spin" /> جاري البحث...</>
                                        ) : (
                                            <><Search className="w-4 h-4" /> بحث</>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {sError && (
                        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                            className="p-4 rounded-2xl bg-gradient-to-r from-rose-500/10 to-transparent border border-rose-500/20 text-rose-400 text-sm flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-rose-500/10 flex items-center justify-center shrink-0">
                                <AlertTriangle className="w-4 h-4" />
                            </div>
                            {sError}
                        </motion.div>
                    )}

                    {sSearched && (
                        <AnimatePresence mode="wait">
                            <motion.div key={sResults ? 'results' : 'loading'} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                                {sLoading ? (
                                    <div className="glass-card rounded-3xl border border-white/5 p-12 flex flex-col items-center justify-center gap-4">
                                        <div className="relative">
                                            <Loader2 className="w-12 h-12 animate-spin text-indigo-400" />
                                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-500/5 to-transparent rounded-full blur-xl" />
                                        </div>
                                        <p className="text-gray-500 text-sm">جاري البحث...</p>
                                    </div>
                                ) : sResults?.length === 0 ? (
                                    <div className="glass-card rounded-3xl border border-white/5 p-16 flex flex-col items-center justify-center gap-5">
                                        <div className="w-20 h-20 rounded-full bg-white/[0.03] flex items-center justify-center border border-white/5">
                                            <Search className="w-9 h-9 text-gray-600" />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-gray-400 font-bold text-lg">لا توجد نتائج</p>
                                            <p className="text-gray-600 text-sm mt-1">تأكد من صحة رقم الفاتورة أو حاول باستخدام فلاتر أخرى</p>
                                        </div>
                                    </div>
                                ) : sResults && (
                                    <>
                                        <div className="flex items-center justify-between flex-wrap gap-3">
                                            <div className="flex items-center gap-3 text-sm">
                                                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                                                    <List className="w-4 h-4 text-indigo-400" />
                                                </div>
                                                <span className="text-gray-400">
                                                    <span className="text-white font-bold">{sResults.length}</span> نتيجة
                                                </span>
                                                <span className="text-gray-600">|</span>
                                                <span className="text-gray-400">
                                                    الإجمالي: <span className="text-emerald-400 font-bold text-base">{sResults.reduce((s, o) => s + parseFloat(o.total_amount || 0), 0).toFixed(2)} ₪</span>
                                                </span>
                                            </div>
                                        </div>
                                        <div className="glass-card rounded-3xl overflow-hidden border border-white/5 group/card">
                                            <div className="overflow-x-auto">
                                                <table className="data-table min-w-[1000px]">
                                                    <thead>
                                                        <tr className="bg-gradient-to-r from-white/[0.04] to-transparent">
                                                            <th className="rounded-tr-3xl">التفاصيل</th>
                                                            <th>المندوب</th>
                                                            <th>الحالة</th>
                                                            <th>المجموع</th>
                                                            <th>طريقة الطلب</th>
                                                            <th>المول / المتجر</th>
                                                            <th>الزبون</th>
                                                            <th>رقم الطلب</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {sResults.map((order, idx) => {
                                                            const status = getStatusInfo(order);
                                                            return (
                                                                <motion.tr key={order.id}
                                                                    initial={{ opacity: 0, y: 10 }}
                                                                    animate={{ opacity: 1, y: 0 }}
                                                                    transition={{ delay: idx * 0.03 }}
                                                                    className="cursor-pointer hover:bg-white/[0.03] transition-colors duration-150 border-b border-white/[0.02] last:border-0"
                                                                    onClick={() => setDetailModal(order)}>
                                                                    <td className="text-center">
                                                                        <button onClick={e => { e.stopPropagation(); navigate(`/orders/${order.id}`); }}
                                                                            className="p-2 rounded-xl bg-white/5 text-gray-500 hover:bg-indigo-500/20 hover:text-indigo-400 transition-all duration-200">
                                                                            <Eye className="w-4 h-4" />
                                                                        </button>
                                                                    </td>
                                                                    <td>
                                                                        {order.delivery_person ? (
                                                                            <button onClick={e => { e.stopPropagation(); setPersonModal(order.delivery_person); }}
                                                                                className="text-white font-medium hover:text-indigo-400 transition-colors underline underline-offset-2 decoration-white/20">
                                                                                {order.delivery_person.name}
                                                                            </button>
                                                                        ) : (
                                                                            <span className="text-gray-600">—</span>
                                                                        )}
                                                                    </td>
                                                                    <td>
                                                                        <span className={`badge ${status.color} flex items-center gap-1 w-fit`}>
                                                                            {status.icon}
                                                                            {status.label}
                                                                        </span>
                                                                    </td>
                                                    <td>
                                                        {(order.delivery_phone || order.user?.phone) ? (
                                                            <a href={`tel:${order.delivery_phone || order.user.phone}`} className="text-emerald-400 font-bold text-xs hover:underline flex items-center gap-1 w-fit" dir="ltr" title="رقم هاتف الطلب من السلة">
                                                                <Phone className="w-3 h-3" />
                                                                {order.delivery_phone || order.user.phone}
                                                            </a>
                                                        ) : (
                                                            <span className="text-gray-600 text-xs">—</span>
                                                        )}
                                                    </td>
                                                    <td className="font-bold text-white">{order.total_amount} ₪</td>
                                                                    <td>
                                                                        <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                                                                            order.delivery_method === 'delivery' ? 'bg-amber-500/20 text-amber-400' : 'bg-sky-500/20 text-sky-400'
                                                                        }`}>
                                                                            {order.delivery_method === 'delivery' ? 'توصيل' : 'داخل المول'}
                                                                        </span>
                                                                    </td>
                                                                    <td>
                                                                        {order.mall ? (
                                                                            <button onClick={e => { e.stopPropagation(); setMallModal(order.mall); }}
                                                                                className="text-gray-300 font-medium hover:text-indigo-400 transition-colors underline underline-offset-2 decoration-white/20">
                                                                                {order.mall.name_ar}
                                                                            </button>
                                                                        ) : (
                                                                            <span className="text-gray-600">—</span>
                                                                        )}
                                                                    </td>
                                                                    <td className="text-gray-400 text-sm">{order.user?.name || '—'}</td>
                                                                    <td className="font-mono text-indigo-400 font-bold">ORD-{order.pending_order_id ?? order.id}</td>
                                                                </motion.tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    )}
                </motion.div>
            )}

            {/* Stat Detail Modal */}
            <AnimatePresence>
                {statsModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
                        onClick={() => setStatsModal(null)}>
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                            onClick={e => e.stopPropagation()}
                            className="w-full max-w-md max-h-[80vh] overflow-y-auto rounded-3xl border border-white/10 bg-gradient-to-br from-gray-900 to-gray-950 p-6 relative">
                            <button onClick={() => setStatsModal(null)} className="sticky top-0 float-left w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
                                <X className="w-4 h-4 text-gray-400" />
                            </button>
                            <div className="text-center mb-4">
                                <h3 className="font-bold text-lg text-white">{statsModal.label}</h3>
                                <p className="text-2xl font-black text-white mt-1">{statsModal.value}</p>
                            </div>
                            {statsModal.orders?.length > 0 ? (
                                <div className="space-y-2">
                                    <p className="text-xs text-gray-500 font-bold border-b border-white/5 pb-2">آخر الطلبات</p>
                                    {statsModal.orders.slice(0, 15).map(o => (
                                        <div key={o.id} className="py-2 border-b border-white/[0.03] text-sm space-y-1">
                                            <div className="flex items-center justify-between">
                                                <span className="text-indigo-400 font-mono font-bold">ORD-{o.pending_order_id ?? o.id}</span>
                                                <span className="text-white font-bold">{o.total_amount} ₪</span>
                                            </div>
                                            <div className="flex items-center justify-between text-xs text-gray-400">
                                                <span>{o.mall?.name_ar || '—'}</span>
                                                <span className="text-gray-500">{new Date(o.created_at).toLocaleDateString('ar-EG')} • {new Date(o.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                            {(o.delivery_phone || o.user?.phone) && (
                                                <a href={`tel:${o.delivery_phone || o.user.phone}`} className="text-emerald-400 font-bold text-xs flex items-center gap-1 hover:underline w-fit" dir="ltr">
                                                    <Phone className="w-3 h-3" />
                                                    {o.delivery_phone || o.user.phone}
                                                </a>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-center text-gray-500 text-sm py-4">لا توجد طلبات في هذه الحالة</p>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Delivery Person Detail Modal */}
            <AnimatePresence>
                {personModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
                        onClick={() => setPersonModal(null)}>
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                            onClick={e => e.stopPropagation()}
                            className="w-full max-w-sm rounded-3xl border border-white/10 bg-gradient-to-br from-gray-900 to-gray-950 p-6 space-y-4 relative">
                            <button onClick={() => setPersonModal(null)} className="absolute top-4 left-4 w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
                                <X className="w-4 h-4 text-gray-400" />
                            </button>
                            <div className="text-center">
                                <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center mb-3">
                                    <User className="w-8 h-8 text-white" />
                                </div>
                                <h3 className="font-bold text-lg text-white">{driverDetail?.name || personModal.name}</h3>
                            </div>
                            <div className="space-y-3 border-t border-white/5 pt-4">
                                {driverDetail?.phone && (
                                    <div className="flex items-center justify-start gap-3 text-sm">
                                        <a href={`tel:${driverDetail.phone}`} className="text-gray-300 hover:text-indigo-400 hover:underline transition-colors" dir="ltr">{driverDetail.phone}</a>
                                        <Phone className="w-4 h-4 text-gray-500 shrink-0" />
                                    </div>
                                )}
                                {driverDetail?.email && (
                                    <div className="flex items-center justify-start gap-3 text-sm">
                                        <span className="text-gray-300" >{driverDetail.email}</span>
                                        <Mail className="w-4 h-4 text-gray-500 shrink-0" />
                                    </div>
                                )}
                                <div className="flex items-center justify-start gap-3 text-sm">
                                    <span className="text-emerald-400 font-bold">{driverDetail?.completed_deliveries || 0} طلب</span>
                                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                                </div>
                                <div className="flex items-center justify-start gap-3 text-sm">
                                    <span className="text-gray-400">{driverDetail?.created_at ? new Date(driverDetail.created_at).toLocaleDateString('ar-EG') : ''}</span>
                                    <Calendar className="w-4 h-4 text-gray-500 shrink-0" />
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Mall Detail Modal */}
            <AnimatePresence>
                {mallModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
                        onClick={() => setMallModal(null)}>
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                            onClick={e => e.stopPropagation()}
                            className="w-full max-w-sm rounded-3xl border border-white/10 bg-gradient-to-br from-gray-900 to-gray-950 p-6 space-y-4 relative">
                            <button onClick={() => setMallModal(null)} className="absolute top-4 left-4 w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
                                <X className="w-4 h-4 text-gray-400" />
                            </button>
                            <div className="text-center">
                                <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-3">
                                    <Store className="w-8 h-8 text-white" />
                                </div>
                                <h3 className="font-bold text-lg text-white">{mallModal.name_ar}</h3>
                                {mallModal.name_en && <p className="text-xs text-gray-500">{mallModal.name_en}</p>}
                            </div>
                            <div className="space-y-3 border-t border-white/5 pt-4">
                                {(mallModal.address_ar || mallModal.location_arabic) && (
                                    <div className="flex items-start justify-start gap-3 text-sm">
                                        <span className="text-gray-300 text-right">{mallModal.address_ar || mallModal.location_arabic}</span>
                                        <MapPin className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />
                                    </div>
                                )}
                                {(mallModal.contact_phone || mallModal.owner?.phone) && (
                                    <div className="flex items-center justify-start gap-3 text-sm">
                                        <a href={`tel:${mallModal.contact_phone || mallModal.owner?.phone}`} className="text-gray-300 hover:text-indigo-400 hover:underline transition-colors" dir="ltr">{mallModal.contact_phone || mallModal.owner?.phone}</a>
                                        <Phone className="w-4 h-4 text-gray-500 shrink-0" />
                                    </div>
                                )}
                                {mallModal.type && (
                                    <div className="flex items-center justify-start gap-3 text-sm">
                                        <span className="text-amber-400">{mallModal.type === 'mall' ? 'مول' : 'سوبر ماركت'}</span>
                                        <Store className="w-4 h-4 text-gray-500 shrink-0" />
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Order Detail Slide-over Modal */}
            <AnimatePresence>
                {detailModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
                        onClick={() => setDetailModal(null)}>
                        <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            onClick={e => e.stopPropagation()}
                            className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl border border-white/10 bg-gradient-to-br from-gray-900 to-gray-950 p-6 relative">
                            <button onClick={() => setDetailModal(null)} className="sticky top-0 float-left w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors mb-2">
                                <X className="w-4 h-4 text-gray-400" />
                            </button>
                            {(() => {
                                const o = detailModal;
                                const status = getStatusInfo(o);
                                return (
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between">
                                            <div className={`badge ${status.color} flex items-center gap-1.5`}>
                                                {status.icon}
                                                {status.label}
                                            </div>
                                            <div className="text-right">
                                                <p className="font-mono text-2xl font-black text-indigo-400">ORD-{o.pending_order_id ?? o.id}</p>
                                                <p className="text-xs text-gray-500">{new Date(o.created_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="p-4 rounded-2xl bg-white/5 space-y-2">
                                                <p className="text-xs text-gray-500 font-bold">المول / المتجر</p>
                                                <p className="text-white font-bold">{o.mall?.name_ar || '—'}</p>
                                                {o.mall?.type && <span className={`text-[10px] px-2 py-0.5 rounded-full ${o.mall.type === 'mall' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-emerald-500/20 text-emerald-400'}`}>{o.mall.type === 'mall' ? 'مول' : 'سوبر ماركت'}</span>}
                                                {(o.mall?.contact_phone || o.mall?.owner?.phone) && (
                                                    <a href={`tel:${o.mall.contact_phone || o.mall.owner?.phone}`} className="text-xs text-indigo-400 flex items-center gap-1 hover:underline" dir="ltr">
                                                        <Phone className="w-3 h-3" />
                                                        {o.mall.contact_phone || o.mall.owner?.phone}
                                                    </a>
                                                )}
                                            </div>
                                            <div className="p-4 rounded-2xl bg-white/5 space-y-2">
                                                <p className="text-xs text-gray-500 font-bold">طريقة الطلب</p>
                                                <p className="text-white font-bold">{o.delivery_method === 'delivery' ? 'توصيل منزلي' : 'داخل المول'}</p>
                                                <p className="text-xs text-gray-400">الحالة: {o.delivery_status || o.status}</p>
                                            </div>
                                            <div className="p-4 rounded-2xl bg-white/5 space-y-2">
                                                <p className="text-xs text-gray-500 font-bold">الزبون</p>
                                                <p className="text-white font-bold">{o.user?.name || '—'}</p>
                                                {(o.delivery_phone || o.user?.phone) && (
                                                    <a href={`tel:${o.delivery_phone || o.user.phone}`} className="text-xs text-emerald-400 font-bold flex items-center gap-1 hover:underline" dir="ltr" title={o.delivery_phone ? 'رقم هاتف الطلب' : 'هاتف الحساب'}>
                                                        <Phone className="w-3 h-3" />
                                                        {o.delivery_phone || o.user.phone}
                                                    </a>
                                                )}
                                                {o.user_id && <p className="text-xs text-gray-500">ID: {o.user_id}</p>}
                                            </div>
                                            <div className="p-4 rounded-2xl bg-white/5 space-y-2">
                                                <p className="text-xs text-gray-500 font-bold">المندوب</p>
                                                {o.delivery_person ? (
                                                    <>
                                                        <p className="text-white font-bold">{o.delivery_person.name}</p>
                                                        {o.delivery_person.phone && <a href={`tel:${o.delivery_person.phone}`} className="text-xs text-indigo-400 font-semibold flex items-center gap-1 hover:underline" dir="ltr"><Phone className="w-3 h-3" />{o.delivery_person.phone}</a>}
                                                    </>
                                                ) : (
                                                    <p className="text-gray-600">—</p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="p-4 rounded-2xl bg-white/5 space-y-3">
                                            <p className="text-xs text-gray-500 font-bold flex items-center gap-2">
                                                <ShoppingBag className="w-3.5 h-3.5" />
                                                المنتجات
                                            </p>
                                            {o.items?.length > 0 ? (
                                                <div className="space-y-2">
                                                    {o.items.map((item, i) => (
                                                        <div key={i} className="flex items-center justify-between text-sm border-b border-white/[0.03] pb-2 last:border-0 last:pb-0">
                                                            <div>
                                                                <p className="text-white">{item.product?.name_ar || 'منتج'}</p>
                                                                <p className="text-xs text-gray-500">×{item.quantity}</p>
                                                            </div>
                                                            <p className="text-white font-bold">{parseFloat(item.price_at_sale || 0).toFixed(2)} ₪</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-gray-600 text-sm">لا توجد منتجات</p>
                                            )}
                                        </div>

                                        <div className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-l from-emerald-500/10 to-transparent border border-emerald-500/20">
                                            <p className="text-sm text-gray-400">الإجمالي</p>
                                            <p className="text-2xl font-black text-emerald-400">{parseFloat(o.total_amount || 0).toFixed(2)} ₪</p>
                                        </div>

                                        <div className="flex gap-3 pt-2">
                                            <button onClick={() => { setDetailModal(null); navigate(`/orders/${o.id}`); }}
                                                className="flex-1 py-3 rounded-xl bg-indigo-500/20 text-indigo-400 font-bold text-sm hover:bg-indigo-500/30 transition-all flex items-center justify-center gap-2">
                                                <Eye className="w-4 h-4" />
                                                عرض تفاصيل الطلب
                                            </button>
                                        </div>
                                    </div>
                                );
                            })()}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default TrackerDashboard;
