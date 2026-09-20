import React from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios';
import { DollarSign, TrendingUp, Users, CreditCard, Calendar, ArrowUpRight, ArrowDownRight, BarChart3, Banknote } from 'lucide-react';

const AdminAccounting = () => {
    const { data: stats } = useQuery({
        queryKey: ['admin-accounting-stats'],
        queryFn: async () => {
            const r = await api.get('/admin/stats'); // Reusing stats for now, or new endpoint
            return r.data;
        }
    });

    const { data: recentSubs } = useQuery({
        queryKey: ['admin-recent-subscriptions'],
        queryFn: async () => {
            const r = await api.get('/admin/mall-subscriptions');
            return r.data;
        }
    });

    const cards = [
        { label: 'دخل الاشتراكات (شهري)', value: '4,250 ₪', icon: DollarSign, trend: '+12%', up: true },
        { label: 'دخل الاشتراكات (سنوي)', value: '38,900 ₪', icon: Banknote, trend: '+5%', up: true },
        { label: 'باقات نشطة', value: recentSubs?.length || '0', icon: CreditCard, trend: '+2', up: true },
        { label: 'متوسط قيمة الفاتورة', value: '185 ₪', icon: TrendingUp, trend: '-1%', up: false },
    ];

    return (
        <div className="space-y-8 pb-10 text-right">
            <header>
                <h2 className="text-3xl font-extrabold text-white">نظام التحصيل والمحاسبة (Admin)</h2>
                <p className="text-gray-400 mt-2">متابعة دخل الاشتراكات من المولات والسوبر ماركت</p>
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {cards.map((c, i) => (
                    <div key={i} className="glass-card rounded-3xl p-6 border border-white/5 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-l from-blue-500/0 via-blue-500/20 to-blue-500/0" />
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                                <c.icon className="w-5 h-5 text-blue-400" />
                            </div>
                            <div className={`flex items-center gap-1 text-[10px] font-bold ${c.up ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {c.trend}
                                {c.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                            </div>
                        </div>
                        <div className="text-2xl font-black">{c.value}</div>
                        <div className="text-xs text-gray-500 mt-1 font-bold">{c.label}</div>
                    </div>
                ))}
            </div>

            <div className="glass-card rounded-[2.5rem] border border-white/5 overflow-hidden">
                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                    <div className="text-xs font-bold text-blue-400 flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        آخر 10 اشتراكات
                    </div>
                    <h3 className="font-bold text-lg">سجل الاشتراكات الأخير</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-right text-sm">
                        <thead className="bg-white/2">
                            <tr>
                                <th className="px-6 py-4 font-bold text-gray-400">التاريخ</th>
                                <th className="px-6 py-4 font-bold text-gray-400">المول / المنشأة</th>
                                <th className="px-6 py-4 font-bold text-gray-400">الباقة</th>
                                <th className="px-6 py-4 font-bold text-gray-400">القيمة</th>
                                <th className="px-6 py-4 font-bold text-gray-400 text-center">الحالة</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {recentSubs?.data?.slice(0, 10).map((sub, i) => (
                                <tr key={i} className="hover:bg-white/2 transition-colors">
                                    <td className="px-6 py-4 text-xs font-mono text-gray-500">
                                        {new Date(sub.created_at).toLocaleDateString('ar-PS')}
                                    </td>
                                    <td className="px-6 py-4 font-bold">{sub.mall?.name_ar}</td>
                                    <td className="px-6 py-4 text-xs">
                                        <span className="px-3 py-1 bg-blue-500/10 text-blue-400 rounded-full">{sub.plan?.name_ar}</span>
                                    </td>
                                    <td className="px-6 py-4 font-black text-emerald-400">
                                        {sub.plan?.price_3_months || sub.plan?.price_6_months || sub.plan?.price_12_months || 0} ₪
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${sub.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                            {sub.status === 'active' ? 'مفعل' : 'منتهي'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminAccounting;
