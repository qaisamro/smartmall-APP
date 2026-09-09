import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import QRScanner from '../components/QRScanner';
import api from '../api/axios';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, MapPin, Tag, QrCode, ArrowLeft, Loader2, Minus, Plus, CheckCircle2, X, AlertCircle } from 'lucide-react';
import useCartStore from '../store/useCartStore';
import QtyModal from '../components/QtyModal';
import SuccessNotification from '../components/SuccessNotification';

const Scanner = () => {
    const [scanning, setScanning] = useState(true);
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(false);
    const [added, setAdded] = useState(false);
    const [qty, setQty] = useState(1);
    const [showError, setShowError] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [lastErrorCode, setLastErrorCode] = useState(null);
    const [lastErrorTime, setLastErrorTime] = useState(0);
    const [scanFeedback, setScanFeedback] = useState(null);

    const navigate = useNavigate();
    const { addItem, activeMallId, setActiveMall } = useCartStore();
    const [posSyncToken, setPosSyncToken] = useState(null);

    const handleScan = async (decodedText) => {
        if (loading) return;

        // Check for POS Sync Link
        if (decodedText.startsWith('POS_LINK:')) {
            const token = decodedText.split(':')[1];
            setPosSyncToken(token);
            setScanFeedback({
                productName: 'تم الربط بنقطة البيع',
                price: 0,
                quantity: 1
            });
            return;
        }

        // If in POS Sync Mode
        if (posSyncToken) {
            setLoading(true);
            try {
                const res = await api.post(`/pos/sync/${posSyncToken}`, { barcode: decodedText });
                const productName = res.data?.product?.name_ar || 'منتج';
                setScanFeedback({
                    productName: `✅ تم إرسال "${productName}" للـ POS`,
                    price: res.data?.price_at_scan ?? 0,
                    quantity: 1
                });
                setTimeout(() => setScanFeedback(null), 1500);
            } catch (err) {
                const msg = err.response?.data?.message || 'فشل في إرسال الصنف، تأكد من وجود الباركود في هذا المول';
                setErrorMessage(msg);
                setShowError(true);
            } finally {
                setLoading(false);
            }
            return;
        }

        // Debounce: ignore same failed barcode within 5 seconds
        if (decodedText === lastErrorCode && (Date.now() - lastErrorTime) < 5000) {
            return;
        }

        setLoading(true);
        setAdded(false);
        setLastScannedCode(decodedText);
        try {
            const payload = { code: decodedText };
            if (activeMallId) payload.mall_id = activeMallId;

            const response = await api.post('/scan', payload);
            const data = response.data;

            if (data.type === 'mall') {
                setActiveMall(data.mall_id);
                navigate(`/mall/${data.slug}`);
                return;
            }

            if (data.type === 'product') {
                setProduct(data.product);
                setQty(1);
                setScanning(false);
                setModalQty(1);
                setModalOpen(true);
                return;
            }

            if (data.type === 'order') {
                navigate(data.redirect_url);
                return;
            }

            throw new Error('QR code not recognized');
        } catch (error) {
            // Save error code to prevent re-triggering
            setLastErrorCode(decodedText);
            setLastErrorTime(Date.now());
            setErrorMessage('عذراً، هذا المنتج غير معرّف أو غير موجود في قاعدة بيانات المول.');
            setShowError(true);
            // Quick resume scanning on error
            setTimeout(() => {
                setScanning(true);
                setLoading(false);
            }, 300);
            return;
        } finally {
            // Don't set loading false here - it's managed by the product flow
        }
    };

    const quickAddProduct = (productData) => {
        addItem(productData, 1);
        // Show success notification with product details
        setScanFeedback({
            productName: productData.name_ar,
            price: productData.price,
            quantity: 1
        });
        // Clear notification after 2 seconds
        setTimeout(() => {
            setScanFeedback(null);
        }, 2000);
        setProduct(null);
        setScanning(true);
        setLastScannedCode(null); // Clear to allow scanning same product again
    };

    const incrementQty = () => {
        if (!product) return;
        if (product.stock_quantity === undefined || product.hide_stock_from_customer || product.mall?.enable_quantity_system === false) { setQty(q => q + 1); return; }
        if (qty < product.stock_quantity) setQty(q => q + 1);
    };
    const decrementQty = () => { if (qty > 1) setQty(q => q - 1); };

    const handleAddToCart = () => {
        if (!product) return;
        quickAddProduct(product);
    };

    return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center py-8">
            <AnimatePresence mode="wait">
                {scanning && (
                    <motion.div
                        key="scanner"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="w-full max-w-lg space-y-8 relative"
                    >
                        {/* POS Sync Mode Banner */}
                        <AnimatePresence>
                            {posSyncToken && (
                                <motion.div
                                    initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }}
                                    className="absolute -top-12 left-0 right-0 z-50 bg-emerald-600 text-white p-2 rounded-xl shadow-xl flex items-center justify-between border border-emerald-400/30"
                                >
                                    <div className="flex items-center gap-2 px-2">
                                        <div className="w-2 h-2 bg-white rounded-full animate-pulse shadow-[0_0_8px_white]" />
                                        <span className="text-[10px] font-bold">بث مباشر للـ POS: {posSyncToken}</span>
                                    </div>
                                    <button onClick={() => setPosSyncToken(null)} className="bg-white/20 px-2 py-1 rounded-lg text-[9px] font-bold hover:bg-white/30 transition-colors">إلغاء الربط</button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                        {/* Header */}
                        <div className="text-center space-y-4">
                            <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center border border-indigo-500/30">
                                <QrCode className="w-10 h-10 text-indigo-400" />
                            </div>
                            <div>
                                <h2 className="text-2xl sm:text-3xl font-extrabold gradient-text-blue">ماسح المنتجات الذكي</h2>
                                <p className="text-gray-400 mt-2 text-sm">وجّه كاميرا هاتفك نحو الباركود لمعرفة السعر والتفاصيل</p>
                            </div>
                        </div>

                        {/* Scanner Frame */}
                        <div className="rounded-[2.5rem] overflow-hidden glass-card border border-white/10 shadow-2xl p-2 relative">
                            {/* Decorative corners */}
                            <div className="absolute top-6 left-6 w-10 h-10 border-t-4 border-l-4 border-emerald-400 rounded-tl-2xl z-20 pointer-events-none shadow-[0_0_20px_rgba(16,185,129,0.3)]" />
                            <div className="absolute top-6 right-6 w-10 h-10 border-t-4 border-r-4 border-emerald-400 rounded-tr-2xl z-20 pointer-events-none shadow-[0_0_20px_rgba(16,185,129,0.3)]" />
                            <div className="absolute bottom-6 left-6 w-10 h-10 border-b-4 border-l-4 border-emerald-400 rounded-bl-2xl z-20 pointer-events-none shadow-[0_0_20px_rgba(16,185,129,0.3)]" />
                            <div className="absolute bottom-6 right-6 w-10 h-10 border-b-4 border-r-4 border-emerald-400 rounded-br-2xl z-20 pointer-events-none shadow-[0_0_20px_rgba(16,185,129,0.3)]" />

                            {/* Scanner View */}
                            <div className="rounded-[2rem] overflow-hidden relative bg-black/80 aspect-square flex items-center justify-center">
                                {loading ? (
                                    <div className="flex flex-col items-center gap-4 text-emerald-400">
                                        <Loader2 className="w-12 h-12 animate-spin" />
                                        <p className="font-bold animate-pulse">جاري سحب بيانات المنتج...</p>
                                    </div>
                                ) : (
                                    <QRScanner onResult={handleScan} onClose={() => { }} variant="inline" />
                                )}

                                {/* Scan line animation */}
                                {!loading && (
                                    <div className="absolute inset-x-8 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent scan-line opacity-60" />
                                )}
                            </div>
                        </div>

                        {/* Tips */}
                        <div className="flex items-center justify-center gap-6 text-xs text-gray-500">
                            <span className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                المسح تلقائي
                            </span>
                            <span className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                                QR أو باركود
                            </span>
                        </div>
                    </motion.div>
                )}

                {product && (
                    <motion.div
                        key="product"
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -40 }}
                        className="w-full max-w-md glass-card rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl"
                    >
                        {/* Product Image */}
                        <div className="h-64 bg-gradient-to-b from-gray-800 to-gray-900 relative">
                            {(product.image || product.link_photo) ? (
                                <div className="product-image-frame w-full h-full">
                                    <img src={product.image || product.link_photo} alt={product.name_ar} className="product-image" />
                                </div>
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center opacity-30">
                                    <ShoppingCart className="w-24 h-24" />
                                </div>
                            )}

                            {/* Back Button */}
                            <button
                                onClick={() => { setProduct(null); setScanning(true); }}
                                className="absolute top-4 left-4 p-2.5 rounded-xl bg-black/40 backdrop-blur-md text-white hover:bg-black/60 transition-colors border border-white/10"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>

                            {/* Stock Badge - لا يظهر عند تعطيل نظام الكميات أو إخفاء المخزون */}
                            {product.stock_quantity !== undefined && !product.hide_stock_from_customer && product.mall?.enable_quantity_system !== false && (
                                <div className={`absolute top-4 right-4 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 backdrop-blur-md ${product.stock_quantity > 0 ? 'bg-emerald-500/90 text-white' : 'bg-rose-500/90 text-white'}`}>
                                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                    {product.stock_quantity > 0 ? `متوفر: ${product.stock_quantity}` : 'نفدت الكمية'}
                                </div>
                            )}
                        </div>

                        {/* Product Details */}
                        <div className="p-6 sm:p-8 space-y-6 text-right">
                            {/* Name & Price */}
                            <div className="space-y-3">
                                <h2 className="text-2xl font-extrabold leading-tight">{product.name_ar}</h2>
                                {product.description_ar && (
                                    <p className="text-gray-400 text-sm leading-relaxed">{product.description_ar}</p>
                                )}
                                <div className="flex items-center justify-between">
                                    <span className="text-3xl font-extrabold text-emerald-400 flex items-center gap-1">
                                        {(product.price * qty).toFixed(2)} <span className="text-sm text-gray-500 font-medium">₪</span>
                                    </span>
                                    {product.stock_quantity !== undefined && !product.hide_stock_from_customer && product.mall?.enable_quantity_system !== false && (
                                        <span className={`badge ${product.stock_quantity > 0 ? 'badge-emerald' : 'badge-rose'}`}>
                                            {product.stock_quantity > 0 ? `متوفر: ${product.stock_quantity}` : 'غير متوفر'}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Product Info Cards */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-transparent border border-indigo-500/20 space-y-2">
                                    <span className="text-[10px] text-indigo-400 font-bold flex items-center justify-start gap-1.5 uppercase tracking-wider">
                                        موقع المنتج <MapPin className="w-3 h-3" />
                                    </span>
                                    <p className="text-sm font-bold text-gray-200">
                                        {product.shelf_location || product.shelves?.[0]?.name || 'اسأل الموظف'}
                                    </p>
                                </div>
                                <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-500/10 to-transparent border border-purple-500/20 space-y-2">
                                    <span className="text-[10px] text-purple-400 font-bold flex items-center justify-start gap-1.5 uppercase tracking-wider">
                                        القسم <Tag className="w-3 h-3" />
                                    </span>
                                    <p className="text-sm font-bold text-gray-200">
                                        {product.mallSection?.name_ar || product.section?.name_ar || product.category?.name_ar || 'عام'}
                                    </p>
                                </div>
                            </div>

                            {/* Add to Cart */}
                            <button
                                onClick={() => quickAddProduct(product)}
                                disabled={(product.stock_quantity !== undefined && !product.hide_stock_from_customer && product.mall?.enable_quantity_system !== false && product.stock_quantity <= 0) || added}
                                className="py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/30 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {added ? (
                                    <>
                                        <CheckCircle2 className="w-5 h-5" />
                                        ✓ تمت
                                    </>
                                ) : (
                                    <>
                                        <ShoppingCart className="w-5 h-5" />
                                        أضف للسلة
                                    </>
                                )}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Success Notification */}
            <SuccessNotification
                show={!!scanFeedback}
                productName={scanFeedback?.productName}
                quantity={scanFeedback?.quantity || 1}
                price={scanFeedback?.price}
            />

            {/* Error Message Modal */}
            <AnimatePresence>
                {showError && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                        onClick={() => setShowError(false)}
                    >
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                            className="bg-gradient-to-br from-red-500/10 to-orange-500/10 border border-red-500/30 rounded-3xl p-6 max-w-md w-full shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-red-500/20 flex items-center justify-center shrink-0">
                                    <AlertCircle className="w-6 h-6 text-red-400" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-bold text-gray-200 mb-2">تنبيه</h3>
                                    <p className="text-gray-400 text-sm leading-relaxed">{errorMessage}</p>
                                </div>
                                <button
                                    onClick={() => setShowError(false)}
                                    className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors shrink-0"
                                >
                                    <X className="w-4 h-4 text-gray-400" />
                                </button>
                            </div>
                            <button
                                onClick={() => setShowError(false)}
                                className="w-full mt-4 py-3 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 font-bold transition-colors"
                            >
                                إغلاق
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Scanner;
