import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CreditCard, CheckCircle, Zap, Clock, Loader2, AlertCircle, Globe } from 'lucide-react';
import api from '../../api/axios';
import { motion, AnimatePresence } from 'framer-motion';

const OwnerSubscriptions = () => {
    const [selectedMall, setSelectedMall] = useState(null);

    const { data: mallsData = [] } = useQuery({
        queryKey: ['owner-malls'],
        queryFn: async () => (await api.get('/owner/my-malls')).data
    });

    useEffect(() => {
        if (mallsData.length > 0 && !selectedMall) {
            setSelectedMall(mallsData[0]);
        }
    }, [mallsData, selectedMall]);

    const { data: plans = [], isLoading: plansLoading } = useQuery({
        queryKey: ['owner-plans'],
        queryFn: async () => (await api.get('/owner/subscription-plans')).data
    });

    const { data: currentSub, isLoading: subLoading } = useQuery({
        queryKey: ['owner-current-sub', selectedMall?.id],
        enabled: !!selectedMall,
        queryFn: async () => (await api.get('/owner/subscription/current', { params: { mall_id: selectedMall.id } })).data
    });

    const durationLabel = (d) => {
        const map = { 3: '3 أشهر', 6: '6 أشهر', 12: 'سنة' };
        return map[d] || d;
    };

    const plan = plans[0];

    if (plansLoading) return (
        <div className="min-h-screen flex items-center justify-center">
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
        </div>
    );

    return (
        <div className="p-6 sm:p-10 space-y-10" dir="rtl">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-white mb-2 flex items-center gap-3">
                        <CreditCard className="w-10 h-10 text-emerald-500" />
                        اشتراك المول
                    </h1>
                    <p className="text-gray-400 font-medium">تفاصيل الاشتراك الحالي والباقة المتاحة</p>
                </div>

                <div className="flex items-center gap-4 bg-white/5 p-2 rounded-2xl border border-white/5">
                    <span className="text-sm font-bold text-gray-400 mr-4">المول الحالي:</span>
                    <div className="flex gap-2">
                        {Array.isArray(mallsData) && mallsData.map(mall => (
                            <button
                                key={mall.id}
                                onClick={() => setSelectedMall(mall)}
                                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${selectedMall?.id === mall.id ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' : 'text-gray-400 hover:bg-white/5'}`}
                            >
                                {mall.name_ar}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            {/* Current Status */}
            <AnimatePresence mode="wait">
                {currentSub ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass-card rounded-[2.5rem] p-8 border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent relative overflow-hidden"
                    >
                        <div className="absolute top-0 left-0 p-8 opacity-10">
                            <CheckCircle className="w-40 h-40" />
                        </div>
                        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                            <div>
                                <div className="flex items-center gap-3 mb-4">
                                    <span className="badge badge-emerald !text-sm !px-4 !py-1">
                                        {currentSub.is_trial ? 'فترة تجريبية' : 'نشط حالياً'}
                                    </span>
                                    <h2 className="text-2xl font-black text-white">{currentSub.plan?.name_ar}</h2>
                                </div>
                                <div className="flex flex-wrap gap-6">
                                    <div className="flex items-center gap-3 text-gray-400">
                                        <Clock className="w-5 h-5 text-emerald-500" />
                                        <span>تاريخ الانتهاء: <b className="text-white">{new Date(currentSub.ends_at).toLocaleDateString('ar-EG')}</b></span>
                                    </div>
                                    <div className="flex items-center gap-3 text-gray-400">
                                        <Globe className="w-5 h-5 text-emerald-500" />
                                        <span>المدة: <b className="text-white">{currentSub.duration_months ? durationLabel(currentSub.duration_months) : (currentSub.is_trial ? 'تجربة' : '—')}</b></span>
                                    </div>
                                    <div className="flex items-center gap-3 text-gray-400">
                                        <Zap className="w-5 h-5 text-amber-500" />
                                        <span>العروض المجانية: <b className="text-amber-400">{currentSub.free_offers_limit ?? 0}</b></span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 bg-emerald-500 text-white px-8 py-4 rounded-3xl font-black shadow-xl shadow-emerald-500/20">
                                <CheckCircle className="w-6 h-6" />
                                الاشتراك مفعل
                            </div>
                        </div>
                    </motion.div>
                ) : !subLoading && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass-card rounded-[2.5rem] p-8 border border-red-500/20 bg-gradient-to-br from-red-500/5 to-transparent"
                    >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                            <div className="flex items-center gap-5">
                                <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
                                    <AlertCircle className="w-8 h-8" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-white">لا يوجد اشتراك نشط</h2>
                                    <p className="text-gray-400 font-medium">يرجى التواصل مع الإدارة لتفعيل الاشتراك</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Plan Details */}
            {plan && (
                <div className="glass-card rounded-[2.5rem] p-8 border border-white/5">
                    <div className="text-center mb-8">
                        <h3 className="text-3xl font-black text-white mb-2">{plan.name_ar}</h3>
                        <p className="text-gray-400">{plan.name_en}</p>
                    </div>
                    <div className="grid sm:grid-cols-3 gap-6">
                        {[3, 6, 12].map(d => (
                            <div key={d} className="glass-card rounded-2xl p-6 border border-white/5 text-center hover:border-blue-500/30 transition-all">
                                <div className="text-4xl font-black text-blue-400 mb-2">{plan['price_' + d + '_months']}</div>
                                <div className="text-sm text-gray-400 mb-1">₪</div>
                                <div className="text-lg font-bold text-white mb-4">{durationLabel(d)}</div>
                                <div className="text-sm text-amber-400 bg-amber-500/10 rounded-xl py-2 px-4">
                                    عروض مجانية: {plan['free_offers_' + d + '_months']}
                                </div>
                            </div>
                        ))}
                    </div>
                    {plan.trial_days > 0 && (
                        <div className="mt-6 flex items-center justify-center gap-2 text-sm text-gray-500 bg-white/5 rounded-2xl py-3 px-6">
                            <Clock className="w-4 h-4 text-amber-400" />
                            <span>فترة تجريبية: <strong className="text-amber-400">{plan.trial_days}</strong> يوم</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default OwnerSubscriptions;
