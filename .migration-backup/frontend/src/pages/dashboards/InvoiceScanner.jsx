import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import QRScanner from '../../components/QRScanner';
import { FileCheck, Loader2, ScanLine, XCircle, CheckCircle, ShoppingCart, AlertCircle, Package, DollarSign, PackageCheck, Search, Printer, X } from 'lucide-react';
import { printThermalReceipt } from '../../utils/thermalPrint';

const InvoiceScanner = () => {
    const [scanMode, setScanMode] = useState(false);
    const [scannedId, setScannedId] = useState('');
    const [pendingOrder, setPendingOrder] = useState(null);
    const [errorMsg, setErrorMsg] = useState('');
    const [confirmedOrder, setConfirmedOrder] = useState(null);
    const debounceRef = useRef(null);
    const queryClient = useQueryClient();

    const playErrorSound = useCallback(() => {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = 260;
            osc.type = 'square';
            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.4);
        } catch (e) {}
    }, []);

    const fetchOrderMutation = useMutation({
        mutationFn: async (id) => {
            const numId = id.replace('ORD-', '');
            return (await api.get(`/orders/pending/${numId}`)).data;
        },
        onSuccess: (data) => {
            setPendingOrder(data);
            setScanMode(false);
            setErrorMsg('');
            setConfirmedOrder(null);
        },
        onError: (err) => {
            const msg = err.response?.data?.message || 'لم يتم العثور على الفاتورة أو أنها غير صالحة';
            setErrorMsg(msg);
            playErrorSound();
            setTimeout(() => setErrorMsg(''), 3000);
        }
    });

    const confirmMutation = useMutation({
        mutationFn: async (id) => (await api.post(`/owner/orders/pending/${id}/confirm`)).data,
        onSuccess: (data) => {
            queryClient.invalidateQueries(['orders']);
            setPendingOrder(null);
            setScannedId('');
            setConfirmedOrder(data.order || data);
        },
        onError: (err) => alert(err.response?.data?.message || 'حدث خطأ أثناء التأكيد')
    });

    const handleScan = (decodedText) => {
        if (!decodedText.startsWith('ORD-')) return;
        if (debounceRef.current === decodedText) return;
        debounceRef.current = decodedText;
        setTimeout(() => { debounceRef.current = null; }, 2000);
        setScannedId(decodedText);
        fetchOrderMutation.mutate(decodedText);
    };

    const parsedItems = pendingOrder?.items_json
        ? (typeof pendingOrder.items_json === 'string' ? JSON.parse(pendingOrder.items_json) : pendingOrder.items_json)
        : [];

    const itemsTotal = parsedItems.reduce((s, i) => s + (parseFloat(i.price || 0) * parseInt(i.quantity || 0)), 0);

    const handlePrint = () => {
        const orderData = pendingOrder;
        const itemsTotalFormatted = itemsTotal.toFixed(2);
        const itemsCount = parsedItems.reduce((s, i) => s + parseInt(i.quantity || 1), 0);
        const bodyHtml = `
                <div class="receipt">
                    <div class="header">
                        <div style="font-size:16px;font-weight:bold;letter-spacing:1px;color:#000;margin-bottom:1mm">Smart Mall</div>
                        <div class="meta">
                            <span style="font-weight:bold">${new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                            <span style="font-size:9px">${new Date().toLocaleTimeString('ar-EG')}</span>
                            <span style="margin-top:0.5mm;font-weight:bold;font-size:12px">رقم الفاتورة: ${scannedId || '#' + orderData?.id}</span>
                            ${(orderData?.phone) ? `<span dir="ltr" style="font-weight:bold;font-size:11px">هاتف الزبون: ${orderData.phone}</span>` : ''}
                        </div>
                    </div>
                    <table>
                        <thead><tr><th>المنتج</th><th>الكمية</th><th>السعر</th><th>المجموع</th></tr></thead>
                        <tbody>
                            ${parsedItems.map((item) => {
                                const price = parseFloat(item.price || 0);
                                const qty = parseInt(item.quantity || 1);
                                return '<tr><td style="font-weight:bold">' + (item.name_ar || 'منتج') + '</td><td>' + qty + '</td><td>' + price.toFixed(2) + '</td><td style="font-weight:bold">' + (price * qty).toFixed(2) + '</td></tr>';
                            }).join('')}
                        </tbody>
                    </table>
                    <div class="totals">
                        <div class="row"><span style="font-weight:bold">${itemsCount} قطعة</span><span>إجمالي القطع</span></div>
                        <div class="row grand"><span style="font-weight:bold">${itemsTotalFormatted} ₪</span><span>المجموع النهائي</span></div>
                    </div>
                    <div class="barcode">${scannedId || orderData?.id || ''}</div>
                    ${(orderData?.notes) ? `<div style="text-align:right;font-size:10px;font-weight:bold;padding:1mm 0;border-top:1px dashed #000;margin-top:1mm">ملاحظات الزبون: ${orderData.notes}</div>` : ''}
                    <div class="footer">
                        <div class="brand">Smart Mall</div>
                        <p style="font-weight:bold">شكراً لتسوقكم</p>
                    </div>
                </div>`;
        printThermalReceipt({ bodyHtml, title: `فاتورة #${scannedId || orderData?.id || ''}` });
    };

    return (
        <div className="space-y-8 pb-10 max-w-4xl mx-auto">
            <header className="text-center space-y-4">
                <div className="w-20 h-20 bg-indigo-500/10 border border-indigo-500/20 rounded-3xl flex items-center justify-center mx-auto shadow-2xl shadow-indigo-500/10">
                    <FileCheck className="w-10 h-10 text-indigo-400" />
                </div>
                <div>
                    <h1 className="text-4xl font-black text-white">قارئ فواتير الزبائن</h1>
                    <p className="text-gray-400 mt-2">امسح باركود السلة لإتمام الدفع وخصم الكميات من المخزون</p>
                </div>
            </header>

            {confirmedOrder ? (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="glass-card rounded-[3rem] p-6 sm:p-10 border border-t-[6px] border-emerald-500/50 shadow-2xl text-center"
                >
                    <div className="w-24 h-24 mx-auto bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/30 mb-6">
                        <PackageCheck className="w-12 h-12 text-emerald-400" />
                    </div>
                    <h2 className="text-3xl font-black text-white mb-2">تم تأكيد الدفع وإتمام الطلب</h2>
                    <p className="text-gray-400 mb-6">رقم الطلب: <span className="font-mono text-indigo-400 font-bold">#{confirmedOrder.id}</span></p>
                    <div className="bg-white/5 rounded-2xl p-4 border border-white/5 mb-6 inline-block">
                        <p className="text-sm text-gray-500">تم خصم الكميات من المخزون بنجاح</p>
                    </div>
                    <button
                        onClick={() => { setConfirmedOrder(null); setScanMode(false); }}
                        className="btn-primary !px-10 !py-4 !rounded-2xl"
                    >
                        مسح فاتورة جديدة
                    </button>
                </motion.div>
            ) : !pendingOrder ? (
                <>
                <div className="glass-card rounded-[3rem] p-6 sm:p-10 border border-white/5 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-30" />
                    <div className="max-w-md mx-auto space-y-6">
                        <div className={`relative bg-black rounded-3xl overflow-hidden aspect-square border-4 ${errorMsg ? 'border-rose-500' : 'border-indigo-500/30'} shadow-2xl`}>
                            {scanMode ? (
                                <QRScanner onResult={handleScan} onClose={() => setScanMode(false)} variant="inline" />
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 space-y-4">
                                    <ScanLine className="w-16 h-16 opacity-30" />
                                    <p className="font-bold">الكاميرا متوقفة</p>
                                </div>
                            )}
                            <div className="absolute inset-x-0 inset-y-12 flex justify-center pointer-events-none">
                                <div className="w-3/4 h-3/4 rounded-3xl border-2 border-indigo-400/50 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]" />
                            </div>
                        </div>

                        <AnimatePresence>
                            {errorMsg && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm"
                                    onClick={() => setErrorMsg('')}
                                >
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        onClick={e => e.stopPropagation()}
                                        className="bg-rose-600/90 border border-rose-400/40 rounded-[2rem] p-8 text-center space-y-4 shadow-2xl shadow-rose-600/30 max-w-xs mx-4"
                                    >
                                        <div className="w-16 h-16 rounded-full bg-rose-400/20 flex items-center justify-center mx-auto border-2 border-rose-400/50">
                                            <X className="w-8 h-8 text-rose-300" />
                                        </div>
                                        <p className="text-white font-bold text-lg">خطأ</p>
                                        <p className="text-rose-200 text-sm">{errorMsg}</p>
                                        <button
                                            onClick={() => setErrorMsg('')}
                                            className="mt-2 px-6 py-2.5 rounded-xl bg-white/10 text-white border border-white/20 font-bold text-sm hover:bg-white/20 transition-all"
                                        >
                                            حسناً
                                        </button>
                                    </motion.div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {fetchOrderMutation.isPending && (
                            <div className="flex items-center justify-center gap-3 text-indigo-400 font-bold p-4">
                                <Loader2 className="w-5 h-5 animate-spin" />
                                جاري استرجاع تفاصيل الفاتورة...
                            </div>
                        )}

                        <button onClick={() => setScanMode(!scanMode)} className="btn-secondary w-full !py-4 !rounded-2xl">
                            {scanMode ? 'إيقاف الماسح' : 'تشغيل الكاميرا'}
                        </button>
                    </div>
                </div>

                <div className="glass-card rounded-[2rem] p-5 border border-white/5">
                    <p className="text-sm text-gray-500 font-bold text-center mb-3">أدخل رقم الفاتورة يدوياً</p>
                    <div className="flex items-center gap-2 max-w-sm mx-auto">
                        <input
                            type="text"
                            inputMode="numeric"
                            className="input-field flex-1 text-center"
                            placeholder="رقم الفاتورة (مثال: 68)"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    const val = e.target.value.trim();
                                    if (val) fetchOrderMutation.mutate(val);
                                }
                            }}
                        />
                        <button
                            onClick={(e) => {
                                const val = e.target.closest('.flex')?.querySelector('input')?.value?.trim();
                                if (val) fetchOrderMutation.mutate(val);
                            }}
                            disabled={fetchOrderMutation.isPending}
                            className="px-5 py-3 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-sm font-bold hover:bg-indigo-500/30 transition-all disabled:opacity-40 whitespace-nowrap flex items-center gap-2"
                        >
                            {fetchOrderMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Search className="w-4 h-4" /> بحث</>}
                        </button>
                    </div>
                </div>
                </>
            ) : (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="glass-card rounded-[3rem] p-6 sm:p-10 border border-t-[6px] border-indigo-500/50 shadow-2xl"
                >
                    <div className="flex items-center justify-between border-b border-white/5 pb-6 mb-6">
                        <button onClick={() => { setPendingOrder(null); setScanMode(false); }} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 transition-colors">
                            <XCircle className="w-6 h-6" />
                        </button>
                        <div className="text-right">
                            <h2 className="text-2xl font-black text-white">تفاصيل الفاتورة الكاملة</h2>
                            <p className="font-mono text-indigo-400 mt-1">{scannedId}</p>
                            <p className="text-xs text-gray-500 mt-0.5">
                                تم إنشاؤها: {pendingOrder.created_at ? new Date(pendingOrder.created_at).toLocaleString('ar-EG') : '-'}
                            </p>
                        </div>
                    </div>

                    {/* Items Table */}
                    <div className="bg-white/2 rounded-[2rem] p-6 border border-white/5 mb-6">
                        <h3 className="font-bold mb-4 flex items-center gap-2 text-gray-300">
                            <Package className="w-5 h-5 text-indigo-400" />
                            المنتجات ({parsedItems.length})
                        </h3>
                        <div className="space-y-3">
                            {parsedItems.map((item, idx) => {
                                const qty = parseInt(item.quantity || 1);
                                const unitPrice = parseFloat(item.price || 0);
                                const subtotal = qty * unitPrice;
                                return (
                                    <div key={idx} className="flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors">
                                        <div className="text-right space-y-1">
                                            <span className="font-mono font-bold text-lg text-emerald-400">{subtotal.toFixed(2)} ₪</span>
                                            <div className="flex items-center gap-2 text-[11px] text-gray-500">
                                                <span>سعر القطعة: <span className="text-indigo-400 font-bold">{unitPrice.toFixed(2)} ₪</span></span>
                                                <span>|</span>
                                                <span>الكمية: <span className="text-white font-bold">{qty}</span></span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-white">{item.name_ar || 'منتج'}</p>
                                            {item.name_en && <p className="text-xs text-gray-500">{item.name_en}</p>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Total */}
                    <div className="p-6 bg-indigo-500/10 border border-indigo-500/20 rounded-[2rem] flex flex-col sm:flex-row items-center justify-between gap-6">
                        <div className="text-center sm:text-right space-y-1">
                            <p className="text-sm text-indigo-400 font-bold">إجمالي الفاتورة</p>
                            <p className="text-5xl font-black text-white font-mono">
                                {itemsTotal.toFixed(2)}<span className="text-2xl mr-2 text-indigo-400">₪</span>
                            </p>
                            <p className="text-xs text-gray-500">{parsedItems.length} منتج - {parsedItems.reduce((s, i) => s + parseInt(i.quantity || 1), 0)} قطعة</p>
                        </div>

                        {pendingOrder.is_paid ? (
                            <div className="flex items-center gap-3 px-8 py-4 bg-emerald-500/20 text-emerald-400 rounded-2xl font-black border border-emerald-500/30">
                                <CheckCircle className="w-6 h-6" />
                                الفاتورة مدفوعة
                            </div>
                        ) : (
                            <button
                                onClick={() => confirmMutation.mutate(pendingOrder.id)}
                                disabled={confirmMutation.isPending}
                                className="btn-primary !px-10 !py-5 !rounded-2xl text-lg flex items-center justify-center gap-3 shadow-xl shadow-indigo-500/20 hover:scale-105 transition-transform"
                            >
                                {confirmMutation.isPending ? <Loader2 className="w-6 h-6 animate-spin" /> : <><CheckCircle className="w-6 h-6" /> تأكيد الدفع وإتمام الطلب</>}
                            </button>
                        )}
                    </div>

                    <div className="mt-4 flex flex-col sm:flex-row items-center gap-3">
                        <button onClick={handlePrint} className="w-full py-3 rounded-xl bg-white/5 text-gray-300 border border-white/10 font-bold text-sm hover:bg-white/10 transition-all flex items-center justify-center gap-2">
                            <Printer className="w-4 h-4" /> طباعة الفاتورة
                        </button>
                    </div>
                    <div className="mt-4 p-4 bg-white/5 rounded-2xl border border-white/5 text-center">
                        <p className="text-xs text-gray-500 flex items-center justify-center gap-2">
                            <PackageCheck className="w-4 h-4 text-amber-400" />
                            عند التأكيد: سيتم إنشاء الطلب وخصم الكميات من المخزون تلقائياً
                        </p>
                    </div>
                </motion.div>
            )}
        </div>
    );
};

export default InvoiceScanner;
