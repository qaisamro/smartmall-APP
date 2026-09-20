import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import useAuthStore from '../../store/useAuthStore';
import { Sparkles, Plus, X, Loader2, Image as ImageIcon, Calendar, CheckCircle2, Trash2, Edit3, ShoppingBag, Search } from 'lucide-react';

const OwnerOffers = () => {
    const queryClient = useQueryClient();
    const { user } = useAuthStore();
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [productSearch, setProductSearch] = useState('');
    const [visibleCount, setVisibleCount] = useState(30);
    const sentinelRef = useRef(null);
    const [form, setForm] = useState({
        title_ar: '', title_en: '', description_ar: '', description_en: '',
        image: null, imagePreview: '', ends_at: '', is_active: true, product_id: '',
        tiers: [{ quantity: '1', price: '' }]
    });

    const { data, isLoading } = useQuery({
        queryKey: ['owner-offers'],
        queryFn: async () => {
            const r = await api.get('/owner/offers');
            return r.data;
        }
    });

    const { data: productsData } = useQuery({
        queryKey: ['owner-products-for-offer', user?.mall_id],
        queryFn: async () => {
            if (!user?.mall_id) return [];
            const r = await api.get(`/malls/${user.mall_id}/products?all=1`);
            return r.data;
        },
        enabled: !!user?.mall_id
    });

    const offers = data?.offers || [];
    const limit = data?.limit || 0;
    const remaining = data?.remaining || 0;
    const products = Array.isArray(productsData) ? productsData : productsData?.data || [];
    const filteredProducts = products.filter(p =>
        !productSearch || p.name_ar?.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.name_en?.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.barcode?.toLowerCase().includes(productSearch.toLowerCase())
    );
    const selectedProduct = products.find(p => p.id == form.product_id);

    // Bulk create state — يحافظ على نموذج الإضافة الفردي الحالي
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [bulkTitle, setBulkTitle] = useState('');
    const [bulkList, setBulkList] = useState(() => [
        { _id: Date.now(), title_ar: '', title_en: '', product_id: '', productSearch: '', tiers: [{ quantity: '1', price: '' }], image: null, imagePreview: '', ends_at: '' }
    ]);
    const addBulkRow = () => setBulkList(prev => [...prev, { _id: Date.now() + Math.random(), title_ar: '', title_en: '', product_id: '', productSearch: '', tiers: [{ quantity: '1', price: '' }], image: null, imagePreview: '', ends_at: '' }]);
    const removeBulkRow = (id) => setBulkList(prev => prev.length <= 1 ? prev : prev.filter(r => r._id !== id));
    const updateBulkRow = (id, patch) => setBulkList(prev => prev.map(r => r._id === id ? { ...r, ...patch } : r));
    const updateBulkTier = (rowId, idx, field, value) => {
        setBulkList(prev => prev.map(r => {
            if (r._id !== rowId) return r;
            const nt = [...r.tiers];
            nt[idx] = { ...nt[idx], [field]: value };
            return { ...r, tiers: nt };
        }));
    };
    const addBulkTier = (rowId) => setBulkList(prev => prev.map(r => r._id === rowId ? { ...r, tiers: [...r.tiers, { quantity: '', price: '' }] } : r));
    const removeBulkTier = (rowId, idx) => setBulkList(prev => prev.map(r => {
        if (r._id !== rowId) return r;
        if (r.tiers.length <= 1) return r;
        return { ...r, tiers: r.tiers.filter((_, i) => i !== idx) };
    }));
    const [bulkSubmitting, setBulkSubmitting] = useState(false);
    const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0, errors: [] });
    const handleBulkSubmit = async () => {
        const sharedTitle = bulkTitle.trim();
        if (!sharedTitle) {
            alert('أدخل عنوان العرض المشترك أولاً');
            return;
        }
        const validRows = bulkList.filter(r => r.product_id);
        if (validRows.length === 0) {
            alert('اختر منتجاً لعرض واحد على الأقل');
            return;
        }
        if (limit > 0 && validRows.length > remaining) {
            alert(`الحد المتبقي ${remaining} فقط — قلّل عدد العروض`);
            return;
        }
        setBulkSubmitting(true);
        setBulkProgress({ done: 0, total: validRows.length, errors: [] });
        let success = 0;
        const errors = [];
        for (let i = 0; i < validRows.length; i++) {
            const row = validRows[i];
            const validTiers = row.tiers.filter(t => t.quantity && t.price !== '' && parseFloat(t.price) >= 0).map(t => ({ quantity: parseInt(t.quantity), price: parseFloat(t.price) }));
            if (validTiers.length === 0) { errors.push(`"${sharedTitle}" — أدخل شريحة سعر واحدة على الأقل`); setBulkProgress({ done: i+1, total: validRows.length, errors: [...errors] }); continue; }
            const fd = new FormData();
            fd.append('title_ar', sharedTitle);
            fd.append('title_en', sharedTitle);
            if (row.ends_at) fd.append('ends_at', row.ends_at);
            fd.append('product_id', row.product_id);
            fd.append('tiers', JSON.stringify(validTiers));
            fd.append('offer_price', String(validTiers[0].price));
            fd.append('offer_quantity', String(validTiers[0].quantity));
            if (row.image instanceof File) fd.append('image', row.image);
            try {
                await api.post('/owner/offers', fd);
                success++;
            } catch (e) {
                errors.push(`"${sharedTitle}" — ${e.response?.data?.message || 'فشل'}`);
            }
            setBulkProgress({ done: i+1, total: validRows.length, errors: [...errors] });
        }
        setBulkSubmitting(false);
        queryClient.invalidateQueries(['owner-offers']);
        if (success > 0) {
            alert(`تم نشر ${success} عروض بنجاح` + (errors.length ? `\nأخطاء: ${errors.join(' | ')}` : ''));
            if (errors.length === 0) {
                setShowBulkModal(false);
                setBulkTitle('');
                setBulkList([{ _id: Date.now(), title_ar: '', title_en: '', product_id: '', productSearch: '', tiers: [{ quantity: '1', price: '' }], image: null, imagePreview: '', ends_at: '' }]);
            }
        } else if (errors.length) {
            alert(errors.join('\n'));
        }
    };

    useEffect(() => {
        setVisibleCount(30);
    }, [productSearch]);

    useEffect(() => {
        if (!sentinelRef.current) return;
        const observer = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting) {
                setVisibleCount(prev => Math.min(prev + 30, filteredProducts.length));
            }
        }, { rootMargin: '200px' });
        observer.observe(sentinelRef.current);
        return () => observer.disconnect();
    }, [filteredProducts.length]);

    const buildFormData = () => {
        const fd = new FormData();
        fd.append('title_ar', form.title_ar);
        fd.append('title_en', (form.title_en || '').trim() || form.title_ar);
        if (form.description_ar) fd.append('description_ar', form.description_ar);
        if (form.description_en) fd.append('description_en', form.description_en);
        if (form.ends_at) fd.append('ends_at', form.ends_at);
        if (form.product_id) fd.append('product_id', form.product_id);
        // tiers: array of {quantity, price} — filter valid entries
        const validTiers = (form.tiers || []).filter(t => t.quantity && t.price !== '' && parseFloat(t.price) >= 0).map(t => ({ quantity: parseInt(t.quantity), price: parseFloat(t.price) }));
        if (validTiers.length > 0) {
            fd.append('tiers', JSON.stringify(validTiers));
            fd.append('offer_price', String(validTiers[0].price));
            fd.append('offer_quantity', String(validTiers[0].quantity));
        }
        if (form.image instanceof File) {
            fd.append('image', form.image);
        }
        if (editing) {
            fd.append('is_active', form.is_active ? 1 : 0);
            fd.append('_method', 'PUT');
        }
        return fd;
    };

    const createMutation = useMutation({
        mutationFn: async () => {
            const r = await api.post('/owner/offers', buildFormData());
            return r.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['owner-offers']);
            closeModal();
        },
        onError: (err) => alert(err.response?.data?.message || 'فشل في إضافة العرض')
    });

    const updateMutation = useMutation({
        mutationFn: async () => {
            const fd = buildFormData();
            const r = await api.post(`/owner/offers/${editing.id}`, fd);
            return r.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['owner-offers']);
            closeModal();
        },
        onError: (err) => alert(err.response?.data?.message || 'فشل في تحديث العرض')
    });

    const deleteMutation = useMutation({
        mutationFn: async (id) => {
            await api.delete(`/owner/offers/${id}`);
        },
        onSuccess: () => queryClient.invalidateQueries(['owner-offers'])
    });

    const closeModal = () => {
        setShowModal(false);
        setEditing(null);
        setProductSearch('');
        setForm({ title_ar: '', title_en: '', description_ar: '', description_en: '', image: null, imagePreview: '', ends_at: '', is_active: true, product_id: '', tiers: [{ quantity: '1', price: '' }] });
    };

    const openEdit = (offer) => {
        setEditing(offer);
        const productName = products?.find(p => p.id == offer.product_id);
        if (productName) setProductSearch(productName.name_ar);
        let tiers = [{ quantity: '1', price: '' }];
        if (offer.tiers && Array.isArray(offer.tiers) && offer.tiers.length > 0) {
            tiers = offer.tiers.map(t => ({ quantity: String(t.quantity), price: String(t.price) }));
        } else if (offer.offer_price) {
            tiers = [{ quantity: String(offer.offer_quantity || 1), price: String(offer.offer_price) }];
        }
        setForm({
            title_ar: offer.title_ar || '',
            title_en: offer.title_en || '',
            description_ar: offer.description_ar || '',
            description_en: offer.description_en || '',
            image: null,
            imagePreview: offer.image || '',
            ends_at: offer.ends_at ? offer.ends_at.slice(0, 16) : '',
            is_active: offer.is_active,
            product_id: offer.product_id || '',
            tiers
        });
        setShowModal(true);
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setForm({ ...form, image: file, imagePreview: URL.createObjectURL(file) });
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (editing) {
            updateMutation.mutate();
        } else {
            createMutation.mutate();
        }
    };

    return (
        <div className="space-y-8 pb-10">
            <header className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 text-right">
                <div>
                    <h2 className="text-2xl sm:text-3xl font-extrabold flex items-center gap-3 justify-start">
                        العروض الخاصة
                        <Sparkles className="w-8 h-8 text-amber-400" />
                    </h2>
                    <p className="text-gray-400 mt-1">أضف عروضك وستظهر بشكل مميز في قسم "العروض" داخل صفحة متجرك وعلى الصفحة العامة لكل العروض</p>
                </div>
                <div className="flex items-center gap-4">
                    {limit > 0 && (
                        <span className="text-sm text-gray-400 flex items-center gap-2 bg-white/5 px-4 py-2 rounded-xl">
                            <Sparkles className="w-4 h-4 text-amber-400" />
                            المتبقي: <span className="text-amber-400 font-bold">{remaining}</span> / {limit}
                        </span>
                    )}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => { setEditing(null); setShowModal(true); }}
                            disabled={limit > 0 && remaining <= 0}
                            className="btn-primary !py-3 !px-6 flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            إضافة عرض
                        </button>
                        <button
                            onClick={() => setShowBulkModal(true)}
                            disabled={limit > 0 && remaining <= 0}
                            className="btn-primary !py-3 !px-6 flex items-center gap-2 bg-gradient-to-l from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 disabled:opacity-40"
                            title="إنشاء عدة عروض دفعة واحدة"
                        >
                            <Plus className="w-4 h-4" />
                            إضافة عروض متعددة
                        </button>
                    </div>
                </div>
            </header>

            {isLoading ? (
                <div className="text-center py-20"><Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-400" /></div>
            ) : offers.length === 0 ? (
                <div className="glass-card rounded-3xl p-12 text-center border border-white/5">
                    <Sparkles className="w-16 h-16 mx-auto mb-4 opacity-20" />
                    <p className="font-bold text-lg text-gray-400">لا توجد عروض مضافة بعد</p>
                    <p className="text-gray-500 text-sm mt-1">أضف عرضك الأول الآن</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {offers.map((offer, i) => (
                        <motion.div
                            key={offer.id}
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="glass-card rounded-3xl overflow-hidden border border-white/5 hover:border-amber-500/20 transition-all group"
                        >
                            {offer.image && (
                                <div className="h-40 bg-gray-800 overflow-hidden">
                                    <img src={offer.image} alt={offer.title_ar} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                </div>
                            )}
                            <div className="p-5">
                                <div className="flex items-center justify-between mb-3">
                                    <div className={`w-2 h-2 rounded-full ${offer.is_active ? 'bg-emerald-500' : 'bg-gray-500'}`} />
                                </div>
                                <h3 className="text-lg font-bold text-white mb-1">{offer.title_ar}</h3>
                                {offer.description_ar && (
                                    <p className="text-xs text-gray-400 mb-3 line-clamp-2">{offer.description_ar}</p>
                                )}
                                {(() => {
                                    const tiers = (offer.tiers && Array.isArray(offer.tiers) && offer.tiers.length > 0)
                                        ? offer.tiers
                                        : (offer.offer_price ? [{ quantity: offer.offer_quantity || 1, price: offer.offer_price }] : []);
                                    if (!offer.product_id || tiers.length === 0) return null;
                                    return (
                                        <div className="mb-3 p-2.5 rounded-xl bg-gradient-to-l from-amber-500/10 to-transparent border border-amber-500/20 space-y-1">
                                            {tiers.map((t, idx) => (
                                                <div key={idx} className="flex items-center justify-between text-xs">
                                                    <span className="font-bold text-amber-400">{t.quantity} حبات بـ {t.price} ₪</span>
                                                    <span className="text-[10px] text-gray-500">(~{(parseFloat(t.price)/t.quantity).toFixed(2)} ₪/حبة)</span>
                                                </div>
                                            ))}
                                        </div>
                                    );
                                })()}
                                <div className="flex items-center gap-3 text-[10px] text-gray-500 mb-4">
                                    {offer.starts_at && (
                                        <span className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            {new Date(offer.starts_at).toLocaleDateString('ar-SA')}
                                        </span>
                                    )}
                                    {offer.ends_at && (
                                        <span className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            {new Date(offer.ends_at).toLocaleDateString('ar-SA')}
                                        </span>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => openEdit(offer)}
                                        className="py-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500 hover:text-white font-bold text-xs transition-all flex items-center justify-center gap-1"
                                    >
                                        <Edit3 className="w-3 h-3" />
                                        تعديل
                                    </button>
                                    <button
                                        onClick={() => { if (confirm('حذف العرض؟')) deleteMutation.mutate(offer.id); }}
                                        className="py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white font-bold text-xs transition-all flex items-center justify-center gap-1"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                        حذف
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Modal */}
            <AnimatePresence>
                {showModal && (
                    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, y: 60 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 60 }}
                            className="w-full sm:max-w-lg glass-dark p-6 sm:p-8 rounded-t-[2.5rem] sm:rounded-[2.5rem] border border-white/10 relative max-h-[90vh] overflow-y-auto"
                        >
                            <button onClick={closeModal} className="absolute top-5 left-5 p-2 rounded-full hover:bg-white/10 transition-colors">
                                <X className="w-5 h-5 text-gray-400 hover:text-white" />
                            </button>

                            <h3 className="text-xl sm:text-2xl font-bold mb-6 text-right">{editing ? 'تعديل العرض' : 'إضافة عرض جديد'}</h3>

                            <form onSubmit={handleSubmit} className="space-y-5 text-right">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-400 mb-2">عنوان العرض</label>
                                    <input type="text" required value={form.title_ar} onChange={e => setForm({ ...form, title_ar: e.target.value })} className="input-field w-full" placeholder="عرض رمضاني" />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-400 mb-2">الوصف بالعربية</label>
                                    <textarea value={form.description_ar} onChange={e => setForm({ ...form, description_ar: e.target.value })} className="input-field w-full" rows={2} placeholder="وصف العرض..." />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-400 mb-2 flex items-center gap-2">
                                        <ShoppingBag className="w-4 h-4" />
                                        المنتج (اختياري - لربط العرض بمنتج)
                                    </label>
                                    <div className="relative mb-2">
                                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                                        <input type="text" value={productSearch}
                                            onChange={e => { setProductSearch(e.target.value); setForm({ ...form, product_id: '', tiers: [{ quantity: '1', price: '' }] }); }}
                                            className="input-field w-full pr-10" placeholder="ابحث عن منتج..." />
                                        {form.product_id && selectedProduct && (
                                            <button type="button" onClick={() => { setForm({ ...form, product_id: '', tiers: [{ quantity: '1', price: '' }] }); setProductSearch(''); }}
                                                className="absolute left-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-white/10 transition-colors">
                                                <X className="w-4 h-4 text-gray-400" />
                                            </button>
                                        )}
                                    </div>
                                    <div className="max-h-48 overflow-y-auto rounded-2xl bg-white/5 border border-white/10 divide-y divide-white/5" style={{ scrollbarWidth: 'thin' }}>
                                        {filteredProducts.length === 0 ? (
                                            <div className="p-4 text-center text-sm text-gray-500">لا توجد منتجات</div>
                                        ) : filteredProducts.slice(0, visibleCount).map(p => (
                                            <button type="button" key={p.id} onClick={() => { setForm({ ...form, product_id: p.id }); setProductSearch(p.name_ar); }}
                                                className={`w-full text-right px-4 py-2.5 flex items-center justify-between hover:bg-white/5 transition-colors ${form.product_id == p.id ? 'bg-indigo-500/10' : ''}`}>
                                                <div>
                                                    <span className={`text-sm font-semibold ${form.product_id == p.id ? 'text-indigo-400' : 'text-white'}`}>{p.name_ar}</span>
                                                    <span className="text-gray-500 text-xs mr-2">{p.name_en}</span>
                                                </div>
                                                <span className="text-xs text-emerald-400">{p.discount_price || p.price} ₪</span>
                                            </button>
                                        ))}
                                        {visibleCount < filteredProducts.length && (
                                            <div ref={sentinelRef} className="h-4" />
                                        )}
                                    </div>
                                </div>

                                {form.product_id && (
                                    <div className="space-y-3 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20">
                                        <label className="block text-sm font-semibold text-amber-300 flex items-center gap-2">
                                            <ShoppingBag className="w-4 h-4" />
                                            تسعير العرض حسب الكمية — يمكنك إضافة عدة شرائح
                                        </label>
                                        <p className="text-[11px] text-gray-400">أدخل كل شريحة: الكمية وسعرها — مثال: 1 بـ 4 ₪ و 3 بـ 10 ₪ . سيُحسب سعر السلة تلقائياً لأي كمية حسب أفضل شريحة.</p>
                                        <div className="space-y-2">
                                            {(form.tiers || []).map((tier, idx) => (
                                                <div key={idx} className="flex items-end gap-2 p-2.5 rounded-xl bg-white/5 border border-white/5">
                                                    <div className="flex-1">
                                                        <label className="block text-[11px] font-bold text-gray-400 mb-1">عدد المنتج</label>
                                                        <input type="number" min="1" step="1" value={tier.quantity}
                                                            onChange={e => {
                                                                const nt = [...form.tiers];
                                                                nt[idx] = { ...nt[idx], quantity: e.target.value };
                                                                setForm({ ...form, tiers: nt });
                                                            }}
                                                            className="input-field w-full text-center !py-2" placeholder="1" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <label className="block text-[11px] font-bold text-gray-400 mb-1">سعر هذه الكمية</label>
                                                        <div className="relative">
                                                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs">₪</span>
                                                            <input type="number" step="0.01" min="0" value={tier.price}
                                                                onChange={e => {
                                                                    const nt = [...form.tiers];
                                                                    nt[idx] = { ...nt[idx], price: e.target.value };
                                                                    setForm({ ...form, tiers: nt });
                                                                }}
                                                                className="input-field w-full text-right pl-7 !py-2" placeholder="0.00" />
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1 pb-1">
                                                        {tier.quantity && tier.price && (
                                                            <span className="text-[10px] text-emerald-400 font-bold whitespace-nowrap">{(parseFloat(tier.price)/parseInt(tier.quantity||1)).toFixed(2)} ₪/حبة</span>
                                                        )}
                                                        <button type="button" onClick={() => {
                                                            if (form.tiers.length <= 1) return;
                                                            setForm({ ...form, tiers: form.tiers.filter((_,i)=>i!==idx) });
                                                        }} disabled={form.tiers.length <= 1} className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-gray-400 hover:text-rose-400 disabled:opacity-30 disabled:cursor-not-allowed">
                                                            <X className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <button type="button" onClick={() => setForm({ ...form, tiers: [...form.tiers, { quantity: '', price: '' }] })}
                                            className="w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-amber-500/20 text-amber-400 text-xs font-bold flex items-center justify-center gap-1.5 transition-all">
                                            <Plus className="w-3.5 h-3.5" /> إضافة شريحة أخرى — مثال: 3 بـ 10 ₪
                                        </button>
                                        {selectedProduct && form.tiers.some(t=>t.quantity && t.price) && (
                                            <div className="space-y-1">
                                                {form.tiers.filter(t=>t.quantity && t.price).map((t, i) => (
                                                    <p key={i} className="text-[11px] bg-white/5 p-2 rounded-xl border border-white/5 flex items-center justify-between">
                                                        <span className="text-gray-400">{t.quantity} حبات → <span className="text-white font-bold">{t.price} ₪</span></span>
                                                        <span className="text-emerald-400 font-bold">{(parseFloat(t.price)/parseInt(t.quantity)).toFixed(2)} ₪/للحبة</span>
                                                    </p>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-semibold text-gray-400 mb-2 flex items-center gap-2">
                                        <ImageIcon className="w-4 h-4" />
                                        صورة العرض
                                    </label>
                                    <div className="flex items-center gap-4">
                                        <label className="cursor-pointer flex-1">
                                            <div className="input-field w-full flex items-center justify-center gap-2 py-4 border-dashed border-white/20 hover:border-indigo-500/50 transition-colors">
                                                <ImageIcon className="w-5 h-5 text-gray-500" />
                                                <span className="text-gray-400 text-sm">اختر صورة</span>
                                            </div>
                                            <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                                        </label>
                                        {(form.imagePreview) && (
                                            <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-white/10">
                                                <img src={form.imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-400 mb-2">تاريخ الانتهاء (اختياري)</label>
                                    <input type="datetime-local" value={form.ends_at} onChange={e => setForm({ ...form, ends_at: e.target.value })} className="input-field w-full" />
                                </div>

                                {editing && (
                                    <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/10">
                                        <button
                                            type="button"
                                            onClick={() => setForm({ ...form, is_active: !form.is_active })}
                                            className={`relative w-12 h-6 rounded-full transition-all duration-300 ${form.is_active ? 'bg-emerald-500' : 'bg-gray-600'}`}
                                        >
                                            <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-300 ${form.is_active ? 'right-0.5' : 'right-6'}`} />
                                        </button>
                                        <span className="text-sm font-bold text-gray-300">العرض نشط</span>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={createMutation.isPending || updateMutation.isPending}
                                    className="btn-primary w-full !py-4 mt-2 flex items-center justify-center gap-2"
                                >
                                    {(createMutation.isPending || updateMutation.isPending)
                                        ? <Loader2 className="animate-spin w-5 h-5" />
                                        : (editing ? 'حفظ التغييرات' : 'إضافة العرض')
                                    }
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Bulk Create Modal — إنشاء عروض متعددة دفعة واحدة مع الحفاظ على النموذج الفردي */}
            <AnimatePresence>
                {showBulkModal && (
                    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, y: 60 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 60 }}
                            className="w-full sm:max-w-3xl glass-dark p-6 sm:p-8 rounded-t-[2.5rem] sm:rounded-[2.5rem] border border-white/10 relative max-h-[90vh] overflow-y-auto"
                        >
                            <button onClick={() => setShowBulkModal(false)} className="absolute top-5 left-5 p-2 rounded-full hover:bg-white/10 transition-colors">
                                <X className="w-5 h-5 text-gray-400 hover:text-white" />
                            </button>
                            <h3 className="text-xl sm:text-2xl font-bold mb-2 text-right">إضافة عروض متعددة</h3>
                            <p className="text-xs text-gray-500 mb-4 text-right">أنشئ 5 عروض مرة واحدة بدل تكرار "إضافة عرض" — عنوان واحد يُطبق على كل العروض، وكل سطر منتج وشريحة سعر مستقلة</p>
                            <div className="mb-4">
                                <label className="block text-sm font-semibold text-gray-400 mb-2 text-right">عنوان العرض (يطبق على كل العروض)</label>
                                <input type="text" value={bulkTitle} onChange={e => setBulkTitle(e.target.value)} className="input-field w-full text-sm" placeholder="مثال: عرض نهاية الأسبوع" />
                            </div>
                            {limit > 0 && (
                                <div className="mb-4 p-3 rounded-xl bg-violet-500/10 border border-violet-500/20 text-xs text-violet-300 flex items-center justify-between">
                                    <span>المتبقي: <b className="text-white">{remaining}</b> / {limit}</span>
                                    <span>{bulkList.length} عروض في القائمة</span>
                                </div>
                            )}
                            {bulkSubmitting && (
                                <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    جاري النشر {bulkProgress.done} / {bulkProgress.total}
                                    {bulkProgress.errors.length > 0 && <span className="text-rose-300">— أخطاء: {bulkProgress.errors.length}</span>}
                                </div>
                            )}
                            <div className="space-y-4">
                                {bulkList.map((row, idx) => {
                                    const prod = products.find(p => p.id == row.product_id);
                                    return (
                                        <div key={row._id} className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 space-y-3 relative">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold text-indigo-400">عرض #{idx + 1}</span>
                                                <button type="button" onClick={() => removeBulkRow(row._id)} disabled={bulkList.length <= 1} className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-gray-400 hover:text-rose-400 disabled:opacity-30">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                            <div>
                                                <div className="relative mb-2">
                                                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                                                    <input type="text" value={row.productSearch} onChange={e => updateBulkRow(row._id, { productSearch: e.target.value, product_id: '' })} className="input-field w-full pr-10 text-sm" placeholder="ابحث عن منتج..." />
                                                    {row.product_id && prod && (
                                                        <span className="absolute left-8 top-1/2 -translate-y-1/2 text-xs text-emerald-400 hidden sm:block">{prod.name_ar}</span>
                                                    )}
                                                </div>
                                                <div className="max-h-32 overflow-y-auto rounded-xl bg-white/5 border border-white/10 divide-y divide-white/5">
                                                    {products.filter(p => !row.productSearch || p.name_ar?.toLowerCase().includes(row.productSearch.toLowerCase()) || p.barcode?.includes(row.productSearch)).slice(0, 20).map(p => (
                                                        <button type="button" key={p.id} onClick={() => updateBulkRow(row._id, { product_id: p.id, productSearch: p.name_ar })} className={`w-full text-right px-3 py-2 flex items-center justify-between hover:bg-white/5 ${row.product_id == p.id ? 'bg-indigo-500/10 text-indigo-400' : ''}`}>
                                                            <span className="text-sm">{p.name_ar}</span>
                                                            <span className="text-xs text-emerald-400">{p.price} ₪</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            {row.product_id && (
                                                <div className="space-y-2">
                                                    {row.tiers.map((t, ti) => (
                                                        <div key={ti} className="flex items-end gap-2">
                                                            <div className="flex-1">
                                                                <label className="block text-[11px] text-gray-400 mb-1">الكمية</label>
                                                                <input type="number" min="1" value={t.quantity} onChange={e => updateBulkTier(row._id, ti, 'quantity', e.target.value)} className="input-field w-full text-center !py-2 text-sm" placeholder="1" />
                                                            </div>
                                                            <div className="flex-1">
                                                                <label className="block text-[11px] text-gray-400 mb-1">السعر</label>
                                                                <div className="relative">
                                                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs">₪</span>
                                                                    <input type="number" step="0.01" value={t.price} onChange={e => updateBulkTier(row._id, ti, 'price', e.target.value)} className="input-field w-full text-right pl-7 !py-2 text-sm" placeholder="0.00" />
                                                                </div>
                                                            </div>
                                                            <button type="button" onClick={() => removeBulkTier(row._id, ti)} disabled={row.tiers.length <= 1} className="p-1.5 mb-1 rounded-lg bg-white/5 hover:bg-rose-500/20 disabled:opacity-30">
                                                                <X className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                    <button type="button" onClick={() => addBulkTier(row._id)} className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1">
                                                        <Plus className="w-3 h-3" /> إضافة شريحة
                                                    </button>
                                                </div>
                                            )}
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-xs text-gray-400 mb-1">ينتهي في</label>
                                                    <input type="datetime-local" value={row.ends_at} onChange={e => updateBulkRow(row._id, { ends_at: e.target.value })} className="input-field w-full text-sm" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-gray-400 mb-1">صورة</label>
                                                    <input type="file" accept="image/*" onChange={e => {
                                                        const f = e.target.files[0];
                                                        if (f) updateBulkRow(row._id, { image: f, imagePreview: URL.createObjectURL(f) });
                                                    }} className="input-field w-full text-xs" />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <button type="button" onClick={addBulkRow} className="w-full mt-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-bold flex items-center justify-center gap-2">
                                <Plus className="w-4 h-4" /> إضافة سطر عرض آخر
                            </button>
                            {bulkProgress.errors.length > 0 && (
                                <div className="mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 space-y-1">
                                    {bulkProgress.errors.map((er, i) => <div key={i}>• {er}</div>)}
                                </div>
                            )}
                            <div className="flex gap-3 mt-6">
                                <button type="button" onClick={() => setShowBulkModal(false)} className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 font-bold">
                                    إلغاء
                                </button>
                                <button type="button" onClick={handleBulkSubmit} disabled={bulkSubmitting} className="flex-1 py-3 rounded-xl bg-gradient-to-l from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-black flex items-center justify-center gap-2 disabled:opacity-40">
                                    {bulkSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> جاري النشر {bulkProgress.done}/{bulkProgress.total}</> : `نشر كل العروض (${bulkList.filter(r=>r.product_id).length})`}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default OwnerOffers;
