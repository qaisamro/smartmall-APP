import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, CheckSquare, Square, Send, Loader2 } from 'lucide-react';
import api from '../api/axios';

const roleLabels = {
    admin: 'إدارة',
    'mall-owner': 'صاحب مول',
    'delivery-person': 'توصيل',
    'order-tracker': 'متابعة',
};

const OrderWhatsAppShare = ({ orderId, mallName, total, deliveryMethod, deliveryAddress, items }) => {
    const [recipients, setRecipients] = useState([]);
    const [selected, setSelected] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!orderId) return;
        setLoading(true);
        api.get(`/orders/${orderId}/whatsapp-recipients`)
            .then(res => {
                setRecipients(res.data);
                const allSelected = {};
                res.data.forEach(r => { allSelected[r.whatsapp] = true; });
                setSelected(allSelected);
            })
            .catch(() => setRecipients([]))
            .finally(() => setLoading(false));
    }, [orderId]);

    const toggle = (whatsapp) => {
        setSelected(prev => ({ ...prev, [whatsapp]: !prev[whatsapp] }));
    };

    const selectAll = () => {
        const all = {};
        recipients.forEach(r => { all[r.whatsapp] = true; });
        setSelected(all);
    };

    const deselectAll = () => {
        setSelected({});
    };

    const buildMessage = () => {
        const isDelivery = deliveryMethod === 'delivery';
        let msg = `🛍️ *طلب جديد - سمارت مول*\n`;
        msg += `══════════════════════════\n\n`;
        msg += `🏪 *المول:* ${mallName}\n`;
        msg += `📦 *طريقة التوصيل:* ${isDelivery ? 'توصيل منزلي 🏠' : 'استلام من المول'}\n`;
        if (isDelivery) {
            msg += `🚚 *نوع الخدمة:* توصيل إلى المنزل (ديليفري)\n`;
            msg += `📍 *عنوان التوصيل:* ${deliveryAddress || 'يرجى تأكيد العنوان'}\n`;
        }
        msg += `💰 *إجمالي المبلغ:* ${total} ₪\n\n`;
        msg += `══════════════════════════\n`;
        msg += `📋 *تفاصيل الطلب:*\n`;
        msg += `──────────────────────────\n`;
        (items || []).forEach((item, i) => {
            const name = item.name_ar || item.product?.name_ar || item.product?.name_en || 'منتج';
            const qty = item.quantity || 1;
            const price = Number(item.price_at_sale || item.price || 0);
            const notes = item.notes || item.product?.notes || '';
            msg += `  ${i + 1}. ${name}\n`;
            msg += `     الكمية: ${qty} | السعر: ${price.toFixed(2)} ₪ | المجموع: ${(price * qty).toFixed(2)} ₪\n`;
            if (notes) msg += `     📝 ${notes}\n`;
        });
        msg += `──────────────────────────\n`;
        msg += `💵 *الإجمالي النهائي:* ${total} ₪\n\n`;
        msg += `══════════════════════════\n\n`;
        msg += `📅 *تاريخ الطلب:* ${new Date().toLocaleString('ar-IQ')}\n`;
        msg += `🕐 *حالة الطلب:* قيد التجهيز 🚀\n\n`;
        msg += `━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        msg += `✅ *شكراً لطلبك!*\n`;
        msg += `تم إرسال الطلب للتوصيل المنزلي\n`;
        msg += `سنتواصل معك قريباً لتأكيد التوصيل 📞\n`;
        msg += `━━━━━━━━━━━━━━━━━━━━━━━━━`;
        return encodeURIComponent(msg);
    };

    const [sending, setSending] = useState(false);
    const [sendResult, setSendResult] = useState(null);

    const sendToSelected = async () => {
        const whatsapps = recipients.filter(r => selected[r.whatsapp]).map(r => r.whatsapp);
        if (whatsapps.length === 0) return;
        const msg = buildMessage();
        setSending(true);
        setSendResult(null);
        try {
            const res = await api.post('/orders/whatsapp/send', {
                recipients: whatsapps,
                message: decodeURIComponent(msg),
            });
            setSendResult({ type: 'success', text: res.data.message });
        } catch {
            setSendResult({ type: 'error', text: 'فشل الإرسال — حاول مرة أخرى' });
        }
        setSending(false);
    };

    const allSelected = recipients.length > 0 && recipients.every(r => selected[r.whatsapp]);

    if (!orderId || recipients.length === 0) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl bg-green-500/5 border border-green-500/15 p-5"
        >
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                    <MessageCircle className="w-5 h-5 text-green-400" />
                </div>
                <div>
                    <h3 className="font-bold text-white text-sm">إرسال تفاصيل الطلب عبر واتساب</h3>
                    <p className="text-xs text-gray-400">اختر المستلمين وأرسل الطلب من واتسابك مباشرة</p>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-green-400" />
                </div>
            ) : (
                <>
                    <div className="space-y-2 mb-4">
                        {recipients.map(r => (
                            <label
                                key={r.whatsapp}
                                className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] cursor-pointer hover:bg-white/[0.08] hover:border-green-500/30 transition-all"
                            >
                                <button onClick={() => toggle(r.whatsapp)} className="shrink-0">
                                    {selected[r.whatsapp] ? (
                                        <CheckSquare className="w-5 h-5 text-green-400" />
                                    ) : (
                                        <Square className="w-5 h-5 text-gray-500" />
                                    )}
                                </button>
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-gray-200">{r.name}</div>
                                    <div className="text-xs text-gray-500" >{r.whatsapp}</div>
                                </div>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-gray-400 font-medium border border-white/[0.06]">
                                    {roleLabels[r.role] || r.role}
                                </span>
                            </label>
                        ))}
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={allSelected ? deselectAll : selectAll}
                            className="text-xs text-green-400 hover:text-green-300 font-medium transition-colors"
                        >
                            {allSelected ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
                        </button>
                        <div className="flex-1" />
                        <button
                            onClick={sendToSelected}
                            disabled={sending || !recipients.some(r => selected[r.whatsapp])}
                            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-l from-green-500 to-emerald-600 text-white text-sm font-bold rounded-xl hover:from-green-600 hover:to-emerald-700 disabled:opacity-40 transition-all shadow-lg shadow-green-500/20"
                        >
                            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            {sending ? 'جارٍ الإرسال...' : 'إرسال'}
                        </button>
                    </div>

                    {sendResult && (
                        <div className={`mt-3 px-4 py-2.5 rounded-xl text-sm font-medium ${sendResult.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                            {sendResult.text}
                        </div>
                    )}
                </>
            )}
        </motion.div>
    );
};

export default OrderWhatsAppShare;
