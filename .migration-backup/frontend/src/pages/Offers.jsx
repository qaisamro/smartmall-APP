import React, { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import useCartStore from '../store/useCartStore';
import { Sparkles, Gift, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import OffersSlider from '../components/OffersSlider';

const Offers = () => {
    const navigate = useNavigate();
    const { addItem } = useCartStore();
    const [toast, setToast] = useState(null);

    const { data: offers, isLoading } = useQuery({
        queryKey: ['offers'],
        queryFn: async () => {
            const r = await api.get('/offers');
            return r.data;
        }
    });

    const offerList = Array.isArray(offers) ? offers : offers?.data || [];

    const showToast = (msg) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3000);
    };

    const handleAddToCart = useCallback((offer, e) => {
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
            tiers ? `شرائح العرض: ${bundleText}${offer.product?.price ? ` (السعر الأصلي ${offer.product.price} ₪)` : ''}` : `سعر العرض: ${bundleText}${offer.product?.price ? ` (بدل ${offer.product.price} ₪)` : ''}`,
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
        showToast(`تمت إضافة ${offer.product?.name_ar || offer.title_ar} إلى السلة مع تفاصيل العرض`);
    }, [addItem]);

    return (
        <div className="space-y-8 pb-12 relative">
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: -30 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -30 }}
                        className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] bg-emerald-600 text-white px-6 py-3.5 rounded-2xl shadow-2xl shadow-emerald-600/30 text-sm font-bold flex items-center gap-2.5 whitespace-nowrap"
                    >
                        <CheckCircle2 className="w-5 h-5 shrink-0" />
                        {toast}
                    </motion.div>
                )}
            </AnimatePresence>

            <header className="flex items-center gap-4">
                <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors">
                    <ArrowLeft className="w-5 h-5 text-gray-400" />
                </button>
                <div>
                    <h2 className="text-2xl sm:text-3xl font-extrabold flex items-center gap-3">
                        العروض
                        <Sparkles className="w-8 h-8 text-amber-400" />
                    </h2>
                    <p className="text-gray-400 mt-1 text-sm">عروض وتخفيضات حصرية للمستخدمين — اسحب للتصفح واضغط للتكبير</p>
                </div>
            </header>

            {isLoading ? (
                <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-indigo-400" /></div>
            ) : offerList.length === 0 ? (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-24 glass-card rounded-[2rem]">
                    <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-white/5 flex items-center justify-center">
                        <Gift className="w-12 h-12 text-gray-600" />
                    </div>
                    <p className="text-xl font-bold text-gray-300 mb-2">لا توجد عروض حالياً</p>
                    <p className="text-gray-500 text-sm">ترقبوا العروض والتخفيضات القادمة</p>
                </motion.div>
            ) : (
                <OffersSlider offers={offerList} onAddToCart={handleAddToCart} />
            )}
        </div>
    );
};

export default Offers;
