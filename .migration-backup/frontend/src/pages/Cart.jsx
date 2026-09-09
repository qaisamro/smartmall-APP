import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import useCartStore, { calcTieredTotal } from '../store/useCartStore';
import useAuthStore from '../store/useAuthStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, ShoppingBag, QrCode, Store, AlertCircle, ArrowLeft, Plus, Minus, CreditCard, LogIn, Loader2, CheckCircle, X, FileText, Search, ScanLine, Camera, Check, Truck, UserCheck } from 'lucide-react';
import QRScanner from '../components/QRScanner';
import { QRCodeSVG } from 'qrcode.react';
import Barcode from 'react-barcode';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';
/*import OrderWhatsAppShare from '../components/OrderWhatsAppShare';*/

const isKiloUnit = (u) => u ? /كيلو|كليو|كجم|كغ|\bkg\b|kilo/i.test(String(u)) : false;
const qtyStep = (u) => isKiloUnit(u) ? 0.1 : 1;
const roundQty = (v) => Math.round(v * 10) / 10;
const stockCap = (item) => {
    const cap = Number(item?.stock_quantity);
    return Number.isFinite(cap) && cap > 0 ? cap : null;
};
const capReached = (item) => {
    const cap = stockCap(item);
    return cap !== null && item.quantity >= cap;
};
const nextQty = (item) => {
    const next = roundQty(item.quantity + qtyStep(item.unit));
    const cap = stockCap(item);
    return cap !== null ? Math.min(cap, next) : next;
};
const manualQty = (item, v) => {
    const min = isKiloUnit(item.unit) ? 0.1 : 1;
    let q = Math.max(min, v);
    const cap = stockCap(item);
    return cap !== null ? Math.min(cap, q) : q;
};
const parseHM = (t) => {
    const m = t ? /^(\d{1,2}):(\d{2})/.exec(String(t)) : null;
    return m ? { h: +m[1], m: +m[2] } : null;
};
const isMallOpenNow = (mall, now = new Date()) => {
    const o = parseHM(mall?.open_time);
    const c = parseHM(mall?.close_time);
    if (!o || !c) return true;
    const mins = now.getHours() * 60 + now.getMinutes();
    const start = o.h * 60 + o.m;
    const end = c.h * 60 + c.m;
    if (start === end) return true;
    if (start < end) return mins >= start && mins < end;
    return mins >= start || mins < end;
};

