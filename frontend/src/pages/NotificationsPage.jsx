import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { Bell, CheckCheck, ShoppingBag, Truck, Star, Package, Megaphone, MessageSquare, ArrowLeft, Clock, Store, DollarSign, User } from 'lucide-react';
import { getNotificationUrl } from '../utils/notifications';
import { clearAppBadge } from '../utils/pwa';

const typeIcons = {
    delivery_requested: Truck,
    offer_created: Star,
    order_confirmed: ShoppingBag,
    admin_broadcast: Megaphone,
    complaint_responded: MessageSquare,
    complaint_new_message: MessageSquare,
    default: Package,
};

const NotificationsPage = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    useEffect(() => {
        clearAppBadge();
        window.dispatchEvent(new CustomEvent('notifications-read'));
    }, []);

    const { data: notifications, isLoading } = useQuery({
        queryKey: ['notifications-page'],
        queryFn: async () => {
            const r = await api.get('/notifications');
            return r.data;
        },
        refetchInterval: 10000,
    });

    const markAsReadMutation = useMutation({
        mutationFn: async (id) => {
            await api.put(`/notifications/${id}/read`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications-page'] });
        }
    });

    const markAllReadMutation = useMutation({
        mutationFn: async () => {
            await api.put('/notifications/read-all');
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications-page'] });
        }
    });

    useEffect(() => {
        const handler = () => queryClient.invalidateQueries({ queryKey: ['notifications-page'] });
        window.addEventListener('notification-received', handler);
        return () => window.removeEventListener('notification-received', handler);
    }, []);

    const handleClick = (n) => {
        if (!n.read_at) {
            markAsReadMutation.mutate(n.id);
        }
        const data = typeof n.data === 'string' ? JSON.parse(n.data) : n.data;
        const url = getNotificationUrl(data);
        navigate(url);
    };

    const notifList = Array.isArray(notifications) ? notifications : [];

    const renderDetails = (data) => {
        const type = data?.type;
        const items = [];
        if (type === 'delivery_requested') {
            if (data?.mall_name) items.push({ icon: Store, label: 'المول', value: data.mall_name });
            if (data?.total) items.push({ icon: DollarSign, label: 'المبلغ', value: `${data.total} ₪` });
            if (data?.customer_name) items.push({ icon: User, label: 'الزبون', value: data.customer_name });
            if (data?.items_summary) items.push({ icon: Package, label: 'المنتجات', value: data.items_summary.length > 60 ? data.items_summary.substring(0, 60) + '...' : data.items_summary });
        } else if (type === 'order_confirmed') {
            if (data?.order_id) items.push({ icon: ShoppingBag, label: 'رقم الطلب', value: `#${data.order_id}` });
            if (data?.total_amount) items.push({ icon: DollarSign, label: 'المبلغ', value: `${data.total_amount} ₪` });
        } else if (type === 'delivery_accepted') {
            if (data?.order_id) items.push({ icon: ShoppingBag, label: 'رقم الطلب', value: `#${data.order_id}` });
        } else if (type === 'offer_created') {
            if (data?.mall_name) items.push({ icon: Store, label: 'المول', value: data.mall_name });
            if (data?.offer_title) items.push({ icon: Star, label: 'العرض', value: data.offer_title.length > 50 ? data.offer_title.substring(0, 50) + '...' : data.offer_title });
        } else if (type === 'admin_broadcast') {
            if (data?.title) items.push({ label: 'العنوان', value: data.title });
            if (data?.body) items.push({ label: 'التفاصيل', value: data.body.length > 80 ? data.body.substring(0, 80) + '...' : data.body });
        } else if (type === 'complaint_responded') {
            if (data?.complaint_id) items.push({ icon: MessageSquare, label: 'رقم الشكوى', value: `#${data.complaint_id}` });
            if (data?.status) items.push({ label: 'الحالة', value: data.status === 'resolved' ? 'تم الحل' : data.status === 'rejected' ? 'مرفوض' : 'قيد المعالجة' });
        } else if (type === 'complaint_new_message') {
            if (data?.sender_name) items.push({ icon: User, label: 'المرسل', value: data.sender_name });
        }
        return items;
    };

    return (
        <div className="min-h-screen pt-24 pb-32 px-4">
            <div className="max-w-3xl mx-auto space-y-6">

                <header className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)}
                        className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors">
                        <ArrowLeft className="w-5 h-5 text-gray-400" />
                    </button>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold flex items-center gap-3">
                            الإشعارات
                            <Bell className="w-7 h-7 text-indigo-400" />
                        </h1>
                        <p className="text-gray-500 mt-1 text-sm">جميع الإشعارات والتنبيهات</p>
                    </div>
                    {notifList.some(n => !n.read_at) && (
                        <button onClick={() => markAllReadMutation.mutate()} className="mr-auto flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20 transition-all text-sm font-bold">
                            <CheckCheck className="w-4 h-4" />
                            تحديد الكل مقروء
                        </button>
                    )}
                </header>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-3"
                >
                    {isLoading ? (
                        <div className="text-center py-20">
                            <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mx-auto" />
                        </div>
                    ) : notifList.length === 0 ? (
                        <div className="glass-card rounded-[2rem] border border-white/[0.06] p-12 text-center">
                            <div className="w-20 h-20 rounded-[2rem] bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-5">
                                <Bell className="w-10 h-10 text-gray-500" />
                            </div>
                            <p className="text-gray-400 text-lg font-bold">لا توجد إشعارات</p>
                            <p className="text-gray-600 text-sm mt-2">عند وصول إشعار جديد ستظهر هنا</p>
                        </div>
                    ) : (
                        notifList.map((n, idx) => {
                            const data = typeof n.data === 'string' ? JSON.parse(n.data) : n.data || {};
                            const Icon = typeIcons[data?.type] || typeIcons.default;
                            const details = renderDetails(data);
                            const isUnread = !n.read_at;

                            return (
                                <motion.div
                                    key={n.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.03 }}
                                    onClick={() => handleClick(n)}
                                    className={`glass-card rounded-[1.75rem] border ${isUnread ? 'border-indigo-500/20' : 'border-white/[0.06]'} p-5 cursor-pointer hover:border-indigo-500/30 transition-all relative overflow-hidden`}
                                >
                                    {isUnread && (
                                        <div className="absolute top-0 right-0 w-1 h-full bg-indigo-500 rounded-r-full" />
                                    )}

                                    <div className="flex items-start gap-4">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${isUnread ? 'bg-indigo-500/15' : 'bg-white/5'}`}>
                                            <Icon className={`w-6 h-6 ${isUnread ? 'text-indigo-400' : 'text-gray-500'}`} />
                                        </div>

                                        <div className="flex-1 min-w-0 space-y-3">

                                            <div>
                                                <p className={`text-base font-bold ${isUnread ? 'text-white' : 'text-gray-300'}`}>
                                                    {data?.title || (data?.type === 'delivery_requested' ? 'طلب توصيل جديد' : data?.type === 'order_confirmed' ? 'طلب جديد' : data?.type === 'delivery_accepted' ? 'قبول طلب توصيل' : data?.type === 'offer_created' ? 'عرض جديد' : data?.type === 'complaint_responded' ? 'رد على شكوى' : data?.type === 'complaint_new_message' ? 'رسالة جديدة في الشكوى' : 'إشعار')}
                                                </p>
                                                {data?.message && data?.type !== 'admin_broadcast' && (
                                                    <p className="text-sm text-gray-500 mt-1">{data.message}</p>
                                                )}
                                            </div>

                                            {details.length > 0 && (
                                                <div className="flex flex-wrap gap-2">
                                                    {details.map((item, i) => (
                                                        <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/[0.06] text-xs text-gray-400">
                                                            {item.icon && <item.icon className="w-3.5 h-3.5 text-indigo-400/70" />}
                                                            <span className="font-medium text-gray-500">{item.label}:</span>
                                                            <span className="text-gray-300">{item.value}</span>
                                                        </span>
                                                    ))}
                                                </div>
                                            )}

                                            <div className="flex items-center gap-1.5 text-[11px] text-gray-600">
                                                <Clock className="w-3 h-3" />
                                                {new Date(n.created_at).toLocaleString('ar-EG')}
                                                {isUnread && (
                                                    <span className="mr-2 px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 text-[10px] font-bold">جديد</span>
                                                )}
                                            </div>

                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })
                    )}
                </motion.div>
            </div>
        </div>
    );
};

export default NotificationsPage;
