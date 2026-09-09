import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MapPin, Store, ArrowLeft, Loader2, ScanLine, QrCode, Download, Share2, ShoppingCart, Package, X, AlertCircle, ChevronLeft, ChevronRight, ZoomIn, Tag, CheckCircle2, Milk, Coffee, Candy, Cookie, CookingPot, Snowflake, Beef, Croissant, SprayCan as Spray, Newspaper, Sparkles, Home, Cigarette, Minus, Plus, Zap, Gift, Clock } from 'lucide-react';
import useCartStore from '../store/useCartStore';
import useAuthStore from '../store/useAuthStore';
import { themeToCssVars } from '../utils/theme';
import QRScanner from '../components/QRScanner';
import SuccessNotification from '../components/SuccessNotification';
import OffersSlider from '../components/OffersSlider';
import { optimizeCloudinaryUrl } from '../utils/imageOptimizer';

const SECTION_ICONS = {
  1: { icon: Milk, color: 'from-blue-500/20 to-cyan-500/20', border: 'border-blue-500/20', text: 'text-blue-400', bg: 'bg-blue-500/10' },
  2: { icon: Coffee, color: 'from-amber-600/20 to-orange-500/20', border: 'border-amber-600/20', text: 'text-amber-500', bg: 'bg-amber-600/10' },
  3: { icon: Candy, color: 'from-pink-500/20 to-rose-500/20', border: 'border-pink-500/20', text: 'text-pink-400', bg: 'bg-pink-500/10' },
  4: { icon: Cookie, color: 'from-orange-500/20 to-amber-500/20', border: 'border-orange-500/20', text: 'text-orange-400', bg: 'bg-orange-500/10' },
  5: { icon: Package, color: 'from-amber-500/20 to-yellow-500/20', border: 'border-amber-500/20', text: 'text-amber-400', bg: 'bg-amber-500/10' },
  6: { icon: CookingPot, color: 'from-orange-600/20 to-red-500/20', border: 'border-orange-600/20', text: 'text-orange-500', bg: 'bg-orange-600/10' },
  7: { icon: Snowflake, color: 'from-sky-500/20 to-indigo-500/20', border: 'border-sky-500/20', text: 'text-sky-400', bg: 'bg-sky-500/10' },
  8: { icon: Beef, color: 'from-red-500/20 to-rose-500/20', border: 'border-red-500/20', text: 'text-red-400', bg: 'bg-red-500/10' },
  9: { icon: Croissant, color: 'from-yellow-500/20 to-amber-500/20', border: 'border-yellow-500/20', text: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  10: { icon: Spray, color: 'from-teal-500/20 to-cyan-500/20', border: 'border-teal-500/20', text: 'text-teal-400', bg: 'bg-teal-500/10' },
  11: { icon: Newspaper, color: 'from-slate-500/20 to-stone-500/20', border: 'border-slate-500/20', text: 'text-slate-400', bg: 'bg-slate-500/10' },
  12: { icon: Sparkles, color: 'from-purple-500/20 to-fuchsia-500/20', border: 'border-purple-500/20', text: 'text-purple-400', bg: 'bg-purple-500/10' },
  13: { icon: Home, color: 'from-stone-500/20 to-neutral-500/20', border: 'border-stone-500/20', text: 'text-stone-400', bg: 'bg-stone-500/10' },
  14: { icon: Cigarette, color: 'from-gray-500/20 to-zinc-500/20', border: 'border-gray-500/20', text: 'text-gray-400', bg: 'bg-gray-500/10' },
  15: { icon: Coffee, color: 'from-amber-500/20 to-orange-500/20', border: 'border-amber-500/20', text: 'text-amber-400', bg: 'bg-amber-500/10' },
};

const MallProfile = () => {
    const { slug } = useParams();
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const { setActiveMall, addItem } = useCartStore();
    const [searchQuery, setSearchQuery] = useState('');
    const [showError, setShowError] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [productPage, setProductPage] = useState(1);
    const [selectedSectionId, setSelectedSectionId] = useState(null);
    const [selectedSubSectionId, setSelectedSubSectionId] = useState(null);
    const [sectionSearch, setSectionSearch] = useState('');
    const [sectionPage, setSectionPage] = useState(1);
    const [zoomProduct, setZoomProduct] = useState(null);
    const [detailProduct, setDetailProduct] = useState(null);
    const [offerToast, setOfferToast] = useState(null);
    const [detailAdded, setDetailAdded] = useState(false);
    const [detailQty, setDetailQty] = useState(1);

    const { user, isAuthenticated } = useAuthStore();

    const { data: mall, isLoading } = useQuery({
        queryKey: ['mallBySlug', slug],
        queryFn: async () => {
            const res = await api.get(`/malls/slug/${slug}`);
            return res.data;
        }
    });

    const { data: mallSections, isLoading: sectionsLoading } = useQuery({
        queryKey: ['mall-sections-tree', mall?.id],
        enabled: !!mall?.id,
        queryFn: async () => {
            const res = await api.get(`/malls/${mall.id}/sections`);
            return res.data;
        },
        placeholderData: (prev) => prev,
    });

    const { data: mallOffers } = useQuery({
        queryKey: ['mall-offers', mall?.id],
        enabled: !!mall?.id,
        queryFn: async () => {
            const res = await api.get('/offers', { params: { mall_id: mall.id } });
            return res.data;
        }
    });
    const activeOffers = Array.isArray(mallOffers) ? mallOffers : [];
    const offerMap = useMemo(() => {
        const m = {};
        activeOffers.forEach(o => { if (o.product_id) m[o.product_id] = o; });
        return m;
    }, [activeOffers]);

    const showOfferToast = (msg) => {
        setOfferToast(msg);
        setTimeout(() => setOfferToast(null), 3000);
    };

    const handleOfferAdd = (offer, e) => {
        e?.stopPropagation?.();
        if (!offer) return;
        const tiers = (offer.tiers && Array.isArray(offer.tiers) && offer.tiers.length > 0)
            ? offer.tiers
            : (offer.offer_quantity && offer.offer_price ? [{ quantity: offer.offer_quantity, price: offer.offer_price }] : null);
        const rawPrice = offer.offer_price ?? offer.product?.discount_price ?? offer.product?.price ?? 0;
        const qty = offer.offer_quantity || 1;
        let perUnit, bundleText, offerPrice;
        if (tiers && tiers.length > 0) {
            const cheapest = Math.min(...tiers.map(t => parseFloat(t.price)/t.quantity));
            perUnit = cheapest;
            offerPrice = cheapest;
            bundleText = tiers.map(t => `${t.quantity} بـ ${t.price} ₪`).join('، ');
        } else {
            perUnit = qty > 1 ? (parseFloat(rawPrice) / qty) : parseFloat(rawPrice);
            offerPrice = perUnit;
            bundleText = qty > 1 ? `${qty} حبات بـ ${rawPrice} ₪ (${perUnit.toFixed(2)} ₪ للحبة)` : `${offerPrice} ₪`;
        }
        const details = [
            offer.title_ar ? `عرض: ${offer.title_ar}` : '',
            offer.description_ar ? offer.description_ar : '',
            tiers ? `شرائح العرض: ${bundleText}${offer.product?.price ? ` (الأصلي ${offer.product.price} ₪)` : ''}` : `سعر العرض: ${bundleText}${offer.product?.price ? ` (بدل ${offer.product.price} ₪)` : ''}`,
        ].filter(Boolean).join(' — ');
        const base = offer.product
            ? { ...offer.product }
            : { id: `offer-${offer.id}`, name_ar: offer.title_ar, name_en: offer.title_en, image: offer.image };
        addItem({
            ...base,
            price: offerPrice,
            original_price: offer.product?.price,
            mall_id: offer.mall_id,
            tiers: tiers,
            offer_quantity: qty,
            offer_bundle_price: rawPrice,
            notes: details,
        }, 1);
        showOfferToast(`تمت إضافة ${offer.product?.name_ar || offer.title_ar} إلى السلة مع تفاصيل العرض`);
    };

    const { data: mallProducts, isLoading: productsLoading } = useQuery({
        queryKey: ['mall-products-list', mall?.id, searchQuery, productPage],
        enabled: !!mall?.id && searchQuery.length > 0,
        queryFn: async () => {
            const params = { page: productPage, search: searchQuery };
            const res = await api.get(`/malls/${mall.id}/products`, { params });
            return res.data;
        },
        placeholderData: (prev) => prev,
    });

    const { data: sectionProducts, isLoading: sectionProductsLoading } = useQuery({
        queryKey: ['section-products', mall?.id, selectedSectionId, selectedSubSectionId, sectionSearch, sectionPage],
        enabled: !!mall?.id && selectedSectionId !== null,
        queryFn: async () => {
            const params = {
                group_by_section: true,
                mall_section_id: selectedSubSectionId || selectedSectionId,
                page: sectionPage,
            };
            if (sectionSearch) params.search = sectionSearch;
            const res = await api.get(`/malls/${mall.id}/products`, { params });
            return res.data;
        },
        placeholderData: (prev) => prev,
    });

    const allMainSections = useMemo(() => {
        const arr = mallSections?.sections || [];
        return [...arr];
    }, [mallSections]);

    const noSectionCount = mallSections?.no_section_count || 0;

    const currentMainSection = selectedSectionId && selectedSectionId !== -1
        ? allMainSections.find(s => s.id === selectedSectionId) || null
        : null;

    const currentSubSection = currentMainSection
        ? (currentMainSection.children || []).find(c => c.id === selectedSubSectionId) || null
        : null;

    const allProducts = searchQuery ? (Array.isArray(mallProducts) ? mallProducts : mallProducts?.data || []) : [];
    const productPagination = !Array.isArray(mallProducts) ? mallProducts : null;

    const sectionPagination = sectionProducts && !Array.isArray(sectionProducts) ? sectionProducts : null;
    const sectionProductsList = sectionProducts ? (Array.isArray(sectionProducts) ? sectionProducts : sectionProducts?.data || []) : [];

    const isOwnerOrAdmin = isAuthenticated && (user?.roles?.[0]?.name === 'super-admin' || user?.roles?.[0]?.name === 'admin' || user?.mall_id === mall?.id);

    const handleStartShopping = () => {
        if (mall) {
            setActiveMall(mall.id);
            navigate('/scanner');
        }
    };

    const [qrScannerOpen, setQrScannerOpen] = useState(false);
    const [scanningProduct, setScanningProduct] = useState(false);
    const [scanFeedback, setScanFeedback] = useState(null);

    const handleAddSearchProduct = (product) => {
        setActiveMall(mall.id);
        addItem(product, 1);
        setScanFeedback({ productName: product.name_ar, price: product.price, quantity: 1 });
        setTimeout(() => setScanFeedback(null), 2500);
    };

    const openZoom = (e, product) => {
        e.stopPropagation();
        setZoomProduct(product);
    };

    const handleQrScan = async (decodedText) => {
        if (!mall?.id) return;
        setScanningProduct(true);
        setQrScannerOpen(false);

        try {
            const response = await api.post('/scan', { code: decodedText, mall_id: mall.id });
            const data = response.data;

            if (data.type === 'product') {
                const product = data.product;
                setDetailProduct(product);
                setDetailAdded(false);
                setDetailQty(1);
                // إذا كان المنتج الممسوح عليه عرض نشط، نبّه المستخدم
                const scannedOffer = activeOffers.find(o => o.product_id === product.id);
                if (scannedOffer) {
                    const offerPrice = scannedOffer.offer_price ?? product.discount_price ?? product.price;
                    setTimeout(() => showOfferToast(`هذا المنتج عليه عرض: ${scannedOffer.title_ar} — ${offerPrice} ₪ (بدل ${product.price} ₪) — موجود في قسم العروض`), 450);
                }
            } else {
                // Show beautiful error message
                setErrorMessage('هذا الرمز ليس لمنتج في هذا المول');
                setShowError(true);
            }
        } catch (error) {
            console.error('QR Scan Error:', error);
            // Show beautiful error message
            setErrorMessage('عذراً، هذا المنتج غير معّرف أو غير موجود في قاعدة بيانات المول.');
            setShowError(true);
        } finally {
            setScanningProduct(false);
        }
    };

    const handleQuickAdd = (product, qty = 1) => {
        setActiveMall(mall.id);
        addItem(product, qty);
        setScanFeedback({ productName: product.name_ar, price: product.price, quantity: qty });
        setTimeout(() => setScanFeedback(null), 2500);
    };

    // Open product detail modal when arriving with ?product=ID (global header search)
    useEffect(() => {
        const productId = searchParams.get('product');
        if (productId) {
            api.get(`/products/${productId}`)
                .then((res) => { setDetailProduct(res.data); setDetailAdded(false); })
                .catch(() => { })
                .finally(() => {
                    const next = new URLSearchParams(searchParams);
                    next.delete('product');
                    setSearchParams(next, { replace: true });
                });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams]);

    if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-indigo-400" /></div>;

    if (!mall) return <div className="text-center py-20 text-red-400 font-bold">هذا المول غير متوفر أو الرابط غير صحيح.</div>;

    const coverImageUrl = mall.cover_image
        ? (/^https?:\/\//.test(mall.cover_image) || mall.cover_image.startsWith('/') ? mall.cover_image : `/storage/${mall.cover_image}`)
        : 'https://images.unsplash.com/photo-1519567281799-9742bd6850c8?q=80&w=2070';

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mall-theme-scope pb-16 w-full space-y-6 p-4 sm:p-6 lg:p-8" style={themeToCssVars(mall.theme)}>

            {/* Offer added toast */}
            <AnimatePresence>
                {offerToast && (
                    <motion.div
                        initial={{ opacity: 0, y: -30 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -30 }}
                        className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] bg-emerald-600 text-white px-6 py-3.5 rounded-2xl shadow-2xl shadow-emerald-600/30 text-sm font-bold flex items-center gap-2.5 whitespace-nowrap"
                    >
                        <CheckCircle2 className="w-5 h-5 shrink-0" />
                        {offerToast}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Cover & Profile */}
            <div className="relative h-48 sm:h-64 lg:h-80 rounded-2xl lg:rounded-3xl overflow-hidden shadow-2xl">
                <img src={coverImageUrl} alt="Mall Cover" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900/95 via-gray-900/50 to-transparent" />
                <button onClick={() => navigate('/malls')} className="absolute top-4 right-4 p-2.5 rounded-xl bg-white/10 backdrop-blur-md text-white hover:bg-white/20 transition-all border border-white/8">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="absolute bottom-4 sm:bottom-6 right-4 sm:right-6 left-4 sm:left-6 flex items-end gap-3 sm:gap-4">
                    <div className="w-16 h-16 sm:w-24 sm:h-24 lg:w-28 lg:h-28 rounded-xl sm:rounded-2xl bg-white p-1 shrink-0 shadow-2xl border border-white/10">
                        <img src="/mall.webp" alt="Mall Logo" className="w-full h-full object-cover rounded-lg sm:rounded-xl" />
                    </div>
                    <div className="flex-1 pb-0 sm:pb-1">
                        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white">{mall.name_ar}</h1>
                        <p className="text-gray-300 font-medium flex items-center gap-1.5 mt-1 sm:mt-2 text-xs sm:text-sm"><MapPin className="w-3 h-3 sm:w-4 sm:h-4 text-indigo-400" /> {mall.location_arabic || 'الموقع غير محدد'}</p>
                    </div>
                </div>
            </div>

            {/* Disabled Mall Notice */}
            {mall.is_active === false && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 sm:p-5 flex items-center gap-3 sm:gap-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
                        <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400" />
                    </div>
                    <div>
                        <p className="text-amber-300 font-bold text-sm sm:text-base">هذا المتجر معلق مؤقتاً</p>
                        <p className="text-amber-400/70 text-xs sm:text-sm mt-0.5">يمكنك تصفح المنتجات، لكن لا يمكن إجراء طلبات جديدة حالياً. يرجى متابعةنا للتحديثات.</p>
                    </div>
                </div>
            )}

            {/* Products Section */}
            <div className="theme-card rounded-xl lg:rounded-2xl p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 border border-white/8 relative z-10 -mt-6 sm:-mt-8 shadow-2xl">
                {/* Search + Actions Bar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
                    <div className="relative flex-1">
                        <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-gray-500" />
                        </div>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); setProductPage(1); setSelectedSectionId(null); setSelectedSubSectionId(null); setSectionSearch(''); }}
                            className="input-field pl-4 pr-12 py-3 sm:py-4 w-full"
                            style={{ color: 'var(--text-color)', borderRadius: 'var(--theme-radius)' }}
                            placeholder="ابحث عن منتج داخل هذا المول..."
                        />
                        {searchQuery && (
                            <button onClick={() => { setSearchQuery(''); setProductPage(1); }} className="absolute inset-y-0 left-3 flex items-center text-gray-500 hover:text-white transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                    <button
                        onClick={() => setQrScannerOpen(true)}
                        className="flex items-center justify-center gap-2 px-5 py-3 sm:py-4 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all font-bold text-sm border border-emerald-500/20 shrink-0"
                    >
                        <ScanLine className="w-5 h-5" />
                        <span className="hidden sm:inline">مسح QR</span>
                    </button>
                </div>

{/* Products Grid */}
                {searchQuery ? (
                    /* ===== GLOBAL SEARCH RESULTS (whole mall) ===== */
                    productsLoading ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 lg:gap-5">
                            {[...Array(10)].map((_, i) => (
                                <div key={i} className="h-48 sm:h-56 rounded-xl sm:rounded-2xl bg-white/5 shimmer" />
                            ))}
                        </div>
                    ) : allProducts.length === 0 ? (
                        <div className="text-center py-12 sm:py-16 text-gray-400">
                            <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                            <p className="font-bold text-lg">لا توجد نتائج للبحث</p>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 lg:gap-5">
                                {allProducts.map((product) => {
                                    const offer = offerMap[product.id];
                                    const hasOffer = !!offer;
                                    const rawOffer = offer?.offer_price;
                                    const qtyOffer = offer?.offer_quantity || 1;
                                    const offerPrice = offer ? (rawOffer ? (parseFloat(rawOffer)/qtyOffer) : (product.discount_price ?? product.price)) : null;
                                    return (
                                    <div key={product.id} className="theme-card rounded-xl sm:rounded-2xl overflow-hidden card-hover flex flex-col h-full border border-white/8 relative">
                                        {hasOffer && (
                                            <div className="absolute top-2 right-2 z-10 flex flex-col gap-1 items-end">
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gradient-to-l from-amber-500 to-rose-500 text-white text-[9px] font-bold shadow-lg shadow-amber-500/20">
                                                    <Zap className="w-3 h-3" /> عرض
                                                </span>
                                            </div>
                                        )}
                                        <div className="aspect-square bg-gradient-to-br from-gray-700/30 to-gray-800/30 flex items-center justify-center relative border-b border-white/5">
                                            {(product.image || product.link_photo) ? (
                                                <div className="product-image-frame w-full h-full relative cursor-zoom-in" onClick={(e) => openZoom(e, product)}>
                                                    <img src={optimizeCloudinaryUrl(product.image || product.link_photo)} alt={product.name_ar} loading="lazy" decoding="async" className="product-image" />
                                                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity">
                                                        <ZoomIn className="w-8 h-8 text-white drop-shadow-lg" />
                                                    </div>
                                                </div>
                                            ) : (
                                                <Package className="w-10 h-10 text-gray-600" />
                                            )}
                                        </div>
                                        <div className="p-2 sm:p-3 flex-1 flex flex-col justify-between text-right gap-2">
                                            <h4 className="font-bold text-xs sm:text-sm line-clamp-2">{product.name_ar}</h4>
                                            <div>
                                                {hasOffer ? (
                                                    <div className="mb-2 space-y-1">
                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                            <span className="text-sm sm:text-base font-extrabold text-emerald-400">{typeof offerPrice === 'number' ? offerPrice.toFixed(2) : Number(offerPrice).toFixed(2)} ₪</span>
                                                            <span className="text-xs line-through text-gray-500">{product.price} ₪</span>
                                                            {qtyOffer > 1 && <span className="text-[10px] text-amber-400 font-bold">({qtyOffer} بـ {rawOffer} ₪)</span>}
                                                        </div>
                                                        <span className="text-[10px] font-bold text-amber-400 flex items-center gap-1">
                                                            <Sparkles className="w-3 h-3" /> هذا المنتج عليه عرض — موجود في قسم العروض
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <div className="text-sm sm:text-base font-extrabold theme-accent-text mb-2">{product.price} ₪</div>
                                                )}
                                                <button disabled={mall.is_active === false} onClick={(e) => { e.stopPropagation(); hasOffer ? handleOfferAdd(offer, e) || handleQuickAdd({ ...product, price: offerPrice }, 1) : handleQuickAdd(product); }} className={`w-full py-2 rounded-xl border transition-all text-xs font-bold flex items-center justify-center gap-1.5 ${mall.is_active === false ? 'bg-gray-500/10 text-gray-500 border-gray-500/20 cursor-not-allowed' : hasOffer ? 'bg-gradient-to-l from-amber-500 to-rose-500 text-white border-amber-500/20 hover:from-amber-600 hover:to-rose-600 shadow-lg shadow-amber-500/10' : 'bg-indigo-500/15 text-indigo-400 hover:bg-indigo-500/25 border-indigo-500/20'}`}>
                                                    <ShoppingCart className="w-3.5 h-3.5" />
                                                    {mall.is_active === false ? 'معطل مؤقتاً' : hasOffer ? 'أضف بسعر العرض' : 'أضف للسلة'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );})}
                            </div>

                            {/* Pagination */}
                            {productPagination?.last_page > 1 && (
                                <div className="flex items-center justify-center gap-1 sm:gap-1.5 pt-4 sm:pt-6">
                                    <button onClick={() => setProductPage(p => Math.max(1, p - 1))} disabled={productPage === 1}
                                        className="p-2 sm:p-2.5 rounded-xl bg-white/5 disabled:opacity-30 hover:bg-white/10 transition-all disabled:cursor-not-allowed">
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                    <div className="flex items-center gap-1 sm:gap-1.5 max-w-[60vw] overflow-x-auto px-1 py-0.5 scrollbar-thin">
                                        {(() => {
                                            const last = productPagination.last_page;
                                            const current = productPage;
                                            const pages = [];
                                            const addPage = (p) => pages.push(p);
                                            const addDots = () => { if (pages[pages.length - 1] !== '...') pages.push('...'); };

                                            addPage(1);
                                            if (current > 3) addDots();
                                            for (let i = Math.max(2, current - 1); i <= Math.min(last - 1, current + 1); i++) {
                                                addPage(i);
                                            }
                                            if (current < last - 2) addDots();
                                            if (last > 1) addPage(last);

                                            return pages.map((p, i) =>
                                                p === '...' ? (
                                                    <span key={`dots-${i}`} className="px-1 text-gray-500 text-xs select-none">•••</span>
                                                ) : (
                                                    <button key={p} onClick={() => setProductPage(p)}
                                                        className={`min-w-[32px] sm:min-w-[40px] h-8 sm:h-10 px-1.5 sm:px-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold transition-all ${current === p ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30' : 'bg-white/5 hover:bg-white/10 text-gray-400'}`}>
                                                        {p}
                                                    </button>
                                                )
                                            );
                                        })()}
                                    </div>
                                    <button onClick={() => setProductPage(p => Math.min(productPagination.last_page, p + 1))} disabled={productPage === productPagination.last_page}
                                        className="p-2 sm:p-2.5 rounded-xl bg-white/5 disabled:opacity-30 hover:bg-white/10 transition-all disabled:cursor-not-allowed">
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </>
                    )
                ) : selectedSectionId === null ? (
                    /* ===== SECTIONS GRID VIEW ===== */
                    sectionsLoading ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                            {[...Array(8)].map((_, i) => (
                                <div key={i} className="h-48 sm:h-56 rounded-xl sm:rounded-2xl bg-white/5 shimmer" />
                            ))}
                        </div>
                    ) : (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                            <div className="text-center sm:text-right">
                                <h2 className="text-2xl sm:text-3xl font-extrabold">أسعار المول</h2>
                                <p className="text-gray-500 text-sm mt-1">اختر قسماً لتصفح منتجاته</p>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                                {allMainSections.map((sec, gi) => {
                                    const si = SECTION_ICONS[sec.section_id] || {};
                                    const IconComp = si.icon || Package;
                                    const count = sec.product_count || 0;
                                    const children = sec.children || [];
                                    return (
                                        <motion.button
                                            key={sec.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: gi * 0.04 }}
                                            onClick={() => { setSelectedSectionId(sec.id); setSelectedSubSectionId(null); setSectionSearch(''); setSectionPage(1); }}
                                            className={`group relative rounded-2xl overflow-hidden text-right border border-white/[0.06] hover:border-white/[0.15] transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/30 aspect-[4/5] lg:aspect-[4/3] ${count === 0 ? 'opacity-60 hover:opacity-100' : ''}`}
                                        >
                                            {/* Background Image */}
                                            <div className="absolute inset-0">
                                                {sec.bg_image ? (
                                                    <img src={sec.bg_image} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                                ) : (
                                                    <div className={`w-full h-full bg-gradient-to-br ${si.color || 'from-gray-800 to-gray-900'}`} />
                                                )}
                                                <div className="absolute inset-0 bg-gradient-to-t from-gray-900/95 via-gray-900/50 to-gray-900/20" />
                                            </div>
                                            {/* Content */}
                                            <div className="relative z-10 p-3 sm:p-5 flex flex-col justify-start lg:justify-end h-full min-w-0">
                                                <div className={`w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl ${si.bg || 'bg-white/10'} flex items-center justify-center mb-1.5 sm:mb-2 border ${si.border || 'border-white/10'} backdrop-blur-sm shrink-0`}>
                                                    <IconComp className={`w-4 h-4 sm:w-6 sm:h-6 ${si.text || 'text-gray-300'}`} />
                                                </div>
                                                <h3 className="text-[13px] sm:text-lg font-extrabold text-white leading-snug line-clamp-2 break-words">{sec.name_ar}</h3>
                                                {children.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 mt-1.5">
                                                        {children.slice(0, 4).map(c => (
                                                            <span key={c.id} className="text-[9px] sm:text-[11px] px-1.5 py-0.5 rounded-lg bg-white/10 text-gray-200 backdrop-blur-sm border border-white/10">
                                                                {c.name_ar}
                                                            </span>
                                                        ))}
                                                        {children.length > 4 && (
                                                            <span className="text-[9px] sm:text-[11px] px-1.5 py-0.5 rounded-lg bg-white/10 text-gray-200">+{children.length - 4}</span>
                                                        )}
                                                    </div>
                                                )}
                                                <p className="text-[11px] sm:text-sm text-gray-300 opacity-80 mt-1 sm:mt-1.5">{count} منتج{count !== 1 ? 'ات' : ''}</p>
                                            </div>
                                        </motion.button>
                                    );
                                })}
                                {noSectionCount > 0 && (
                                    <motion.button
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: allMainSections.length * 0.04 }}
                                        onClick={() => { setSelectedSectionId(-1); setSelectedSubSectionId(null); setSectionSearch(''); setSectionPage(1); }}
                                        className="group relative rounded-2xl overflow-hidden text-right border border-white/[0.06] hover:border-white/[0.15] transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/30 aspect-[4/5] lg:aspect-[4/3]"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900">
                                            <div className="absolute inset-0 bg-gradient-to-t from-gray-900/95 via-gray-900/50 to-gray-900/20" />
                                        </div>
                                        <div className="relative z-10 p-3 sm:p-5 flex flex-col justify-start lg:justify-end h-full min-w-0">
                                            <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-white/10 flex items-center justify-center mb-1.5 sm:mb-2 border border-white/10 backdrop-blur-sm shrink-0">
                                                <Package className="w-4 h-4 sm:w-6 sm:h-6 text-gray-300" />
                                            </div>
                                            <h3 className="text-[13px] sm:text-lg font-extrabold text-white leading-snug line-clamp-2 break-words">منتجات أخرى</h3>
                                            <p className="text-[11px] sm:text-sm text-gray-300 opacity-80 mt-1 sm:mt-1.5">{noSectionCount} منتج{noSectionCount !== 1 ? 'ات' : ''}</p>
                                        </div>
                                    </motion.button>
                                )}
                            </div>
                        </motion.div>
                    )
                ) : (
                    /* ===== SINGLE SECTION PRODUCTS VIEW ===== */
                    <motion.div key={selectedSectionId} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
                        {/* Back + Section Header Banner */}
                        {(() => {
                            const isNoSec = selectedSectionId === -1;
                            const sec = isNoSec ? null : currentMainSection;
                            const sub = currentSubSection;
                            const si = sec ? (SECTION_ICONS[sec.section_id] || {}) : {};
                            const IconComp = si.icon || Package;
                            const totalCount = sectionPagination?.total ?? sectionProductsList.length;
                            return (
                                <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden" style={{ minHeight: '160px' }}>
                                    {!isNoSec && sec?.bg_image ? (
                                        <img src={sec.bg_image} alt="" className="absolute inset-0 w-full h-full object-cover" />
                                    ) : (
                                        <div className={`absolute inset-0 bg-gradient-to-br ${si.color || 'from-gray-800 to-gray-900'}`} />
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900/95 via-gray-900/60 to-gray-900/30" />
                                    <div className="relative z-10 p-4 sm:p-6 flex items-center gap-3 flex-wrap">
                                        <button
                                            onClick={() => { setSelectedSectionId(null); setSelectedSubSectionId(null); setSectionSearch(''); setSectionPage(1); }}
                                            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-white/10 backdrop-blur-md hover:bg-white/20 border border-white/15 transition-all text-sm font-bold shrink-0"
                                        >
                                            <ChevronRight className="w-4 h-4" />
                                            جميع الأقسام
                                        </button>
                                        <div className="flex items-center gap-3">
                                            <div className={`w-12 h-12 rounded-2xl ${isNoSec ? 'bg-white/10' : si.bg || 'bg-white/10'} flex items-center justify-center shrink-0 border ${isNoSec ? 'border-white/10' : si.border || 'border-white/10'} backdrop-blur-sm`}>
                                                {isNoSec ? <Package className="w-6 h-6 text-gray-300" /> : <IconComp className={`w-6 h-6 ${si.text || 'text-gray-300'}`} />}
                                            </div>
                                            <div>
                                                <h2 className="text-xl sm:text-2xl font-extrabold text-white">
                                                    {isNoSec ? 'منتجات أخرى' : sub ? `${sec?.name_ar} › ${sub.name_ar}` : sec?.name_ar}
                                                </h2>
                                                <p className="text-xs text-gray-300 opacity-80">{totalCount} منتج{totalCount !== 1 ? 'ات' : ''}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Sub-section chips */}
                        {currentMainSection && currentMainSection.children?.length > 0 && (
                            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                                <button
                                    onClick={() => { setSelectedSubSectionId(null); setSectionSearch(''); setSectionPage(1); }}
                                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border transition-all shrink-0 text-xs font-bold whitespace-nowrap ${selectedSubSectionId === null ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30' : 'bg-white/5 hover:bg-white/10 text-gray-300 border-white/5 hover:border-white/15'}`}
                                >
                                    كل {currentMainSection.name_ar}
                                </button>
                                {currentMainSection.children.map(sub => (
                                    <button
                                        key={sub.id}
                                        onClick={() => { setSelectedSubSectionId(sub.id); setSectionSearch(''); setSectionPage(1); }}
                                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border transition-all shrink-0 text-xs font-bold whitespace-nowrap ${selectedSubSectionId === sub.id ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30' : 'bg-white/5 hover:bg-white/10 text-gray-300 border-white/5 hover:border-white/15'}`}
                                    >
                                        {sub.name_ar}
                                        {sub.product_count > 0 && (
                                            <span className="text-[10px] opacity-70">({sub.product_count})</span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Quick Nav pills for other sections */}
                        {allMainSections.length > 0 && (
                            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                                {allMainSections.filter(s => s.id !== selectedSectionId).map(sec => {
                                    const si = SECTION_ICONS[sec.section_id] || {};
                                    const IconComp = si.icon || Package;
                                    return (
                                        <button
                                            key={sec.id}
                                            onClick={() => { setSelectedSectionId(sec.id); setSelectedSubSectionId(null); setSectionSearch(''); setSectionPage(1); }}
                                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/15 transition-all shrink-0 text-xs font-bold whitespace-nowrap"
                                        >
                                            <div className={`w-5 h-5 rounded-lg ${si.bg || 'bg-white/5'} flex items-center justify-center`}>
                                                <IconComp className={`w-3 h-3 ${si.text || 'text-gray-400'}`} />
                                            </div>
                                            {sec.name_ar}
                                        </button>
                                    );
                                })}
                                {noSectionCount > 0 && selectedSectionId !== -1 && (
                                    <button
                                        onClick={() => { setSelectedSectionId(-1); setSelectedSubSectionId(null); setSectionSearch(''); setSectionPage(1); }}
                                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/15 transition-all shrink-0 text-xs font-bold whitespace-nowrap"
                                    >
                                        <div className="w-5 h-5 rounded-lg bg-white/5 flex items-center justify-center">
                                            <Package className="w-3 h-3 text-gray-400" />
                                        </div>
                                        منتجات أخرى
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Search within this section */}
                        <div className="relative">
                            <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                                <Search className="h-4 w-4 text-gray-500" />
                            </div>
                            <input
                                type="text"
                                value={sectionSearch}
                                onChange={(e) => { setSectionSearch(e.target.value); setSectionPage(1); }}
                                className="input-field pl-4 pr-11 py-3 w-full"
                                style={{ color: 'var(--text-color)', borderRadius: 'var(--theme-radius)' }}
                                placeholder="ابحث داخل هذا القسم..."
                            />
                            {sectionSearch && (
                                <button onClick={() => { setSectionSearch(''); setSectionPage(1); }} className="absolute inset-y-0 left-3 flex items-center text-gray-500 hover:text-white transition-colors">
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>

                        {/* Section Products Grid */}
                        {sectionProductsLoading ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 lg:gap-5">
                                {[...Array(10)].map((_, i) => (
                                    <div key={i} className="h-48 sm:h-56 rounded-xl sm:rounded-2xl bg-white/5 shimmer" />
                                ))}
                            </div>
                        ) : sectionProductsList.length === 0 ? (
                            <div className="text-center py-16 text-gray-500">
                                <Package className="w-16 h-16 mx-auto mb-4 opacity-20" />
                                <p className="font-bold text-lg">{sectionSearch ? 'لا توجد نتائج للبحث داخل هذا القسم' : 'لا توجد منتجات في هذا القسم'}</p>
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 lg:gap-5">
                                    {sectionProductsList.map((product, pi) => {
                                        const isNoSec = selectedSectionId === -1;
                                        const sec = isNoSec ? null : currentMainSection;
                                        const si = sec ? (SECTION_ICONS[sec.section_id] || {}) : {};
                                        const IconComp = si.icon || Package;
                                        const offer = offerMap[product.id];
                                        const hasOffer = !!offer;
                                        const rawOfferSec = offer?.offer_price;
                                        const qtyOfferSec = offer?.offer_quantity || 1;
                                        const offerPrice = hasOffer ? (rawOfferSec ? (parseFloat(rawOfferSec)/qtyOfferSec) : (product.discount_price ?? product.price)) : null;
                                        return (
                                            <motion.div
                                                key={product.id}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ duration: 0.25, delay: pi * 0.03 }}
                                                className="group relative rounded-2xl overflow-hidden bg-gradient-to-b from-white/[0.07] to-white/[0.02] border border-white/[0.06] hover:border-white/[0.15] transition-all duration-300 hover:shadow-2xl hover:shadow-black/30 hover:-translate-y-1 flex flex-col"
                                            >
                                                {hasOffer && (
                                                    <div className="absolute top-2 left-2 z-10">
                                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gradient-to-l from-amber-500 to-rose-500 text-white text-[9px] font-bold shadow-lg shadow-amber-500/20">
                                                            <Zap className="w-3 h-3" /> عرض
                                                        </span>
                                                    </div>
                                                )}
                                                <div className="aspect-square relative overflow-hidden bg-gradient-to-br from-gray-800/40 to-gray-900/40">
                                                    {(product.image || product.link_photo) ? (
                                                        <div className="w-full h-full relative group/img cursor-zoom-in" onClick={(e) => openZoom(e, product)}>
                                                            <img src={optimizeCloudinaryUrl(product.image || product.link_photo)} alt={product.name_ar} loading="lazy" decoding="async" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                                            <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover/img:opacity-100 transition-opacity">
                                                                <ZoomIn className="w-8 h-8 text-white drop-shadow-lg" />
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center">
                                                            <div className={`w-16 h-16 rounded-2xl ${si.bg || 'bg-white/5'} flex items-center justify-center`}>
                                                                <IconComp className={`w-8 h-8 ${si.text || 'text-gray-600'}`} />
                                                            </div>
                                                        </div>
                                                    )}
                                                    {!isNoSec && sec && !hasOffer && (
                                                        <div className="absolute top-2 right-2">
                                                            <span className={`text-[10px] px-2 py-1 rounded-lg ${si.bg || 'bg-white/10'} ${si.text || 'text-gray-400'} backdrop-blur-sm border ${si.border || 'border-white/5'}`}>
                                                                {sec.name_ar}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="p-3 sm:p-3.5 flex-1 flex flex-col justify-between text-right gap-2">
                                                    <h4 className="font-bold text-xs sm:text-sm line-clamp-2 leading-tight">{product.name_ar}</h4>
                                                    <div>
                                                        {hasOffer ? (
                                                            <div className="mb-2 space-y-1">
                                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                                    <span className="text-sm sm:text-base font-extrabold text-emerald-400">{typeof offerPrice === 'number' ? offerPrice.toFixed(2) : Number(offerPrice).toFixed(2)} ₪</span>
                                                                    <span className="text-xs line-through text-gray-500">{product.price} ₪</span>
                                                                    {qtyOfferSec > 1 && <span className="text-[10px] text-amber-400 font-bold">({qtyOfferSec} بـ {rawOfferSec} ₪)</span>}
                                                                </div>
                                                                <span className="text-[10px] font-bold text-amber-400 flex items-center gap-1">
                                                                    <Sparkles className="w-3 h-3" /> عليه عرض — في قسم العروض
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <div className="text-sm sm:text-base font-extrabold theme-accent-text mb-2">{product.price} ₪</div>
                                                        )}
                                                        <button disabled={mall.is_active === false} onClick={(e) => { e.stopPropagation(); hasOffer ? handleOfferAdd(offer, e) : handleQuickAdd(product); }} className={`w-full py-2 rounded-xl border transition-all text-xs font-bold flex items-center justify-center gap-1.5 ${mall.is_active === false ? 'bg-gray-500/10 text-gray-500 border-gray-500/20 cursor-not-allowed' : hasOffer ? 'bg-gradient-to-l from-amber-500 to-rose-500 text-white border-amber-500/20 hover:from-amber-600 hover:to-rose-600 shadow-lg shadow-amber-500/10' : 'bg-indigo-500/15 text-indigo-400 hover:bg-indigo-500/25 border-indigo-500/20'}`}>
                                                            <ShoppingCart className="w-3.5 h-3.5" />
                                                            {mall.is_active === false ? 'معطل مؤقتاً' : hasOffer ? 'أضف بسعر العرض' : 'أضف للسلة'}
                                                        </button>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>

                                {/* Section Pagination */}
                                {sectionPagination?.last_page > 1 && (
                                    <div className="flex items-center justify-center gap-1 sm:gap-1.5 pt-4 sm:pt-6">
                                        <button onClick={() => setSectionPage(p => Math.max(1, p - 1))} disabled={sectionPage === 1}
                                            className="p-2 sm:p-2.5 rounded-xl bg-white/5 disabled:opacity-30 hover:bg-white/10 transition-all disabled:cursor-not-allowed">
                                            <ChevronRight className="w-4 h-4" />
                                        </button>
                                        <div className="flex items-center gap-1 sm:gap-1.5 max-w-[60vw] overflow-x-auto px-1 py-0.5 scrollbar-thin">
                                            {(() => {
                                                const last = sectionPagination.last_page;
                                                const current = sectionPage;
                                                const pages = [];
                                                const addPage = (p) => pages.push(p);
                                                const addDots = () => { if (pages[pages.length - 1] !== '...') pages.push('...'); };

                                                addPage(1);
                                                if (current > 3) addDots();
                                                for (let i = Math.max(2, current - 1); i <= Math.min(last - 1, current + 1); i++) {
                                                    addPage(i);
                                                }
                                                if (current < last - 2) addDots();
                                                if (last > 1) addPage(last);

                                                return pages.map((p, i) =>
                                                    p === '...' ? (
                                                        <span key={`dots-${i}`} className="px-1 text-gray-500 text-xs select-none">•••</span>
                                                    ) : (
                                                        <button key={p} onClick={() => setSectionPage(p)}
                                                            className={`min-w-[32px] sm:min-w-[40px] h-8 sm:h-10 px-1.5 sm:px-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold transition-all ${current === p ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30' : 'bg-white/5 hover:bg-white/10 text-gray-400'}`}>
                                                            {p}
                                                        </button>
                                                    )
                                                );
                                            })()}
                                        </div>
                                        <button onClick={() => setSectionPage(p => Math.min(sectionPagination.last_page, p + 1))} disabled={sectionPage === sectionPagination.last_page}
                                            className="p-2 sm:p-2.5 rounded-xl bg-white/5 disabled:opacity-30 hover:bg-white/10 transition-all disabled:cursor-not-allowed">
                                            <ChevronLeft className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </motion.div>
                )}
            </div>

            {/* Mall Offers Section */}
            {activeOffers.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="theme-card rounded-xl lg:rounded-2xl p-4 sm:p-6 lg:p-8 border border-amber-500/25 relative z-10 shadow-2xl space-y-5 overflow-hidden"
                >
                    <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-l from-amber-500 via-rose-500 to-amber-500" />
                    <div className="flex items-center justify-between flex-wrap gap-3">
                        <div>
                            <h2 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2.5">
                                عروض {mall.name_ar}
                                <Sparkles className="w-6 h-6 text-amber-400" />
                            </h2>
                            <p className="text-gray-400 mt-1 text-xs sm:text-sm">عروض وتخفيضات حصرية من هذا المتجر</p>
                        </div>
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-gradient-to-l from-amber-500 to-rose-500 text-white text-[10px] font-bold shadow-lg shadow-amber-500/30">
                            <Zap className="w-3 h-3" /> {activeOffers.length} عرض متاح
                        </span>
                    </div>

                    <OffersSlider offers={activeOffers} onAddToCart={handleOfferAdd} />
                </motion.div>
            )}

            {/* Image Zoom Lightbox */}
            <AnimatePresence>
                {zoomProduct && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-4 bg-black/90 backdrop-blur-sm"
                        onClick={() => setZoomProduct(null)}
                    >
                        <button
                            onClick={() => setZoomProduct(null)}
                            className="absolute top-4 left-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                        >
                            <X className="w-6 h-6 text-white" />
                        </button>
                        {(zoomProduct.image || zoomProduct.link_photo) && (
                            <img
                                src={zoomProduct.image || zoomProduct.link_photo}
                                alt={zoomProduct.name_ar}
                                className="max-w-full max-h-[70vh] object-contain rounded-2xl shadow-2xl"
                                onClick={(e) => e.stopPropagation()}
                            />
                        )}
                        <div className="mt-4 text-center max-w-lg" onClick={(e) => e.stopPropagation()}>
                            <h3 className="text-white font-bold text-lg">{zoomProduct.name_ar}</h3>
                            {zoomProduct.price && <p className="text-gray-300 mt-1 font-bold">{zoomProduct.price} ₪</p>}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

{/* Product Detail Modal */}
            <AnimatePresence>
                {detailProduct && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm"
                        onClick={() => setDetailProduct(null)}
                    >
                        <motion.div
                            initial={{ opacity: 0, y: 60, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 60, scale: 0.95 }}
                            transition={{ duration: 0.25 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full sm:max-w-md glass-card rounded-t-[2.5rem] sm:rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl max-h-[92vh] overflow-y-auto"
                        >
                            {/* Product Image */}
                            <div className="h-60 sm:h-64 bg-gradient-to-b from-gray-800 to-gray-900 relative">
                                {detailProduct.image || detailProduct.link_photo ? (
                                    <div className="product-image-frame w-full h-full">
                                        <img src={detailProduct.image || detailProduct.link_photo} alt={detailProduct.name_ar} className="product-image" />
                                        {/* Soft gradient overlay for text contrast */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />
                                    </div>
                                ) : (
                                    <div className="absolute inset-0 flex items-center justify-center opacity-30">
                                        <ShoppingCart className="w-24 h-24" />
                                    </div>
                                )}

                                <button
                                    onClick={() => setDetailProduct(null)}
                                    className="absolute top-4 left-4 p-2.5 rounded-xl bg-black/40 backdrop-blur-md text-white hover:bg-black/60 transition-colors border border-white/10"
                                >
                                    <ArrowLeft className="w-5 h-5" />
                                </button>

                                {detailProduct.stock_quantity !== undefined && (
                                    <div className={`absolute top-4 right-4 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 backdrop-blur-md ${detailProduct.stock_quantity > 0 ? 'bg-emerald-500/90 text-white' : 'bg-rose-500/90 text-white'}`}>
                                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                        {detailProduct.stock_quantity > 0 ? `متوفر: ${detailProduct.stock_quantity}` : 'نفدت الكمية'}
                                    </div>
                                )}
                                {offerMap[detailProduct.id] && (
                                    <div className="absolute bottom-4 right-4 px-3 py-1.5 rounded-full bg-gradient-to-l from-amber-500 to-rose-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-amber-500/20">
                                        <Zap className="w-3.5 h-3.5" /> عرض خاص - متوفر في قسم العروض
                                    </div>
                                )}
                            </div>

                            {/* Product Details */}
                            <div className="p-6 sm:p-7 space-y-5 text-right">
                                <div className="space-y-2">
                                    <h2 className="text-xl sm:text-2xl font-extrabold leading-tight">{detailProduct.name_ar}</h2>
                                    {detailProduct.description_ar && (
                                        <p className="text-gray-400 text-sm leading-relaxed">{detailProduct.description_ar}</p>
                                    )}
                                    {(() => {
                                        const offer = offerMap[detailProduct.id];
                                        const tiersDetail = offer?.tiers && Array.isArray(offer.tiers) && offer.tiers.length > 0 ? offer.tiers : (offer?.offer_price ? [{ quantity: offer.offer_quantity || 1, price: offer.offer_price }] : null);
                                        const hasOffer = !!offer && !!tiersDetail;
                                        const perUnitDetail = hasOffer ? Math.min(...tiersDetail.map(t => parseFloat(t.price)/t.quantity)) : null;
                                        const offerUnit = hasOffer ? perUnitDetail : detailProduct.price;
                                        const rawDetail = hasOffer ? tiersDetail[0].price : null;
                                        const qtyDetail = hasOffer ? tiersDetail[0].quantity : 1;
                                        const originalUnit = detailProduct.price;
                                        return (
                                            <div className="space-y-2 pt-1">
                                                {hasOffer ? (
                                                    <>
                                                        <div className="flex items-baseline gap-2 flex-wrap">
                                                            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-400">{(offerUnit * detailQty).toFixed(2)}</span>
                                                            <span className="text-sm text-gray-500 font-medium">₪</span>
                                                            <span className="text-sm line-through text-gray-500">{(originalUnit * detailQty).toFixed(2)} ₪</span>
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 text-[10px] font-bold border border-amber-500/20"><Zap className="w-3 h-3" /> سعر العرض</span>
                                                            {qtyDetail > 1 && <span className="text-[11px] text-amber-400 font-bold">({qtyDetail} بـ {rawDetail} ₪)</span>}
                                                        </div>
                                                        <div className="flex items-center gap-2 text-xs flex-wrap">
                                                            <span className="text-gray-500">السعر الأصلي: <span className="line-through">{originalUnit} ₪</span> → <span className="text-emerald-400 font-bold">{Number(offerUnit).toFixed(2)} ₪</span>{qtyDetail > 1 && <span className="text-amber-400"> ({qtyDetail} حبات بـ {rawDetail} ₪)</span>}</span>
                                                            <span className="text-amber-400 font-bold flex items-center gap-1"><Sparkles className="w-3 h-3" /> هذا المنتج عليه عرض وموجود في قسم العروض</span>
                                                        </div>
                                                        {detailQty > 1 && (
                                                            <span className="text-xs text-gray-500 font-medium block">({detailQty} × {offerUnit} ₪ بسعر العرض)</span>
                                                        )}
                                                    </>
                                                ) : (
                                                    <div className="flex items-baseline gap-1">
                                                        <span className="text-2xl sm:text-3xl font-extrabold text-emerald-400">{(detailProduct.price * detailQty).toFixed(2)}</span>
                                                        <span className="text-sm text-gray-500 font-medium">₪</span>
                                                        {detailQty > 1 && (
                                                            <span className="text-xs text-gray-500 font-medium">({detailQty} × {detailProduct.price} ₪)</span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })()}
                                </div>

                                <div className="grid grid-cols-2 gap-3.5">
                                    <div className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-transparent border border-indigo-500/20 space-y-1.5">
                                        <span className="text-[10px] text-indigo-400 font-bold flex items-center gap-1.5 uppercase tracking-wider">
                                            موقع المنتج <MapPin className="w-3 h-3" />
                                        </span>
                                        <p className="text-sm font-bold text-gray-200">
                                            {detailProduct.shelf_location || detailProduct.shelves?.[0]?.name || 'اسأل الموظف'}
                                        </p>
                                    </div>
                                    <div className="p-3.5 rounded-2xl bg-gradient-to-br from-purple-500/10 to-transparent border border-purple-500/20 space-y-1.5">
                                        <span className="text-[10px] text-purple-400 font-bold flex items-center gap-1.5 uppercase tracking-wider">
                                            القسم <Tag className="w-3 h-3" />
                                        </span>
                                        <p className="text-sm font-bold text-gray-200">
                                            {detailProduct.mallSection?.name_ar || detailProduct.section?.name_ar || detailProduct.category?.name_ar || 'عام'}
                                        </p>
                                    </div>
                                </div>

                                {/* Quantity selector */}
                                <div className="flex items-center justify-between bg-white/[0.03] border border-white/[0.08] rounded-2xl p-2">
                                    <span className="text-xs font-bold text-gray-400 px-3">الكمية</span>
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => setDetailQty(q => Math.max(1, q - 1))}
                                            disabled={detailQty <= 1}
                                            className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors border border-white/10 text-white"
                                        >
                                            <Minus className="w-4 h-4" />
                                        </button>
                                        <span className="w-10 text-center text-lg font-extrabold">{detailQty}</span>
                                        <button
                                            onClick={() => setDetailQty(q => q + 1)}
                                            className="w-10 h-10 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 flex items-center justify-center transition-colors border border-emerald-500/30 text-emerald-400"
                                        >
                                            <Plus className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {(() => {
                                    const offer = offerMap[detailProduct.id];
                                    const tiers = offer?.tiers && Array.isArray(offer.tiers) && offer.tiers.length > 0 ? offer.tiers : (offer?.offer_price ? [{ quantity: offer.offer_quantity || 1, price: offer.offer_price }] : null);
                                    const hasOffer = !!offer && !!tiers;
                                    const perUnit = hasOffer ? Math.min(...tiers.map(t => parseFloat(t.price)/t.quantity)) : null;
                                    const offerUnit = hasOffer ? perUnit : detailProduct.price;
                                    return (
                                <button
                                    onClick={() => {
                                        if (hasOffer) {
                                            const tiersText = tiers.map(t => `${t.quantity} بـ ${t.price} ₪`).join('، ');
                                            const base = { ...detailProduct, price: perUnit, original_price: detailProduct.price, tiers: tiers, notes: `عرض: ${offer.title_ar} - ${tiersText}` };
                                            handleQuickAdd(base, detailQty);
                                        } else {
                                            handleQuickAdd(detailProduct, detailQty);
                                        }
                                        setDetailAdded(true);
                                        setTimeout(() => { setDetailProduct(null); setDetailAdded(false); setDetailQty(1); }, 800);
                                    }}
                                    disabled={mall.is_active === false || (detailProduct.stock_quantity !== undefined && detailProduct.stock_quantity <= 0)}
                                    className={`relative group w-full py-4 rounded-2xl font-extrabold flex items-center justify-center gap-2.5 transition-all duration-300 overflow-hidden shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 ${hasOffer ? 'bg-gradient-to-l from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 shadow-amber-500/20 text-white' : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30 text-white hover:shadow-emerald-500/40'}`}
                                >
                                    <span className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity ${hasOffer ? 'bg-gradient-to-l from-amber-600 to-rose-600' : 'bg-gradient-to-l from-emerald-500 to-emerald-600'}`} />
                                    <span className="relative flex items-center justify-center gap-2.5">
                                        {detailAdded ? (
                                            <>
                                                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center justify-center w-6 h-6 rounded-full bg-white/25">
                                                    <CheckCircle2 className="w-5 h-5" />
                                                </motion.span>
                                                ✓ تمت الإضافة للسلة
                                            </>
                                        ) : mall.is_active === false ? (
                                            <>
                                                <AlertCircle className="w-5 h-5" />
                                                المعطل مؤقتاً
                                            </>
                                        ) : hasOffer ? (
                                            <>
                                                <Zap className="w-5 h-5 transition-transform group-hover:scale-110" />
                                                أضف بسعر العرض · {(offerUnit * detailQty).toFixed(2)} ₪
                                            </>
                                        ) : (
                                            <>
                                                <ShoppingCart className="w-5 h-5 transition-transform group-hover:scale-110" />
                                                أضف للسلة · {(detailProduct.price * detailQty).toFixed(2)} ₪
                                            </>
                                        )}
                                    </span>
                                </button>
                                    );
                                })()}

                                <button
                                    onClick={() => setDetailProduct(null)}
                                    className="w-full py-2.5 rounded-xl text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-colors text-sm font-bold"
                                >
                                    متابعة التسوق
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* QR Scanner Overlay */}
            <AnimatePresence>
                {qrScannerOpen && (
                    <QRScanner
                        onResult={handleQrScan}
                        onClose={() => setQrScannerOpen(false)}
                    />
                )}
            </AnimatePresence>

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

            {/* Description & Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {mall.branches?.length > 0 && (
                    <div className="theme-card rounded-2xl p-6 border border-white/8">
                        <h3 className="font-bold text-lg mb-2 flex items-center gap-2"><Store className="w-5 h-5 theme-accent-text" /> الفروع ({mall.branches?.length || 0})</h3>
                        {mall.branches?.map(b => (
                            <div key={b.id} className="flex items-center gap-2 text-gray-300 text-sm mt-3"><MapPin className="w-4 h-4 text-gray-500" /> {b.name} - {b.location}</div>
                        ))}
                        {/* Empty branches check removed */}
                    </div>
                )}
                {mall.description && (
                    <div className="theme-card rounded-2xl p-6 border border-white/8">
                        <h3 className="font-bold text-lg mb-2">نبذة عن المول</h3>
                        <p className="text-gray-300 text-sm leading-relaxed">{mall.description}</p>
                    </div>
                )}
            </div>
            {/* QR Code Section - Only for owner/admin */}
            {
                isOwnerOrAdmin && (
                    <div className="theme-card rounded-2xl p-6 border border-white/8">
                        <h3 className="font-bold text-lg mb-4 flex items-center justify-start gap-2">
                            رمز QR للمول
                            <QrCode className="w-5 h-5 theme-accent-text" />
                        </h3>
                        {mall.qr_code_path ? (
                            <div className="space-y-4">
                                <div className="bg-white p-4 rounded-2xl flex items-center justify-center max-w-[200px] mx-auto">
                                    <img
                                        src={`/storage/${mall.qr_code_path}`}
                                        alt="Mall QR Code"
                                        className="w-40 h-40 object-contain"
                                    />
                                </div>
                                <div className="flex gap-3 justify-center">
                                    <a
                                        href={`/storage/${mall.qr_code_path}`}
                                        download={`mall-${mall.slug}-qr.png`}
                                        className="flex-1 max-w-[160px] py-3 rounded-xl bg-indigo-500/10 text-indigo-300 font-bold text-sm flex items-center justify-center gap-2 hover:bg-indigo-500/20 transition-all border border-indigo-500/20"
                                    >
                                        <Download className="w-4 h-4" />
                                        تحميل QR
                                    </a>
                                    <button
                                        onClick={() => {
                                            const url = window.location.origin + '/mall/' + mall.slug;
                                            navigator.clipboard.writeText(url);
                                            alert('تم نسخ الرابط!');
                                        }}
                                        className="flex-1 max-w-[160px] py-3 rounded-xl bg-emerald-500/10 text-emerald-300 font-bold text-sm flex items-center justify-center gap-2 hover:bg-emerald-500/20 transition-all border border-emerald-500/20"
                                    >
                                        <Share2 className="w-4 h-4" />
                                        نسخ الرابط
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-4 text-gray-400 text-sm">
                                لم يتم توليد رمز QR لهذا المول بعد. يمكنك توليده من لوحة الإدارة.
                            </div>
                        )}
                    </div>
                )
            }
            {/* Success Notification */}
            <SuccessNotification
                show={!!scanFeedback}
                productName={scanFeedback?.productName}
                quantity={scanFeedback?.quantity || 1}
                price={scanFeedback?.price}
            />
        </motion.div>
    );
};

export default MallProfile;