const Cart = () => {
    const items = useCartStore(state => state.items);
    const total = useCartStore(state => state.total);
    const removeItem = useCartStore(state => state.removeItem);
    const updateQuantity = useCartStore(state => state.updateQuantity);
    const updateItemNotes = useCartStore(state => state.updateItemNotes);
    const clearCart = useCartStore(state => state.clearCart);
    const mallId = useCartStore(state => state.mallId);
    const isAuthenticated = useAuthStore(state => state.isAuthenticated);
    const [showQR, setShowQR] = useState(false);
    const [orderId, setOrderId] = useState(null);
    const [confirmedOrder, setConfirmedOrder] = useState(null);
    const [showDeliverySuccess, setShowDeliverySuccess] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [deliveryMethod, setDeliveryMethod] = useState('in-mall');
    const [showMallQrScanner, setShowMallQrScanner] = useState(false);
    const [pendingOrderId, setPendingOrderId] = useState(null);
    const [pendingMallId, setPendingMallId] = useState(null);
    const [scanningMallQr, setScanningMallQr] = useState(false);
    const [mallQrError, setMallQrError] = useState('');
    const [zoneSearch, setZoneSearch] = useState('');
    const [showZoneDropdown, setShowZoneDropdown] = useState(false);
    const navigate = useNavigate();

    const { data: cartMall } = useQuery({
        queryKey: ['cart-mall', mallId],
        queryFn: async () => {
            const r = await api.get(`/malls/${mallId}`);
            return r.data;
        },
        enabled: !!mallId
    });

    const deliveryEnabled = cartMall?.delivery_enabled === true;

    React.useEffect(() => {
        if (!deliveryEnabled && deliveryMethod === 'delivery') setDeliveryMethod('in-mall');
    }, [deliveryEnabled]);

    const { data: zones } = useQuery({
        queryKey: ['active-zones'],
        queryFn: async () => {
            const r = await api.get('/delivery-zones/active');
            return r.data;
        },
        enabled: deliveryMethod === 'delivery' && isAuthenticated && deliveryEnabled
    });

    const [selectedZone, setSelectedZone] = useState(null);
    const [address, setAddress] = useState('');
    const [phone, setPhone] = useState('');
    const [generalNotes, setGeneralNotes] = useState('');

    const currentDeliveryFee = deliveryMethod === 'delivery' ? parseFloat(selectedZone?.fee || 0) : 0;
    const itemsTotal = typeof total === 'function' ? total() : (Number(total) || 0);
    const finalTotal = itemsTotal + currentDeliveryFee;

    // Poll pending order until paid (in-mall mode)
    const pendingId = showQR && deliveryMethod === 'in-mall' && orderId ? orderId.replace('ORD-', '') : null;
    const { data: pendingStatus } = useQuery({
        queryKey: ['pending-order-status', pendingId],
        queryFn: async () => {
            const r = await api.get(`/orders/pending/${pendingId}`);
            if (r.data?.is_paid) {
                clearCart();
            }
            return r.data;
        },
        enabled: !!pendingId,
        refetchInterval: 3000,
    });
    const orderPaid = pendingStatus?.is_paid;

    const handleConfirm = async () => {
        if (submitting) return;
        const isRemote = deliveryMethod === 'delivery' || deliveryMethod === 'pickup';
        try {
            setSubmitting(true);
            if (deliveryMethod === 'delivery' && (!selectedZone || !address)) {
                alert("يرجى اختيار منطقة التوصيل وإدخال العنوان بالتفصيل");
                return;
            }
            if (isRemote && !phone.trim()) {
                alert("يرجى إدخال رقم الهاتف — هو مطلوب");
                return;
            }

            // Group items by mall_id
            const grouped = items.reduce((acc, item) => {
                if (!acc[item.mall_id]) acc[item.mall_id] = [];
                acc[item.mall_id].push(item);
                return acc;
            }, {});

            const mIds = Object.keys(grouped);
            let lastOrderId = null;

            for (const mId of mIds) {
                const mallItems = grouped[mId];
                const mallItemsTotal = mallItems.reduce((s, i) => s + (i.tiers ? calcTieredTotal(i.quantity, i.tiers, i.original_price ?? i.price) : i.price * i.quantity), 0);

                const response = await api.post('/orders/pending', {
                    mall_id: mId,
                    items: mallItems,
                    total: mallItemsTotal,
                    notes: generalNotes.trim() || undefined,
                    phone: phone.trim() || undefined,
                });

                if (isRemote) {
                    const confirmRes = await api.post(`/orders/pending/${response.data.order_id.replace('ORD-', '')}/confirm`, {
                        delivery_method: deliveryMethod,
                        ...(deliveryMethod === 'delivery' ? {
                            delivery_zone_id: selectedZone.id,
                            delivery_fee: selectedZone.fee,
                            delivery_address: address
                        } : {}),
                        delivery_phone: phone.trim(),
                        general_notes: generalNotes.trim() || null
                    });
                    setConfirmedOrder(confirmRes.data.order);
                }
                lastOrderId = response.data.order_id;
            }

            setOrderId(lastOrderId);
            if (isRemote) {
                clearCart();
                setShowDeliverySuccess(true);
            } else {
                setShowQR(true);
            }
        } catch (error) {
            console.error("Error creating orders:", error);
            const msg = error.response?.data?.message || error.response?.data?.products?.join('\n') || "حدث خطأ أثناء إتمام الطلب. يرجى المحاولة مرة أخرى.";
            if (error.response?.data?.products) {
                alert("بعض المنتجات لا تتوفر بالكمية المطلوبة:\n" + error.response.data.products.join('\n'));
            } else {
                alert(msg);
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleMallQrScan = async (code) => {
        setScanningMallQr(true);
        setMallQrError('');
        try {
            const res = await api.post('/scan', { code, mall_id: pendingMallId });
            if (res.data.type === 'mall' && String(res.data.mall_id) === String(pendingMallId)) {
                await api.post(`/orders/pending/${pendingOrderId.replace('ORD-', '')}/confirm`, {
                    delivery_method: 'direct_purchase',
                });
                clearCart();
                setShowMallQrScanner(false);
                navigate('/my-purchases');
            } else {
                setMallQrError('رمز المول غير متطابق — يرجى مسح رمز المول الصحيح');
                setScanningMallQr(false);
            }
        } catch (err) {
            setMallQrError('لم يتم التعرف على الرمز — يرجى المحاولة مرة أخرى');
            setScanningMallQr(false);
        }
    };

    if (items.length === 0 && !showDeliverySuccess) return (
        <div className="flex flex-col items-center justify-center py-20 sm:py-28 space-y-6">
            <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-24 h-24 rounded-full bg-gradient-to-br from-white/5 to-white-0 border border-white/10 flex items-center justify-center shadow-2xl shadow-black/50"
            >
                <ShoppingBag className="w-10 h-10 text-gray-600" />
            </motion.div>
            <div className="text-center space-y-2">
                <h2 className="text-xl sm:text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-white to-gray-500">
                    سلتك فارغة تماماً
                </h2>
                <p className="text-gray-400 max-w-xs mx-auto text-xs leading-relaxed">
                    استخدم ماسح الباركود لإضافة المنتجات التي تريد شراءها من المول وسهّل عملية الدفع.
                </p>
            </div>
            <Link
                to="/malls"
                className="btn-primary !px-6 !py-3 !rounded-xl gap-2 text-sm shadow-lg shadow-indigo-500/20"
            >
                <Store className="w-4 h-4" />
                ابدأ التسوق الآن
            </Link>
        </div>
    );

    const cartPayload = items.length > 0 ? {
        mall_id: items[0].mall_id,
        items: items.map(i => ({ name: i.name_ar, price: i.price, q: i.quantity })),
        total: typeof total === 'function' ? total() : (Number(total) || 0)
    } : null;

    // Generate a URL so standard phone cameras can open it natively
    const encodedData = cartPayload ? encodeURIComponent(btoa(encodeURIComponent(JSON.stringify(cartPayload)))) : '';
    const qrUrl = cartPayload ? window.location.origin + '/owner/pos?data=' + encodedData : '';

    return (
        <div className="pb-12">
            {/* Header */}
            <header className="flex items-center gap-3 mb-6">
                <button
                    onClick={() => navigate(-1)}
                    className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4 text-gray-400" />
                </button>
                <div>
                    <h2 className="text-xl sm:text-2xl font-extrabold flex items-center gap-2">
                        سلة المشتريات
                        <ShoppingBag className="w-6 h-6 text-indigo-400" />
                    </h2>
                    <p className="text-gray-400 mt-0.5 text-xs">راجع منتجاتك قبل التوجه للكاشير والدفع</p>
                </div>
            </header>

            <div className="grid lg:grid-cols-3 gap-6 sm:gap-8">
                {/* Cart Items */}
                <div className="lg:col-span-2 space-y-3 text-right">
                    {/* Kilo Notice */}
                    <div className="flex items-start gap-2.5 px-4 py-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-[11px] leading-relaxed text-amber-300">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <p className="font-bold">
                            الأصناف التي تعتمد شراءها بالكيلو يرجى تحديد كمية الكيلو المطلوبة من السلة
                        </p>
                    </div>

                    {/* Table Header */}
                    <div className="hidden sm:grid grid-cols-12 gap-3 px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-white/5">
                        <div className="col-span-5">المنتج</div>
                        <div className="col-span-2 text-center">الكمية</div>
                        <div className="col-span-2 text-center">السعر</div>
                        <div className="col-span-2 text-center">المجموع</div>
                        <div className="col-span-1"></div>
                    </div>

                    <AnimatePresence mode="popLayout">
                        {items.map((item, i) => (
                            <motion.div
                                key={item.id}
                                layout
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, x: -20, height: 0 }}
                                transition={{ delay: i * 0.02 }}
                                className="glass-card border border-white/5 rounded-2xl overflow-hidden"
                            >
                                {/* Desktop Row */}
                                <div className="hidden sm:grid grid-cols-12 gap-3 items-center px-5 py-4">
                                    {/* Product Name */}
                                    <div className="col-span-5 min-w-0 overflow-visible">
                                        <h3 className="text-sm font-bold text-white whitespace-normal break-words leading-tight" style={{textWrap: 'pretty'}}>{item.name_ar}</h3>
                                        <textarea
                                            value={item.notes || ''}
                                            onChange={(e) => updateItemNotes(item.id, e.target.value)}
                                            className="w-full bg-transparent border border-white/5 rounded-lg px-2 py-1.5 text-[11px] text-gray-500 placeholder-gray-600 focus:border-indigo-500/30 outline-none transition-colors mt-1.5 whitespace-pre-wrap break-words overflow-visible min-h-[32px] resize-none"
                                            placeholder="ملاحظة... (سيظهر كامل النص مع التفاف تلقائي)"
                                            rows={2}
                                            title={item.notes || 'ملاحظة...'}
                                        />
                                        {isKiloUnit(item.unit) && (
                                            <p className="mt-1.5 text-[10px] font-bold text-amber-400 flex items-center gap-1">
                                                <AlertCircle className="w-3 h-3 shrink-0" />
                                                يباع بالكيلو — حدد كمية الكيلو المطلوبة
                                            </p>
                                        )}
                                    </div>

                                    {/* Quantity */}
                                    <div className="col-span-2 flex items-center justify-center">
                                        <div className="flex items-center gap-1 bg-white/5 rounded-lg p-0.5 border border-white/5">
                                            <button
                                                onClick={() => updateQuantity(item.id, Math.max(isKiloUnit(item.unit) ? 0.1 : 1, roundQty(item.quantity - qtyStep(item.unit))))}
                                                disabled={item.quantity <= (isKiloUnit(item.unit) ? 0.1 : 1)}
                                                className="w-7 h-7 rounded-md bg-white/5 hover:bg-white/10 flex items-center justify-center disabled:opacity-30 transition-colors"
                                            >
                                                <Minus className="w-3 h-3" />
                                            </button>
                                            <input
                                                type="number"
                                                step={isKiloUnit(item.unit) ? 0.1 : 1}
                                                min={isKiloUnit(item.unit) ? 0.1 : 1}
                                                value={item.quantity}
                                                onChange={(e) => {
                                                    const v = parseFloat(e.target.value);
                                                    if (!isNaN(v)) updateQuantity(item.id, manualQty(item, v));
                                                }}
                                                className="w-14 text-center font-bold text-xs bg-transparent outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                            />
                                            <button
                                                onClick={() => updateQuantity(item.id, nextQty(item))}
                                                disabled={capReached(item)}
                                                className="w-7 h-7 rounded-md bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 flex items-center justify-center disabled:opacity-30 transition-colors"
                                            >
                                                <Plus className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Unit Price */}
                                    <div className="col-span-2 text-center">
                                        <span className="text-xs text-gray-400 font-mono">{Number(item.price).toFixed(2)} ₪</span>
                                    </div>

                                    {/* Line Total */}
                                    <div className="col-span-2 text-center">
                                        <span className="text-sm font-bold text-indigo-400 font-mono">{(item.tiers ? calcTieredTotal(item.quantity, item.tiers, item.original_price ?? item.price) : parseFloat(item.price) * parseFloat(item.quantity)).toFixed(2)} ₪</span>
                                    </div>

                                    {/* Remove */}
                                    <div className="col-span-1 flex justify-center">
                                        <button
                                            onClick={() => removeItem(item.id)}
                                            className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center"
                                            title="حذف"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>

                                {/* Mobile Row */}
                                <div className="sm:hidden px-4 py-3 space-y-3 overflow-visible">
                                    <div className="flex items-start justify-between gap-3">
                                        <h3 className="text-sm font-bold text-white flex-1 whitespace-normal break-words leading-tight" style={{textWrap: 'pretty'}} title={item.name_ar}>{item.name_ar}</h3>
                                        <button
                                            onClick={() => removeItem(item.id)}
                                            className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center shrink-0"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1 bg-white/5 rounded-lg p-0.5 border border-white/5">
                                            <button
                                                onClick={() => updateQuantity(item.id, Math.max(isKiloUnit(item.unit) ? 0.1 : 1, roundQty(item.quantity - qtyStep(item.unit))))}
                                                disabled={item.quantity <= (isKiloUnit(item.unit) ? 0.1 : 1)}
                                                className="w-7 h-7 rounded-md bg-white/5 hover:bg-white/10 flex items-center justify-center disabled:opacity-30"
                                            >
                                                <Minus className="w-3 h-3" />
                                            </button>
                                            <input
                                                type="number"
                                                step={isKiloUnit(item.unit) ? 0.1 : 1}
                                                min={isKiloUnit(item.unit) ? 0.1 : 1}
                                                value={item.quantity}
                                                onChange={(e) => {
                                                    const v = parseFloat(e.target.value);
                                                    if (!isNaN(v)) updateQuantity(item.id, manualQty(item, v));
                                                }}
                                                className="w-14 text-center font-bold text-xs bg-transparent outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                            />
                                            <button
                                                onClick={() => updateQuantity(item.id, nextQty(item))}
                                                disabled={capReached(item)}
                                                className="w-7 h-7 rounded-md bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 flex items-center justify-center disabled:opacity-30"
                                            >
                                                <Plus className="w-3 h-3" />
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-3 text-xs flex-wrap overflow-visible">
                                            <span className="text-gray-500 font-mono whitespace-normal break-words flex flex-wrap gap-1 items-center overflow-visible" style={{textWrap: 'pretty'}} title={item.notes || ''}>
                                                {item.tiers ? item.tiers.map(t => `${t.quantity} بـ ${Number(t.price).toFixed(2)} ₪`).join('، ') + ' — ' : ''}{Number(item.price).toFixed(2)} × {item.quantity}
                                            </span>
                                            <span className="font-bold text-indigo-400 font-mono whitespace-nowrap">{(item.tiers ? calcTieredTotal(item.quantity, item.tiers, item.original_price ?? item.price) : parseFloat(item.price) * parseFloat(item.quantity)).toFixed(2)} ₪</span>
                                        </div>
                                    </div>
                                    <textarea
                                        value={item.notes || ''}
                                        onChange={(e) => updateItemNotes(item.id, e.target.value)}
                                        className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-1.5 text-[11px] text-gray-400 placeholder-gray-600 focus:border-indigo-500/30 outline-none whitespace-pre-wrap break-words overflow-visible min-h-[36px] resize-none"
                                        placeholder="ملاحظة... (النص سيلتف تلقائياً ولن يُقص)"
                                        rows={2}
                                        title={item.notes || 'ملاحظة...'}
                                    />
                                    {isKiloUnit(item.unit) && (
                                        <p className="text-[10px] font-bold text-amber-400 flex items-center gap-1">
                                            <AlertCircle className="w-3 h-3 shrink-0" />
                                            يباع بالكيلو — حدد كمية الكيلو المطلوبة
                                        </p>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {/* Items Count Footer */}
                    <div className="flex items-center justify-between px-5 py-3 text-xs text-gray-500">
                        <span>{items.length} منتج في السلة</span>
                        <span className="font-mono">{itemsTotal.toFixed(2)} ₪</span>
                    </div>
                </div>

                {/* Checkout Summary */}
                <div className="space-y-4">
                    <div className="p-5 sm:p-6 rounded-2xl glass-card space-y-5 sticky top-24 border border-white/10">
                        <h3 className="text-lg font-bold border-b border-white/5 pb-3 text-right flex items-center gap-2">
                            <CreditCard className="w-4 h-4 text-indigo-400" />
                            ملخص الحساب
                        </h3>

                        <div className="space-y-3 text-right">
                            <div className="flex justify-between text-gray-400 text-xs">
                                <span className="font-mono text-white">{itemsTotal.toFixed(2)} ₪</span>
                                <span>المجموع الفرعي ({items.length} منتج)</span>
                            </div>
                            {deliveryMethod === 'delivery' && currentDeliveryFee > 0 && (
                                <div className="flex justify-between text-gray-400 text-xs">
                                    <span className="font-mono text-amber-400">+ {currentDeliveryFee.toFixed(2)} ₪</span>
                                    <span>رسوم التوصيل</span>
                                </div>
                            )}
                            <div className="flex justify-between items-center text-lg font-bold border-t border-white/5 pt-3">
                                <span className="text-indigo-400 font-mono">{finalTotal.toFixed(2)} <span className="text-xs">₪</span></span>
                                <span>الإجمالي</span>
                            </div>

                        {(deliveryMethod === 'delivery' || deliveryMethod === 'pickup') && !showQR && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="space-y-4 pt-4 border-t border-white/5 text-right"
                            >
                                {cartMall && !isMallOpenNow(cartMall) && (
                                    <div className="flex items-start gap-2.5 px-4 py-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-[11px] leading-relaxed text-rose-300 font-bold">
                                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                        <p>
                                            ⚠️ {cartMall.name_ar} مغلق حالياً
                                            {cartMall.open_time && cartMall.close_time ? ` (ساعات الدوام: ${String(cartMall.open_time).slice(0, 5)} - ${String(cartMall.close_time).slice(0, 5)})` : ''}
                                            {' '}— يمكنك إرسال الطلب وسيتم تجهيزه عند الفتح، أو تسوق من متجر مفتوح.
                                        </p>
                                    </div>
                                )}
                                {deliveryMethod === 'delivery' && (
                                <div className="relative">
                                    <label className="block text-sm font-bold text-gray-400 mb-1">اختر منطقة التوصيل</label>
                                    <p className="text-[10px] text-gray-500 mb-2 leading-relaxed">
                                        اختر منطقتك حسب التالي: <span className="text-amber-400">  حنينه - سنجر - كنار - كريسة وهكذا</span>
                                    </p>
                                    <div className="relative">
                                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                        <input
                                            type="text"
                                            className="input-field w-full text-right pr-10 bg-white/5 border-white/10"
                                            placeholder="ابحث عن منطقتك..."
                                            value={zoneSearch}
                                            onFocus={() => setShowZoneDropdown(true)}
                                            onChange={(e) => {
                                                setZoneSearch(e.target.value);
                                                setShowZoneDropdown(true);
                                            }}
                                            onBlur={() => setTimeout(() => setShowZoneDropdown(false), 200)}
                                        />
                                    </div>
                                    {showZoneDropdown && (
                                        <div className="absolute z-20 mt-1 w-full max-h-48 overflow-y-auto rounded-xl bg-gray-900 border border-white/10 shadow-2xl backdrop-blur-xl">
                                            {zones?.filter(z => z.name.includes(zoneSearch)).length === 0 ? (
                                                <div className="p-3 text-center text-xs text-gray-500">لا توجد مناطق مطابقة</div>
                                            ) : (
                                                zones?.filter(z => z.name.includes(zoneSearch)).map(z => (
                                                    <button
                                                        key={z.id}
                                                        type="button"
                                                        onMouseDown={() => {
                                                            setSelectedZone(z);
                                                            setZoneSearch(z.name);
                                                            setShowZoneDropdown(false);
                                                        }}
                                                        className={`w-full text-right px-4 py-3 text-sm transition-colors flex items-center justify-between hover:bg-white/5 ${selectedZone?.id === z.id ? 'bg-indigo-500/10 text-indigo-400' : 'text-gray-300'}`}
                                                    >
                                                        <span>{z.name}</span>
                                                        <span className="text-[11px] text-amber-400 font-mono">+{z.fee} ₪</span>
                                                    </button>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>
                                )}
                                {deliveryMethod === 'delivery' && (
                                <div>
                                    <label className="block text-sm font-bold text-gray-400 mb-2">العنوان بالتفصيل</label>
                                    <textarea
                                        className="input-field w-full text-right h-20 resize-none py-3"
                                        placeholder="اسم الشارع، البناية، رقم الشقة، علامة مميزة..."
                                        value={address}
                                        onChange={(e) => setAddress(e.target.value)}
                                    />
                                </div>
                                )}
                                {selectedZone && (
                                    <div className="flex justify-between text-amber-400 text-xs font-bold">
                                        <span className="font-mono">{selectedZone.fee} ₪</span>
                                        <span>رسوم التوصيل لهذه المنطقة</span>
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {!showQR && (
                            <div className="space-y-3 pt-4 border-t border-white/5">
                                <p className="text-xs font-bold text-gray-400 text-right">اختر طريقة الاستلام</p>
                                <div className="flex flex-col gap-1.5">
                                    <button
                                        onClick={() => setDeliveryMethod('in-mall')}
                                        className={`py-2.5 rounded-xl font-bold transition-all border flex items-center gap-2 text-[11px] ${deliveryMethod === 'in-mall' ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400' : 'bg-white/5 border-white/5 text-gray-500'}`}
                                    >
                                        <Store className="w-4 h-4 shrink-0" />
                                        داخل المول — مسح باركود عند الكاشير
                                    </button>
                                    {/* ترحيل الفاتورة — معطل حالياً
                                    {isAuthenticated ? (
                                        <button
                                            onClick={() => setDeliveryMethod('direct_purchase')}
                                            className={`py-2.5 rounded-xl font-bold transition-all border flex items-center gap-2 text-[11px] ${deliveryMethod === 'direct_purchase' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-white/5 border-white/5 text-gray-500'}`}
                                        >
                                            <CheckCircle className="w-4 h-4 shrink-0" />
                                            ترحيل الفاتورة إلى مشترياتي
                                        </button>
                                    ) : (
                                        <Link
                                            to="/login"
                                            className="py-2.5 rounded-xl font-bold transition-all border bg-white/5 border-white/5 text-gray-500 hover:text-emerald-400 hover:border-emerald-500/30 flex items-center gap-2 text-[11px]"
                                        >
                                            <LogIn className="w-4 h-4 shrink-0" />
                                            سجل للدخول لترحيل الفاتورة
                                        </Link>
                                    )}
                                    */}
                                    {deliveryEnabled && (isAuthenticated ? (
                                        <button
                                            onClick={() => setDeliveryMethod('delivery')}
                                            className={`py-2.5 rounded-xl font-bold transition-all border flex items-center gap-2 text-[11px] ${deliveryMethod === 'delivery' ? 'bg-amber-500/20 border-amber-500 text-amber-400' : 'bg-white/5 border-white/5 text-gray-500'}`}
                                        >
                                            <ShoppingBag className="w-4 h-4 shrink-0" />
                                            توصيل منزلي
                                        </button>
                                    ) : (
                                        <Link
                                            to="/login"
                                            className="py-2.5 rounded-xl font-bold transition-all border bg-white/5 border-white/5 text-gray-500 hover:text-amber-400 hover:border-amber-500/30 flex items-center gap-2 text-[11px]"
                                        >
                                            <LogIn className="w-4 h-4 shrink-0" />
                                            سجل للدخول للتوصيل
                                        </Link>
                                    ))}
                                    {isAuthenticated ? (
                                        <button
                                            onClick={() => setDeliveryMethod('pickup')}
                                            className={`py-2.5 rounded-xl font-bold transition-all border flex items-center gap-2 text-[11px] ${deliveryMethod === 'pickup' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-white/5 border-white/5 text-gray-500'}`}
                                        >
                                            <UserCheck className="w-4 h-4 shrink-0" />
                                            استلام شخصي من المتجر
                                        </button>
                                    ) : (
                                        <Link
                                            to="/login"
                                            className="py-2.5 rounded-xl font-bold transition-all border bg-white/5 border-white/5 text-gray-500 hover:text-emerald-400 hover:border-emerald-500/30 flex items-center gap-2 text-[11px]"
                                        >
                                            <LogIn className="w-4 h-4 shrink-0" />
                                            سجل للدخول للاستلام الشخصي
                                        </Link>
                                    )}
                                </div>
                                {!showQR && (
                                    <>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-400 mb-1.5">
                                                رقم الهاتف {(deliveryMethod === 'delivery' || deliveryMethod === 'pickup') && <span className="text-rose-400">*</span>}
                                                {deliveryMethod === 'in-mall' && <span className="text-gray-600 font-normal"> (اختياري — ليظهر على فاتورتك)</span>}
                                            </label>
                                            <input
                                                type="tel"
                                                dir="ltr"
                                                className="input-field w-full text-left font-mono"
                                                placeholder="05xxxxxxxx"
                                                value={phone}
                                                onChange={(e) => setPhone(e.target.value.replace(/[^\d+\s-]/g, ''))}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-400 mb-1.5">ملاحظات عامة (اختياري)</label>
                                            <textarea
                                                className="input-field w-full text-right h-16 resize-none py-2 text-sm"
                                                placeholder="أي ملاحظات إضافية حول طلبك..."
                                                value={generalNotes}
                                                onChange={(e) => setGeneralNotes(e.target.value)}
                                            />
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {!showQR ? (
                            <div className="pt-1 space-y-2">
                                <button
                                    onClick={handleConfirm}
                                    disabled={submitting}
                                    className="btn-primary w-full !py-3 shadow-lg shadow-indigo-500/20 !rounded-xl text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {submitting ? (
                                        <><Loader2 className="w-4 h-4 animate-spin" /> جاري تأكيد الطلب...</>
                                    ) : deliveryMethod === 'delivery' ? (
                                        <>تأكيد طلب التوصيل <ShoppingBag className="w-4 h-4" /></>
                                    ) : deliveryMethod === 'pickup' ? (
                                        <>تأكيد طلب الاستلام الشخصي <UserCheck className="w-4 h-4" /></>
                                    ) : (
                                        <>إنشاء رمز الدفع <QrCode className="w-4 h-4" /></>
                                    )}
                                </button>
                                <p className="text-[10px] text-gray-500 text-center flex items-center justify-center gap-1">
                                    <AlertCircle className="w-3 h-3" />
                                    {deliveryMethod === 'delivery'
                                        ? 'سيتم إرسال طلبك للمناديب ويمكنك تتبعه من صفحة تتبع الطلبات'
                                        : deliveryMethod === 'pickup'
                                            ? 'سيصل إشعار للمتجر بطلبك، وعند قبوله وتحديد مدة التجهيز سيصلك إشعار'
                                            : 'يمكنك الدفع عبر مسح الرمز عند الكاشير'}
                                </p>
                            </div>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex flex-col items-center gap-6 bg-white p-8 sm:p-10 rounded-[2rem] border-4 border-indigo-100 shadow-2xl"
                            >
                                {orderPaid && deliveryMethod !== 'delivery' ? (
                                    <div className="text-center space-y-6 w-full">
                                        <div className="w-20 h-20 mx-auto bg-emerald-100 rounded-full flex items-center justify-center">
                                            <CheckCircle className="w-10 h-10 text-emerald-600" />
                                        </div>
                                        <div>
                                            <p className="text-emerald-700 text-xl font-bold">تم تأكيد الدفع بنجاح</p>
                                            <p className="text-gray-500 text-sm mt-1">رقم الطلب: {orderId}</p>
                                        </div>
                                        <button
                                            onClick={() => { setShowQR(false); setOrderId(null); }}
                                            className="btn-primary !px-8 !py-3 !rounded-2xl"
                                        >
                                            العودة للتسوق
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        {/* Header */}
                                        <div className="text-center space-y-2 w-full">
                                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100 rounded-full">
                                                <CreditCard className="w-4 h-4 text-emerald-600" />
                                                <p className="text-emerald-700 text-sm font-bold">
                                                    {deliveryMethod === 'delivery' ? 'تم تقديم طلب التوصيل' : 'باركود الفاتورة الرقمية'}
                                                </p>
                                            </div>
                                            <p className="text-gray-600 text-sm font-medium mt-2">
                                                {deliveryMethod === 'delivery'
                                                    ? 'تم إرسال طلبك للمناديب بنجاح. رقم الطلب للتمبع:'
                                                    : 'امسح هذا الباركود لدفع مبلغ '}
                                                <span className="font-bold text-indigo-600 text-lg">{finalTotal} ₪</span>
                                            </p>
                                        </div>

                                        {/* WhatsApp share for delivery orders — DISABLED
                                        {deliveryMethod === 'delivery' && confirmedOrder && !showDeliverySuccess && (
                                            <OrderWhatsAppShare ... />
                                        )}
                                        */}

                                        {/* Barcode - for camera scanning (laser USB won't read phone screens) */}
                                        <div className="relative p-6 bg-white rounded-2xl border-4 border-gray-200 shadow-lg w-full flex justify-center overflow-hidden">
                                            <Barcode
                                                value={orderId || ''}
                                                width={2}
                                                height={80}
                                                format="CODE128"
                                                displayValue={true}
                                                fontOptions="bold"
                                                fontSize={16}
                                                margin={10}
                                            />
                                        </div>

                                        {/* Instructions */}
                                        <div className="text-center space-y-3 w-full max-w-sm">
                                            <div className="flex items-center justify-center gap-2 text-gray-500 text-xs">
                                                <ScanLine className="w-4 h-4" />
                                                <span>أظهر هذا الرمز للكاشير — يتم المسح بالكاميرا</span>
                                            </div>
                                            <div className="bg-amber-50 rounded-xl p-3 border border-amber-200">
                                                <p className="text-amber-700 text-xs font-medium">
                                                    ⚠️ أجهزة الليزر USB لا تقرأ من شاشات الجوال — الكاشير سيستخدم الكاميرا للمسح
                                                </p>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex gap-3 w-full max-w-sm">
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(orderId);
                                                }}
                                                className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 font-bold text-sm transition-all flex items-center justify-center gap-2"
                                            >
                                                نسخ الكود
                                            </button>
                                            <button
                                                onClick={() => setShowQR(false)}
                                                className="flex-1 py-3 rounded-xl bg-indigo-100 text-indigo-700 hover:bg-indigo-200 font-bold text-sm transition-all"
                                            >
                                                إغلاق
                                            </button>
                                        </div>
                                    </>
                                )}
                            </motion.div>
                        )}
                        </div>
                    </div>
                </div>
            </div>
            {/* Delivery Success Modal */}
            <AnimatePresence>
                {showDeliverySuccess && confirmedOrder && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm"
                        onClick={() => setShowDeliverySuccess(false)}
                    >
                        <motion.div
                            initial={{ opacity: 0, y: 100, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 100, scale: 0.95 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="w-full sm:max-w-lg max-h-[90vh] overflow-y-auto bg-gradient-to-b from-gray-900 to-gray-950 rounded-t-[2rem] sm:rounded-[2rem] border border-white/10 shadow-2xl p-6"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="text-center mb-6">
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                                    className="w-20 h-20 mx-auto rounded-full bg-emerald-500/20 flex items-center justify-center mb-4"
                                >
                                    <CheckCircle className="w-10 h-10 text-emerald-400" />
                                </motion.div>
                                <h3 className="text-2xl font-bold text-white">{deliveryMethod === 'pickup' ? 'تم إرسال طلب الاستلام الشخصي' : 'تم تأكيد طلب التوصيل'}</h3>
                                <p className="text-gray-400 mt-2">رقم الطلب: <span className="text-emerald-400 font-bold font-mono text-lg">#{confirmedOrder.id}</span></p>
                                {deliveryMethod === 'pickup' && (
                                    <p className="text-gray-400 mt-2 text-xs">سيصل إشعار للمتجر — وعند قبول الطلب وتحديد مدة التجهيز سيصلك إشعار</p>
                                )}
                            </div>

                            <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-2xl p-5 mb-4">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center shrink-0">
                                        <ShoppingBag className="w-6 h-6 text-indigo-400" />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-white text-sm mb-1">تتبع طلبك الآن</h4>
                                        <p className="text-gray-400 text-xs leading-relaxed">
                                            يمكنك متابعة حالة طلبك والتوصيل في أي وقت من خلال صفحة تتبع الطلبات
                                        </p>
                                        <button
                                            onClick={() => { navigate('/order-tracking'); setShowDeliverySuccess(false); }}
                                            className="mt-3 inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-bold rounded-xl transition-all"
                                        >
                                            <ShoppingBag className="w-4 h-4" />
                                            الذهاب إلى تتبع الطلبات
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 mt-4">
                                <button
                                    onClick={() => { navigate('/order-tracking'); setShowDeliverySuccess(false); }}
                                    className="flex-1 py-3.5 rounded-2xl bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-sm transition-all flex items-center justify-center gap-2"
                                >
                                    <ShoppingBag className="w-4 h-4" />
                                    تتبع الطلب
                                </button>
                                <button
                                    onClick={() => setShowDeliverySuccess(false)}
                                    className="flex-1 py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 text-gray-300 font-bold text-sm transition-colors border border-white/10"
                                >
                                    إغلاق
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Mall QR Scanner for direct_purchase confirmation */}
            <AnimatePresence>
                {showMallQrScanner && (
                    <>
                        {scanningMallQr ? (
                            <div className="fixed inset-0 z-[200] bg-black/95 flex flex-col items-center justify-center p-6">
                                <Loader2 className="w-12 h-12 text-indigo-400 animate-spin mb-4" />
                                <p className="text-white font-bold text-lg">جاري التحقق من رمز المول...</p>
                            </div>
                        ) : (
                            <QRScanner
                                onResult={handleMallQrScan}
                                onClose={() => { setShowMallQrScanner(false); setPendingOrderId(null); setPendingMallId(null); setMallQrError(''); }}
                            />
                        )}
                        {mallQrError && (
                            <div className="fixed inset-0 z-[210] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="bg-gray-900 rounded-3xl p-8 max-w-sm w-full border border-white/10 shadow-2xl text-center space-y-5"
                                >
                                    <div className="w-16 h-16 rounded-full bg-rose-500/20 flex items-center justify-center mx-auto">
                                        <AlertCircle className="w-8 h-8 text-rose-400" />
                                    </div>
                                    <p className="text-white font-bold text-lg">{mallQrError}</p>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => { setMallQrError(''); }}
                                            className="flex-1 py-3 rounded-xl bg-indigo-500 text-white font-bold"
                                        >
                                            حاول مرة أخرى
                                        </button>
                                        <button
                                            onClick={() => { setShowMallQrScanner(false); setPendingOrderId(null); setPendingMallId(null); setMallQrError(''); }}
                                            className="flex-1 py-3 rounded-xl bg-white/10 text-gray-300 font-bold"
                                        >
                                            إلغاء
                                        </button>
                                    </div>
                                </motion.div>
                            </div>
                        )}
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Cart;
