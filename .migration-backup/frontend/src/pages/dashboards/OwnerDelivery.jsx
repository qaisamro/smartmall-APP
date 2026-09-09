import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import useAuthStore from '../../store/useAuthStore';
import { printThermalReceipt } from '../../utils/thermalPrint';
import { Truck, Package, User, Phone, MapPin, Clock, CheckCircle2, XCircle, Loader2, Search, Filter, ThumbsUp, Timer, X, AlertTriangle, Printer } from 'lucide-react';

const PrepCountdown = ({ approvedAt, prepMinutes }) => {
    const [remaining, setRemaining] = React.useState(null);
    React.useEffect(() => {
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
            <Clock className="w-3.5 h-3.5 shrink-0" />
            {remaining > 0 ? `${remaining} دقيقة متبقية` : 'مكتمل التجهيز ✅'}
        </div>
    );
};

const statusColors = {
    pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    preparing: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
    ready: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    accepted: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    delivering: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    delivered: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    failed: 'bg-rose-500/10 text-rose-400 border-rose-500/20'
};

const statusLabels = {
    pending: 'قيد الانتظار',
    preparing: 'قيد التجهيز',
    ready: 'جاهز للاستلام',
    accepted: 'تم القبول من المندوب',
    delivering: 'قيد التوصيل',
    delivered: order => (order?.delivery_method === 'pickup' ? 'تم الاستلام' : 'تم التوصيل'),
    failed: 'فشل / ملغي'
};

const OwnerDelivery = () => {
    const queryClient = useQueryClient();
    const [statusFilter, setStatusFilter] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [approvingId, setApprovingId] = useState(null);
    const [prepTime, setPrepTime] = useState(30);
    const [approveError, setApproveError] = useState('');

    const labelFor = (s, order) => {
        const v = statusLabels[s];
        return typeof v === 'function' ? v(order) : (v || s);
    };

    const printOrderInvoice = (order) => {
        const itemsHtml = (order.items || []).map(item => {
            const name = item.product?.name_ar || item.product?.name_en || 'منتج';
            const price = parseFloat(item.price_at_sale || 0);
            const qty = item.quantity || 1;
            const notes = item.notes ? `<span class="item-notes">ملاحظة: ${item.notes}</span>` : '';
            return `<tr><td style="font-weight:bold">${name}${notes}</td><td>${qty}</td><td>${price.toFixed(2)}</td><td style="font-weight:bold">${(price * qty).toFixed(2)}</td></tr>`;
        }).join('');
        const itemCount = (order.items || []).reduce((s, i) => s + (i.quantity || 1), 0);
        const subtotal = (order.items || []).reduce((s, i) => s + (parseFloat(i.price_at_sale || 0) * (i.quantity || 1)), 0);
        const total = parseFloat(order.total_amount || 0).toFixed(2);
        const deliveryFee = parseFloat(order.delivery_fee || 0);
        const orderNum = `ORD-${order.pending_order_id ?? order.id}`;
        const methodLabel = order.delivery_method === 'delivery' ? 'توصيل منزلي' : order.delivery_method === 'pickup' ? 'استلام شخصي من المتجر' : 'داخل المول';
        // اسم المول: من بيانات الطلب إن وجد، وإلا من حساب صاحب المول الحالي
        const mallName = order.mall?.name_ar || order.mall?.name || useAuthStore.getState()?.user?.mall?.name_ar || useAuthStore.getState()?.user?.mall?.name || '';

        printThermalReceipt({
            bodyHtml: `
                <div class="receipt">
                    <div class="header">
                        <div style="font-size:16px;font-weight:bold;letter-spacing:1px;color:#000;margin-bottom:1mm">Smart Mall</div>
                        ${mallName ? `<div style="font-size:13px;font-weight:bold;color:#000;margin-bottom:0.5mm">${mallName}</div>` : ''}
                        <div class="meta">
                            <span style="font-weight:bold">${new Date(order.created_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                            <span style="margin-top:0.5mm;font-weight:bold;font-size:12px">رقم الفاتورة: ${orderNum}</span>
                            ${order.user?.name ? `<span style="font-weight:bold">العميل: ${order.user.name}</span>` : ''}
                            <span style="font-weight:bold">${methodLabel}</span>
                            ${(order.delivery_phone || order.user?.phone) ? `<span dir="ltr" style="font-weight:bold">هاتف الزبون: ${order.delivery_phone || order.user.phone}</span>` : ''}
                            ${(order.delivery_address) ? `<span>العنوان: ${order.delivery_address}</span>` : ''}
                            ${order.preparation_time ? `<span style="font-weight:bold">المدة المتوقعة: ${order.preparation_time} دقيقة</span>` : ''}
                        </div>
                    </div>
                    <table>
                        <thead><tr><th>المنتج</th><th>الكمية</th><th>السعر</th><th>المجموع</th></tr></thead>
                        <tbody>${itemsHtml}</tbody>
                    </table>
                    <div class="totals">
                        <div class="row"><span style="font-weight:bold">${itemCount} قطعة</span><span>إجمالي القطع</span></div>
                        <div class="row"><span style="font-weight:bold">${subtotal.toFixed(2)} ₪</span><span>مجموع المنتجات (قبل التوصيل)</span></div>
                        <div class="row"><span style="font-weight:bold">${deliveryFee.toFixed(2)} ₪</span><span>رسوم التوصيل</span></div>
                        <div class="row grand"><span style="font-weight:bold">${total} ₪</span><span>المجموع النهائي (مع التوصيل)</span></div>
                    </div>
                    ${(order.general_notes) ? `<div style="text-align:right;font-size:10px;font-weight:bold;padding:1mm 0;border-top:1px dashed #000;margin-top:1mm">ملاحظات الزبون: ${order.general_notes}</div>` : ''}
                    <div class="footer">
                        <div class="brand">Smart Mall</div>
                        <p style="font-weight:bold">شكراً لتسوقكم</p>
                    </div>
                </div>`,
            title: `فاتورة ${orderNum}`,
        });
    };

    const { data: orders, isLoading } = useQuery({
        queryKey: ['owner-delivery-orders', statusFilter],
        queryFn: async () => {
            const params = statusFilter ? { status: statusFilter } : {};
            const r = await api.get('/owner/delivery/orders', { params });
            return r.data;
        },
        refetchInterval: 15000,
    });

    const updateStatusMutation = useMutation({
        mutationFn: async ({ id, status }) => {
            const r = await api.put(`/owner/delivery/orders/${id}/status`, { status });
            return r.data;
        },
        onSuccess: () => queryClient.invalidateQueries(['owner-delivery-orders']),
        onError: (err) => {
            alert(err?.response?.data?.message || err?.message || 'فشل تحديث حالة الطلب — حاول مرة أخرى');
        }
    });

    const approveMutation = useMutation({
        mutationFn: async ({ id, preparation_time }) => {
            const r = await api.post(`/owner/delivery/orders/${id}/approve`, { preparation_time });
            return r.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['owner-delivery-orders']);
            setApprovingId(null);
            setApproveError('');
        },
        onError: (err) => {
            const msg = err?.response?.data?.message || err?.message || 'فشل الاعتماد — تأكد من اتصال السيرفر';
            setApproveError(msg);
        }
    });

    const orderList = Array.isArray(orders) ? orders : [];

    const filtered = orderList.filter(o =>
        !searchTerm || o.id.toString().includes(searchTerm) ||
        o.user?.name?.includes(searchTerm) ||
        o.delivery_address?.includes(searchTerm)
    );

    return (
        <div className="space-y-4 sm:space-y-6 pb-10">
            <header className="text-right">
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold flex items-center gap-2 sm:gap-3 justify-start">
                    إدارة التوصيل
                    <Truck className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-400 shrink-0" />
                </h2>
                <p className="text-gray-400 mt-1 text-xs sm:text-sm">عرض وإدارة طلبات التوصيل الخاصة بمولك</p>
            </header>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1 min-w-0">
                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                        type="text" placeholder="بحث برقم الطلب أو اسم العميل..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="input-field w-full pr-11 text-sm"
                    />
                </div>
                <div className="flex gap-1.5 overflow-x-auto flex-nowrap pb-1 -mb-1 scrollbar-thin" style={{ scrollbarWidth: 'thin' }}>
                    {['', 'pending', 'preparing', 'ready', 'accepted', 'delivering', 'delivered'].map(s => (
                        <button
                            key={s}
                            onClick={() => setStatusFilter(s)}
                            className={`shrink-0 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all border whitespace-nowrap ${statusFilter === s ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10'}`}
                        >
                            {s ? (s === 'delivered' ? 'مكتمل' : labelFor(s)) : 'الكل'}
                        </button>
                    ))}
                </div>
            </div>

            {isLoading ? (
                <div className="text-center py-16 sm:py-20"><Loader2 className="w-7 h-7 sm:w-8 sm:h-8 animate-spin mx-auto text-indigo-400" /></div>
            ) : filtered.length === 0 ? (
                <div className="glass-card rounded-2xl sm:rounded-3xl p-8 sm:p-12 text-center border border-white/5">
                    <Truck className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 opacity-20" />
                    <p className="font-bold text-base sm:text-lg text-gray-400">لا توجد طلبات توصيل</p>
                </div>
            ) : (
                <div className="space-y-3 sm:space-y-4">
                    {filtered.map((order, i) => (
                        <motion.div
                            key={order.id}
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="glass-card rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-white/5 hover:border-emerald-500/20 transition-all"
                        >
                            <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
                                {/* Order Info */}
                                <div className="flex-1 min-w-0 space-y-2 sm:space-y-3">
                                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                                        <span className="text-xs sm:text-sm font-mono text-indigo-400 shrink-0">{order.pending_order_id ? `ORD-${order.pending_order_id}` : `#ORD-${order.id}`}</span>
                                        <span className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-bold border shrink-0 ${statusColors[order.delivery_status] || 'bg-gray-500/10 text-gray-400'}`}>
                                            {labelFor(order.delivery_status, order)}
                                        </span>
                                        {order.approved_at && (
                                            <span className="px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-bold border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 shrink-0">
                                                <CheckCircle2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 inline ml-0.5" />
                                                تم الاعتماد
                                            </span>
                                        )}
                                        {order.preparation_time && (
                                            <span className="px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-bold border border-indigo-500/20 bg-indigo-500/10 text-indigo-400 shrink-0">
                                                <Timer className="w-2.5 h-2.5 sm:w-3 sm:h-3 inline ml-0.5" />
                                                {order.preparation_time} د
                                            </span>
                                        )}
                                        <span className="text-[10px] sm:text-xs text-gray-500 flex items-center gap-1">
                                            <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                            {new Date(order.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2">
                                        <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-400 min-w-0">
                                            <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500 shrink-0" />
                                            <span className="truncate">{order.user?.name || 'زائر'}</span>
                                        </div>
                                        {(order.delivery_phone || order.user?.phone) && (
                                            <a
                                                href={`tel:${order.delivery_phone || order.user.phone}`}
                                                className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm min-w-0 hover:text-indigo-400 transition-colors"
                                                title={order.delivery_phone ? 'رقم هاتف الطلب' : 'هاتف الحساب'}
                                            >
                                                <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500 shrink-0" />
                                                <span className="truncate underline decoration-dotted underline-offset-4 font-bold" dir="ltr">{order.delivery_phone || order.user.phone}</span>
                                            </a>
                                        )}
                                        {order.delivery_address && (
                                            <div className="flex items-start gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-400 sm:col-span-2 min-w-0">
                                                <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500 shrink-0 mt-0.5" />
                                                <span className="break-words">{order.delivery_address}</span>
                                            </div>
                                        )}
                                        {order.general_notes && (
                                            <div className="flex items-start gap-1.5 sm:gap-2 text-xs sm:text-sm text-amber-400 bg-amber-500/5 border border-amber-500/15 rounded-xl px-2.5 py-1.5 sm:col-span-2 min-w-0">
                                                <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 mt-0.5" />
                                                <span className="break-words"><span className="font-bold">ملاحظات الزبون:</span> {order.general_notes}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Order Items — visible on mobile inside info section */}
                                    <div className="block lg:hidden space-y-1.5">
                                        <p className="text-[10px] sm:text-xs font-bold text-gray-500">المنتجات:</p>
                                        {order.items?.map(item => (
                                            <div key={item.id}>
                                                <div className="flex items-center justify-between gap-1 text-[11px] sm:text-xs bg-white/5 rounded-lg sm:rounded-xl px-2 sm:px-3 py-1.5 sm:py-2">
                                                    <span className="text-gray-300 truncate min-w-0">{item.product?.name_ar || item.product?.name_en || 'منتج'}</span>
                                                    <span className="text-gray-500 shrink-0 mx-1">x{item.quantity}</span>
                                                    <span className="text-emerald-400 font-bold shrink-0">{parseFloat(item.price_at_sale) * item.quantity} ₪</span>
                                                </div>
                                                {item.notes && <p className="text-[10px] text-amber-400/70 pr-3 pb-1">{item.notes}</p>}
                                            </div>
                                        ))}
                                        <div className="flex justify-between items-center pt-1.5 border-t border-white/10 mt-1.5">
                                            <span className="text-[10px] sm:text-xs text-gray-500">الإجمالي</span>
                                            <span className="text-base sm:text-lg font-extrabold text-emerald-400">{parseFloat(order.total_amount).toFixed(2)} ₪</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Order Items — desktop sidebar */}
                                <div className="hidden lg:block lg:w-72 space-y-2">
                                    <p className="text-xs font-bold text-gray-500 mb-2">المنتجات:</p>
                                    {order.items?.map(item => (
                                        <div key={item.id}>
                                            <div className="flex items-center justify-between gap-2 text-xs bg-white/5 rounded-xl px-3 py-2">
                                                <span className="text-gray-300 truncate min-w-0">{item.product?.name_ar || item.product?.name_en || 'منتج'}</span>
                                                <span className="text-gray-500 shrink-0">x{item.quantity}</span>
                                                <span className="text-emerald-400 font-bold shrink-0">{parseFloat(item.price_at_sale) * item.quantity} ₪</span>
                                            </div>
                                            {item.notes && <p className="text-[10px] text-amber-400/70 pr-3 pb-1">{item.notes}</p>}
                                        </div>
                                    ))}
                                    <div className="flex justify-between items-center pt-2 border-t border-white/10 mt-2">
                                        <span className="text-xs text-gray-500">الإجمالي</span>
                                        <span className="text-lg font-extrabold text-emerald-400">{parseFloat(order.total_amount).toFixed(2)} ₪</span>
                                    </div>
                                </div>

                                {/* Actions */}
                                {order.delivery_status !== 'delivered' && order.delivery_status !== 'failed' && (
                                    <div className="flex sm:flex-col gap-2 sm:gap-2 justify-center">
                                        {order.delivery_status === 'pending' && !order.approved_at && (
                                            approvingId === order.id ? (
                                                <div className="space-y-2 p-2 sm:p-3 rounded-xl bg-white/5 border border-indigo-500/20 w-full">
                                                    <div className="flex items-center gap-1.5 sm:gap-2">
                                                        <Timer className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-400 shrink-0" />
                                                        <span className="text-[10px] sm:text-xs text-gray-400">مدة التجهيز (دقائق):</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                                                        <input
                                                            type="number" min={1} max={480}
                                                            value={prepTime}
                                                            onChange={e => setPrepTime(Math.max(1, Math.min(480, parseInt(e.target.value) || 1)))}
                                                            className="input-field w-16 sm:w-20 text-center text-xs sm:text-sm"
                                                        />
                                                        <span className="text-[10px] sm:text-xs text-gray-500 self-center">دقيقة</span>
                                                        <div className="flex-1 min-w-0" />
                                                        <button
                                                            onClick={() => { setApproveError(''); approveMutation.mutate({ id: order.id, preparation_time: prepTime }); }}
                                                            disabled={approveMutation.isPending}
                                                            className="py-1.5 sm:py-2 px-3 sm:px-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white font-bold text-[11px] sm:text-xs transition-all shrink-0"
                                                        >
                                                            {approveMutation.isPending ? <Loader2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 animate-spin" /> : <ThumbsUp className="w-3 h-3 sm:w-3.5 sm:h-3.5 inline ml-0.5 sm:ml-1" />}
                                                            تأكيد
                                                        </button>
                                                        <button
                                                            onClick={() => { setApprovingId(null); setApproveError(''); }}
                                                            className="py-1.5 sm:py-2 px-2 sm:px-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white text-[11px] sm:text-xs transition-all shrink-0"
                                                        >
                                                            <X className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                                        </button>
                                                    </div>
                                                    {approveError && (
                                                        <p className="text-[10px] sm:text-[11px] text-rose-400 text-right">{approveError}</p>
                                                    )}
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => { setApprovingId(order.id); setPrepTime(30); }}
                                                    className="w-full sm:w-auto py-2 sm:py-2.5 px-4 sm:px-5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500 hover:text-white font-bold text-[11px] sm:text-xs transition-all"
                                                >
                                                    <ThumbsUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 inline ml-1" />
                                                    اعتماد الطلب
                                                </button>
                                            )
                                        )}
                                        {order.delivery_status === 'preparing' && (
                                            order.delivery_method === 'pickup' ? (
                                                <div className="flex flex-col items-center gap-1.5 sm:gap-2 p-2 sm:p-3 rounded-xl bg-white/5 border border-sky-500/20 w-full">
                                                    {order.approved_at && order.preparation_time && (
                                                        <PrepCountdown approvedAt={order.approved_at} prepMinutes={order.preparation_time} />
                                                    )}
                                                    <button
                                                        onClick={() => updateStatusMutation.mutate({ id: order.id, status: 'ready' })}
                                                        disabled={updateStatusMutation.isPending}
                                                        className="w-full py-2 sm:py-2.5 px-4 sm:px-5 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400 hover:bg-violet-500 hover:text-white font-bold text-[11px] sm:text-xs transition-all"
                                                    >
                                                        <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 inline ml-1" />
                                                        الطلب جاهز للاستلام
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center gap-1.5 sm:gap-2 p-2 sm:p-3 rounded-xl bg-white/5 border border-sky-500/20 w-full">
                                                    <div className="flex items-center gap-1.5 sm:gap-2 text-sky-400 text-[10px] sm:text-xs font-bold">
                                                        <AlertTriangle className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                                                        بانتظار مندوب
                                                    </div>
                                                    {order.approved_at && order.preparation_time && (
                                                        <PrepCountdown approvedAt={order.approved_at} prepMinutes={order.preparation_time} />
                                                    )}
                                                </div>
                                            )
                                        )}
                                        {order.delivery_status === 'ready' && order.delivery_method === 'pickup' && (
                                            <button
                                                onClick={() => updateStatusMutation.mutate({ id: order.id, status: 'delivered' })}
                                                disabled={updateStatusMutation.isPending}
                                                className="w-full sm:w-auto py-2 sm:py-2.5 px-4 sm:px-5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white font-bold text-[11px] sm:text-xs transition-all"
                                            >
                                                <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 inline ml-1" />
                                                تم الاستلام من الزبون
                                            </button>
                                        )}
                                        {order.delivery_status === 'delivering' && (
                                            <button
                                                onClick={() => updateStatusMutation.mutate({ id: order.id, status: 'delivered' })}
                                                disabled={updateStatusMutation.isPending}
                                                className="w-full sm:w-auto py-2 sm:py-2.5 px-4 sm:px-5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white font-bold text-[11px] sm:text-xs transition-all"
                                            >
                                                <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 inline ml-1" />
                                                تأكيد التوصيل
                                            </button>
                                        )}
                                        <button
                                            onClick={() => printOrderInvoice(order)}
                                            className="w-full sm:w-auto py-2 sm:py-2.5 px-4 sm:px-5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500 hover:text-white font-bold text-[11px] sm:text-xs transition-all"
                                        >
                                            <Printer className="w-3.5 h-3.5 sm:w-4 sm:h-4 inline ml-1" />
                                            طباعة الفاتورة
                                        </button>
                                        <button
                                            onClick={() => updateStatusMutation.mutate({ id: order.id, status: 'failed' })}
                                            disabled={updateStatusMutation.isPending}
                                            className="w-full sm:w-auto py-2 sm:py-2.5 px-4 sm:px-5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white font-bold text-[11px] sm:text-xs transition-all"
                                        >
                                            <XCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 inline ml-1" />
                                            إلغاء الطلب
                                        </button>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default OwnerDelivery;
