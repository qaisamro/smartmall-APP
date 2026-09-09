import React, { useRef, useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X, ZoomIn, ShoppingCart, Store, Clock, Tag, Sparkles, Gift, Zap } from 'lucide-react';

const OfferCard = ({ offer, onAdd, onOpen }) => {
    const hasTiers = offer.tiers && Array.isArray(offer.tiers) && offer.tiers.length > 0;
    return (
        <div
            onClick={() => onOpen(offer)}
            className="group relative text-right overflow-hidden rounded-xl sm:rounded-[1.5rem] border border-amber-500/20 hover:border-amber-500/40 bg-white/5 backdrop-blur-sm hover:shadow-xl hover:shadow-amber-500/10 transition-all duration-300 cursor-pointer flex flex-col h-full snap-start shrink-0 w-[68vw] sm:w-[280px] lg:w-[300px]"
        >
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/0 via-transparent to-rose-500/0 group-hover:from-amber-500/10 group-hover:to-rose-500/10 transition-all duration-300 pointer-events-none" />
            {offer.image ? (
                <div className="relative h-32 sm:h-44 overflow-hidden shrink-0">
                    <img src={offer.image} alt={offer.title_ar} loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/30 to-transparent" />
                    <div className="absolute top-2 right-2 sm:top-3 sm:right-3">
                        <span className="inline-flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-1.5 rounded-full bg-gradient-to-l from-amber-500 to-rose-500 text-white text-[9px] sm:text-[10px] font-bold shadow-lg shadow-amber-500/30">
                            <Zap className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> عرض حصري
                        </span>
                    </div>
                    <div className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:flex">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-black/50 backdrop-blur text-white text-[10px]">
                            <ZoomIn className="w-3 h-3" /> اضغط للتكبير
                        </span>
                    </div>
                </div>
            ) : (
                <div className="h-28 sm:h-36 bg-gradient-to-br from-amber-500/10 to-rose-500/10 flex items-center justify-center relative shrink-0">
                    <Gift className="w-8 h-8 sm:w-10 sm:h-10 text-amber-500/30" />
                    <div className="absolute top-2 right-2 sm:top-3 sm:right-3">
                        <span className="inline-flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-1.5 rounded-full bg-gradient-to-l from-amber-500 to-rose-500 text-white text-[9px] sm:text-[10px] font-bold shadow-lg shadow-amber-500/30">
                            <Zap className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> عرض حصري
                        </span>
                    </div>
                </div>
            )}
            <div className="p-3 sm:p-4 space-y-2 sm:space-y-3 flex-1 flex flex-col relative z-10">
                <h3 className="font-bold text-sm sm:text-base text-white group-hover:text-amber-300 transition-colors line-clamp-2 leading-tight">{offer.title_ar}</h3>
                {offer.description_ar && (
                    <p className="text-gray-400 text-[11px] sm:text-xs line-clamp-2 leading-relaxed">{offer.description_ar}</p>
                )}
                {offer.product && (
                    <div className="space-y-0.5 sm:space-y-1 p-2 sm:p-2.5 rounded-xl bg-gradient-to-l from-emerald-500/10 to-transparent border border-emerald-500/10">
                        {hasTiers ? (
                            offer.tiers.slice(0,2).map((t, idx) => (
                                <div key={idx} className="flex items-center justify-between">
                                    <span className="text-emerald-400 text-xs font-bold flex items-center gap-1">
                                        <Tag className="w-3 h-3" />
                                        <span className="line-through text-gray-500 ml-1">{offer.product.price} ₪</span>
                                        <span>{(parseFloat(t.price)/t.quantity).toFixed(2)} ₪</span>
                                        <span className="text-[10px] text-amber-400">({t.quantity} بـ {t.price} ₪)</span>
                                    </span>
                                </div>
                            ))
                        ) : offer.offer_price ? (
                            <div className="flex items-center justify-between">
                                <span className="text-emerald-400 text-xs font-bold flex items-center gap-1">
                                    <Tag className="w-3 h-3" />
                                    <span className="line-through text-gray-500 ml-1">{offer.product.price} ₪</span>
                                    <span>{(offer.offer_quantity > 1 ? (parseFloat(offer.offer_price)/offer.offer_quantity).toFixed(2) : offer.offer_price)} ₪</span>
                                    {offer.offer_quantity > 1 && <span className="text-[10px] text-amber-400">({offer.offer_quantity} بـ {offer.offer_price} ₪)</span>}
                                </span>
                            </div>
                        ) : (
                            <span className="text-emerald-400 text-xs font-bold">{offer.product.price} ₪</span>
                        )}
                        {hasTiers && offer.tiers.length > 2 && (
                            <span className="text-[10px] text-gray-500">+{offer.tiers.length - 2} شرائح أخرى</span>
                        )}
                    </div>
                )}
                <div className="flex items-center justify-between pt-1.5 sm:pt-2 border-t border-white/5 text-[10px] sm:text-xs mt-auto">
                    {offer.mall && (
                        <span className="text-indigo-400 flex items-center gap-1 truncate max-w-[50%]">
                            <Store className="w-3 h-3 shrink-0" /> {offer.mall.name_ar}
                        </span>
                    )}
                    {offer.ends_at && (
                        <span className="text-gray-500 flex items-center gap-1 shrink-0">
                            <Clock className="w-3 h-3" /> حتى {new Date(offer.ends_at).toLocaleDateString('ar-EG')}
                        </span>
                    )}
                </div>
                <button
                    onClick={(e) => onAdd(offer, e)}
                    className="w-full py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 sm:gap-2 bg-gradient-to-l from-amber-500 to-rose-500 text-white hover:from-amber-600 hover:to-rose-600 shadow-lg shadow-amber-500/10 transition-all active:scale-95"
                >
                    <ShoppingCart className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> أضف إلى السلة
                </button>
            </div>
        </div>
    );
};

