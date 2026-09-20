import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { Store, MapPin, Building2, Palette, User, X, Loader2, Phone, Mail, CheckCircle2, AlertCircle, ArrowUp, ArrowDown, GripVertical, Truck, Sparkles, Package, Trash2, AlertTriangle, Clock } from 'lucide-react';

const AdminMalls = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { data: plans } = useQuery({
        queryKey: ['subscription-plans'],
        queryFn: async () => {
            const r = await api.get('/admin/subscription-plans');
            return r.data;
        }
    });

    const [formData, setFormData] = useState({
        mall_name_ar: '', mall_name_en: '', owner_name: '', owner_email: '',
        owner_password: '', contact_email: '', contact_phone: '',
        location_arabic: '', type: 'mall', latitude: '', longitude: '',
        plan_id: '', duration_months: 3, delivery_enabled: false, offer_limit: 0, enable_quantity_system: false,
        open_time: '', close_time: ''
    });
    const [editingMall, setEditingMall] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [typeFilter, setTypeFilter] = useState('all');

    const { data: malls, isLoading } = useQuery({
        queryKey: ['admin-malls'],
        queryFn: async () => {
            const r = await api.get('/admin/malls');
            return r.data;
        }
    });

    const createMallMutation = useMutation({
        mutationFn: async (payload) => {
            const response = await api.post('/admin/malls', payload);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['admin-malls']);
            setShowModal(false);
            setEditingMall(null);
            setFormData({
                mall_name_ar: '', mall_name_en: '', owner_name: '', owner_email: '',
                owner_password: '', contact_email: '', contact_phone: '',
                location_arabic: '', type: 'mall', latitude: '', longitude: '',
                plan_id: '', duration_months: 3, enable_quantity_system: false,
            });
        },
        onError: (err) => alert(err.response?.data?.message || 'فشل في إنشاء المول')
    });

    const updateMallMutation = useMutation({
        mutationFn: async ({ id, data }) => {
            const r = await api.put(`/admin/malls/${id}`, data);
            return r.data;
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries(['admin-malls']);
            setShowModal(false);
            setEditingMall(null);
        },
        onError: (err) => alert(err.response?.data?.message || 'فشل في تحديث المول')
    });

    const toggleActiveMutation = useMutation({
        mutationFn: async ({ id, is_active }) => {
            return await api.put(`/admin/malls/${id}`, { is_active });
        },
        onSuccess: () => queryClient.invalidateQueries(['admin-malls'])
    });

    const [reorderMode, setReorderMode] = useState(false);
    const [localOrder, setLocalOrder] = useState([]);

    const updateOrderMutation = useMutation({
        mutationFn: async (order) => {
            const r = await api.put('/admin/malls/order', { order });
            return r.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['admin-malls']);
            setReorderMode(false);
        },
        onError: (err) => alert(err.response?.data?.message || 'فشل في تحديث الترتيب')
    });

    const [deleteTarget, setDeleteTarget] = useState(null);

    const deleteMallMutation = useMutation({
        mutationFn: async (id) => (await api.delete(`/admin/malls/${id}`)).data,
        onSuccess: (data) => {
            queryClient.invalidateQueries(['admin-malls', 'admin-stats']);
            setDeleteTarget(null);
            alert(data.message);
        },
        onError: (err) => alert(err.response?.data?.message || 'فشل في حذف المنشأة')
    });

    const mallList = Array.isArray(malls) ? malls : malls?.data || [];
    const filteredMalls = typeFilter === 'all' ? mallList : mallList.filter(m => m.type === typeFilter);

    const handleMoveUp = (index) => {
        if (index === 0) return;
        const newOrder = [...localOrder];
        [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
        setLocalOrder(newOrder);
    };

    const handleMoveDown = (index) => {
        if (index === localOrder.length - 1) return;
        const newOrder = [...localOrder];
        [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
        setLocalOrder(newOrder);
    };

    const enterReorderMode = () => {
        setLocalOrder([...mallList]);
        setReorderMode(true);
    };

    const saveOrder = () => {
        const payload = localOrder.map((mall, i) => ({
            id: mall.id,
            sort_order: i
        }));
        updateOrderMutation.mutate(payload);
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        if (editingMall) {
            updateMallMutation.mutate({
                id: editingMall.id,
                data: {
                    name_ar: formData.mall_name_ar,
                    name_en: formData.mall_name_en,
                    location_arabic: formData.location_arabic,
                    type: formData.type,
                    latitude: formData.latitude,
                    longitude: formData.longitude,
                    contact_email: formData.contact_email,
                    contact_phone: formData.contact_phone,
                    owner_name: formData.owner_name,
                    owner_email: formData.owner_email,
                    plan_id: formData.plan_id,
                    duration_months: formData.duration_months,
                    delivery_enabled: formData.delivery_enabled,
                    offer_limit: formData.offer_limit,
                    enable_quantity_system: formData.enable_quantity_system,
                    open_time: formData.open_time || null,
                    close_time: formData.close_time || null
                }
            });
        } else {
            createMallMutation.mutate(formData);
        }
    };

    const { data: subscriptionsList } = useQuery({
        queryKey: ['admin-mall-subscriptions'],
        queryFn: async () => (await api.get('/admin/mall-subscriptions')).data,
    });
    const allSubs = subscriptionsList?.data || [];

    const openEdit = (mall) => {
        const mallSub = allSubs.find(s => s.mall_id === mall.id && s.status === 'active');
        setEditingMall(mall);
        setFormData({
            mall_name_ar: mall.name_ar || '',
            mall_name_en: mall.name_en || '',
            location_arabic: mall.location_arabic || '',
            type: mall.type || 'mall',
            latitude: mall.latitude || '',
            longitude: mall.longitude || '',
            contact_email: mall.contact_email || '',
            contact_phone: mall.contact_phone || '',
            owner_name: mall.owner?.name || '',
            owner_email: mall.owner?.email || '',
            owner_password: '',
            delivery_enabled: mall.delivery_enabled ?? false,
            offer_limit: mall.offer_limit ?? 0,
            enable_quantity_system: mall.enable_quantity_system ?? false,
            open_time: mall.open_time ? String(mall.open_time).slice(0, 5) : '',
            close_time: mall.close_time ? String(mall.close_time).slice(0, 5) : '',
            plan_id: mallSub?.plan_id || '',
            duration_months: mallSub?.duration_months || 3,
        });
        setShowModal(true);
    };

    return (
        <div className="space-y-8 pb-10">
            <header className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 text-right">
                <div className="flex gap-2 shrink-0 order-1 sm:order-2">
                    {reorderMode ? (
                        <>
                            <button
                                onClick={saveOrder}
                                disabled={updateOrderMutation.isPending}
                                className="btn-primary !py-3 !px-6 flex items-center gap-2"
                            >
                                {updateOrderMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                حفظ الترتيب
                            </button>
                            <button
                                onClick={() => setReorderMode(false)}
                                className="btn-secondary !py-3 !px-6"
                            >
                                إلغاء
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={() => { setEditingMall(null); setShowModal(true); }}
                                className="btn-primary !py-3 !px-6"
                            >
                                <Store className="w-4 h-4" />
                                إضافة منشأة جديدة
                            </button>
                            {mallList.length > 1 && (
                                <button
                                    onClick={enterReorderMode}
                                    className="btn-secondary !py-3 !px-6 flex items-center gap-2"
                                >
                                    <GripVertical className="w-4 h-4" />
                                    ترتيب الظهور
                                </button>
                            )}
                        </>
                    )}
                </div>
                <div className="order-2 sm:order-1 space-y-3">
                    <div className="flex items-center gap-4">
                        <h2 className="text-2xl sm:text-3xl font-extrabold flex items-center gap-3">
                            إدارة المنشآت
                            <Building2 className="w-8 h-8 text-blue-400" />
                            <span className="text-sm font-bold text-gray-500 bg-white/5 px-3 py-1 rounded-xl hidden sm:inline-flex items-center gap-1">
                                <Store className="w-3.5 h-3.5" /> {mallList.length}
                            </span>
                        </h2>
                        <div className="flex gap-1 bg-white/5 p-1 rounded-2xl border border-white/5">
                            {['all', 'mall', 'supermarket'].map(t => (
                                <button key={t} onClick={() => setTypeFilter(t)}
                                    className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${typeFilter === t ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' : 'text-gray-400 hover:text-white'}`}>
                                    {t === 'all' ? 'الكل' : t === 'mall' ? 'مولات' : 'سوبرماركت'}
                                </button>
                            ))}
                        </div>
                    </div>
                    <p className="text-gray-400 mt-1">{typeFilter === 'mall' ? 'عرض المولات التجارية' : typeFilter === 'supermarket' ? 'عرض السوبرماركت' : 'عرض جميع المنشآت المسجلة'}</p>
                </div>
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {isLoading ? (
                    [...Array(6)].map((_, i) => (
                        <div key={i} className="h-56 rounded-3xl bg-white/5 shimmer" />
                    ))
                ) : mallList.length === 0 ? (
                    <div className="col-span-full py-20 text-center text-gray-500 glass-card rounded-3xl border border-white/5">
                        <Store className="w-16 h-16 mx-auto mb-4 opacity-20" />
                        <p className="font-bold text-lg">
                            {typeFilter === 'mall' ? 'لا توجد مولات مسجلة' : typeFilter === 'supermarket' ? 'لا يوجد سوبرماركت مسجل' : 'لا توجد أي منشآت مسجلة حالياً'}
                        </p>
                    </div>
                ) : (
                    (reorderMode ? localOrder : filteredMalls).map((mall, i) => (
                        <motion.div
                            key={mall.id}
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className={`glass-card rounded-3xl p-5 relative overflow-hidden group hover:shadow-2xl hover:shadow-blue-500/10 transition-all border border-white/5 flex flex-col min-h-[220px] ${reorderMode ? 'ring-2 ring-indigo-500/40' : ''}`}
                        >
                            {/* Reorder Handle + Sort Order Badge */}
                            {reorderMode && (
                                <div className="absolute top-3 left-3 z-10 flex items-center gap-1">
                                    <span className="bg-indigo-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">
                                        {i + 1}
                                    </span>
                                </div>
                            )}

                            {/* Top Status Bar */}
                            <div className={`absolute top-0 right-0 w-full h-1.5 ${mall.is_active ? 'bg-emerald-500' : 'bg-rose-500'}`} />

                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center border border-white/10 group-hover:border-blue-500/50 transition-colors shadow-lg">
                                    <Store className="w-6 h-6 text-gray-400 group-hover:text-blue-400" />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${mall.is_active ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                                        {mall.is_active ? 'متجر نشط' : 'متجر معلق'}
                                    </span>
                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${mall.type === 'supermarket' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'}`}>
                                        {mall.type === 'supermarket' ? 'سوبرماركت' : 'مول تجاري'}
                                    </span>
                                </div>
                            </div>

                            <div className="text-right flex-1 mb-5">
                                <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors truncate">{mall.name_ar}</h3>
                                <p className="text-sm text-gray-500 mb-3 truncate">{mall.name_en || 'No english name'}</p>

                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-xs text-gray-400">
                                        <span className="truncate">{mall.location_arabic || 'غير محدد'}</span>
                                        <MapPin className="w-3.5 h-3.5 text-gray-600 shrink-0" />
                                    </div>
                                    {mall.owner && (
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2 text-[11px] text-gray-400">
                                                <span>{mall.owner.name}</span>
                                                <User className="w-3.5 h-3.5" />
                                            </div>
                                            <div className="flex items-center gap-2 text-[10px] text-gray-500">
                                                <span className="truncate">{mall.owner.email}</span>
                                                <Mail className="w-3 h-3" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Actions Group */}
                            {reorderMode ? (
                                <div className="grid grid-cols-2 gap-2.5">
                                    <button
                                        onClick={() => handleMoveUp(i)}
                                        disabled={i === 0}
                                        className={`py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all border ${i === 0 ? 'bg-white/5 text-gray-600 border-white/10 cursor-not-allowed' : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400 hover:bg-indigo-500 hover:text-white'}`}
                                    >
                                        <ArrowUp className="w-4 h-4" />
                                        للأعلى
                                    </button>
                                    <button
                                        onClick={() => handleMoveDown(i)}
                                        disabled={i === (reorderMode ? localOrder : mallList).length - 1}
                                        className={`py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all border ${i === (reorderMode ? localOrder : mallList).length - 1 ? 'bg-white/5 text-gray-600 border-white/10 cursor-not-allowed' : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400 hover:bg-indigo-500 hover:text-white'}`}
                                    >
                                        <ArrowDown className="w-4 h-4" />
                                        للأسفل
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-2.5">
                                    <button
                                        onClick={() => openEdit(mall)}
                                        className="py-3 rounded-xl bg-blue-500/10 hover:bg-blue-500 text-blue-400 hover:text-white font-bold text-xs flex items-center justify-center gap-2 transition-all border border-blue-500/20"
                                    >
                                        تعديل
                                    </button>
                                    <button
                                        onClick={() => toggleActiveMutation.mutate({ id: mall.id, is_active: !mall.is_active })}
                                        className={`py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all border ${mall.is_active ? 'bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white'}`}
                                    >
                                        {mall.is_active ? 'تعطيل' : 'تفعيل'}
                                    </button>
                                    <button
                                        onClick={() => navigate(`/admin/malls/${mall.id}/theme`)}
                                        className="py-3 rounded-xl bg-purple-500/10 hover:bg-purple-500 text-purple-400 hover:text-white font-bold text-xs flex items-center justify-center gap-2 transition-all border border-purple-500/20"
                                    >
                                        <Palette className="w-4 h-4" />
                                        التصميم
                                    </button>
                                    <button
                                        onClick={() => setDeleteTarget(mall)}
                                        className="py-3 rounded-xl bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white font-bold text-xs flex items-center justify-center gap-2 transition-all border border-red-500/20"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        حذف
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    ))
                )}
            </div>

            {/* Modal */}
            <AnimatePresence>
                {showModal && (
                    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, y: 60 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 60 }}
                            className="w-full sm:max-w-xl glass-dark p-6 sm:p-8 rounded-t-[2.5rem] sm:rounded-[2.5rem] border border-white/10 relative max-h-[90vh] overflow-y-auto"
                        >
                            <button onClick={() => setShowModal(false)} className="absolute top-5 left-5 p-2 rounded-full hover:bg-white/10 transition-colors">
                                <X className="w-5 h-5 text-gray-400 hover:text-white" />
                            </button>

                            <h3 className="text-xl sm:text-2xl font-bold mb-1 text-right">
                                {editingMall
                                    ? `تعديل بيانات ${editingMall.type === 'supermarket' ? 'السوبرماركت' : 'المول'}`
                                    : `إضافة ${formData.type === 'supermarket' ? 'سوبرماركت' : 'مول'} جديد`}
                            </h3>
                            <p className="text-gray-500 text-sm mb-6 text-right">
                            </p>

                            <form onSubmit={handleSubmit} className="space-y-6 text-right">
                                {/* Mall Details Section */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-400 mb-2">الاسم بالعربية</label>
                                        <input
                                            type="text" required
                                            placeholder="سيتي مول"
                                            value={formData.mall_name_ar}
                                            onChange={e => setFormData({ ...formData, mall_name_ar: e.target.value })}
                                            className="input-field w-full"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-400 mb-2">الاسم بالإنجليزية</label>
                                        <input
                                            type="text" required
                                            placeholder="City Mall"
                                            value={formData.mall_name_en}
                                            onChange={e => setFormData({ ...formData, mall_name_en: e.target.value })}
                                            className="input-field w-full text-right"
                                        />
                                    </div>
                                </div>

                                <div className="border-t border-white/5 pt-5 mt-5">
                                    <h4 className="text-sm font-bold text-blue-400 mb-4">بيانات المالك (User Account)</h4>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-400 mb-2">اسم صاحب المول</label>
                                        <input
                                            type="text" required
                                            placeholder="الاسم الثلاثي"
                                            value={formData.owner_name}
                                            onChange={e => setFormData({ ...formData, owner_name: e.target.value })}
                                            className="input-field w-full"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-400 mb-2">البريد الإلكتروني للمالك</label>
                                        <input
                                            type="email" required
                                            placeholder="owner@mall.com"
                                            value={formData.owner_email}
                                            onChange={e => setFormData({ ...formData, owner_email: e.target.value })}
                                            className="input-field w-full text-right"
                                        />
                                    </div>
                                </div>

                                {!editingMall && (
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-400 mb-2">كلمة المرور المؤقتة</label>
                                        <input
                                            type="text" required minLength={8}
                                            placeholder="8 خانات على الأقل"
                                            value={formData.owner_password}
                                            onChange={e => setFormData({ ...formData, owner_password: e.target.value })}
                                            className="input-field w-full text-right font-mono"
                                        />
                                    </div>
                                )}

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-400 mb-2">بريد الاتصال (اختياري)</label>
                                        <input
                                            type="email"
                                            placeholder="contact@mall.com"
                                            value={formData.contact_email}
                                            onChange={e => setFormData({ ...formData, contact_email: e.target.value })}
                                            className="input-field w-full text-right"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-400 mb-2">رقم الهاتف (اختياري)</label>
                                        <input
                                            type="text"
                                            placeholder="05xxxxxxx"
                                            value={formData.contact_phone}
                                            onChange={e => setFormData({ ...formData, contact_phone: e.target.value })}
                                            className="input-field w-full text-right"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-400 mb-2">العنوان الجغرافي</label>
                                    <div className="relative group">
                                        <MapPin className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                        <input
                                            type="text" required
                                            placeholder="المدينة - الشارع - المعلم القريب"
                                            value={formData.location_arabic}
                                            onChange={e => setFormData({ ...formData, location_arabic: e.target.value })}
                                            className="input-field w-full pr-11"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-400 mb-2">نوع النشاط</label>
                                        <select
                                            value={formData.type}
                                            onChange={e => setFormData({ ...formData, type: e.target.value })}
                                            className="input-field w-full appearance-none bg-gray-900"
                                        >
                                            <option value="mall">مول تجاري متنوع</option>
                                            <option value="supermarket">سوبرماركت / بقالة</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-400 mb-2">باقة الاشتراك</label>
                                        <select
                                            value={formData.plan_id}
                                            onChange={e => setFormData({ ...formData, plan_id: e.target.value })}
                                            className="input-field w-full appearance-none bg-gray-900 border-indigo-500/30"
                                            required
                                        >
                                            <option value="">اختر الباقة...</option>
                                            {plans?.map(p => (
                                                <option key={p.id} value={p.id}>
                                                    {p.name_ar}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    {editingMall && formData.plan_id && (
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-400 mb-2">مدة الاشتراك</label>
                                            <select
                                                value={formData.duration_months}
                                                onChange={e => setFormData({ ...formData, duration_months: parseInt(e.target.value) })}
                                                className="input-field w-full appearance-none bg-gray-900 border-indigo-500/30"
                                            >
                                                <option value={3}>3 أشهر</option>
                                                <option value={6}>6 أشهر</option>
                                                <option value={12}>سنة (12 شهر)</option>
                                            </select>
                                            {(() => {
                                                const sub = allSubs.find(s => s.mall_id === editingMall?.id && s.status === 'active');
                                                return sub ? (
                                                    <p className="text-[11px] text-gray-500 mt-1">
                                                        الاشتراك الحالي: {sub.duration_months ? `${sub.duration_months} أشهر` : (sub.is_trial ? 'تجربة' : '—')}
                                                        {sub.ends_at ? ` | ينتهي: ${new Date(sub.ends_at).toLocaleDateString('ar-EG')}` : ''}
                                                    </p>
                                                ) : null;
                                            })()}
                                        </div>
                                    )}
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-400 mb-2">الإحداثيات (اختياري)</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text" placeholder="Lat"
                                                value={formData.latitude}
                                                onChange={e => setFormData({ ...formData, latitude: e.target.value })}
                                                className="input-field text-center text-xs w-1/2"
                                            />
                                            <input
                                                type="text" placeholder="Lng"
                                                value={formData.longitude}
                                                onChange={e => setFormData({ ...formData, longitude: e.target.value })}
                                                className="input-field text-center text-xs w-1/2"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {editingMall && (
                                    <>
                                        <div className="border-t border-white/5 pt-5 mt-5">
                                            <h4 className="text-sm font-bold text-emerald-400 mb-4">إعدادات التوصيل والعروض</h4>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/10">
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, delivery_enabled: !formData.delivery_enabled })}
                                                    className={`relative w-12 h-6 rounded-full transition-all duration-300 ${formData.delivery_enabled ? 'bg-emerald-500' : 'bg-gray-600'}`}
                                                >
                                                    <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-300 ${formData.delivery_enabled ? 'right-0.5' : 'right-6'}`} />
                                                </button>
                                        <div className="flex items-center gap-2">
                                            <Truck className="w-5 h-5 text-emerald-400" />
                                            <span className="text-sm font-bold text-gray-300">تفعيل التوصيل للمول</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/10">
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, enable_quantity_system: !formData.enable_quantity_system })}
                                            className={`relative w-12 h-6 rounded-full transition-all duration-300 ${formData.enable_quantity_system ? 'bg-blue-500' : 'bg-gray-600'}`}
                                        >
                                            <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-300 ${formData.enable_quantity_system ? 'right-0.5' : 'right-6'}`} />
                                        </button>
                                        <div className="flex items-center gap-2">
                                            <Package className="w-5 h-5 text-blue-400" />
                                            <span className="text-sm font-bold text-gray-300">تفعيل نظام الكميات</span>
                                        </div>
                                    </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-400 mb-2 flex items-center gap-2">
                                                    <Sparkles className="w-4 h-4 text-amber-400" />
                                                    الحد الأقصى للعروض المسموحة
                                                </label>
                                                <input
                                                    type="number" min="0"
                                                    value={formData.offer_limit}
                                                    onChange={e => setFormData({ ...formData, offer_limit: parseInt(e.target.value) || 0 })}
                                                    className="input-field w-full text-center"
                                                />
                                            </div>
                                        </div>

                                        <div className="border-t border-white/5 pt-5 mt-5">
                                            <h4 className="text-sm font-bold text-amber-400 mb-2 flex items-center gap-2">
                                                <Clock className="w-4 h-4" />
                                                ساعات الدوام اليومية
                                            </h4>
                                            <p className="text-[11px] text-gray-500 mb-4">حدد من أي ساعة إلى أي ساعة يعمل المتجر يومياً — يظهر للزبون هل المتجر مفتوح أم مغلق حسب الوقت الحالي. اتركهما فارغين إذا كان المتجر يعمل دائماً.</p>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-semibold text-gray-400 mb-2">من ساعة</label>
                                                    <input
                                                        type="time"
                                                        value={formData.open_time}
                                                        onChange={e => setFormData({ ...formData, open_time: e.target.value })}
                                                        className="input-field w-full text-center font-mono"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-semibold text-gray-400 mb-2">إلى ساعة</label>
                                                    <input
                                                        type="time"
                                                        value={formData.close_time}
                                                        onChange={e => setFormData({ ...formData, close_time: e.target.value })}
                                                        className="input-field w-full text-center font-mono"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}

                                <button
                                    type="submit"
                                    disabled={createMallMutation.isLoading || updateMallMutation.isLoading}
                                    className="btn-primary w-full !py-4 mt-2 flex items-center justify-center gap-2"
                                >
                                    {createMallMutation.isPending || updateMallMutation.isPending
                                        ? <Loader2 className="animate-spin w-5 h-5" />
                                        : (editingMall ? 'حفظ التغييرات' : 'اعتماد وإنشاء المتجر')
                                    }
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {deleteTarget && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="w-full max-w-md glass-dark p-6 sm:p-8 rounded-[2rem] border border-white/10 relative"
                        >
                            <div className="flex flex-col items-center text-center space-y-6">
                                <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20">
                                    <AlertTriangle className="w-10 h-10 text-red-400" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-2xl font-bold text-white">تأكيد حذف المنشأة</h3>
                                    <p className="text-gray-400 text-sm">
                                        هل أنت متأكد من حذف <span className="text-red-400 font-bold">{deleteTarget.name_ar}</span>؟
                                        <br />
                                        سيتم حذف جميع المنتجات والطلبات والبيانات المرتبطة بها نهائياً.
                                        {deleteTarget.owner && <><br />سيتم أيضاً حذف حساب المالك <span className="text-red-400">{deleteTarget.owner.name}</span> إذا لم يكن لديه منشآت أخرى.</>}
                                    </p>
                                </div>
                                <div className="flex items-center gap-3 w-full">
                                    <button
                                        onClick={() => setDeleteTarget(null)}
                                        disabled={deleteMallMutation.isPending}
                                        className="flex-1 py-3 rounded-xl bg-white/5 text-gray-300 hover:bg-white/10 transition-all font-bold border border-white/8 disabled:opacity-50"
                                    >
                                        إلغاء
                                    </button>
                                    <button
                                        onClick={() => deleteMallMutation.mutate(deleteTarget.id)}
                                        disabled={deleteMallMutation.isPending}
                                        className="flex-1 py-3 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-all font-bold disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {deleteMallMutation.isPending ? (
                                            <><Loader2 className="w-4 h-4 animate-spin" /> جاري الحذف...</>
                                        ) : (
                                            <><Trash2 className="w-4 h-4" /> نعم، احذف الكل</>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AdminMalls;
