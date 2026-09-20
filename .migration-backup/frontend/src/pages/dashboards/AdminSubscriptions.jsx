import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CreditCard, Edit, Loader2, CheckCircle, XCircle, Clock, Search, Globe } from 'lucide-react';
import api from '../../api/axios';
import { motion, AnimatePresence } from 'framer-motion';

const AdminSubscriptions = () => {
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [editingPlan, setEditingPlan] = useState(null);
    const [planForm, setPlanForm] = useState({
        price_3_months: '', price_6_months: '', price_12_months: '',
        free_offers_3_months: 0, free_offers_6_months: 0, free_offers_12_months: 0,
        trial_days: 15
    });
    const [showNewSubModal, setShowNewSubModal] = useState(false);
    const [showTrialModal, setShowTrialModal] = useState(false);
    const [trialMallId, setTrialMallId] = useState('');
    const [newSubForm, setNewSubForm] = useState({ mall_id: '', plan_id: '', duration_months: '3' });

    const { data: plans = [], isLoading: plansLoading } = useQuery({
        queryKey: ['admin-plans'],
        queryFn: async () => (await api.get('/admin/subscription-plans')).data
    });

    const { data: subscriptionsData, isLoading: subsLoading } = useQuery({
        queryKey: ['admin-mall-subscriptions'],
        queryFn: async () => (await api.get('/admin/mall-subscriptions')).data
    });

    const { data: malls = [] } = useQuery({
        queryKey: ['admin-malls-list'],
        queryFn: async () => (await api.get('/admin/malls')).data
    });

    const updatePlanMutation = useMutation({
        mutationFn: async (updatedPlan) => {
            return (await api.put(`/admin/subscription-plans/${updatedPlan.id}`, updatedPlan)).data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['admin-plans']);
            setEditingPlan(null);
        }
    });

    const subscribeMutation = useMutation({
        mutationFn: async (newSub) => {
            return (await api.post('/admin/mall-subscriptions', newSub)).data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['admin-mall-subscriptions']);
            queryClient.invalidateQueries(['admin-malls']);
            setShowNewSubModal(false);
            setNewSubForm({ mall_id: '', plan_id: '', duration_months: '3' });
        }
    });

    const trialMutation = useMutation({
        mutationFn: async ({ mall_id }) => {
            return (await api.post('/admin/mall-subscriptions/trial', { mall_id })).data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['admin-mall-subscriptions']);
            queryClient.invalidateQueries(['admin-malls']);
            setShowTrialModal(false);
            setTrialMallId('');
            alert('✅ تم تفعيل الفترة التجريبية بنجاح!');
        },
        onError: (err) => alert(err.response?.data?.message || 'حدث خطأ أثناء منح التجربة')
    });

    const handleEditPlan = (plan) => {
        setEditingPlan(plan);
        setPlanForm({
            price_3_months: plan.price_3_months,
            price_6_months: plan.price_6_months,
            price_12_months: plan.price_12_months,
            free_offers_3_months: plan.free_offers_3_months ?? 3,
            free_offers_6_months: plan.free_offers_6_months ?? 5,
            free_offers_12_months: plan.free_offers_12_months ?? 10,
            trial_days: plan.trial_days ?? 15,
        });
    };

    const handlePlanSubmit = (e) => {
        e.preventDefault();
        updatePlanMutation.mutate({ ...editingPlan, ...planForm });
    };

    const handleNewSubSubmit = (e) => {
        e.preventDefault();
        subscribeMutation.mutate(newSubForm);
    };

    const subscriptions = subscriptionsData?.data || [];
    const plan = plans[0]; // Single plan

    const durationLabel = (d) => {
        const map = { 3: '3 أشهر', 6: '6 أشهر', 12: 'سنة' };
        return map[d] || d;
    };

    const getDurationPrice = (d) => {
        if (!plan) return 0;
        return plan['price_' + d + '_months'] || 0;
    };

    const getDurationOffers = (d) => {
        if (!plan) return 0;
        return plan['free_offers_' + d + '_months'] || 0;
    };

    return (
        <div className="p-6 sm:p-10 space-y-10" dir="rtl">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-white mb-2 flex items-center gap-3">
                        <CreditCard className="w-10 h-10 text-blue-500" />
                        إدارة الاشتراكات والخطط
                    </h1>
                    <p className="text-gray-400 font-medium">إدارة أسعار الباقة وفترات الاشتراك</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setShowTrialModal(true)}
                        className="btn-secondary flex items-center gap-2 !px-8 !py-4 border-amber-500/30 text-amber-400 hover:text-amber-300"
                    >
                        <Clock className="w-5 h-5" />
                        منح تجربة مجانية
                    </button>
                    <button
                        onClick={() => setShowNewSubModal(true)}
                        className="btn-primary flex items-center gap-2 !px-8 !py-4"
                    >
                        <CreditCard className="w-5 h-5" />
                        اشتراك جديد لمول
                    </button>
                </div>
            </header>

            {/* Single Plan Card */}
            {plansLoading ? (
                <div className="h-64 rounded-3xl bg-white/5 shimmer" />
            ) : plan ? (
                <section>
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-blue-400">الباقة الحالية</h2>
                        <button
                            onClick={() => handleEditPlan(plan)}
                            className="p-3 rounded-xl bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-all"
                        >
                            <Edit className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="glass-card rounded-[2.5rem] p-8 border border-white/5">
                        <div className="text-center mb-8">
                            <h3 className="text-3xl font-black text-white mb-2">{plan.name_ar}</h3>
                            <p className="text-gray-400">{plan.name_en}</p>
                        </div>
                        <div className="grid sm:grid-cols-3 gap-6">
                            {[3, 6, 12].map(d => (
                                <div key={d} className="glass-card rounded-2xl p-6 border border-white/5 text-center hover:border-blue-500/30 transition-all">
                                    <div className="text-4xl font-black text-blue-400 mb-2">{getDurationPrice(d)}</div>
                                    <div className="text-sm text-gray-400 mb-1">₪</div>
                                    <div className="text-lg font-bold text-white mb-4">{durationLabel(d)}</div>
                                    <div className="flex items-center justify-center gap-2 text-sm text-amber-400 bg-amber-500/10 rounded-xl py-2 px-4">
                                        <Globe className="w-4 h-4" />
                                        <span>عروض مجانية: {getDurationOffers(d)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-6 flex items-center justify-center gap-2 text-sm text-gray-500 bg-white/5 rounded-2xl py-3 px-6">
                            <Clock className="w-4 h-4 text-amber-400" />
                            <span>فترة تجريبية: <strong className="text-amber-400">{plan.trial_days}</strong> يوم</span>
                        </div>
                    </div>
                </section>
            ) : (
                <div className="text-center py-16 text-gray-500">
                    <p>لا توجد باقات بعد. قم بإنشاء باقة جديدة.</p>
                </div>
            )}

            {/* Mall Subscriptions Table */}
            <section className="glass-card rounded-[2.5rem] overflow-hidden border border-white/10">
                <div className="p-8 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <h2 className="text-2xl font-bold text-white">سجل اشتراكات المولات</h2>
                    <div className="relative max-w-md w-full">
                        <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                        <input
                            type="text"
                            placeholder="بحث عن مول..."
                            className="w-full bg-black/40 border border-white/10 rounded-2xl py-3 pr-12 pl-4 text-white focus:outline-none focus:border-blue-500/50 transition-all"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-right border-collapse">
                        <thead>
                            <tr className="bg-white/5 text-gray-400 text-xs uppercase tracking-wider font-bold">
                                <th className="px-8 py-5">المول</th>
                                <th className="px-8 py-5">الباقة</th>
                                <th className="px-8 py-5">المدة</th>
                                <th className="px-8 py-5">العروض المجانية</th>
                                <th className="px-8 py-5">تاريخ الانتهاء</th>
                                <th className="px-8 py-5 text-center">الحالة</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {subsLoading ? (
                                [...Array(5)].map((_, i) => <tr key={i} className="h-16 shimmer" />)
                            ) : (
                                subscriptions
                                    .filter(s => s.mall?.name_ar?.includes(search))
                                    .map(sub => {
                                        const isExpired = sub.ends_at && new Date(sub.ends_at) < new Date();
                                        return (
                                            <tr key={sub.id} className="hover:bg-white/5 transition-colors group">
                                                <td className="px-8 py-5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 font-bold">
                                                            {sub.mall?.name_ar?.[0]}
                                                        </div>
                                                        <span className="font-bold text-white">{sub.mall?.name_ar}</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5 text-gray-300">{sub.plan?.name_ar || '—'}</td>
                                                <td className="px-8 py-5">
                                                    <span className="badge badge-indigo">
                                                        {sub.is_trial ? 'تجربة' : durationLabel(sub.duration_months)}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-5 text-gray-400 text-sm">{sub.free_offers_limit ?? 0}</td>
                                                <td className="px-8 py-5 text-gray-400 text-sm">
                                                    {sub.ends_at ? new Date(sub.ends_at).toLocaleDateString('ar-EG') : '—'}
                                                </td>
                                                <td className="px-8 py-5 text-center">
                                                    {sub.status === 'active' && !isExpired ? (
                                                        <span className="inline-flex items-center gap-1.5 text-emerald-400 font-bold bg-emerald-400/10 px-3 py-1 rounded-full text-xs">
                                                            <CheckCircle className="w-3.5 h-3.5" /> نشط
                                                        </span>
                                                    ) : isExpired ? (
                                                        <span className="inline-flex items-center gap-1.5 text-rose-400 font-bold bg-rose-400/10 px-3 py-1 rounded-full text-xs">
                                                            <XCircle className="w-3.5 h-3.5" /> منتهي
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 text-red-400 font-bold bg-red-400/10 px-3 py-1 rounded-full text-xs">
                                                            <XCircle className="w-3.5 h-3.5" /> {sub.status}
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* Edit Plan Modal */}
            <AnimatePresence>
                {editingPlan && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-gray-900 border border-white/10 p-8 rounded-[2.5rem] w-full max-w-lg shadow-2xl relative"
                        >
                            <button
                                onClick={() => setEditingPlan(null)}
                                className="absolute top-6 left-6 p-2 rounded-full hover:bg-white/10 text-gray-400"
                            >
                                <XCircle className="w-6 h-6" />
                            </button>
                            <h2 className="text-2xl font-black text-white mb-6">تعديل الباقة</h2>
                            <form onSubmit={handlePlanSubmit} className="space-y-5 text-right">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-2">3 أشهر (₪)</label>
                                        <input type="number" className="input-field" value={planForm.price_3_months}
                                            onChange={e => setPlanForm({ ...planForm, price_3_months: e.target.value })} required />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-2">6 أشهر (₪)</label>
                                        <input type="number" className="input-field" value={planForm.price_6_months}
                                            onChange={e => setPlanForm({ ...planForm, price_6_months: e.target.value })} required />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-2">12 شهر / سنة (₪)</label>
                                        <input type="number" className="input-field" value={planForm.price_12_months}
                                            onChange={e => setPlanForm({ ...planForm, price_12_months: e.target.value })} required />
                                    </div>
                                </div>

                                <div className="border-t border-white/10 pt-4">
                                    <h4 className="text-sm font-bold text-amber-400 mb-4">العروض المجانية لكل فترة</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-sm text-gray-400 mb-2">عروض 3 أشهر</label>
                                            <input type="number" min="0" className="input-field" value={planForm.free_offers_3_months}
                                                onChange={e => setPlanForm({ ...planForm, free_offers_3_months: parseInt(e.target.value) || 0 })} />
                                        </div>
                                        <div>
                                            <label className="block text-sm text-gray-400 mb-2">عروض 6 أشهر</label>
                                            <input type="number" min="0" className="input-field" value={planForm.free_offers_6_months}
                                                onChange={e => setPlanForm({ ...planForm, free_offers_6_months: parseInt(e.target.value) || 0 })} />
                                        </div>
                                        <div>
                                            <label className="block text-sm text-gray-400 mb-2">عروض 12 شهر</label>
                                            <input type="number" min="0" className="input-field" value={planForm.free_offers_12_months}
                                                onChange={e => setPlanForm({ ...planForm, free_offers_12_months: parseInt(e.target.value) || 0 })} />
                                        </div>
                                    </div>
                                </div>

                                <div className="border-t border-white/10 pt-4">
                                    <h4 className="text-sm font-bold text-emerald-400 mb-4">الفترة التجريبية</h4>
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-2">عدد أيام التجربة المجانية</label>
                                        <input type="number" min="0" className="input-field" value={planForm.trial_days}
                                            onChange={e => setPlanForm({ ...planForm, trial_days: parseInt(e.target.value) || 0 })} />
                                    </div>
                                </div>

                                <button type="submit" disabled={updatePlanMutation.isLoading}
                                    className="btn-primary w-full !py-4 mt-4">
                                    {updatePlanMutation.isLoading ? <Loader2 className="animate-spin mx-auto w-6 h-6" /> : 'حفظ التغييرات'}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* New Subscription Modal */}
            <AnimatePresence>
                {showNewSubModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-gray-900 border border-white/10 p-8 rounded-[2.5rem] w-full max-w-md shadow-2xl relative"
                        >
                            <button onClick={() => setShowNewSubModal(false)} className="absolute top-6 left-6 p-2 rounded-full hover:bg-white/10 text-gray-400">
                                <XCircle className="w-6 h-6" />
                            </button>
                            <h2 className="text-2xl font-black text-white mb-6 text-right">اشتراك جديد لمول</h2>
                            <form onSubmit={handleNewSubSubmit} className="space-y-5 text-right">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">اختر المول</label>
                                    <select className="input-field bg-gray-800 text-white w-full p-3 rounded-2xl border border-white/10"
                                        value={newSubForm.mall_id}
                                        onChange={e => setNewSubForm({ ...newSubForm, mall_id: e.target.value })} required>
                                        <option value="">-- اختر مول --</option>
                                        {malls.map(mall => (
                                            <option key={mall.id} value={mall.id}>{mall.name_ar}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">الباقة</label>
                                    <select className="input-field bg-gray-800 text-white w-full p-3 rounded-2xl border border-white/10"
                                        value={newSubForm.plan_id}
                                        onChange={e => setNewSubForm({ ...newSubForm, plan_id: e.target.value })} required>
                                        <option value="">-- اختر باقة --</option>
                                        {plans.map(p => (
                                            <option key={p.id} value={p.id}>{p.name_ar}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">مدة الاشتراك</label>
                                    <select className="input-field bg-gray-800 text-white w-full p-3 rounded-2xl border border-white/10"
                                        value={newSubForm.duration_months}
                                        onChange={e => setNewSubForm({ ...newSubForm, duration_months: e.target.value })} required>
                                        <option value="3">3 أشهر</option>
                                        <option value="6">6 أشهر</option>
                                        <option value="12">سنة (12 شهر)</option>
                                    </select>
                                </div>
                                <button type="submit" disabled={subscribeMutation.isLoading}
                                    className="btn-primary w-full !py-4 mt-4">
                                    {subscribeMutation.isLoading ? <Loader2 className="animate-spin mx-auto w-6 h-6" /> : 'تفعيل الاشتراك'}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Free Trial Modal */}
            <AnimatePresence>
                {showTrialModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-gray-900 border border-amber-500/20 p-8 rounded-[2.5rem] w-full max-w-md shadow-2xl relative"
                        >
                            <button onClick={() => setShowTrialModal(false)} className="absolute top-6 left-6 p-2 rounded-full hover:bg-white/10 text-gray-400">
                                <XCircle className="w-6 h-6" />
                            </button>
                            <div className="text-center mb-6">
                                <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Clock className="w-8 h-8 text-amber-400" />
                                </div>
                                <h2 className="text-2xl font-black text-white">منح فترة تجريبية</h2>
                                <p className="text-gray-400 text-sm mt-1">{plan?.trial_days || 15} يوم مجاناً لأي مول</p>
                            </div>
                            <div className="space-y-4 text-right">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">اختر المول</label>
                                    <select className="input-field bg-gray-800 text-white w-full p-3 rounded-2xl border border-white/10"
                                        value={trialMallId}
                                        onChange={e => setTrialMallId(e.target.value)} required>
                                        <option value="">-- اختر مول --</option>
                                        {malls.map(mall => (
                                            <option key={mall.id} value={mall.id}>{mall.name_ar}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 text-sm text-amber-400">
                                    ⚠️ يمكن منح الفترة التجريبية مرة واحدة فقط لكل مول.
                                </div>
                                <button
                                    onClick={() => trialMutation.mutate({ mall_id: trialMallId })}
                                    disabled={!trialMallId || trialMutation.isLoading}
                                    className="btn-primary w-full !py-4 mt-2 !bg-amber-500 hover:!bg-amber-400">
                                    {trialMutation.isLoading ? <Loader2 className="animate-spin mx-auto w-6 h-6" /> : '✅ تفعيل الفترة التجريبية'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AdminSubscriptions;
