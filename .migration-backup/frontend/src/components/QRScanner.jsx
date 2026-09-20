import React, { useEffect, useRef, useState, useCallback } from 'react';
import { BrowserMultiFormatReader } from '@zxing/library';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Scan, X, Check, RefreshCw, Zap } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { scanNative, checkCameraPermission, requestCameraPermission, openAppSettings } from '../services/scannerService';

const SCAN_DEBOUNCE_MS = 2000;

const getBrowserInfo = () => {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    return {
        isSafari: /^((?!chrome|android|crios|fxios|edg).)*safari/i.test(ua),
        isFirefox: /Firefox/.test(ua),
        isIOS: /iPad|iPhone|iPod/.test(ua),
    };
};

const getCameraErrorMessage = (err) => {
    const b = getBrowserInfo();
    if (typeof window !== 'undefined' && !window.isSecureContext) {
        return 'متصفحك يحظر الكاميرا لأن الرابط غير آمن بالكامل (HTTP). يرجى فتح الموقع عبر HTTPS.';
    }
    if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        if (b.isSafari || b.isIOS) {
            return 'إذن الكاميرا مرفوض! اذهب إلى إعدادات Safari (Safari Settings) ثم (Camera) واجعلها (Allow).';
        }
        if (b.isFirefox) {
            return 'إذن الكاميرا مرفوض. اضغط على أيقونة الحماية في شريط العنوان ثم اسمح بالوصول إلى الكاميرا، ثم أعد المحاولة.';
        }
        return 'إذن الكاميرا مرفوض. اضغط على أيقونة القفل (🔒) في شريط العنوان ثم اسمح بالوصول إلى الكاميرا، ثم أعد المحاولة.';
    }
    if (err?.name === 'NotFoundError') {
        return 'لم يتم العثور على أي كاميرا مادية في هذا الجهاز.';
    }
    if (err?.name === 'NotReadableError' || err?.name === 'AbortError') {
        return 'الكاميرا قيد الاستخدام من تطبيق آخر. أغلق البرنامج الآخر ثم أعد المحاولة.';
    }
    return `خطأ في الكاميرا: ${err?.message || err?.name || 'مجهول'}`;
};

