import React, { useState, useRef, useEffect, useCallback } from 'react';
import QRScanner from '../../components/QRScanner';
import api from '../../api/axios';
import { motion, AnimatePresence } from 'framer-motion';
import { ScanLine, Store, CheckCircle2, X, AlertCircle, Link2, Link2Off, Loader2, Plus, QrCode, Camera, Usb } from 'lucide-react';
import useAuthStore from '../../store/useAuthStore';
import { useNavigate } from 'react-router-dom';

const OwnerScanner = () => {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [posToken, setPosToken] = useState(() => localStorage.getItem('pos_scanner_link_token'));
    const [lastScanned, setLastScanned] = useState(null);
    const [showError, setShowError] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [lastUnfoundBarcode, setLastUnfoundBarcode] = useState(null);
    const [needReconnect, setNeedReconnect] = useState(false);
    const [scannerActive, setScannerActive] = useState(false);
    const [usbBarcode, setUsbBarcode] = useState('');
    const debounceRef = useRef(null);
    const usbInputRef = useRef(null);

    const mallId = user?.mall?.id;
    const mallName = user?.mall?.name_ar || 'مولك';

    useEffect(() => {
        if (posToken) {
            localStorage.setItem('pos_scanner_link_token', posToken);
        } else {
            localStorage.removeItem('pos_scanner_link_token');
        }
    }, [posToken]);

    // Check if stored token is still valid on mount
    useEffect(() => {
        if (posToken) {
            api.post(`/pos/sync/${posToken}`, { barcode: 'PING' }).catch(err => {
                if (err.response?.status === 404 || err.response?.status === 403) {
                    setPosToken(null);
                    setNeedReconnect(true);
                }
            });
        }
    }, []);

    const handleScan = async (decodedText) => {
        if (loading) return;

        const text = decodedText.trim();

        if (debounceRef.current === text) return;
        debounceRef.current = text;
        setTimeout(() => { debounceRef.current = null; }, 800);

        // POS LINK Mode
        if (text.startsWith('POS_LINK:')) {
            const token = text.split(':')[1];
            setPosToken(token);
            setNeedReconnect(false);
            setLastScanned({ name: '✅ تم الربط بالكاشير', price: null, qty: null, isLink: true });
            setTimeout(() => setLastScanned(null), 2000);
            return;
        }

        // POS SYNC Mode
        if (posToken) {
            setLoading(true);
            try {
                const res = await api.post(`/pos/sync/${posToken}`, { barcode: text });
                const product = res.data?.product;
                setLastScanned({
                    name: product?.name_ar || 'منتج',
                    price: res.data?.price_at_scan ?? product?.price ?? 0,
                    qty: res.data?.quantity ?? 1,
                    isLink: false,
                });
                setTimeout(() => setLastScanned(null), 1500);
            } catch (err) {
                if (err.response?.status === 404 || err.response?.status === 403) {
                    setPosToken(null);
                    setNeedReconnect(true);
                    setErrorMessage('انتهت صلاحية الجلسة');
                    setShowError(true);
                } else if (err.response?.status === 422) {
                    setErrorMessage(err.response?.data?.message || 'الكمية غير متوفرة');
                    setShowError(true);
                } else {
                    setErrorMessage(err.response?.data?.message || 'باركود غير موجود');
                    setShowError(true);
                }
                setTimeout(() => setShowError(false), 3000);
            } finally {
                setLoading(false);
            }
            return;
        }

        // BROWSE Mode
        setLoading(true);
        try {
            const response = await api.post('/scan', { code: text, mall_id: mallId });
            const data = response.data;
            if (data.type === 'product') {
                const p = data.product;
                setLastScanned({ name: p.name_ar, price: p.price, qty: 1, isLink: false });
                setLastUnfoundBarcode(null);
                setTimeout(() => setLastScanned(null), 2000);
            } else {
                setLastUnfoundBarcode(text);
                setErrorMessage('هذا الكود لا يخص منتجاً في مولك');
                setShowError(true);
                setTimeout(() => setShowError(false), 3000);
            }
        } catch {
            setLastUnfoundBarcode(text);
            setErrorMessage('لم يتم العثور على هذا المنتج في ' + mallName);
            setShowError(true);
            setTimeout(() => setShowError(false), 3000);
        } finally {
            setLoading(false);
        }
    };

    const handleUsbKeyDown = useCallback((e) => {
        if (e.key === 'Enter') {
            const code = usbBarcode.trim();
            if (code) {
                handleScan(code);
            }
            setUsbBarcode('');
            e.preventDefault();
        }
    }, [usbBarcode, handleScan]);

    useEffect(() => {
        setTimeout(() => usbInputRef.current?.focus(), 500);
    }, []);

    const isLinked = !!posToken;

    return (
        <div className="space-y-6 pb-10 max-w-lg mx-auto">
            {/* Header */}
            <div className="text-center space-y-2">
                <h1 className="text-2xl font-extrabold flex items-center gap-2 justify-center">
                    <ScanLine className="w-6 h-6 text-emerald-400" />
                    ماسح المنتجات
                </h1>
                <p className="text-xs text-gray-500 flex items-center gap-1 justify-center">
                    <Store className="w-3.5 h-3.5 text-purple-400" />
                    منتجات <span className="text-purple-400 font-bold">{mallName}</span>
                </p>
            </div>

            {/* Main status card */}
            <motion.div layout className={`rounded-[2.5rem] p-5 border text-center transition-all duration-500 ${isLinked ? 'bg-emerald-500/10 border-emerald-500/30' : needReconnect ? 'bg-amber-500/10 border-amber-500/30' : 'bg-white/5 border-white/10'}`}>
                {isLinked ? (
                    <div className="space-y-3">
                        <div className="flex items-center justify-center gap-2">
                            <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
                            <span className="text-emerald-400 font-bold text-lg">مربوط بالكاشير</span>
                            <Link2 className="w-5 h-5 text-emerald-400" />
                        </div>
                        <p className="text-xs text-emerald-400/60">المسح يضيف المنتجات مباشرة للفاتورة</p>
                        <button onClick={() => { if (window.confirm('فصل الماسح عن الكاشير؟')) { setPosToken(null); } }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-bold hover:bg-rose-500/20 transition-all">
                            <Link2Off className="w-3 h-3" /> فصل
                        </button>
                    </div>
                ) : needReconnect ? (
                    <div className="space-y-3">
                        <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
                        <p className="text-amber-400 font-bold">الجلسة السابقة انتهت</p>
                        <p className="text-xs text-amber-400/60">امسح QR الكاشير مرة أخرى لإعادة الربط</p>
                        <QrCode className="w-6 h-6 text-amber-400 mx-auto opacity-50" />
                    </div>
                ) : (
                    <div className="space-y-3">
                        <QrCode className="w-8 h-8 text-gray-500 mx-auto" />
                        <p className="text-gray-400 font-bold">غير مرتبط</p>
                        <p className="text-xs text-gray-500">امسح QR من صفحة الكاشير لتفعيل الإضافة التلقائية</p>
                    </div>
                )}
            </motion.div>

            {/* Overlay messages (center screen) */}
            <AnimatePresence>
                {lastScanned && (
                    <motion.div
                        key={lastScanned.name + lastScanned.isLink}
                        initial={{ opacity: 0, scale: 0.85 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.85 }}
                        className={`rounded-[2rem] p-6 border text-center space-y-3 shadow-2xl ${lastScanned.isLink ? 'bg-emerald-600 border-emerald-400/30' : 'bg-black/90 border-white/10 backdrop-blur-2xl'}`}
                    >
                        {lastScanned.isLink ? (
                            <>
                                <div className="w-16 h-16 rounded-full bg-emerald-400/20 flex items-center justify-center mx-auto border-2 border-emerald-400">
                                    <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                                </div>
                                <p className="text-emerald-400 font-black text-xl">{lastScanned.name}</p>
                            </>
                        ) : (
                            <>
                                <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto border-2 border-emerald-500/40">
                                    <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                                </div>
                                <p className="text-white font-black text-xl">{lastScanned.name}</p>
                                {lastScanned.price !== null && (
                                    <div className="flex items-center justify-center gap-3 text-sm">
                                        <span className="bg-white/10 px-3 py-1 rounded-lg text-gray-300">
                                            الكمية: {lastScanned.qty}
                                        </span>
                                        <span className="text-emerald-400 font-black text-2xl">
                                            {(lastScanned.price * (lastScanned.qty || 1)).toFixed(2)} ₪
                                        </span>
                                    </div>
                                )}
                                <p className="text-[10px] text-gray-500">تمت الإضافة إلى الفاتورة</p>
                            </>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Error message (center) */}
            <AnimatePresence>
                {showError && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="rounded-[2rem] p-6 border text-center space-y-3 bg-rose-600/90 border-rose-400/30 shadow-2xl"
                    >
                        <div className="w-14 h-14 rounded-full bg-rose-400/20 flex items-center justify-center mx-auto border-2 border-rose-400/40">
                            <AlertCircle className="w-7 h-7 text-rose-300" />
                        </div>
                        <p className="text-white font-bold text-lg">{errorMessage}</p>
                        {lastUnfoundBarcode && (
                            <button onClick={() => navigate(`/owner/products?barcode=${lastUnfoundBarcode}`)}
                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-white/15 hover:bg-white/25 rounded-xl text-xs font-bold transition-all text-white">
                                <Plus className="w-3.5 h-3.5" /> إضافة هذا المنتج
                            </button>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* USB / Laser barcode scanner */}
            <div className="glass-card rounded-[2.5rem] border border-white/5 overflow-hidden">
                <div className="relative" onClick={() => usbInputRef.current?.focus()}>
                    <input
                        ref={usbInputRef}
                        type="text"
                        inputMode="none"
                        value={usbBarcode}
                        onChange={(e) => setUsbBarcode(e.target.value)}
                        onKeyDown={handleUsbKeyDown}
                        onBlur={() => setTimeout(() => usbInputRef.current?.focus(), 50)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-default pointer-events-auto"
                        autoComplete="off"
                        aria-hidden="true"
                    />
                </div>
                <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Usb className="w-4 h-4 text-blue-400" />
                        <span>ماسح الليزر USB</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                        <span className="text-[10px] text-blue-400">جاهز</span>
                    </div>
                </div>
            </div>

            {/* Scanner camera */}
            <div className={`glass-card rounded-[2.5rem] p-2 border shadow-2xl transition-all duration-500 ${isLinked ? 'border-emerald-500/30 shadow-emerald-500/20' : 'border-white/10'}`}>
                <div className="absolute top-5 left-5 w-8 h-8 border-t-4 border-l-4 rounded-tl-xl z-20 pointer-events-none transition-colors duration-500 border-emerald-400/50" />
                <div className="absolute top-5 right-5 w-8 h-8 border-t-4 border-r-4 rounded-tr-xl z-20 pointer-events-none transition-colors duration-500 border-emerald-400/50" />
                <div className="absolute bottom-5 left-5 w-8 h-8 border-b-4 border-l-4 rounded-bl-xl z-20 pointer-events-none transition-colors duration-500 border-emerald-400/50" />
                <div className="absolute bottom-5 right-5 w-8 h-8 border-b-4 border-r-4 rounded-br-xl z-20 pointer-events-none transition-colors duration-500 border-emerald-400/50" />
                <div className="rounded-[2rem] overflow-hidden bg-black/80 aspect-square flex items-center justify-center relative">
                    {loading ? (
                        <div className="flex flex-col items-center gap-3 text-emerald-400">
                            <Loader2 className="w-10 h-10 animate-spin" />
                            <p className="text-sm font-bold animate-pulse">
                                {isLinked ? 'جاري الإضافة...' : 'جاري البحث...'}
                            </p>
                        </div>
                    ) : scannerActive ? (
                        <QRScanner onResult={handleScan} onClose={() => setScannerActive(false)} variant="inline" />
                    ) : (
                        <div className="flex flex-col items-center justify-center gap-3 text-gray-500 cursor-pointer" onClick={() => setScannerActive(true)}>
                            <Camera className="w-10 h-10" />
                            <p className="text-sm font-bold">اضغط لتفعيل الكاميرا</p>
                        </div>
                    )}
                    {!loading && scannerActive && (
                        <>
                            <div className="absolute inset-x-8 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent scan-line opacity-70 shadow-[0_0_15px_rgba(52,211,153,1)]" />
                            <div className="absolute w-64 h-64 border-2 border-dashed rounded-3xl opacity-20 pointer-events-none border-emerald-400" />
                        </>
                    )}
                </div>
            </div>

            {/* Hint */}
            <div className="bg-white/5 rounded-2xl p-4 border border-white/5 text-center">
                <p className="text-[11px] text-gray-500 font-medium leading-relaxed">
                    {isLinked
                        ? 'الماسح نشط — امسح أي باركود ليظهر مباشرة في فاتورة الكاشير'
                        : 'امسح QR من شاشة الكاشير لربط الماسح'}
                </p>
            </div>
        </div>
    );
};

export default OwnerScanner;
