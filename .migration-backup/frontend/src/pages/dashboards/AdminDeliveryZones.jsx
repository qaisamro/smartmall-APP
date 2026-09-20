import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Plus, Trash2, Edit2, CheckCircle, X, Loader2 } from 'lucide-react';

const AdminDeliveryZones = () => {
    const queryClient = useQueryClient();
    const [showModal, setShowModal] = useState(false);
    const [editingZone, setEditingZone] = useState(null);
    const [formData, setFormData] = useState({ name: '', fee: 0, is_active: true });

    const { data: zones, isLoading } = useQuery({
        queryKey: ['admin-delivery-zones'],
        queryFn: async () => {
            const r = await api.get('/admin/delivery-zones');
            return r.data;
        }
    });

    const createMutation = useMutation({
        mutationFn: async (data) => await api.post('/admin/delivery-zones', data),
        onSuccess: () => {
            queryClient.invalidateQueries(['admin-delivery-zones']);
            setShowModal(false);
            setFormData({ name: '', fee: 0, is_active: true });
        }
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, ...data }) => await api.put(`/admin/delivery-zones/${id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries(['admin-delivery-zones']);
            setShowModal(false);
            setEditingZone(null);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id) => await api.delete(`/admin/delivery-zones/${id}`),
        onSuccess: () => queryClient.invalidateQueries(['admin-delivery-zones'])
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (editingZone) {
            updateMutation.mutate({ id: editingZone.id, ...formData });
        } else {
            createMutation.mutate(formData);
        }
    };

    return (
        <div className="space-y-8 pb-10 text-right">
            <header className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-extrabold flex items-center gap-3 text-white">
                        إدارة مناطق التوصيل
                        <MapPin className="w-8 h-8 text-indigo-400" />
                    </h2>
                    <p className="text-gray-400 mt-1">حدد المناطق وأسعار التوصيل الخاصة بكل منها</p>
                </div>
                <button
                    onClick={() => {
                        setEditingZone(null);
                        setFormData({ name: '', fee: 0, is_active: true });
                        setShowModal(true);
                    }}
                    className="btn-primary"
                >
                    <Plus className="w-4 h-4" />
                    إضافة منطقة توصيل جديدة
                </button>
            </header>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoading ? (
                    [...Array(3)].map((_, i) => (
                        <div key={i} className="h-40 bg-white/5 rounded-3xl shimmer" />
                    ))
                ) : zones?.map(zone => (
                    <motion.div
                        key={zone.id}
                        layout
                        className="glass-card p-6 rounded-3xl border border-white/5 space-y-4 hover:border-indigo-500/30 transition-all group"
                    >
                        <div className="flex justify-between items-start">
                            <div className={`p-2 rounded-xl ${zone.is_active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                <CheckCircle className="w-5 h-5" />
                            </div>
                            <h3 className="text-xl font-bold text-white">{zone.name}</h3>
                        </div>

                        <div className="flex items-center gap-2 text-2xl font-black text-indigo-400">
                            <span>{zone.fee}</span>
                            <span className="text-lg">₪</span>
                        </div>

                        <div className="flex gap-2 pt-2 border-t border-white/5">
                            <button
                                onClick={() => {
                                    if (window.confirm('هل أنت متأكد من حذف هذه المنطقة؟')) deleteMutation.mutate(zone.id);
                                }}
                                className="flex-1 py-2 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white transition-all text-sm font-bold"
                            >
                                <Trash2 className="w-4 h-4 mx-auto" />
                            </button>
                            <button
                                onClick={() => {
                                    setEditingZone(zone);
                                    setFormData({ name: zone.name, fee: zone.fee, is_active: zone.is_active });
                                    setShowModal(true);
                                }}
                                className="flex-1 py-2 rounded-xl bg-white/5 text-gray-400 hover:bg-indigo-500 hover:text-white transition-all text-sm font-bold"
                            >
                                <Edit2 className="w-4 h-4 mx-auto" />
                            </button>
                        </div>
                    </motion.div>
                ))}
            </div>

            <AnimatePresence>
                {showModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="w-full max-w-md glass-dark p-8 rounded-[2rem] border border-white/10 relative"
                        >
                            <button onClick={() => setShowModal(false)} className="absolute top-6 left-6 p-2 rounded-full hover:bg-white/10">
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                            <h3 className="text-2xl font-bold mb-6 text-right text-white">
                                {editingZone ? 'تعديل منطقة' : 'إضافة منطقة جديدة'}
                            </h3>
                            <form onSubmit={handleSubmit} className="space-y-6 text-right">
                                <div>
                                    <label className="block text-sm font-bold text-gray-400 mb-2">اسم المنطقة</label>
                                    <input
                                        type="text" required
                                        className="input-field"
                                        placeholder="مثال: وسط المدينة"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-400 mb-2">سعر التوصيل (₪)</label>
                                    <input
                                        type="number" required
                                        className="input-field"
                                        placeholder="0"
                                        value={formData.fee}
                                        onChange={e => setFormData({ ...formData, fee: e.target.value })}
                                    />
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-bold text-gray-400">تفعيل هذه المنطقة</span>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                                        className={`w-12 h-6 rounded-full transition-all relative ${formData.is_active ? 'bg-indigo-500' : 'bg-gray-700'}`}
                                    >
                                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${formData.is_active ? 'right-1' : 'right-7'}`} />
                                    </button>
                                </div>
                                <button className="btn-primary w-full !py-4 font-bold text-lg">
                                    {createMutation.isPending || updateMutation.isPending ? <Loader2 className="animate-spin mx-auto" /> : 'حفظ البيانات'}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AdminDeliveryZones;
