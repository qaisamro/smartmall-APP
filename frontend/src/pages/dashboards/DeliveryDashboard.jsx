import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import api from '../../api/axios';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, CheckCircle, Clock, MapPin, Phone, Package, Navigation, User, Store, DollarSign, ChevronDown, ChevronUp, History, XCircle, Loader2, Bell, X, Info } from 'lucide-react';

const tabs = [
    { key: 'pending', label: 'طلبات جديدة', icon: Clock },
    { key: 'active', label: 'مهامي', icon: Navigation },
    { key: 'accepted_view', label: 'تم القبول', icon: CheckCircle },
    { key: 'history', label: 'السجل', icon: History },
];

const OrderItemsList = ({ items }) => (
    <div className="space-y-1.5 text-sm">
        {items?.map((item, i) => (
            <div key={i} className="text-gray-300">
                <div className="flex justify-between items-center">
                    <span className="text-gray-400">{item.quantity} × {item.price_at_sale} ₪</span>
                    <span>{item.product?.name_ar || 'منتج'}</span>
                </div>
                {item.notes && <p className="text-[10px] text-amber-400/70 pr-2 mt-0.5">{item.notes}</p>}
            </div>
        ))}
    </div>
);

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
        <div className={`flex items-center gap-1.5 text-xs font-bold ${remaining > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
            <Clock className="w-3.5 h-3.5" />
            {remaining > 0 ? `${remaining} دقيقة متبقية` : 'مكتمل التجهيز ✅'}
        </div>
    );
};

const DeliveryDashboard = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'pending');
    const [expandedOrders, setExpandedOrders] = useState({});
    const [highlightedOrder, setHighlightedOrder] = useState(null);
    const [filterFrom, setFilterFrom] = useState('');
    const [filterTo, setFilterTo] = useState('');
    const [acceptedFilterFrom, setAcceptedFilterFrom] = useState('');
    const [acceptedFilterTo, setAcceptedFilterTo] = useState('');
    const [statsModal, setStatsModal] = useState(null);
    const orderRefs = useRef({});
    const queryClient = useQueryClient();

    const { data: pendingOrders, isLoading: loadingPending } = useQuery({
        queryKey: ['pending-deliveries'],
        queryFn: async () => {
            const r = await api.get('/delivery/orders/pending');
            return r.data;
        },
        refetchInterval: 10000,
    });

    const { data: stats } = useQuery({
        queryKey: ['delivery-stats'],
        queryFn: async () => {
            const r = await api.get('/delivery/stats');
            return r.data;
        },
        refetchInterval: 10000,
    });

    const { data: activeOrders, isLoading: loadingActive } = useQuery({
        queryKey: ['active-deliveries'],
        queryFn: async () => {
            const r = await api.get('/delivery/orders/active');
            return r.data;
        },
        refetchInterval: 10000,
    });

    const { data: acceptedOrders, isLoading: loadingAccepted } = useQuery({
        queryKey: ['delivery-accepted', acceptedFilterFrom, acceptedFilterTo],
        queryFn: async () => {
            const params = {};
            if (acceptedFilterFrom) params.from = acceptedFilterFrom;
            if (acceptedFilterTo) params.to = acceptedFilterTo;
            const r = await api.get('/delivery/orders/accepted', { params });
            return r.data;
        },
        refetchInterval: 10000,
    });

    const { data: historyOrders, isLoading: loadingHistory } = useQuery({
        queryKey: ['delivery-history', filterFrom, filterTo],
        queryFn: async () => {
            const params = {};
            if (filterFrom) params.from = filterFrom;
            if (filterTo) params.to = filterTo;
            const r = await api.get('/delivery/orders/history', { params });
            return r.data;
        },
        refetchInterval: 10000,
    });

    const acceptMutation = useMutation({
        mutationFn: async (id) => await api.post(`/delivery/orders/${id}/accept`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pending-deliveries'] });
            queryClient.invalidateQueries({ queryKey: ['active-deliveries'] });
            queryClient.invalidateQueries({ queryKey: ['delivery-accepted'] });
            queryClient.invalidateQueries({ queryKey: ['delivery-stats'] });
        }
    });

    const updateStatusMutation = useMutation({
        mutationFn: async ({ id, status }) => await api.post(`/delivery/orders/${id}/status`, { status }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['active-deliveries'] });
            queryClient.invalidateQueries({ queryKey: ['delivery-accepted'] });
            queryClient.invalidateQueries({ queryKey: ['delivery-history'] });
            queryClient.invalidateQueries({ queryKey: ['delivery-stats'] });
        }
    });

    const declineMutation = useMutation({
        mutationFn: async (id) => await api.post(`/delivery/orders/${id}/decline`),
        onSuccess: (_, id) => {
            queryClient.invalidateQueries({ queryKey: ['pending-deliveries'] });
            queryClient.invalidateQueries({ queryKey: ['active-deliveries'] });
            queryClient.invalidateQueries({ queryKey: ['delivery-accepted'] });
            queryClient.invalidateQueries({ queryKey: ['delivery-stats'] });
        },
        onError: () => {
            queryClient.invalidateQueries({ queryKey: ['pending-deliveries'] });
            queryClient.invalidateQueries({ queryKey: ['active-deliveries'] });
            queryClient.invalidateQueries({ queryKey: ['delivery-accepted'] });
        }
    });

    const toggleExpand = (id) => {
        setExpandedOrders(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const filteredPending = Array.isArray(pendingOrders) ? pendingOrders : [];

    useEffect(() => {
        const orderId = searchParams.get('order_id');
        if (orderId && filteredPending.length > 0) {
            const found = filteredPending.find(o => o.id === Number(orderId) || String(o.id) === orderId);
            if (found) {
                setHighlightedOrder(found.id);
                setExpandedOrders(prev => ({ ...prev, [found.id]: true }));
                setTimeout(() => {
                    orderRefs.current[found.id]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 300);
                setTimeout(() => setHighlightedOrder(null), 8000);
            }
        }
    }, [filteredPending, searchParams]);

    const switchTab = (key) => {
        setActiveTab(key);
        setSearchParams({ tab: key }, { replace: true });
    };

    const renderPendingOrder = (order) => (
        <motion.div
            key={order.id}
            ref={el => orderRefs.current[order.id] = el}
            className={`glass-card p-5 rounded-3xl border space-y-4 transition-all duration-500 ${
                highlightedOrder === order.id
                    ? 'border-indigo-400/60 bg-indigo-500/10 shadow-lg shadow-indigo-500/20'
                    : 'border-white/5'
            }`}
        >
            {highlightedOrder === order.id && (
                <div className="flex items-center justify-center gap-2 text-indigo-400 text-sm font-bold">
                    <Bell className="w-4 h-4" />
                    <span>طلب جديد من الإشعار</span>
                </div>
            )}
            <div className="flex justify-between items-start">
                <span className="text-indigo-400 font-bold text-lg">#{order.id}</span>
                <div className="text-right">
                    <p className="font-bold text-base">{order.mall?.name_ar || 'متجر'}</p>
                    <p className="text-xs text-gray-500">{new Date(order.created_at).toLocaleString('ar-EG')}</p>
                </div>
            </div>

            <div className="border-t border-white/5 pt-3 space-y-3">
                <div className="flex items-start justify-start gap-2">
                    <div className="text-right">
                        <p className="font-bold">{order.user?.name || 'زبون'}</p>
                        {(order.delivery_phone || order.user?.phone) ? (
                            <a href={`tel:${order.delivery_phone || order.user.phone}`} className="inline-flex items-center gap-1 text-xs text-indigo-400 font-semibold hover:underline" dir="ltr">
                                <Phone className="w-3 h-3" />
                                {order.delivery_phone || order.user.phone}
                            </a>
                        ) : (
                            <p className="text-xs text-gray-400">لا يوجد رقم</p>
                        )}
                    </div>
                    <User className="w-4 h-4 text-gray-400 mt-1 shrink-0" />
                </div>
                {order.delivery_address && (
                    <div className="flex items-start justify-start gap-2">
                        <p className="text-sm text-gray-300 text-right">{order.delivery_address}</p>
                        <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                    </div>
                )}
                {order.delivery_zone && (
                    <div className="flex items-center justify-start gap-2 text-sm">
                        <span className="text-gray-300">{order.delivery_zone.name}</span>
                        <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
                    </div>
                )}
                {order.approved_at && order.preparation_time && (
                    <div className="flex items-center justify-start gap-2">
                        <PrepCountdown approvedAt={order.approved_at} prepMinutes={order.preparation_time} />
                    </div>
                )}
            </div>

            <button
                onClick={() => toggleExpand(order.id)}
                className="flex items-center justify-center gap-2 w-full text-sm text-gray-400 hover:text-white transition-colors"
            >
                {expandedOrders[order.id] ? 'إخفاء التفاصيل' : 'عرض تفاصيل الطلب'}
                {expandedOrders[order.id] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {expandedOrders[order.id] && (
                <div className="border-t border-white/5 pt-3 space-y-2">
                    <OrderItemsList items={order.items} />
                    <div className="border-t border-white/5 pt-2 space-y-1 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-400">{order.delivery_fee} ₪</span>
                            <span className="text-gray-500">رسوم التوصيل</span>
                        </div>
                        <div className="flex justify-between font-bold text-base">
                            <span className="text-white">{order.total_amount} ₪</span>
                            <span className="text-gray-300">الإجمالي</span>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-2 gap-3">
                <button
                    onClick={() => acceptMutation.mutate(order.id)}
                    disabled={acceptMutation.isPending}
                    className="py-3 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold text-sm hover:bg-emerald-500 hover:text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed col-span-2"
                >
                    {acceptMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'قبول الطلب'}
                </button>
            </div>
        </motion.div>
    );

    const statusBadge = (status) => {
        const map = {
            accepted: { label: 'تم القبول', cls: 'badge-amber' },
            delivering: { label: 'جاري التوصيل', cls: 'badge-blue' },
            delivered: { label: 'تم التسليم', cls: 'badge-green' },
            failed: { label: 'فشل التوصيل', cls: 'badge-rose' },
        };
        const s = map[status] || { label: status, cls: 'badge-gray' };
        return <span className={`badge ${s.cls}`}>{s.label}</span>;
    };

    const renderActiveOrder = (order) => {
        const isUpdating = updateStatusMutation.isPending && updateStatusMutation.variables?.id === order.id;

        return (
            <motion.div key={order.id} className="glass-card p-5 rounded-3xl border border-emerald-500/20 bg-emerald-500/5 space-y-4">
                <div className="flex justify-between items-center">
                    {statusBadge(order.delivery_status)}
                    <p className="font-bold text-lg">طلب رقم #{order.id}</p>
                </div>
                <div className="space-y-2 text-sm text-gray-400 text-right">
                    <div className="flex items-center justify-start gap-2">
                        <span className="font-bold text-white">{order.mall?.name_ar || 'متجر'}</span>
                        <Store className="w-4 h-4" />
                    </div>
                    <div className="flex items-start justify-start gap-2">
                        <div className="text-right">
                            <p className="font-bold text-white">{order.user?.name || 'زبون'}</p>
                            {(order.delivery_phone || order.user?.phone) ? (
                                <a href={`tel:${order.delivery_phone || order.user.phone}`} className="inline-flex items-center gap-1 text-xs text-indigo-400 font-semibold hover:underline" dir="ltr">
                                    <Phone className="w-3 h-3" />
                                    {order.delivery_phone || order.user.phone}
                                </a>
                            ) : null}
                        </div>
                        <User className="w-4 h-4 shrink-0 mt-1" />
                    </div>
                    {order.delivery_address && (
                        <div className="flex items-start justify-start gap-2">
                            <p className="text-sm text-gray-300 text-right">{order.delivery_address}</p>
                            <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
                        </div>
                    )}
                    {order.approved_at && order.preparation_time && (
                        <div className="flex items-center justify-start gap-2">
                            <PrepCountdown approvedAt={order.approved_at} prepMinutes={order.preparation_time} />
                        </div>
                    )}
                </div>

                <button
                    onClick={() => toggleExpand(order.id)}
                    className="flex items-center justify-center gap-2 w-full text-sm text-gray-400 hover:text-white transition-colors"
                >
                    {expandedOrders[order.id] ? 'إخفاء التفاصيل' : 'عرض تفاصيل الطلب'}
                    {expandedOrders[order.id] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {expandedOrders[order.id] && (
                    <div className="border-t border-white/5 pt-3 space-y-2">
                        <OrderItemsList items={order.items} />
                        <div className="border-t border-white/5 pt-2 space-y-1 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-400">{order.delivery_fee} ₪</span>
                                <span className="text-gray-500">رسوم التوصيل</span>
                            </div>
                            <div className="flex justify-between font-bold text-base">
                                <span className="text-white">{order.total_amount} ₪</span>
                                <span className="text-gray-300">الإجمالي</span>
                            </div>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={() => updateStatusMutation.mutate({ id: order.id, status: 'delivered' })}
                        disabled={isUpdating}
                        className="py-3 rounded-xl bg-emerald-500 text-white font-bold text-sm hover:bg-emerald-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed col-span-2"
                    >
                        {isUpdating ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'تم التسليم بنجاح'}
                    </button>
                    {order.delivery_status !== 'delivering' && (
                        <button
                            onClick={() => updateStatusMutation.mutate({ id: order.id, status: 'delivering' })}
                            disabled={isUpdating}
                            className="py-3 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold text-sm hover:bg-amber-500 hover:text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {isUpdating ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'بدء التوصيل الآن'}
                        </button>
                    )}
                    <button
                        onClick={() => declineMutation.mutate(order.id)}
                        disabled={isUpdating || (declineMutation.isPending && declineMutation.variables === order.id)}
                        className="py-3 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold text-sm hover:bg-rose-500 hover:text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {declineMutation.isPending && declineMutation.variables === order.id ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'إرسال لكابتن آخر'}
                    </button>
                </div>
            </motion.div>
        );
    };

    const renderAcceptedOrder = (order) => (
        <motion.div key={order.id} className="glass-card p-5 rounded-3xl border border-white/5 space-y-3 opacity-80 hover:opacity-100 transition-opacity">
            <div className="flex justify-between items-start">
                {statusBadge(order.delivery_status)}
                <div className="text-right">
                    <p className="font-bold">{order.mall?.name_ar || 'متجر'}</p>
                    <p className="text-xs text-gray-500">{new Date(order.created_at).toLocaleString('ar-EG')}</p>
                </div>
            </div>
            <div className="flex items-start justify-start gap-2 text-sm">
                <div className="text-right">
                    <p className="font-medium text-gray-200">{order.user?.name || 'زبون'}</p>
                    {(order.delivery_phone || order.user?.phone) ? (
                        <a href={`tel:${order.delivery_phone || order.user.phone}`} className="inline-flex items-center gap-1 text-xs text-indigo-400 font-semibold hover:underline" dir="ltr">
                            <Phone className="w-3 h-3" />
                            {order.delivery_phone || order.user.phone}
                        </a>
                    ) : null}
                </div>
                <User className="w-4 h-4 text-gray-500 mt-1 shrink-0" />
            </div>
            {order.delivery_address && (
                <div className="flex items-start justify-start gap-2 text-sm">
                    <p className="text-gray-400 text-right">{order.delivery_address}</p>
                    <MapPin className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
                </div>
            )}
            <button
                onClick={() => toggleExpand(order.id)}
                className="flex items-center justify-center gap-2 w-full text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
                {expandedOrders[order.id] ? 'إخفاء التفاصيل' : 'عرض تفاصيل الطلب'}
                {expandedOrders[order.id] ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {expandedOrders[order.id] && (
                <div className="border-t border-white/5 pt-3 space-y-2">
                    <OrderItemsList items={order.items} />
                    <div className="border-t border-white/5 pt-2 space-y-1 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-400">{order.delivery_fee} ₪</span>
                            <span className="text-gray-500">رسوم التوصيل</span>
                        </div>
                        <div className="flex justify-between font-bold">
                            <span className="text-white">{order.total_amount} ₪</span>
                            <span className="text-gray-300">الإجمالي</span>
                        </div>
                    </div>
                </div>
            )}
        </motion.div>
    );

    const renderHistoryOrder = (order) => (
        <motion.div key={order.id} className="glass-card p-5 rounded-3xl border border-white/5 space-y-3 opacity-80 hover:opacity-100 transition-opacity">
            <div className="flex justify-between items-start">
                <span className="text-emerald-400 font-bold"># {order.id}</span>
                <div className="text-right">
                    <p className="font-bold">{order.mall?.name_ar || 'متجر'}</p>
                    <p className="text-xs text-gray-500">{new Date(order.created_at).toLocaleString('ar-EG')}</p>
                </div>
            </div>

            <div className="flex items-start justify-start gap-2 text-sm">
                <div className="text-right">
                    <p className="font-medium text-gray-200">{order.user?.name || 'زبون'}</p>
                    {(order.delivery_phone || order.user?.phone) ? (
                        <a href={`tel:${order.delivery_phone || order.user.phone}`} className="inline-flex items-center gap-1 text-xs text-indigo-400 font-semibold hover:underline" dir="ltr">
                            <Phone className="w-3 h-3" />
                            {order.delivery_phone || order.user.phone}
                        </a>
                    ) : null}
                </div>
                <User className="w-4 h-4 text-gray-500 mt-1 shrink-0" />
            </div>

            {order.delivery_address && (
                <div className="flex items-start justify-start gap-2 text-sm">
                    <p className="text-gray-400 text-right">{order.delivery_address}</p>
                    <MapPin className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
                </div>
            )}

            <button
                onClick={() => toggleExpand(order.id)}
                className="flex items-center justify-center gap-2 w-full text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
                {expandedOrders[order.id] ? 'إخفاء التفاصيل' : 'عرض تفاصيل الطلب'}
                {expandedOrders[order.id] ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {expandedOrders[order.id] && (
                <div className="border-t border-white/5 pt-3 space-y-2">
                    <OrderItemsList items={order.items} />
                    <div className="border-t border-white/5 pt-2 space-y-1 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-400">{order.delivery_fee} ₪</span>
                            <span className="text-gray-500">رسوم التوصيل</span>
                        </div>
                        <div className="flex justify-between font-bold">
                            <span className="text-white">{order.total_amount} ₪</span>
                            <span className="text-gray-300">الإجمالي</span>
                        </div>
                    </div>
                    <div className="flex items-center justify-start gap-2 text-xs text-gray-500">
                        <span>تم التوصيل {order.delivered_at ? new Date(order.delivered_at).toLocaleString('ar-EG') : ''}</span>
                        <CheckCircle className="w-3 h-3 text-emerald-500" />
                    </div>
                </div>
            )}
        </motion.div>
    );

    return (
        <div className="space-y-8 pb-10 text-right">
            <header className="flex flex-col sm:flex-row justify-between items-end gap-4">
                <div className="order-last sm:order-first">
                    <h2 className="text-3xl font-extrabold flex items-center gap-3 justify-start">
                        لوحة التحكم للمناديب
                        <ShoppingBag className="w-8 h-8 text-amber-400" />
                    </h2>
                    <p className="text-gray-400 mt-1">تتبع طلبات التوصيل وقم بتحديث حالتهم</p>
                </div>
            </header>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {(() => {
                const statBoxes = [
                    { label: 'بانتظار الاعتماد', value: stats?.pending_count || 0, color: 'text-rose-400', orders: [] },
                    { label: 'بانتظار مندوب', value: stats?.preparing_count || 0, color: 'text-sky-400', orders: pendingOrders || [] },
                    { label: 'قيد التوصيل', value: stats?.active_count || 0, color: 'text-amber-400', orders: activeOrders || [] },
                    { label: 'تم تسليمها', value: stats?.delivered_count || 0, color: 'text-emerald-400', orders: historyOrders || [] },
                ];
                return statBoxes.map(box => (
                    <button key={box.label} onClick={() => setStatsModal(box)} className="glass-card p-4 rounded-3xl border border-white/5 text-right text-start hover:bg-white/[0.04] transition-all">
                        <p className="text-gray-400 text-xs">{box.label}</p>
                        <p className={`text-xl font-bold mt-1 ${box.color}`}>{box.value}</p>
                    </button>
                ));
            })()}
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-white/5 pb-2">
                {tabs.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => switchTab(tab.key)}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                            activeTab === tab.key
                                ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Pending Tab */}
            {activeTab === 'pending' && (
                <section className="space-y-4">
                    {loadingPending ? (
                        <div className="h-40 bg-white/5 rounded-3xl shimmer" />
                    ) : filteredPending.length > 0 ? (
                        filteredPending.map(renderPendingOrder)
                    ) : (
                        <div className="text-center py-16">
                            <Package className="w-16 h-16 mx-auto text-gray-600 mb-4" />
                            <p className="text-gray-500">لا توجد طلبات جديدة حالياً</p>
                        </div>
                    )}
                </section>
            )}

            {/* Active Tab */}
            {activeTab === 'active' && (
                <section className="space-y-4">
                    {loadingActive ? (
                        <div className="h-40 bg-white/5 rounded-3xl shimmer" />
                    ) : activeOrders?.length > 0 ? (
                        activeOrders.map(renderActiveOrder)
                    ) : (
                        <div className="text-center py-16">
                            <Navigation className="w-16 h-16 mx-auto text-gray-600 mb-4" />
                            <p className="text-gray-500">لديك 0 مهام نشطة حالياً</p>
                        </div>
                    )}
                </section>
            )}

            {/* Accepted Tab */}
            {activeTab === 'accepted_view' && (
                <section className="space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2">
                            <label className="text-xs text-gray-400">من</label>
                            <input type="date" value={acceptedFilterFrom} onChange={e => setAcceptedFilterFrom(e.target.value)}
                                className="input-field !py-2 !px-3 text-xs w-36 bg-white/5 border-white/10" />
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-xs text-gray-400">إلى</label>
                            <input type="date" value={acceptedFilterTo} onChange={e => setAcceptedFilterTo(e.target.value)}
                                className="input-field !py-2 !px-3 text-xs w-36 bg-white/5 border-white/10" />
                        </div>
                        {(acceptedFilterFrom || acceptedFilterTo) && (
                            <button onClick={() => { setAcceptedFilterFrom(''); setAcceptedFilterTo(''); }}
                                className="text-xs text-rose-400 hover:text-rose-300 transition-colors font-bold">
                                إلغاء الفلتر
                            </button>
                        )}
                    </div>
                    {loadingAccepted ? (
                        <div className="h-40 bg-white/5 rounded-3xl shimmer" />
                    ) : acceptedOrders?.length > 0 ? (
                        acceptedOrders.map(order => renderAcceptedOrder(order))
                    ) : (
                        <div className="text-center py-16">
                            <CheckCircle className="w-16 h-16 mx-auto text-gray-600 mb-4" />
                            <p className="text-gray-500">لا توجد طلبات مقبولة</p>
                        </div>
                    )}
                </section>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
                <section className="space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2">
                            <label className="text-xs text-gray-400">من</label>
                            <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)}
                                className="input-field !py-2 !px-3 text-xs w-36 bg-white/5 border-white/10" />
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-xs text-gray-400">إلى</label>
                            <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)}
                                className="input-field !py-2 !px-3 text-xs w-36 bg-white/5 border-white/10" />
                        </div>
                        {(filterFrom || filterTo) && (
                            <button onClick={() => { setFilterFrom(''); setFilterTo(''); }}
                                className="text-xs text-rose-400 hover:text-rose-300 transition-colors font-bold">
                                إلغاء الفلتر
                            </button>
                        )}
                    </div>
                    {loadingHistory ? (
                        <div className="h-40 bg-white/5 rounded-3xl shimmer" />
                    ) : historyOrders?.length > 0 ? (
                        historyOrders.map(renderHistoryOrder)
                    ) : (
                        <div className="text-center py-16">
                            <History className="w-16 h-16 mx-auto text-gray-600 mb-4" />
                            <p className="text-gray-500">لا يوجد سجل توصيل بعد</p>
                        </div>
                    )}
                </section>
            )}

            {/* Stats Detail Modal */}
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
                                    {statsModal.orders.slice(0, 10).map(o => (
                                        <div key={o.id} className="flex items-center justify-between py-2 border-b border-white/[0.03] text-sm">
                                            <span className="text-gray-400 font-mono">#{o.id}</span>
                                            <span className="text-gray-300">{o.mall?.name_ar || '—'}</span>
                                            <span className="text-white font-bold">{o.total_amount} ₪</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (statsModal.label !== 'إجمالي المبيعات' && statsModal.label !== 'بانتظار الاعتماد' ? (
                                <p className="text-center text-gray-500 text-sm py-4">لا توجد طلبات</p>
                            ) : (
                                <p className="text-center text-gray-500 text-sm py-4">{statsModal.label === 'إجمالي المبيعات' ? 'مجموع مبيعات التوصيل المكتملة' : 'طلبات بانتظار موافقة المول'}</p>
                            ))}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default DeliveryDashboard;