const QRScanner = ({ onResult, onClose, lastScannedCode, variant = 'modal' }) => {
    const videoRef = useRef(null);
    const codeReaderRef = useRef(null);
    const [error, setError] = useState(null);
    const [started, setStarted] = useState(false);
    const [lastScan, setLastScan] = useState(null);
    const [scanSuccess, setScanSuccess] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    const stopScan = useCallback(() => {
        try {
            if (codeReaderRef.current) {
                codeReaderRef.current.reset();
                codeReaderRef.current = null;
            }
        } catch (e) { }
    }, []);

    const handleScanResult = useCallback((code) => {
        if (isProcessing) return;

        const now = Date.now();
        if (lastScan && (now - lastScan) < SCAN_DEBOUNCE_MS) return;

        if (lastScannedCode && code === lastScannedCode) return;

        setLastScan(now);
        setIsProcessing(true);
        setScanSuccess(true);

        setTimeout(() => {
            setScanSuccess(false);
            setIsProcessing(false);
        }, 300);

        onResult(code);
    }, [onResult, lastScan, isProcessing, lastScannedCode]);

    const startScan = useCallback(async () => {
        // Native path - Capacitor Android/iOS
        if (Capacitor.isNativePlatform()) {
            setError(null);
            setStarted(true);
            try {
                let perm = await checkCameraPermission();
                if (perm !== 'granted') {
                    perm = await requestCameraPermission();
                }
                if (perm !== 'granted') {
                    setError('إذن الكاميرا مرفوض. يرجى السماح بالكاميرا من إعدادات التطبيق.');
                    setStarted(false);
                    return;
                }
                const code = await scanNative();
                if (code) handleScanResult(code);
                else setStarted(false);
            } catch (err) {
                console.error("Native Scanner Error:", err);
                if (err?.message === 'no_barcode') {
                    setError(null);
                    setStarted(false);
                } else {
                    setError(getCameraErrorMessage(err));
                    setStarted(false);
                }
            }
            return;
        }

        // Web path - existing zxing logic (unchanged)
        setError(null);
        setStarted(true);
        stopScan();

        const codeReader = new BrowserMultiFormatReader();
        codeReaderRef.current = codeReader;

        try {
            await codeReader.decodeFromConstraints(
                {
                    video: {
                        facingMode: 'environment',
                        width: { ideal: 1920 },
                        height: { ideal: 1080 }
                    }
                },
                videoRef.current,
                (result) => {
                    if (result) {
                        handleScanResult(result.getText());
                    }
                }
            );
        } catch (err) {
            console.error("Camera Error:", err);
            setError(getCameraErrorMessage(err));
            setStarted(false);
            stopScan();
        }
    }, [handleScanResult, stopScan]);

    useEffect(() => {
        startScan();
        return () => {
            stopScan();
            setError(null);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const isInline = variant === 'inline';

    /* ============ INLINE — fills its parent box (no full-screen overlay) ============ */
    if (isInline) {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="relative w-full h-full"
            >
                {error ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center p-5 bg-black/80">
                        <Camera className="w-12 h-12 text-red-400" />
                        <p className="text-red-400 text-sm leading-6">{error}</p>
                        <button
                            onClick={startScan}
                            className="w-full max-w-[220px] py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-bold text-sm text-white transition-all flex items-center justify-center gap-2"
                        >
                            <RefreshCw className="w-4 h-4" /> إعادة المحاولة
                        </button>
                        {Capacitor.isNativePlatform() && (
                            <button
                                onClick={openAppSettings}
                                className="w-full max-w-[220px] py-2.5 rounded-xl bg-white/10 hover:bg-white/20 font-bold text-sm text-white transition-all"
                            >
                                فتح الإعدادات
                            </button>
                        )}
                        {onClose && (
                            <button
                                onClick={onClose}
                                className="w-full max-w-[220px] py-2.5 rounded-xl bg-white/10 hover:bg-white/20 font-bold text-sm text-white transition-all"
                            >
                                إغلاق
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        <video
                            ref={videoRef}
                            className="w-full h-full object-cover"
                            playsInline
                            muted
                            autoPlay
                        />

                        {onClose && (
                            <button
                                onClick={onClose}
                                className="absolute top-2 left-2 z-20 p-2 rounded-full bg-black/60 hover:bg-red-500/80 text-white transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}

                        <AnimatePresence>
                            {scanSuccess && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="absolute inset-0 bg-emerald-500/30 flex items-center justify-center"
                                >
                                    <div className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg">
                                        <Check className="w-8 h-8 text-white" />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="absolute bottom-2 inset-x-0 flex justify-center pointer-events-none">
                            <span className="text-[11px] font-bold flex items-center gap-1.5 text-white/80 bg-black/40 rounded-full px-3 py-1">
                                <span className={`w-1.5 h-1.5 rounded-full ${started ? 'bg-emerald-400 animate-pulse' : 'bg-yellow-400'}`} />
                                {started ? 'المسح التلقائي نشط' : 'جاري تشغيل الكاميرا...'}
                            </span>
                        </div>
                    </>
                )}
            </motion.div>
        );
    }

    /* ============ MODAL — full-screen overlay ============ */
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[200] bg-black/95 flex flex-col items-center justify-center p-4"
        >
            {/* Header */}
            <div className="w-full max-w-sm mb-4 flex items-center justify-between">
                <button onClick={onClose} className="p-2 rounded-full bg-white/10 hover:bg-red-500/30 transition-colors">
                    <X className="w-5 h-5 text-white" />
                </button>
                <h3 className="text-lg font-bold flex items-center gap-2 text-white">
                    <Scan className="w-5 h-5 text-emerald-400" />
                    امسح الباركود
                </h3>
                <div className="w-9" /> {/* Spacer */}
            </div>

            {error ? (
                <div className="w-full max-w-sm text-center space-y-5 py-8">
                    <Camera className="w-16 h-16 text-red-400 mx-auto" />
                    <p className="text-red-400 leading-7 text-sm">{error}</p>
                    <div className="flex flex-col gap-3">
                        <button
                            onClick={startScan}
                            className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 font-bold transition-all text-white"
                        >
                            إعادة المحاولة
                        </button>
                        {Capacitor.isNativePlatform() && (
                            <button
                                onClick={openAppSettings}
                                className="w-full py-3 rounded-2xl bg-white/10 hover:bg-white/20 font-bold transition-all text-white"
                            >
                                فتح الإعدادات
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="w-full py-3 rounded-2xl bg-white/10 hover:bg-white/20 font-bold transition-all text-white"
                        >
                            إغلاق
                        </button>
                    </div>
                </div>
            ) : (
                <div className="w-full max-w-sm space-y-4">
                    {/* Scanner Viewport - Rectangular 4:3 for better barcode reading */}
                    <div className="relative w-full rounded-3xl overflow-hidden border-2 border-emerald-400/50 bg-black shadow-2xl shadow-emerald-500/20"
                        style={{ aspectRatio: '4/3' }}
                    >
                        <video
                            ref={videoRef}
                            className="w-full h-full object-cover"
                            playsInline
                            muted
                            autoPlay
                        />

                        {/* Scan frame overlay - targeting box */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="absolute inset-0 bg-black/30" />
                            <div className="relative z-10 w-56 h-36 border-2 border-white/80 rounded-xl">
                                <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
                                <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
                                <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
                                <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />
                            </div>
                        </div>

                        {/* Animated scan line - horizontal sweep */}
                        {!isProcessing && started && (
                            <div className="absolute inset-x-0 flex items-center justify-center pointer-events-none" style={{ top: '25%', height: '50%' }}>
                                <motion.div
                                    className="absolute left-4 right-4 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent"
                                    animate={{ y: ['0%', '100%', '0%'] }}
                                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                                    style={{ top: 0 }}
                                />
                            </div>
                        )}

                        {/* Success flash */}
                        <AnimatePresence>
                            {scanSuccess && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="absolute inset-0 bg-emerald-500/30 flex items-center justify-center"
                                >
                                    <div className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg">
                                        <Check className="w-8 h-8 text-white" />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Status */}
                    <div className="flex items-center justify-center gap-3 text-sm">
                        <div className="flex items-center gap-2 text-gray-300">
                            {started ? (
                                <>
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                    وجّه الكاميرا نحو الباركود — يتم المسح تلقائياً
                                </>
                            ) : (
                                <>
                                    <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                                    جاري تشغيل الكاميرا...
                                </>
                            )}
                        </div>
                    </div>

                    {/* Hint pills */}
                    <div className="flex items-center justify-center gap-3 flex-wrap">
                        <span className="flex items-center gap-1 text-xs text-gray-500 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
                            <Zap className="w-3 h-3 text-yellow-400" /> مسح سريع
                        </span>
                        <span className="flex items-center gap-1 text-xs text-gray-500 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
                            <Scan className="w-3 h-3 text-indigo-400" /> QR + باركود
                        </span>
                    </div>
                </div>
            )}
        </motion.div>
    );
};

export default QRScanner;
