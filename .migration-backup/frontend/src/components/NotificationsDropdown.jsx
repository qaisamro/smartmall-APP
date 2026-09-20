import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { Bell, X, CheckCheck, Loader2, ShoppingBag, Truck, Star, Package, Megaphone, MessageSquare, ExternalLink } from 'lucide-react';
import { getNotificationUrl } from '../utils/notifications';
import NotificationSoundControl from './NotificationSoundControl';

const typeIcons = {
    delivery_requested: Truck,
    offer_created: Star,
    order_confirmed: ShoppingBag,
    admin_broadcast: Megaphone,
    complaint_responded: MessageSquare,
    complaint_new_message: MessageSquare,
    default: Package,
};

const NotificationsDropdown = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);
    const [notifGranted, setNotifGranted] = useState('Notification' in navigator && Notification.permission === 'granted');
    const ref = useRef(null);
    const dropdownRef = useRef(null);

    const handleBellClick = () => {
        setOpen(!open);
        if (!open && 'Notification' in navigator && Notification.permission === 'default') {
            Notification.requestPermission().then((result) => {
                setNotifGranted(result === 'granted');
            });
        }
    };

    const { data: notifications } = useQuery({
        queryKey: ['notifications'],
        queryFn: async () => {
            const r = await api.get('/notifications');
            return r.data;
        },
        enabled: open,
    });

    const { data: unreadData } = useQuery({
        queryKey: ['unread-count'],
        queryFn: async () => {
            const r = await api.get('/notifications/unread-count');
            return r.data;
        },
        refetchInterval: 10000,
    });

    const markAsReadMutation = useMutation({
        mutationFn: async (id) => {
            await api.put(`/notifications/${id}/read`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['notifications']);
            queryClient.invalidateQueries(['unread-count']);
        }
    });

    const handleNotificationClick = (n) => {
        if (!n.read_at) {
            markAsReadMutation.mutate(n.id);
        }
        const data = typeof n.data === 'string' ? JSON.parse(n.data) : n.data;
        const url = getNotificationUrl(data);
        navigate(url);
        setOpen(false);
    };

    const markAllReadMutation = useMutation({
        mutationFn: async () => {
            const r = await api.put('/notifications/read-all');
            return r.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['notifications']);
            queryClient.invalidateQueries(['unread-count']);
        }
    });

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        const handleRealtimeNotification = () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            queryClient.invalidateQueries({ queryKey: ['unread-count'] });
        };
        document.addEventListener('mousedown', handleClickOutside);
        window.addEventListener('notification-received', handleRealtimeNotification);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('notification-received', handleRealtimeNotification);
        };
    }, []);

    const notifList = Array.isArray(notifications) ? notifications : [];
    const unreadCount = unreadData?.count || 0;

    const notifPrompt = !notifGranted && 'Notification' in navigator ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-3 text-sm">
            <p className="text-amber-800 font-medium">الإشعارات غير مفعلة</p>
            <p className="text-amber-600 text-xs mt-1">اضغط على زر السماح في المتصفح لتفعيل الإشعارات</p>
        </div>
    ) : null;

    const notifBody = notifList.length === 0 ? (
        <div className="text-center py-10 text-gray-500 text-sm">لا توجد إشعارات</div>
    ) : (
        notifList.map((n) => {
            const data = typeof n.data === 'string' ? JSON.parse(n.data) : n.data;
            const Icon = typeIcons[data?.type] || typeIcons.default;
            const showTitleBody = data?.type === 'admin_broadcast' || data?.type === 'complaint_responded' || data?.type === 'complaint_new_message';
            return (
                <div key={n.id} onClick={() => handleNotificationClick(n)} className={`flex items-start gap-3 p-3 rounded-xl transition-colors cursor-pointer ${n.read_at ? 'hover:bg-gray-50' : 'bg-indigo-50 hover:bg-indigo-100'}`}>
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${n.read_at ? 'bg-gray-100' : 'bg-indigo-100'}`}>
                        <Icon className={`w-4 h-4 ${n.read_at ? 'text-gray-500' : 'text-indigo-600'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                        {showTitleBody ? (
                            <>
                                <p className={`text-sm font-bold ${n.read_at ? 'text-gray-700' : 'text-gray-900'}`}>{data?.title || 'رد على شكوى'}</p>
                                <p className={`text-xs mt-0.5 ${n.read_at ? 'text-gray-500' : 'text-gray-700'}`}>{data?.body || data?.message}</p>
                            </>
                        ) : (
                            <p className={`text-sm ${n.read_at ? 'text-gray-600' : 'text-gray-900 font-semibold'}`}>{data?.message || 'إشعار جديد'}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-0.5">{new Date(n.created_at).toLocaleString('ar-EG')}</p>
                    </div>
                    {data?.action_url && (
                        <ExternalLink className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-1" />
                    )}
                </div>
            );
        })
    );

    return (
        <div ref={dropdownRef} className="relative">
            <button
                onClick={handleBellClick}
                className="relative p-2.5 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900 transition-all border border-gray-200"
                title="الإشعارات"
            >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-rose-500 text-[9px] font-bold min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-white shadow-lg shadow-rose-500/30 px-1">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            <AnimatePresence>
                {open && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
                            onClick={() => setOpen(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, y: 8, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 8, scale: 0.95 }}
                            transition={{ duration: 0.15 }}
                            className="absolute left-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl shadow-gray-400/20 p-2 border border-gray-200 max-h-[70vh] overflow-hidden flex-col hidden lg:flex"
                        >
                            <div className="flex items-center justify-between px-3 py-3 border-b border-gray-200 shrink-0">
                                <h3 className="font-bold text-sm text-gray-900">الإشعارات</h3>
                                <div className="flex items-center gap-2">
                                    {unreadCount > 0 && (
                                        <button onClick={() => markAllReadMutation.mutate()} className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1">
                                            <CheckCheck className="w-3.5 h-3.5" />
                                            تحديد الكل كمقروء
                                        </button>
                                    )}
                                    <button onClick={() => { navigate('/notifications'); setOpen(false); }} className="text-xs text-gray-500 hover:text-gray-700 font-semibold">
                                        عرض الكل
                                    </button>
                                </div>
                            </div>
                            <div className="overflow-y-auto flex-1 px-2">
                                {notifPrompt}
                                <div className="mt-1">{notifBody}</div>
                            </div>
                            <NotificationSoundControl />
                        </motion.div>
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="fixed bottom-0 left-0 right-0 z-[70] bg-white rounded-t-2xl shadow-2xl max-h-[80vh] overflow-hidden flex flex-col lg:hidden"
                        >
                            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 shrink-0">
                                <h3 className="font-bold text-sm text-gray-900">الإشعارات</h3>
                                <div className="flex items-center gap-2">
                                    {unreadCount > 0 && (
                                        <button onClick={() => markAllReadMutation.mutate()} className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1">
                                            <CheckCheck className="w-3.5 h-3.5" />
                                            تحديد الكل
                                        </button>
                                    )}
                                    <button onClick={() => { navigate('/notifications'); setOpen(false); }} className="text-xs text-gray-500 hover:text-gray-700 font-semibold">
                                        عرض الكل
                                    </button>
                                    <button onClick={() => setOpen(false)} className="p-1.5 rounded-xl hover:bg-gray-100 transition-colors">
                                        <X className="w-5 h-5 text-gray-500" />
                                    </button>
                                </div>
                            </div>
                            <div className="overflow-y-auto flex-1 px-2 pb-4 pb-[80px]">
                                {notifPrompt}
                                <div className="mt-1">{notifBody}</div>
                            </div>
                            <NotificationSoundControl />
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

export default NotificationsDropdown;
