import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import { Megaphone, Plus, Trash2, Edit, Eye, EyeOff, Image, Link, Clock, CalendarDays, X, Loader2 } from 'lucide-react';

const audienceLabels = {
    all: 'الكل', logged_in: 'المستخدمون المسجلون', guest: 'الزوار',
    customer: 'الزبائن', 'mall-owner': 'مدراء المولات', 'supermarket-owner': 'مدراء السوبرماركت',
    'delivery-person': 'مندوبو توصيل', 'order-tracker': 'متابعو طلبات',
};

const pageLabels = {
    all: 'جميع الصفحات', home: 'الصفحة الرئيسية', malls: 'المولات',
    cart: 'السلة', offers: 'العروض',
};

const AdminPopups = () => {
    const queryClient = useQueryClient();
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({
        title: '', content: '', image: null, btn_text: '', btn_url: '',
        target_audience: 'all', target_page: 'all', is_active: true,
        auto_close_seconds: 0, starts_at: '', ends_at: '',
    });

    const { data: popups, isLoading } = useQuery({
        queryKey: ['admin-popups'],
        queryFn: async () => (await api.get('/admin/popups')).data,
    });

    const saveMutation = useMutation({
        mutationFn: async ({ id, data }) => {
            const hasFile = data.image instanceof File;
            if (!hasFile) {
                if (id) return api.put(`/admin/popups/${id}`, data);
                return api.post('/admin/popups', data);
            }
            const fd = new FormData();
            Object.entries(data).forEach(([k, v]) => { if (v !== null && v !== undefined) fd.append(k, v); });
            if (id) fd.append('_method', 'PUT');
            return api.post(id ? `/admin/popups/${id}` : '/admin/popups', fd);
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id) => api.delete(`/admin/popups/${id}`),
    });

    const toggleMutation = useMutation({
        mutationFn: async ({ id, is_active }) => api.put(`/admin/popups/${id}`, { is_active }),
    });

    const resetForm = () => setForm({
        title: '', content: '', image: null, btn_text: '', btn_url: '',
        target_audience: 'all', target_page: 'all', is_active: true,
        auto_close_seconds: 0, starts_at: '', ends_at: '',
    });

    const openEdit = (popup) => {
        setEditing(popup.id);
        setForm({
            title: popup.title || '', content: popup.content || '', image: null, btn_text: popup.btn_text || '', btn_url: popup.btn_url || '',
            target_audience: popup.target_audience, target_page: popup.target_page, is_active: popup.is_active,
            auto_close_seconds: popup.auto_close_seconds || 0, starts_at: popup.starts_at || '', ends_at: popup.ends_at || '',
        });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const payload = {};
        Object.entries(form).forEach(([k, v]) => {
            if (k === 'image' && !v) return;
            if (v !== null && v !== undefined && v !== '') payload[k] = v;
        });
        try {
            if (editing) await saveMutation.mutateAsync({ id: editing, data: payload });
            else await saveMutation.mutateAsync({ id: null, data: payload });
            await queryClient.invalidateQueries({ queryKey: ['admin-popups'] });
            setShowModal(false);
            setEditing(null);
            resetForm();
        } catch (err) {
            const msgs = err.response?.data?.errors;
            if (msgs) alert('Validation errors:\n' + JSON.stringify(msgs, null, 2));
            else alert('Error: ' + (err.response?.data?.message || err.message));
        }
    };

    const imgUrl = (img) => img ? (img.startsWith('http') ? img : `/storage/${img}`) : null;

    return (
        <div className="space-y-8 pb-10 text-right">
            <header className="flex items-start justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-extrabold flex items-center gap-3 text-white">
                        الإعلانات المنبثقة
                        <Megaphone className="w-8 h-8 text-amber-400" />
                    </h2>
                    <p className="text-gray-400 mt-1">إنشاء وإدارة الإعلانات المنبثقة في الموقع</p>
                </div>
                <button onClick={() => { setEditing(null); resetForm(); setShowModal(true); }} className="btn-primary !py-2.5 !px-5 shrink-0">
                    <Plus className="w-4 h-4" /> إعلان جديد
                </button>
            </header>

            <div className="grid gap-4">
                {isLoading ? [...Array(3)].map((_, i) => <div key={i} className="h-24 rounded-2xl bg-white/5 shimmer" />)
                : popups?.length === 0 ? (
                    <div className="text-center py-16 text-gray-500 glass-card rounded-3xl border border-white/5">
                        <Megaphone className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p className="font-bold">لا توجد إعلانات</p>
                    </div>
                ) : popups?.map(popup => (
                    <motion.div key={popup.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                        className="glass-card rounded-2xl border border-white/5 p-5 flex items-center gap-4">
                        {popup.image && <img src={imgUrl(popup.image)} alt="" className="w-16 h-16 rounded-xl object-cover shrink-0" />}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <h4 className="font-bold text-white truncate">{popup.title || 'بدون عنوان'}</h4>
                                <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${popup.is_active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-gray-500/10 text-gray-400'}`}>
                                    {popup.is_active ? 'نشط' : 'متوقف'}
                                </span>
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-500 flex-wrap">
                                <span>{audienceLabels[popup.target_audience]}</span>
                                <span>•</span>
                                <span>{pageLabels[popup.target_page] || popup.target_page}</span>
                                {popup.auto_close_seconds > 0 && <><span>•</span><span>يغلق تلقائياً بعد {popup.auto_close_seconds}ث</span></>}
                            </div>
                            {popup.content && <p className="text-xs text-gray-500 mt-1 line-clamp-1">{popup.content}</p>}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <button onClick={async () => {
                                try {
                                    await toggleMutation.mutateAsync({ id: popup.id, is_active: !popup.is_active });
                                    await queryClient.invalidateQueries({ queryKey: ['admin-popups'] });
                                } catch {}
                            }}
                                className="p-2 rounded-xl bg-white/5 text-gray-500 hover:text-white transition-all" title={popup.is_active ? 'إيقاف' : 'تفعيل'}>
                                {popup.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                            <button onClick={() => openEdit(popup)}
                                className="p-2 rounded-xl bg-white/5 text-gray-500 hover:text-indigo-400 transition-all" title="تعديل">
                                <Edit className="w-4 h-4" />
                            </button>
                            <button onClick={async () => {
                                if (!window.confirm('حذف هذا الإعلان؟')) return;
                                try {
                                    await deleteMutation.mutateAsync(popup.id);
                                    await queryClient.invalidateQueries({ queryKey: ['admin-popups'] });
                                } catch {}
                            }}
                                disabled={deleteMutation.isPending}
                                className="p-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all" title="حذف">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Modal */}
            <AnimatePresence>
                {showModal && (
                    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm">
                        <motion.div initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 60 }}
                            className="w-full sm:max-w-2xl glass-dark p-6 sm:p-8 rounded-t-[2rem] sm:rounded-[2rem] border border-white/10 relative max-h-[90vh] overflow-y-auto">
                            <button onClick={() => setShowModal(false)} className="absolute top-5 left-5 p-2 rounded-full hover:bg-white/10 transition-colors">
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                            <h3 className="text-xl font-bold mb-1 text-right">{editing ? 'تعديل الإعلان' : 'إعلان منبثق جديد'}</h3>
                            <p className="text-gray-500 text-sm mb-6 text-right">حدد المحتوى والجمهور المستهدف</p>

                            <form onSubmit={handleSubmit} className="space-y-4 text-right" encType="multipart/form-data">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-400 mb-2">العنوان</label>
                                    <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                                        className="input-field" placeholder="عنوان الإعلان" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-400 mb-2">المحتوى النصي</label>
                                    <textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })}
                                        className="input-field min-h-[100px]" placeholder="نص الإعلان..." />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-400 mb-2">صورة الإعلان</label>
                                    <input type="file" accept="image/*" onChange={e => setForm({ ...form, image: e.target.files[0] })}
                                        className="input-field" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-400 mb-2">نص الزر</label>
                                        <input type="text" value={form.btn_text} onChange={e => setForm({ ...form, btn_text: e.target.value })}
                                            className="input-field" placeholder="مثلاً: تسوق الآن" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-400 mb-2">رابط الزر</label>
                                        <input type="text" value={form.btn_url} onChange={e => setForm({ ...form, btn_url: e.target.value })}
                                            className="input-field" placeholder="/malls" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-400 mb-2">الجمهور المستهدف</label>
                                        <select value={form.target_audience} onChange={e => setForm({ ...form, target_audience: e.target.value })}
                                            className="input-field">
                                            {Object.entries(audienceLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-400 mb-2">الصفحة المستهدفة</label>
                                        <select value={form.target_page} onChange={e => setForm({ ...form, target_page: e.target.value })}
                                            className="input-field">
                                            {Object.entries(pageLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-400 mb-2">الإغلاق التلقائي (ثواني)</label>
                                        <input type="number" min="0" value={form.auto_close_seconds} onChange={e => setForm({ ...form, auto_close_seconds: parseInt(e.target.value) || 0 })}
                                            className="input-field" placeholder="0 = يدوي" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-400 mb-2">تاريخ البدء</label>
                                        <input type="datetime-local" value={form.starts_at} onChange={e => setForm({ ...form, starts_at: e.target.value })}
                                            className="input-field" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-400 mb-2">تاريخ الانتهاء</label>
                                        <input type="datetime-local" value={form.ends_at} onChange={e => setForm({ ...form, ends_at: e.target.value })}
                                            className="input-field" />
                                    </div>
                                </div>
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })}
                                        className="w-5 h-5 rounded-lg accent-indigo-500" />
                                    <span className="text-sm font-bold text-gray-300">نشط</span>
                                </label>
                                <button type="submit" disabled={saveMutation.isPending}
                                    className="btn-primary w-full !py-3.5 mt-4">
                                    {saveMutation.isPending ? <Loader2 className="animate-spin w-5 h-5 mx-auto" /> : (editing ? 'حفظ التعديلات' : 'إنشاء الإعلان')}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AdminPopups;
