import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { Truck, MapPin, Store, Package, ArrowLeft, Loader2, Clock, CheckCircle2, User, Phone, Mail, MessageCircle, Timer } from 'lucide-react';

const PrepCountdown = ({ approvedAt, prepMinutes }) => {
    const calc = () => {
        const end = new Date(approvedAt).getTime() + prepMinutes * 60000;
        const diff = Math.ceil((end - Date.now()) / 60000);
        return diff > 0 ? diff : 0;
    };
    const [remaining, setRemaining] = useState(calc);
    useEffect(() => {
        const id = setInterval(() => setRemaining(calc()), 15000);
        return () => clearInterval(id);
    }, [approvedAt, prepMinutes]);
    return (
        <div className="bg-sky-500/5 border border-sky-500/20 rounded-2xl p-4 space-y-1.5">
            <p className="text-xs font-bold text-gray-400 flex items-center gap-1.5">
                <Timer className="w-3.5 h-3.5 text-sky-400" />
                المدة المتوقعة من المتجر: <span className="text-sky-400">{prepMinutes} دقيقة</span>
            </p>
            {remaining > 0 ? (
                <p className="text-sm font-bold text-amber-400 flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    متبقي حوالي {remaining} دقيقة
                </p>
            ) : (
                <p className="text-sm font-bold text-emerald-400">انتهت المدة المتوقعة ✅</p>
            )}
        </div>
    );
};

const statusConfig = {
    pending: { label: 'بانتظار الاعتماد', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', icon: Clock },
    preparing: { label: 'قيد التجهيز', color: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/20', icon: Clock },
    ready: { label: 'جاهز للاستلام من المتجر', color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20', icon: CheckCircle2 },
    accepted: { label: 'تم القبول من المندوب', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', icon: CheckCircle2 },
    delivering: { label: 'جاري التوصيل', color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', icon: Truck },
    delivered: { label: 'تم التسليم', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: CheckCircle2 },
};

const OrderTracking = () => {
    const navigate = useNavigate();

    const { data: orders, isLoading } = useQuery({
        queryKey: ['customer-order-tracking'],
        queryFn: async () => {
            const r = await api.get('/customer/orders/tracking');
            return r.data;
        },
        refetchInterval: 15000,
    });

    const orderList = Array.isArray(orders) ? orders : orders?.data || [];

    return (
        <div className="space-y-8 pb-12">
            <header className="flex items-center gap-4">
                <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors">
                    <ArrowLeft className="w-5 h-5 text-gray-400" />
                </button>
                <div>
                    <h2 className="text-2xl sm:text-3xl font-extrabold flex items-center gap-3">
                        تتبع الطلبات
                        <Truck className="w-8 h-8 text-amber-400" />
                    </h2>
                    <p className="text-gray-400 mt-1 text-sm">تتبع حالة طلبات التوصيل الخاصة بك</p>
                </div>
            </header>

            {isLoading ? (
                <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-indigo-400" /></div>
            ) : orderList.length === 0 ? (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-24 glass-card rounded-[2rem]">
                    <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-white/5 flex items-center justify-center">
                        <Truck className="w-12 h-12 text-gray-600" />
                    </div>
                    <p className="text-xl font-bold text-gray-300 mb-2">لا توجد طلبات توصيل نشطة</p>
                    <p className="text-gray-500 text-sm">عند تقديم طلب توصيل، ستظهر هنا حالته</p>
                </motion.div>
            ) : (
                <div className="space-y-4">
                    {orderList.map((order, i) => {
                        const cfg = statusConfig[order.delivery_status] || statusConfig.pending;
                        const Icon = cfg.icon;
                        return (
                            <motion.div
                                key={order.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.06 }}
                                className="glass-card rounded-[2rem] p-6 border border-white/10 space-y-4"
                            >
                                <div className="flex items-start justify-between">
                                    <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${cfg.bg} ${cfg.color} ${cfg.border} border flex items-center gap-1.5`}>
                                        <Icon className="w-3.5 h-3.5" />
                                        {cfg.label}
                                    </span>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-white">{order.mall?.name_ar}</p>
                                        <p className="text-xs text-gray-500">طلب #{order.id}</p>
                                    </div>
                                </div>

                                {order.mall?.location_arabic && (
                                    <div className="flex items-center gap-2 text-xs text-gray-400">
                                        <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                                        {order.mall.location_arabic}
                                    </div>
                                )}

                                {order.preparation_time && order.approved_at && (order.delivery_status === 'preparing' || order.delivery_status === 'ready') && (
                                    <PrepCountdown approvedAt={order.approved_at} prepMinutes={order.preparation_time} />
                                )}

                                {order.delivery_address && (
                                    <div className="bg-white/5 rounded-2xl p-4 border border-white/5 text-right">
                                        <p className="text-xs text-gray-400 mb-1">عنوان التوصيل:</p>
                                        <p className="text-sm font-medium">{order.delivery_address}</p>
                                    </div>
                                )}

                                {order.delivery_person && (
                                    <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-2xl p-4 space-y-2">
                                        <p className="text-xs font-bold text-gray-500">بيانات المندوب</p>
                                        <div className="flex items-center gap-2 text-sm text-gray-300">
                                            <User className="w-4 h-4 text-indigo-400 shrink-0" />
                                            <span className="font-medium">{order.delivery_person.name}</span>
                                        </div>
                                        {order.delivery_person.phone ? (
                                            <div className="flex items-center gap-2 text-sm text-gray-400">
                                                <Phone className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                                                <a href={`tel:${order.delivery_person.phone}`} className="hover:text-indigo-400 hover:underline" dir="ltr">{order.delivery_person.phone}</a>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                <Phone className="w-3.5 h-3.5 shrink-0" />
                                                <span>لا يوجد رقم هاتف</span>
                                            </div>
                                        )}
                                        {order.delivery_person.email && (
                                            <div className="flex items-center gap-2 text-sm text-gray-400">
                                                <Mail className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                                                <span  className="text-[11px]">{order.delivery_person.email}</span>
                                            </div>
                                        )}
                                        {order.delivery_person.whatsapp && (
                                            <div className="flex items-center gap-2 text-sm text-gray-400">
                                                <MessageCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                                <a href={`tel:${order.delivery_person.whatsapp}`} className="hover:text-emerald-400 hover:underline" dir="ltr">{order.delivery_person.whatsapp}</a>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {order.items?.length > 0 && (
                                    <div className="space-y-2">
                                        <p className="text-xs text-gray-500 font-bold">المنتجات:</p>
                                        {order.items.map(item => (
                                            <div key={item.id}>
                                                <div className="flex items-center justify-between text-sm">
                                                    <span className="text-gray-400">x{item.quantity}</span>
                                                    <span className="text-gray-300">{item.product?.name_ar || 'منتج'}</span>
                                                </div>
                                                {item.notes && <p className="text-[10px] text-amber-400/70 text-right">{item.notes}</p>}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="flex items-center justify-between pt-2 border-t border-white/5 text-sm">
                                    <span className="text-indigo-400 font-bold">{order.total_amount} ₪</span>
                                    <span className="text-gray-500">{new Date(order.created_at).toLocaleDateString('ar-EG')}</span>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default OrderTracking;
