import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    TrendingUp,
    TrendingDown,
    DollarSign,
    Plus,
    Trash2,
    Calendar,
    FileText,
    Loader2,
    AlertCircle,
    ArrowRight
} from 'lucide-react';
import api from '../../api/axios';
import { themeToCssVars } from '../../utils/theme';

const OwnerAccounting = () => {
    const queryClient = useQueryClient();
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        amount: '',
        type: 'income',
        description: '',
        entry_date: new Date().toISOString().split('T')[0]
    });

    // Fetch entries
    const { data: entries, isLoading: loadingEntries } = useQuery({
        queryKey: ['owner-accounting-entries'],
        queryFn: async () => (await api.get('/owner/accounting')).data
    });

    // Fetch stats
    const { data: stats, isLoading: loadingStats } = useQuery({
        queryKey: ['owner-accounting-stats'],
        queryFn: async () => (await api.get('/owner/accounting/stats')).data
    });

    // Fetch theme for mall scoping
    const { data: mall } = useQuery({
        queryKey: ['owner-mall-accounting'],
        queryFn: async () => (await api.get('/owner/my-malls')).data?.[0]
    });

    // Mutations
    const addEntryMutation = useMutation({
        mutationFn: async (payload) => (await api.post('/owner/accounting', payload)).data,
        onSuccess: () => {
            queryClient.invalidateQueries(['owner-accounting-entries']);
            queryClient.invalidateQueries(['owner-accounting-stats']);
            setShowForm(false);
            setFormData({
                amount: '',
                type: 'income',
                description: '',
                entry_date: new Date().toISOString().split('T')[0]
            });
        }
    });

    const deleteEntryMutation = useMutation({
        mutationFn: async (id) => (await api.delete(`/owner/accounting/${id}`)).data,
        onSuccess: () => {
            queryClient.invalidateQueries(['owner-accounting-entries']);
            queryClient.invalidateQueries(['owner-accounting-stats']);
        }
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        addEntryMutation.mutate(formData);
    };

    return (
        <div className="mall-theme-scope space-y-8 pb-10 min-h-screen" style={themeToCssVars(mall?.theme)}>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-right">
                <div>
                    <h2 className="text-2xl sm:text-3xl font-extrabold flex items-center gap-3 justify-start">
                        نظام المحاسبة المصغر
                        <DollarSign className="w-8 h-8 text-emerald-400" />
                    </h2>
                    <p className="text-gray-400 mt-1">سجل مبيعاتك اليومية ومصاريفك لمتابعة أداء متجرك</p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="theme-primary !py-3 !px-6 !rounded-2xl flex items-center gap-2 font-bold transition-all"
                >
                    {showForm ? <ArrowRight className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    {showForm ? 'إلغاء' : 'إضافة حركة مالية'}
                </button>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    {
                        label: 'إجمالي الدخل',
                        value: stats?.total_income ?? 0,
                        icon: TrendingUp,
                        color: 'text-emerald-400',
                        bg: 'bg-emerald-500/10'
                    },
                    {
                        label: 'إجمالي المصاريف',
                        value: stats?.total_expenses ?? 0,
                        icon: TrendingDown,
                        color: 'text-red-400',
                        bg: 'bg-red-500/10'
                    },
                    {
                        label: 'صافي الربح',
                        value: stats?.balance ?? 0,
                        icon: DollarSign,
                        color: 'text-blue-400',
                        bg: 'bg-blue-500/10'
                    }
                ].map((stat, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="glass-card rounded-[2rem] p-8 card-hover border border-white/5"
                    >
                        <div className={`w-14 h-14 rounded-2xl ${stat.bg} flex items-center justify-center mb-6`}>
                            <stat.icon className={`w-7 h-7 ${stat.color}`} />
                        </div>
                        <div className="space-y-1 text-right">
                            <p className="text-gray-500 text-sm font-medium">{stat.label}</p>
                            <div className="text-3xl font-black">{stat.value} ₪</div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Content Area */}
            <div className="grid lg:grid-cols-5 gap-8">
                {/* Form Section */}
                <AnimatePresence>
                    {showForm && (
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="lg:col-span-2 glass-card rounded-[2rem] p-8 border border-emerald-500/10 h-fit sticky top-8"
                        >
                            <h3 className="text-xl font-bold mb-6 text-right flex items-center gap-2 justify-start">
                                إضافة حركة جديدة
                                <Plus className="w-5 h-5 text-emerald-400" />
                            </h3>
                            <form onSubmit={handleSubmit} className="space-y-5 text-right">
                                <div>
                                    <label className="block text-sm font-bold text-gray-400 mb-2">نوع الحركة</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, type: 'income' })}
                                            className={`py-3 rounded-xl font-bold transition-all border ${formData.type === 'income'
                                                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                                                    : 'bg-white/5 border-white/5 text-gray-500'
                                                }`}
                                        >
                                            دخل (+)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, type: 'expense' })}
                                            className={`py-3 rounded-xl font-bold transition-all border ${formData.type === 'expense'
                                                    ? 'bg-red-500/20 border-red-500 text-red-400'
                                                    : 'bg-white/5 border-white/5 text-gray-500'
                                                }`}
                                        >
                                            مصروف (-)
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-400 mb-2">المبلغ (₪)</label>
                                        <input
                                            type="number" step="0.01" required
                                            value={formData.amount}
                                            onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                            className="input-field w-full text-right"
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-400 mb-2">الوصف</label>
                                        <input
                                            type="text" required
                                            value={formData.description}
                                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                                            className="input-field w-full"
                                            placeholder="مثال: مبيعات الصباح، فاتورة كهرباء..."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-400 mb-2">التاريخ</label>
                                        <input
                                            type="date" required
                                            value={formData.entry_date}
                                            onChange={e => setFormData({ ...formData, entry_date: e.target.value })}
                                            className="input-field w-full"
                                        />
                                    </div>
                                </div>
                                <button
                                    type="submit"
                                    disabled={addEntryMutation.isLoading}
                                    className="theme-primary w-full !py-4 rounded-2xl flex items-center justify-center gap-2 font-bold shadow-xl shadow-emerald-500/10 mt-4"
                                >
                                    {addEntryMutation.isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : 'تأكيد الإضافة'}
                                </button>
                            </form>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* List Section */}
                <div className={`${showForm ? 'lg:col-span-3' : 'lg:col-span-5'} space-y-6`}>
                    <div className="glass-card rounded-[2rem] overflow-hidden border border-white/5">
                        <div className="p-6 border-b border-white/5 flex items-center justify-between text-right">
                            <span className="text-gray-500 text-sm">إجمالي السجلات: {entries?.length ?? 0}</span>
                            <h3 className="text-lg font-bold">آخر الحركات المالية</h3>
                        </div>

                        <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto">
                            {loadingEntries ? (
                                [...Array(5)].map((_, i) => (
                                    <div key={i} className="p-6 shimmer h-20" />
                                ))
                            ) : entries?.length === 0 ? (
                                <div className="p-20 text-center text-gray-500">
                                    <AlertCircle className="w-16 h-16 mx-auto mb-4 opacity-20" />
                                    <p className="font-bold text-lg">لا توجد حركات مالية مسجلة بعد</p>
                                    <p className="text-sm">ابدأ بإضافة أول حركة لمتابعة حساباتك</p>
                                </div>
                            ) : (
                                entries.map((entry) => (
                                    <motion.div
                                        key={entry.id}
                                        layout
                                        className="p-5 sm:p-6 hover:bg-white/[0.02] flex items-center justify-between group transition-colors"
                                    >
                                        <div className="flex items-center gap-4">
                                            <button
                                                onClick={() => deleteEntryMutation.mutate(entry.id)}
                                                className="p-2.5 rounded-xl bg-red-500/10 text-red-400 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500/20"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                            <div className="text-right">
                                                <div className={`text-lg font-black ${entry.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                                                    {entry.type === 'income' ? '+' : '-'}{entry.amount} ₪
                                                </div>
                                            </div>
                                        </div>

                                        <div className="text-right space-y-1">
                                            <div className="font-bold text-gray-200">{entry.description}</div>
                                            <div className="flex items-center justify-start gap-3 text-xs text-gray-500">
                                                <span className="flex items-center gap-1.5 order-2">
                                                    {entry.entry_date}
                                                    <Calendar className="w-3.5 h-3.5" />
                                                </span>
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold order-1 ${entry.type === 'income' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                                                    }`}>
                                                    {entry.type === 'income' ? 'دخل' : 'مصروف'}
                                                </span>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OwnerAccounting;
