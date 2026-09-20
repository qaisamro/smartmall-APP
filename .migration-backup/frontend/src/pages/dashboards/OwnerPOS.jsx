import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import QRScanner from '../../components/QRScanner';
import useAuthStore from '../../store/useAuthStore';
import { Receipt, CheckCircle, ScanLine, X, Loader2, QrCode, ShoppingBag, Trash2, Printer, ExternalLink, Minus, Plus, AlertCircle, LogOut, Sun, Search, Maximize2, Minimize2, FileCheck, PackageCheck, Package, Camera } from 'lucide-react';
import { printThermalReceipt } from '../../utils/thermalPrint';
import { QRCodeSVG } from 'qrcode.react';

const OwnerPOS = () => {
    const [activeSession, setActiveSession] = useState(() => {
        const saved = localStorage.getItem('pos_active_session');
        return saved ? JSON.parse(saved) : null;
    });
    const [scanMode, setScanMode] = useState(false);
    const [lastAddedName, setLastAddedName] = useState('');
    const [stockError, setStockError] = useState('');
    const [remoteAddedName, setRemoteAddedName] = useState('');
    const [invoice, setInvoice] = useState(null);
    const [usbBarcode, setUsbBarcode] = useState('');
    const [scanError, setScanError] = useState('');
    const [productSearch, setProductSearch] = useState('');
    const [showSearchDropdown, setShowSearchDropdown] = useState(false);
    const [dropdownStyle, setDropdownStyle] = useState({});
    const [invoiceFullscreen, setInvoiceFullscreen] = useState(false);

    // Invoice scanner state (supermarket sidebar)
    const [invoicePanelOpen, setInvoicePanelOpen] = useState(true);
    const [invoiceScanMode, setInvoiceScanMode] = useState(false);
    const [pendingOrder, setPendingOrder] = useState(null);
    const [invoiceScannedId, setInvoiceScannedId] = useState('');
    const [invoiceErrorMsg, setInvoiceErrorMsg] = useState('');
    const [invoiceConfirmed, setInvoiceConfirmed] = useState(null);
    const [invoiceUsbBarcode, setInvoiceUsbBarcode] = useState('');
    const invoiceDebounceRef = useRef(null);
    const invoiceUsbInputRef = useRef(null);
    const manualEntryRef = useRef(null);

    const fetchOrderMutation = useMutation({
        mutationFn: async (id) => {
            const numId = id.replace('ORD-', '');
            return (await api.get(`/orders/pending/${numId}`)).data;
        },
        onSuccess: (data) => {
            setPendingOrder(data);
            setInvoiceScanMode(false);
            setInvoiceErrorMsg('');
            setInvoiceConfirmed(null);
        },
        onError: (err) => {
            const msg = err.response?.data?.message || 'لم يتم العثور على الفاتورة أو أنها غير صالحة';
            setInvoiceErrorMsg(msg);
            playErrorSound();
            setTimeout(() => setInvoiceErrorMsg(''), 3000);
        }
    });

    const confirmOrderMutation = useMutation({
        mutationFn: async (id) => (await api.post(`/owner/orders/pending/${id}/confirm`)).data,
        onSuccess: (data) => {
            queryClient.invalidateQueries(['orders']);
            setPendingOrder(null);
            setInvoiceScannedId('');
            setInvoiceConfirmed(data.order || data);
        },
        onError: (err) => alert(err.response?.data?.message || 'حدث خطأ أثناء التأكيد')
    });

    const handleInvoiceScan = (decodedText) => {
        const clean = decodedText.trim();
        if (!clean.startsWith('ORD-') && !/^\d+$/.test(clean)) return;
        if (invoiceDebounceRef.current === clean) return;
        invoiceDebounceRef.current = clean;
        setTimeout(() => { invoiceDebounceRef.current = null; }, 2000);
        setInvoiceScannedId(clean);
        fetchOrderMutation.mutate(clean);
    };

    const handleInvoiceUsbKeyDown = useCallback((e) => {
        if (e.key === 'Enter') {
            const code = invoiceUsbBarcode.trim();
            if (code) {
                handleInvoiceScan(code);
            }
            setInvoiceUsbBarcode('');
            setTimeout(() => invoiceUsbInputRef.current?.focus(), 10);
            e.preventDefault();
        }
    }, [invoiceUsbBarcode, handleInvoiceScan]);

    // Auto-start camera when invoice panel opens
    useEffect(() => {
        if (invoicePanelOpen) {
            setInvoiceScanMode(true);
            setTimeout(() => invoiceUsbInputRef.current?.focus(), 300);
        }
    }, [invoicePanelOpen]);

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
    const queryClient = useQueryClient();
    const debounceRef = useRef(null);
    const hasAutoCreated = useRef(false);
    const prevItemCount = useRef(0);
    const invoiceRef = useRef(null);
    const usbInputRef = useRef(null);
    const searchInputRef = useRef(null);
    const { user } = useAuthStore();
    const isSupermarket = user?.mall?.type === 'supermarket';

    const { data: allProducts } = useQuery({
        queryKey: ['owner-pos-products', user?.mall_id],
        queryFn: async () => {
            if (!user?.mall_id) return [];
            const r = await api.get(`/malls/${user.mall_id}/products?all=1`);
            return r.data;
        },
        enabled: !!user?.mall_id && !!activeSession,
    });

    const products = Array.isArray(allProducts) ? allProducts : allProducts?.data || [];
    const filteredSearchProducts = products.filter(p =>
        !productSearch ||
        p.name_ar?.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.name_en?.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.barcode?.toLowerCase().includes(productSearch.toLowerCase())
    );

    const { data: sessionData } = useQuery({
        queryKey: ['pos-session', activeSession?.token],
        queryFn: async () => {
            try {
                const r = await api.get(`/owner/pos/sessions/${activeSession.token}`);
                return r.data;
            } catch (err) {
                if (err.response?.status === 404) setActiveSession(null);
                throw err;
            }
        },
        enabled: !!activeSession,
        refetchInterval: 300,
        staleTime: 0,
    });

    const createSessionMutation = useMutation({
        mutationFn: async () => (await api.post('/owner/pos/sessions')).data,
        onSuccess: (data) => {
            setActiveSession(data);
        }
    });

    const addItemMutation = useMutation({
        mutationFn: async (barcode) => {
            return (await api.post(`/pos/sync/${activeSession.token}`, { barcode })).data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries(['pos-session', activeSession?.token]);
            setLastAddedName(data.product?.name_ar || 'منتج');
            setStockError('');
            setTimeout(() => setLastAddedName(''), 2000);
        },
        onError: (err) => {
            const msg = err.response?.data?.message || '';
            if (msg) {
                if (msg.includes('not found')) {
                    setScanError(msg);
                    playErrorSound();
                    setTimeout(() => setScanError(''), 2000);
                } else {
                    setStockError(msg);
                    setTimeout(() => setStockError(''), 4000);
                }
            }
        }
    });

    const addByIdMutation = useMutation({
        mutationFn: async (productId) => {
            return (await api.post(`/pos/sync/${activeSession.token}`, { product_id: productId })).data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries(['pos-session', activeSession?.token]);
            setLastAddedName(data.product?.name_ar || 'منتج');
            setStockError('');
            setShowSearchDropdown(false);
            setProductSearch('');
            setTimeout(() => setLastAddedName(''), 2000);
        },
        onError: (err) => {
            const msg = err.response?.data?.message || '';
            if (msg) {
                setStockError(msg);
                setTimeout(() => setStockError(''), 4000);
            }
        }
    });

    const updateQuantityMutation = useMutation({
        mutationFn: async ({ itemId, quantity }) => {
            return (await api.patch(`/owner/pos/items/${itemId}`, { quantity })).data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['pos-session', activeSession?.token]);
        }
    });

    const finalizeMutation = useMutation({
        mutationFn: async (token) => (await api.post(`/owner/pos/finalize/${token}`)).data,
        onSuccess: (data) => {
            setInvoice(data);
            queryClient.invalidateQueries(['pos-session', activeSession?.token]);
            setStockError('');
        },
        onError: (err) => {
            const msg = err.response?.data?.message || 'حدث خطأ أثناء إتمام البيع';
            const products = err.response?.data?.products;
            setStockError(products ? `${msg}: ${products.join('، ')}` : msg);
            setTimeout(() => setStockError(''), 6000);
        }
    });

    const closeSessionMutation = useMutation({
        mutationFn: async (token) => (await api.post(`/owner/pos/close/${token}`)).data,
        onSuccess: () => {
            setActiveSession(null);
            setScanMode(false);
            queryClient.invalidateQueries(['pos-session']);
        },
        onError: () => {
            setActiveSession(null);
            setScanMode(false);
            queryClient.invalidateQueries(['pos-session']);
        }
    });

    const removeItemMutation = useMutation({
        mutationFn: async (itemId) => { await api.delete(`/owner/pos/items/${itemId}`); },
        onSuccess: () => queryClient.invalidateQueries(['pos-session', activeSession?.token])
    });

    const handleUsbKeyDown = useCallback((e) => {
        if (e.key === 'Enter') {
            const code = usbBarcode.trim();
            if (code && activeSession) {
                addItemMutation.mutate(code);
            }
            setUsbBarcode('');
            setTimeout(() => usbInputRef.current?.focus(), 10);
            e.preventDefault();
        }
    }, [usbBarcode, activeSession, addItemMutation]);

    useEffect(() => {
        if (activeSession) {
            localStorage.setItem('pos_active_session', JSON.stringify(activeSession));
            [500, 1000, 2000].forEach(delay => setTimeout(() => usbInputRef.current?.focus(), delay));
        } else {
            localStorage.removeItem('pos_active_session');
        }
    }, [activeSession]);

    useEffect(() => {
        if (!activeSession && !hasAutoCreated.current) {
            hasAutoCreated.current = true;
            createSessionMutation.mutate();
        }
    }, []);

    const handleScan = async (decodedText) => {
        if (decodedText.startsWith('POS_LINK:')) return;

        if (debounceRef.current === decodedText) return;
        debounceRef.current = decodedText;
        setTimeout(() => { debounceRef.current = null; }, 1500);

        if (!activeSession) return;
        addItemMutation.mutate(decodedText);
    };

    const handlePrintInvoice = () => {
        const mallName = user?.mall?.name_ar || invoice?.order?.mall?.name_ar || '';
        const bodyHtml = `
                <div class="receipt">
                    <div class="header">
                        <div style="font-size:16px;font-weight:bold;letter-spacing:1px;color:#000;margin-bottom:1mm">Smart Mall</div>
                        ${mallName ? `<div style="font-size:12px;font-weight:bold;color:#000;margin-bottom:0.5mm">${mallName}</div>` : ''}
                        <div class="meta">
                            <span style="font-weight:bold">${new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                            <span style="font-size:9px">${new Date().toLocaleTimeString('ar-EG')}</span>
                            ${invoice?.order?.id ? `<span style="margin-top:0.5mm;font-weight:bold;font-size:12px">رقم الفاتورة: ${invoice.order.pending_order_id ? `ORD-${invoice.order.pending_order_id}` : `#${invoice.order.id}`}</span>` : ''}
                        </div>
                            ${(invoice?.order?.delivery_phone) ? `<div class="meta"><span dir="ltr" style="font-weight:bold;font-size:11px">هاتف الزبون: ${invoice.order.delivery_phone}</span></div>` : ''}
                    </div>

                    <table>
                        <thead><tr><th>المنتج</th><th>الكمية</th><th>السعر</th><th>المجموع</th></tr></thead>
                        <tbody>
                            ${(invoice?.order?.items || invoice?.session?.items || []).map((item, i) => {
                                const name = item.product?.name_ar || 'منتج';
                                const price = Number(item.price_at_sale || item.price_at_scan || 0);
                                const qty = item.quantity || 1;
                                const notes = item.notes ? `<span class="item-notes">ملاحظة: ${item.notes}</span>` : '';
                                return `<tr><td style="font-weight:bold">${name}${notes}</td><td>${qty}</td><td>${price.toFixed(2)}</td><td style="font-weight:bold">${(price * qty).toFixed(2)}</td></tr>`;
                            }).join('')}
                        </tbody>
                    </table>

                    <div class="totals">
                        <div class="row"><span style="font-weight:bold">${(invoice?.order?.items || invoice?.session?.items || []).reduce((s, i) => s + (i.quantity || 1), 0)} قطعة</span><span>إجمالي القطع</span></div>
                        <div class="row grand"><span style="font-weight:bold">${Number(invoice?.order?.total_amount || 0).toFixed(2)} ₪</span><span>المجموع النهائي</span></div>
                    </div>

                    <div class="barcode">${invoice?.order?.id || ''}</div>

                    ${(invoice?.order?.general_notes) ? `<div style="text-align:right;font-size:10px;font-weight:bold;padding:1mm 0;border-top:1px dashed #000;margin-top:1mm">ملاحظات الزبون: ${invoice.order.general_notes}</div>` : ''}

                    <div class="footer">
                        <div class="brand">Smart Mall</div>
                        <p style="font-weight:bold">شكراً لتسوقكم</p>
                    </div>
                </div>`;
        printThermalReceipt({ bodyHtml, title: `فاتورة - ${mallName || 'SmartMall'}` });
    };

    const items = sessionData?.items || [];
    const total = items.reduce((acc, item) => acc + (Number(item.price_at_scan) * item.quantity), 0);

    useEffect(() => {
        if (items.length > prevItemCount.current) {
            const newItem = items[items.length - 1];
            if (newItem?.product?.name_ar && !addItemMutation.isPending) {
                setRemoteAddedName(newItem.product.name_ar);
                setTimeout(() => setRemoteAddedName(''), 2000);
            }
        }
        prevItemCount.current = items.length;
    }, [items.length]);

    return (
        <div className="space-y-8 pb-10">
            {/* Scan error popup */}
            <AnimatePresence>
                {scanError && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm"
                    >
                        <div className="bg-rose-600/90 border border-rose-400/40 rounded-[2rem] p-8 text-center space-y-4 shadow-2xl shadow-rose-600/30 max-w-xs mx-4">
                            <div className="w-16 h-16 rounded-full bg-rose-400/20 flex items-center justify-center mx-auto border-2 border-rose-400/50">
                                <X className="w-8 h-8 text-rose-300" />
                            </div>
                            <p className="text-white font-bold text-lg">لم يتم العثور على المنتج</p>
                            <p className="text-rose-200 text-sm">{scanError}</p>
                        </div>
                    </motion.div>
                )}
                {invoiceErrorMsg && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm"
                        onClick={() => setInvoiceErrorMsg('')}
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
                            <p className="text-rose-200 text-sm">{invoiceErrorMsg}</p>
                            <button
                                onClick={() => setInvoiceErrorMsg('')}
                                className="mt-2 px-6 py-2.5 rounded-xl bg-white/10 text-white border border-white/20 font-bold text-sm hover:bg-white/20 transition-all"
                            >
                                حسناً
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <header className="flex flex-col sm:flex-row justify-between items-center gap-4 text-center sm:text-right">
                <div>
                    <h2 className="text-3xl font-extrabold flex items-center gap-3 justify-center sm:justify-start">
                        <Receipt className="w-8 h-8 text-emerald-400" />
                        نظام الكاشير الذكي
                    </h2>
                    <p className="text-gray-400 mt-1 text-sm">امسح المنتجات بالماسح الضوئي أو الليزر USB أو وصّل جوالك كـ ماسح لاسلكي</p>
                </div>
                <div className="flex items-center gap-3">
                    {activeSession ? (
                        <>
                            <button
                                onClick={() => setScanMode(!scanMode)}
                                className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm transition-all border ${scanMode
                                    ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
                                    : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                                }`}
                            >
                                <ScanLine className="w-4 h-4" />
                                {scanMode ? 'إيقاف الماسح' : 'تشغيل الماسح'}
                            </button>
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-xs font-bold text-emerald-400">
                                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                                {remoteAddedName ? `🔄 ${remoteAddedName}` : 'جلسة اليوم نشطة'}
                            </div>
                        </>
                    ) : (
                        <button
                            onClick={() => createSessionMutation.mutate()}
                            disabled={createSessionMutation.isPending}
                            className="btn-primary !py-3 !px-6 flex items-center gap-2"
                        >
                            {createSessionMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScanLine className="w-4 h-4" />}
                            فتح جلسة كاشير
                        </button>
                    )}
                </div>
            </header>

            {!activeSession ? (
                <div className="flex flex-col items-center justify-center py-20 text-center glass-card rounded-[3rem] border border-white/5">
                    <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6 border border-emerald-500/20">
                        <ScanLine className="w-12 h-12 text-emerald-400" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">انتهت جلسة اليوم</h3>
                    <p className="text-gray-500 max-w-sm mx-auto mb-8">
                        تم إغلاق جلسة اليوم بنجاح. يمكنك فتح جلسة جديدة غداً.
                    </p>
                    <button
                        onClick={() => createSessionMutation.mutate()}
                        className="btn-primary px-10 py-4 flex items-center gap-2"
                    >
                        فتح جلسة جديدة <ExternalLink className="w-4 h-4" />
                    </button>
                </div>
            ) : (
                <div className="flex flex-col-reverse lg:grid lg:grid-cols-12 gap-8 items-start">
                    <div className="lg:col-span-5 space-y-5 w-full">
                        <div className={`glass-card rounded-[2.5rem] border overflow-hidden transition-all duration-500 ${scanMode ? 'border-emerald-500/30 shadow-2xl shadow-emerald-500/10' : 'border-white/5'}`}>
                            <div className="p-5 border-b border-white/5 flex items-center justify-between">
                                <div className={`flex items-center gap-2 text-sm font-bold ${stockError ? 'text-rose-400' : remoteAddedName ? 'text-emerald-400' : 'text-emerald-400'}`}>
                                    {stockError
                                        ? <><AlertCircle className="w-4 h-4" /> {stockError}</>
                                        : addItemMutation.isPending
                                            ? <><Loader2 className="w-4 h-4 animate-spin" /> جاري الإضافة...</>
                                            : remoteAddedName
                                                ? <><CheckCircle className="w-4 h-4" /> {remoteAddedName}</>
                                                : lastAddedName
                                                    ? <><CheckCircle className="w-4 h-4 text-emerald-400" /> تمت إضافة: {lastAddedName}</>
                                                    : <><ScanLine className="w-4 h-4" /> الماسح الضوئي جاهز — امسح الباركود بالليزر أو الكاميرا</>
                                    }
                                </div>
                                <h4 className="font-bold text-sm">ماسح الباركود</h4>
                            </div>

                            <div className="relative bg-black aspect-video" onClick={() => usbInputRef.current?.focus()}>
                                {/* Hidden USB input — covers entire scanner area for laser/USB scanner */}
                                <input
                                    ref={usbInputRef}
                                    type="text"
                                    inputMode="none"
                                    value={usbBarcode}
                                    onChange={(e) => setUsbBarcode(e.target.value)}
                                    onKeyDown={handleUsbKeyDown}
                                    onBlur={(e) => { if (e.relatedTarget?.closest?.('[data-pos-search]')) return; setTimeout(() => usbInputRef.current?.focus(), 50); }}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-default"
                                    autoComplete="off"
                                    aria-hidden="true"
                                />
                                {scanMode ? (
                                    <QRScanner onResult={handleScan} onClose={() => setScanMode(false)} variant="inline" />
                                ) : (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 opacity-30 pointer-events-none">
                                        <ScanLine className="w-16 h-16" />
                                        <p className="text-sm font-bold">الماسح جاهز — امسح الباركود</p>
                                        <p className="text-xs text-gray-400">USB Laser / Camera QR Code</p>
                                    </div>
                                )}
                                {scanMode && (
                                    <>
                                        <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-emerald-400 rounded-tl-lg z-20 pointer-events-none" />
                                        <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-emerald-400 rounded-tr-lg z-20 pointer-events-none" />
                                        <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-emerald-400 rounded-bl-lg z-20 pointer-events-none" />
                                        <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-emerald-400 rounded-br-lg z-20 pointer-events-none" />
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="glass-card rounded-[2.5rem] border border-white/5 overflow-hidden">
                                <button
                                    onClick={() => setInvoicePanelOpen(!invoicePanelOpen)}
                                    className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
                                >
                                    <div className="flex items-center gap-2 text-sm font-bold">
                                        <FileCheck className="w-4 h-4 text-indigo-400" />
                                        قارئ فواتير الزبائن
                                    </div>
                                    <div className={`text-gray-500 transition-transform ${invoicePanelOpen ? 'rotate-180' : ''}`}>
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                    </div>
                                </button>

                                        {invoicePanelOpen && (
                                    <div className="border-t border-white/5">
                                        {invoiceConfirmed ? (
                                            <div className="p-5 text-center space-y-4">
                                                <div className="w-16 h-16 mx-auto bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/30">
                                                    <PackageCheck className="w-8 h-8 text-emerald-400" />
                                                </div>
                                                <p className="text-sm font-bold text-emerald-400">تم تأكيد الدفع</p>
                                                <p className="text-xs text-gray-400">رقم الفاتورة: {invoiceConfirmed.pending_order_id ? `ORD-${invoiceConfirmed.pending_order_id}` : `#${invoiceConfirmed.id}`}</p>
                                                <button
                                                    onClick={() => { setInvoiceConfirmed(null); setPendingOrder(null); setInvoiceScanMode(true); }}
                                                    className="w-full py-3 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 font-bold text-sm hover:bg-indigo-500/30 transition-all"
                                                >
                                                    مسح فاتورة جديدة
                                                </button>
                                            </div>
                                        ) : pendingOrder ? (
                                            <div className="p-4 space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs text-gray-500 font-mono">{invoiceScannedId}</span>
                                                    <button
                                                        onClick={() => { setPendingOrder(null); setInvoiceScanMode(true); }}
                                                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                <div className="space-y-2 max-h-48 overflow-y-auto">
                                                    {(typeof pendingOrder.items_json === 'string' ? JSON.parse(pendingOrder.items_json) : pendingOrder.items_json || []).map((item, idx) => {
                                                        const qty = parseInt(item.quantity || 1);
                                                        const unitPrice = parseFloat(item.price || 0);
                                                        return (
                                                            <div key={idx} className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/5">
                                                                <span className="text-xs font-black text-emerald-400">{(qty * unitPrice).toFixed(2)} ₪</span>
                                                                <div className="text-right">
                                                                    <p className="text-sm font-bold">{item.name_ar || 'منتج'}</p>
                                                                    <p className="text-[10px] text-gray-500">×{qty}</p>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                                <div className="flex items-center justify-between p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                                                    <span className="text-sm font-bold text-indigo-400">
                                                        {(typeof pendingOrder.items_json === 'string' ? JSON.parse(pendingOrder.items_json) : pendingOrder.items_json || []).reduce((s, i) => s + (parseFloat(i.price || 0) * parseInt(i.quantity || 0)), 0).toFixed(2)} ₪
                                                    </span>
                                                    <span className="text-xs text-gray-400">الإجمالي</span>
                                                </div>
                                                {pendingOrder.is_paid ? (
                                                    <div className="flex items-center justify-center gap-2 p-3 bg-emerald-500/10 rounded-xl text-emerald-400 text-sm font-bold">
                                                        <CheckCircle className="w-4 h-4" /> مدفوعة
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => confirmOrderMutation.mutate(pendingOrder.id)}
                                                        disabled={confirmOrderMutation.isPending}
                                                        className="w-full py-3 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold text-sm hover:bg-emerald-500/30 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                                                    >
                                                        {confirmOrderMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle className="w-4 h-4" /> تأكيد الدفع وإتمام الطلب</>}
                                                    </button>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="p-4 space-y-3">
                                                {/* Camera scanner (auto-starts) */}
                                                <div className="relative bg-black rounded-2xl overflow-hidden aspect-video border-2 border-indigo-500/20">
                                                    {invoiceScanMode ? (
                                                        <QRScanner onResult={handleInvoiceScan} onClose={() => setInvoiceScanMode(false)} variant="inline" />
                                                    ) : (
                                                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                                                            <Camera className="w-10 h-10 text-gray-500" />
                                                            <p className="text-xs text-gray-500 font-bold">اضغط لبدء الكاميرا</p>
                                                            <button
                                                                onClick={() => setInvoiceScanMode(true)}
                                                                className="px-5 py-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-xs font-bold hover:bg-indigo-500/30 transition-all"
                                                            >
                                                                تشغيل الكاميرا
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>

                                                {fetchOrderMutation.isPending && (
                                                    <div className="flex items-center justify-center gap-2 text-indigo-400 text-xs font-bold py-2">
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                        جاري استرجاع الفاتورة...
                                                    </div>
                                                )}

                                                <p className="text-[10px] text-amber-400/70 text-center flex items-center justify-center gap-1">
                                                    <Sun className="w-3 h-3" />
                                                    ارفع سطوع شاشة الزبون لأقصى درجة — وجّه الكاميرا نحو الرمز
                                                </p>

                                                <div className="border-t border-white/5 pt-3 space-y-2">
                                                    <p className="text-[10px] text-gray-500 font-bold text-center">أو أدخل رقم الفاتورة يدوياً</p>
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="text"
                                                            inputMode="numeric"
                                                            className="input-field flex-1 text-center text-sm"
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
                                                                const val = e.target.closest('.space-y-2')?.querySelector('input')?.value?.trim();
                                                                if (val) fetchOrderMutation.mutate(val);
                                                            }}
                                                            disabled={fetchOrderMutation.isPending}
                                                            className="px-4 py-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-xs font-bold hover:bg-indigo-500/30 transition-all disabled:opacity-40 whitespace-nowrap"
                                                        >
                                                            {fetchOrderMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'بحث'}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                        <div className="glass-card rounded-[2rem] p-6 text-center border border-white/5 hidden lg:block">
                            <h4 className="text-sm font-bold text-gray-400 mb-4 flex items-center gap-2 justify-center">
                                <QrCode className="w-4 h-4" />
                                ربط الجوال كـ ماسح لاسلكي
                            </h4>
                            <div className="bg-white p-4 rounded-2xl inline-block mb-3">
                                <QRCodeSVG value={`POS_LINK:${activeSession.token}`} size={120} level="H" includeMargin={false} />
                            </div>
                            <p className="text-[10px] text-gray-500 leading-relaxed mb-3">
                                افتح تطبيق SmartMall من جوالك → ماسح المنتجات → امسح هذا الكود
                            </p>
                            <code className="text-[10px] bg-black/30 px-2 py-1 rounded text-emerald-400 font-mono">
                                Token: {activeSession.token}
                            </code>
                            <div className="mt-6 space-y-3">
                                <button
                                    onClick={() => {
                                        if (window.confirm('هل أنت متأكد من إغلاق جلسة اليوم؟ بعد الإغلاق لا يمكن إضافة منتجات جديدة.')) {
                                            closeSessionMutation.mutate(activeSession.token);
                                        }
                                    }}
                                    disabled={closeSessionMutation.isPending}
                                    className="w-full py-3 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold text-sm hover:bg-rose-500 hover:text-white transition-all disabled:opacity-40"
                                >
                                    {closeSessionMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : <><LogOut className="w-4 h-4 inline ml-2" />إغلاق الجلسة (نهاية اليوم)</>}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-7 flex flex-col gap-6 w-full">
                        {/* Product search */}
                        <div className="glass-card rounded-[2.5rem] border border-white/5" data-pos-search>
                            <div className="p-4">
                                <div className="flex items-center gap-2">
                                    <div className="relative flex-1">
                                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                                        <input
                                            ref={searchInputRef}
                                            type="text"
                                            value={productSearch}
                                            onChange={(e) => { setProductSearch(e.target.value); setShowSearchDropdown(true); if (searchInputRef.current) { const r = searchInputRef.current.getBoundingClientRect(); setDropdownStyle({ top: r.bottom + 6, left: r.left, width: r.width }); } }}
                                            onFocus={() => { setShowSearchDropdown(true); if (searchInputRef.current) { const r = searchInputRef.current.getBoundingClientRect(); setDropdownStyle({ top: r.bottom + 6, left: r.left, width: r.width }); } }}
                                            className="input-field w-full pr-10"
                                            placeholder="ابحث عن منتج بالاسم أو الباركود..."
                                        />
                                    </div>
                                </div>
                                <div className="border-t border-white/5 mt-3 pt-3">
                                    <div className="flex items-center gap-2">
                                        <div className="relative flex-1">
                                            <FileCheck className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500 pointer-events-none" />
                                            <input
                                                ref={manualEntryRef}
                                                type="text"
                                                className="input-field w-full pr-10"
                                                placeholder="رقم الفاتورة يدوياً (مثال: 68)"
                                                inputMode="numeric"
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        const val = e.target.value.trim();
                                                        if (val) fetchOrderMutation.mutate(val);
                                                    }
                                                }}
                                            />
                                        </div>
                                        <button
                                            onClick={() => {
                                                const val = manualEntryRef.current?.value?.trim();
                                                if (val) fetchOrderMutation.mutate(val);
                                            }}
                                            disabled={fetchOrderMutation.isPending}
                                            className="px-4 py-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-xs font-bold hover:bg-indigo-500/30 transition-all disabled:opacity-40 whitespace-nowrap"
                                        >
                                            {fetchOrderMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'بحث'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="glass-card rounded-[2.5rem] flex-1 flex flex-col min-h-[500px] border border-white/5 overflow-hidden">
                            <div className="p-6 border-b border-white/5 flex items-center justify-between">
                                <span className="px-3 py-1 bg-white/5 rounded-full text-xs font-bold text-blue-400">
                                    {items.length} منتجات
                                </span>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-xl font-bold">الفاتورة الحالية</h3>
                                    <button onClick={() => setInvoiceFullscreen(true)}
                                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all text-gray-400 hover:text-white"
                                        title="تكبير الشاشة">
                                        <Maximize2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-3">
                                {items.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-16 opacity-20 text-center">
                                        <ShoppingBag className="w-16 h-16 mb-4" />
                                        <p className="font-bold">ابدأ بمسح المنتجات لإضافتها هنا</p>
                                    </div>
                                ) : (
                                    <AnimatePresence>
                                        {items.map((item) => (
                                            <motion.div
                                                key={item.id}
                                                initial={{ opacity: 0, x: 20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, scale: 0.95 }}
                                                className="flex items-center justify-between p-4 bg-white/2 rounded-2xl border border-white/5 group hover:bg-white/5 transition-all"
                                            >
                                                <button
                                                    onClick={() => removeItemMutation.mutate(item.id)}
                                                    className="p-2 text-gray-600 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>

                                                <div className="flex items-center gap-4 text-right flex-1 justify-start">
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-sm font-bold">{item.product?.name_ar}</span>
                                                        <span className="text-[10px] text-gray-500 font-mono">{item.product?.barcode}</span>
                                                    </div>

                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            onClick={() => {
                                                                const q = item.quantity + 1;
                                                                updateQuantityMutation.mutate({ itemId: item.id, quantity: q });
                                                            }}
                                                            className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all"
                                                        >
                                                            <Plus className="w-3.5 h-3.5" />
                                                        </button>
                                                        <span className="px-3 py-1 bg-blue-500/10 text-blue-400 rounded-lg font-mono text-sm font-bold min-w-[40px] text-center">
                                                            {item.quantity}
                                                        </span>
                                                        <button
                                                            onClick={() => {
                                                                const q = item.quantity - 1;
                                                                if (q < 1) {
                                                                    if (window.confirm('حذف هذا المنتج من الفاتورة؟')) removeItemMutation.mutate(item.id);
                                                                } else {
                                                                    updateQuantityMutation.mutate({ itemId: item.id, quantity: q });
                                                                }
                                                            }}
                                                            className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-all"
                                                        >
                                                            <Minus className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>

                                                    <div className="text-sm font-black text-white w-20 text-right">
                                                        {(Number(item.price_at_scan) * item.quantity).toFixed(2)} ₪
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                )}
                            </div>

                            <div className="p-8 bg-black/40 border-t border-white/5 backdrop-blur-md">
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                                    <div className="flex items-baseline gap-2 flex-col items-center sm:items-start order-2 sm:order-1">
                                        <span className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-bold">إجمالي الفاتورة</span>
                                        <div className="text-5xl font-black text-emerald-400 flex items-center gap-2">
                                            <span className="text-xl font-bold opacity-50">₪</span>
                                            {total.toFixed(2)}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => finalizeMutation.mutate(activeSession.token)}
                                        disabled={items.length === 0 || finalizeMutation.isPending}
                                        className="btn-primary !py-5 !px-12 !rounded-[2rem] text-lg font-black shadow-2xl shadow-emerald-500/20 order-1 sm:order-2 w-full sm:w-auto flex items-center justify-center gap-3 disabled:opacity-40"
                                    >
                                        {finalizeMutation.isPending
                                            ? <Loader2 className="w-6 h-6 animate-spin" />
                                            : <><CheckCircle className="w-6 h-6" /> تأكيد وإتمام البيع</>
                                        }
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Fullscreen invoice overlay */}
                        <AnimatePresence>
                            {invoiceFullscreen && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="fixed inset-0 z-[100] bg-gray-950/95 backdrop-blur-md flex flex-col"
                                >
                                    <div className="p-4 border-b border-white/5 flex items-center justify-between shrink-0">
                                        <span className="px-3 py-1 bg-white/5 rounded-full text-xs font-bold text-blue-400">
                                            {items.length} منتجات
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-lg font-bold">الفاتورة الحالية</h3>
                                            <button onClick={() => setInvoiceFullscreen(false)}
                                                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all text-gray-400 hover:text-white"
                                                title="تصغير">
                                                <Minimize2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex-1 overflow-y-auto p-4 space-y-2">
                                        {items.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center py-16 opacity-20 text-center">
                                                <ShoppingBag className="w-16 h-16 mb-4" />
                                                <p className="font-bold">ابدأ بمسح المنتجات لإضافتها هنا</p>
                                            </div>
                                        ) : (
                                            <AnimatePresence>
                                                {items.map((item) => (
                                                    <motion.div
                                                        key={item.id}
                                                        initial={{ opacity: 0, x: 20 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        exit={{ opacity: 0, scale: 0.95 }}
                                                        className="flex items-center justify-between p-4 bg-white/2 rounded-2xl border border-white/5 group hover:bg-white/5 transition-all"
                                                    >
                                                        <button
                                                            onClick={() => removeItemMutation.mutate(item.id)}
                                                            className="p-2 text-gray-600 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>

                                                        <div className="flex items-center gap-4 text-right flex-1 justify-start">
                                                            <div className="flex flex-col items-end">
                                                                <span className="text-base font-bold">{item.product?.name_ar}</span>
                                                                <span className="text-xs text-gray-500 font-mono">{item.product?.barcode}</span>
                                                            </div>

                                                            <div className="flex items-center gap-1">
                                                                <button
                                                                    onClick={() => updateQuantityMutation.mutate({ itemId: item.id, quantity: item.quantity + 1 })}
                                                                    className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all"
                                                                >
                                                                    <Plus className="w-3.5 h-3.5" />
                                                                </button>
                                                                <span className="px-3 py-1 bg-blue-500/10 text-blue-400 rounded-lg font-mono text-sm font-bold min-w-[40px] text-center">
                                                                    {item.quantity}
                                                                </span>
                                                                <button
                                                                    onClick={() => {
                                                                        const q = item.quantity - 1;
                                                                        if (q < 1) {
                                                                            if (window.confirm('حذف هذا المنتج من الفاتورة؟')) removeItemMutation.mutate(item.id);
                                                                        } else {
                                                                            updateQuantityMutation.mutate({ itemId: item.id, quantity: q });
                                                                        }
                                                                    }}
                                                                    className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-all"
                                                                >
                                                                    <Minus className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>

                                                            <div className="text-sm font-black text-white w-20 text-right">
                                                                {(Number(item.price_at_scan) * item.quantity).toFixed(2)} ₪
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                ))}
                                            </AnimatePresence>
                                        )}
                                    </div>

                                    <div className="p-6 bg-black/40 border-t border-white/5 backdrop-blur-md shrink-0">
                                        <div className="flex items-center justify-between gap-6">
                                            <div className="flex items-baseline gap-2 flex-col items-start">
                                                <span className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-bold">إجمالي الفاتورة</span>
                                                <div className="text-4xl font-black text-emerald-400 flex items-center gap-2">
                                                    <span className="text-lg font-bold opacity-50">₪</span>
                                                    {total.toFixed(2)}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => finalizeMutation.mutate(activeSession.token)}
                                                disabled={items.length === 0 || finalizeMutation.isPending}
                                                className="btn-primary !py-4 !px-10 !rounded-[2rem] text-lg font-black shadow-2xl shadow-emerald-500/20 flex items-center justify-center gap-3 disabled:opacity-40"
                                            >
                                                {finalizeMutation.isPending
                                                    ? <Loader2 className="w-6 h-6 animate-spin" />
                                                    : <><CheckCircle className="w-6 h-6" /> تأكيد وإتمام البيع</>
                                                }
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="lg:hidden">
                            <button
                                onClick={() => {
                                    if (window.confirm('هل أنت متأكد من إغلاق جلسة اليوم؟ بعد الإغلاق لا يمكن إضافة منتجات جديدة.')) {
                                        closeSessionMutation.mutate(activeSession.token);
                                    }
                                }}
                                disabled={closeSessionMutation.isPending}
                                className="w-full py-4 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold text-sm hover:bg-rose-500 hover:text-white transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                            >
                                {closeSessionMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                                إغلاق الجلسة (نهاية اليوم)
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Invoice Modal */}
            <AnimatePresence>
                {invoice && (
                    <motion.div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            ref={invoiceRef}
                            className="bg-gray-900 rounded-[2.5rem] border border-white/10 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                        >
                            <div className="p-6 border-b border-white/5 flex items-center justify-between">
                                <h3 className="text-lg font-bold flex items-center gap-2">
                                    <Receipt className="w-5 h-5 text-emerald-400" />
                                    تمت عملية البيع
                                </h3>
                                <button onClick={() => setInvoice(null)} className="p-2 hover:bg-white/5 rounded-xl transition-all">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="p-6 space-y-6">
                                <div className="text-center space-y-2">
                                    <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto border-2 border-emerald-500/40">
                                        <CheckCircle className="w-8 h-8 text-emerald-400" />
                                    </div>
                                    <p className="text-emerald-400 font-bold">تم تسديد الفاتورة بنجاح</p>
                                    {invoice?.order?.id && (
                                        <p className="text-gray-400 text-sm">رقم الفاتورة: {invoice.order.pending_order_id ? `ORD-${invoice.order.pending_order_id}` : `#${invoice.order.id}`}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    {((invoice?.order?.items || invoice?.session?.items) || []).map((item, i) => (
                                        <div key={i}>
                                            <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                                                <span className="text-sm font-bold">{item.product?.name_ar || 'منتج'}</span>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xs text-gray-400">×{item.quantity}</span>
                                                    <span className="text-emerald-400 font-black">
                                                        {((item.price_at_sale || item.price_at_scan || 0) * item.quantity).toFixed(2)} ₪
                                                    </span>
                                                </div>
                                            </div>
                                            {item.notes && <p className="text-[10px] text-amber-400/70 pr-3 -mt-1 pb-1">{item.notes}</p>}
                                        </div>
                                    ))}
                                </div>

                                <div className="flex items-center justify-between p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                                    <span className="font-bold text-emerald-400">الإجمالي</span>
                                    <span className="text-2xl font-black text-emerald-400">
                                        {Number(invoice?.order?.total_amount || 0).toFixed(2)} ₪
                                    </span>
                                </div>

                                <div className="flex gap-3">
                                    <button onClick={handlePrintInvoice}
                                        className="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/20 font-bold text-sm transition-all flex items-center justify-center gap-2"
                                    >
                                        <Printer className="w-4 h-4" /> طباعة الفاتورة
                                    </button>
                                    <button onClick={() => setInvoice(null)}
                                        className="flex-1 py-3 rounded-xl bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 font-bold text-sm transition-all"
                                    >
                                        متابعة البيع
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Search dropdown overlay */}
            <AnimatePresence>
                {showSearchDropdown && productSearch && (
                    <>
                        <div className="fixed inset-0 z-[80]" onClick={() => { setShowSearchDropdown(false); setProductSearch(''); }} />
                        <motion.div
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            className="fixed z-[90] rounded-2xl bg-gray-800 border border-white/10 shadow-xl shadow-black/50 overflow-y-auto max-h-60"
                            style={{ scrollbarWidth: 'thin', ...dropdownStyle }}
                        >
                            {filteredSearchProducts.length === 0 ? (
                                <div className="p-4 text-center text-sm text-gray-500">لا توجد منتجات</div>
                            ) : filteredSearchProducts.slice(0, 50).map(p => (
                                <button
                                    type="button"
                                    key={p.id}
                                    onClick={() => { addByIdMutation.mutate(p.id); setShowSearchDropdown(false); setProductSearch(''); }}
                                    className="w-full text-right px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
                                >
                                    <div>
                                        <span className="text-white text-sm font-semibold">{p.name_ar}</span>
                                        <span className="text-gray-500 text-xs mr-2">{p.name_en}</span>
                                    </div>
                                    <span className="text-xs text-emerald-400">{p.discount_price || p.price} ₪</span>
                                </button>
                            ))}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

export default OwnerPOS;