const OfferDetailModal = ({ offer, onClose, onAdd }) => {
    const [lightbox, setLightbox] = useState(false);
    if (!offer) return null;
    const hasTiers = offer.tiers && Array.isArray(offer.tiers) && offer.tiers.length > 0;
    return (
        <>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ opacity: 0, y: 30, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.97 }}
                    onClick={e => e.stopPropagation()}
                    className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[1.5rem] bg-gradient-to-b from-gray-900 to-gray-950 border border-white/10 shadow-2xl relative"
                >
                    <button onClick={onClose} className="absolute top-4 left-4 z-10 w-9 h-9 rounded-xl bg-black/40 backdrop-blur border border-white/10 flex items-center justify-center hover:bg-black/60 transition-colors">
                        <X className="w-5 h-5 text-white" />
                    </button>
                    {offer.image && (
                        <div className="relative h-64 sm:h-80 overflow-hidden rounded-t-[1.5rem] cursor-zoom-in group" onClick={() => setLightbox(true)}>
                            <img src={offer.image} alt={offer.title_ar} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 to-transparent" />
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/90 text-gray-900 text-sm font-bold">
                                    <ZoomIn className="w-4 h-4" /> تكبير الصورة
                                </span>
                            </div>
                            <div className="absolute bottom-4 right-4">
                                <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-gradient-to-l from-amber-500 to-rose-500 text-white text-xs font-bold">
                                    <Zap className="w-3 h-3" /> عرض حصري
                                </span>
                            </div>
                        </div>
                    )}
                    <div className="p-6 space-y-5">
                        <div>
                            <h2 className="text-2xl font-black text-white leading-tight">{offer.title_ar}</h2>
                            {offer.title_en && <p className="text-sm text-gray-500 mt-1">{offer.title_en}</p>}
                            {offer.description_ar && <p className="text-gray-300 text-sm leading-relaxed mt-3 whitespace-pre-wrap break-words">{offer.description_ar}</p>}
                        </div>
                        {offer.product && (
                            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                                <p className="text-xs font-bold text-gray-400 flex items-center gap-1"><Tag className="w-3 h-3 text-emerald-400" /> المنتج: {offer.product.name_ar}</p>
                                <div className="space-y-1.5">
                                    {hasTiers ? offer.tiers.map((t, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                                            <span className="text-sm font-bold text-emerald-400">{t.quantity} حبات بـ {t.price} ₪ <span className="text-xs text-gray-400">({(parseFloat(t.price)/t.quantity).toFixed(2)} ₪/حبة)</span></span>
                                            <span className="text-xs line-through text-gray-500">{offer.product.price} ₪</span>
                                        </div>
                                    )) : (
                                        <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                                            <span className="text-sm font-bold text-emerald-400">
                                                {offer.offer_price ? (offer.offer_quantity > 1 ? `${offer.offer_quantity} بـ ${offer.offer_price} ₪ (${(parseFloat(offer.offer_price)/offer.offer_quantity).toFixed(2)} ₪/حبة)` : `${offer.offer_price} ₪`) : `${offer.product.price} ₪`}
                                            </span>
                                            <span className="text-xs line-through text-gray-500">{offer.product.price} ₪</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            {offer.mall && (
                                <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                                    <p className="text-xs text-indigo-300 mb-1 flex items-center gap-1"><Store className="w-3 h-3" /> المتجر</p>
                                    <p className="font-bold text-white">{offer.mall.name_ar}</p>
                                </div>
                            )}
                            {offer.ends_at && (
                                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                                    <p className="text-xs text-gray-400 mb-1 flex items-center gap-1"><Clock className="w-3 h-3" /> ينتهي في</p>
                                    <p className="font-bold text-white">{new Date(offer.ends_at).toLocaleDateString('ar-EG', { year:'numeric', month:'long', day:'numeric'})}</p>
                                </div>
                            )}
                        </div>
                        <button
                            onClick={(e) => { onAdd(offer, e); onClose(); }}
                            className="w-full py-4 rounded-2xl font-black text-base flex items-center justify-center gap-2 bg-gradient-to-l from-amber-500 to-rose-500 text-white hover:from-amber-600 hover:to-rose-600 shadow-xl shadow-amber-500/20 transition-all active:scale-[0.98]"
                        >
                            <ShoppingCart className="w-5 h-5" /> أضف العرض إلى السلة
                        </button>
                    </div>
                </motion.div>
            </motion.div>
            <AnimatePresence>
                {lightbox && offer.image && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[110] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4"
                        onClick={() => setLightbox(false)}
                    >
                        <button onClick={() => setLightbox(false)} className="absolute top-4 left-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center">
                            <X className="w-6 h-6 text-white" />
                        </button>
                        <motion.img
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            src={offer.image}
                            alt={offer.title_ar}
                            className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl"
                            onClick={e => e.stopPropagation()}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

const OffersSlider = ({ offers, onAddToCart, emptyText = "لا توجد عروض حالياً" }) => {
    const scrollRef = useRef(null);
    const [canLeft, setCanLeft] = useState(false);
    const [canRight, setCanRight] = useState(false);
    const [selected, setSelected] = useState(null);

    const updateArrows = useCallback(() => {
        const el = scrollRef.current;
        if (!el) return;
        setCanLeft(el.scrollLeft > 8);
        setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
    }, []);

    useEffect(() => {
        updateArrows();
        const el = scrollRef.current;
        if (!el) return;
        el.addEventListener('scroll', updateArrows, { passive: true });
        window.addEventListener('resize', updateArrows);
        return () => {
            el.removeEventListener('scroll', updateArrows);
            window.removeEventListener('resize', updateArrows);
        };
    }, [offers, updateArrows]);

    const scroll = (dir) => {
        const el = scrollRef.current;
        if (!el) return;
        const cardW = el.querySelector('[data-offer-card]')?.offsetWidth || 320;
        el.scrollBy({ left: dir * (cardW + 16), behavior: 'smooth' });
    };

    if (!offers || offers.length === 0) {
        return (
            <div className="text-center py-16 glass-card rounded-[1.5rem] border border-white/5">
                <Gift className="w-12 h-12 mx-auto mb-3 text-gray-600" />
                <p className="text-gray-400 font-bold">{emptyText}</p>
            </div>
        );
    }

    return (
        <>
            <div className="relative group/slider">
                {offers.length > 1 && canRight && (
                    <button onClick={() => scroll(-1)} className="hidden sm:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/20 hover:bg-amber-500 hover:border-amber-500 hover:text-white text-white transition-all shadow-xl -ml-4">
                        <ChevronLeft className="w-5 h-5 mx-auto" />
                    </button>
                )}
                {offers.length > 1 && canLeft && (
                    <button onClick={() => scroll(1)} className="hidden sm:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/20 hover:bg-amber-500 hover:border-amber-500 hover:text-white text-white transition-all shadow-xl -mr-4">
                        <ChevronRight className="w-5 h-5 mx-auto" />
                    </button>
                )}
                <div
                    ref={scrollRef}
                    className="flex gap-3 sm:gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-4 pt-2 px-1"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    onScroll={updateArrows}
                >
                    <style>{`div::-webkit-scrollbar{display:none}`}</style>
                    {offers.map((offer) => (
                        <div key={offer.id} data-offer-card className="snap-center">
                            <OfferCard offer={offer} onAdd={onAddToCart} onOpen={setSelected} />
                        </div>
                    ))}
                </div>
                {offers.length > 1 && (
                    <div className="flex items-center justify-center gap-1.5 mt-1">
                        <span className="text-[11px] text-gray-500 flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-amber-400" /> اسحب للمزيد • اضغط للتكبير
                        </span>
                    </div>
                )}
            </div>
            <AnimatePresence>
                {selected && (
                    <OfferDetailModal offer={selected} onClose={() => setSelected(null)} onAdd={onAddToCart} />
                )}
            </AnimatePresence>
        </>
    );
};

export default OffersSlider;
