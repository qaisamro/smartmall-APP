import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Store, TrendingUp, Activity, ArrowLeft, ShieldCheck, Clock, Zap, Globe, BarChart3, MapPin, MessageSquare, Monitor, ChevronDown, ChevronUp } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import useAuthStore from '../../store/useAuthStore';
import MonitorPanel from '../../components/MonitorPanel';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const [showMonitor, setShowMonitor] = useState(false);

    const { data: stats } = useQuery({
        queryKey: ['admin-stats'],
        queryFn: async () => {
            const r = await api.get('/admin/stats');
            return r.data;
        }
    });

    const cards = [
        { label: "السوبرماركت", value: stats?.supermarkets_count ?? '—', icon: Store, color: 'from-emerald-500 to-teal-500', bg: 'bg-emerald-500/10', text: 'text-emerald-400', borderColor: 'border-emerald-500/20' },
        { label: "المولات التجارية", value: stats?.malls_count ?? '—', icon: Store, color: 'from-indigo-500 to-purple-500', bg: 'bg-indigo-500/10', text: 'text-indigo-400', borderColor: 'border-indigo-500/20' },
        { label: "المستخدمون", value: stats?.users_count ?? '—', icon: Users, color: 'from-purple-500 to-pink-500', bg: 'bg-purple-500/10', text: 'text-purple-400', borderColor: 'border-purple-500/20' },
        { label: "الدخل الكلي", value: `${stats?.revenue ?? '0'} ₪`, icon: TrendingUp, color: 'from-emerald-500 to-teal-500', bg: 'bg-emerald-500/10', text: 'text-emerald-400', borderColor: 'border-emerald-500/20' },
        { label: "طلبات انتظار", value: stats?.pending_malls ?? '0', icon: Clock, color: 'from-amber-500 to-orange-500', bg: 'bg-amber-500/10', text: 'text-amber-400', borderColor: 'border-amber-500/20' },
    ];

    const shortcuts = [
        { label: 'إدارة المستخدمين', path: '/admin/users', icon: Users, desc: 'عرض وتعديل حسابات المستخدمين', color: 'indigo' },
        { label: 'إدارة المولات', path: '/admin/malls', icon: Store, desc: 'قبول وإدارة المولات المسجّلة', color: 'emerald' },
        { label: 'استيراد المنتجات', path: '/admin/product-imports', icon: Zap, desc: 'إدارة استيراد المنتجات', color: 'amber' },
        { label: 'الاشتراكات', path: '/admin/subscriptions', icon: BarChart3, desc: 'متابعة الاشتراكات والدفع', color: 'purple' },
        { label: 'مناطق التوصيل', path: '/admin/delivery-zones', icon: MapPin, desc: 'إدارة مناطق الرسوم والتوصيل', color: 'indigo' },
        { label: 'إدارة الشكاوى', path: '/admin/complaints', icon: MessageSquare, desc: 'عرض والرد على شكاوى المستخدمين', color: 'rose' },
        { label: 'تقارير المبيعات', path: '/admin/sales-reports', icon: TrendingUp, desc: 'عرض وتصدير تقارير المبيعات لجميع المولات', color: 'emerald' },
    ];

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-8 pb-10"
        >
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col sm:flex-row sm:items-center gap-6"
            >
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center shadow-lg shadow-rose-500/20">
                            <ShieldCheck className="w-6 h-6 text-white" />
                        </div>
                        <span className="badge badge-rose">مشرف عام</span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold gradient-text-blue">
                        مرحباً، {user?.name?.split(' ')[0]} 👋
                    </h1>
                    <p className="text-gray-400 text-sm">هذا ملخص شامل لنشاط المنصة</p>
                </div>
                <div className="text-sm text-gray-500 hidden sm:block bg-white/5 px-4 py-2 rounded-xl border border-white/5">
                    {new Date().toLocaleDateString('ar-PS', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
            </motion.div>

            {/* Stats Grid */}
            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-2 xl:grid-cols-5 gap-4 sm:gap-6"
            >
                {cards.map((card, i) => (
                    <motion.div
                        key={i}
                        variants={itemVariants}
                        whileHover={{ y: -4, scale: 1.02 }}
                        className="glass-card rounded-[1.5rem] p-5 sm:p-6 card-hover border border-white/5"
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className={`w-12 h-12 rounded-2xl ${card.bg} flex items-center justify-center border ${card.borderColor}`}>
                                <card.icon className={`w-5 h-5 ${card.text}`} />
                            </div>
                            <span className={`w-2 h-2 rounded-full ${card.text.replace('400', '500')} animate-pulse`} />
                        </div>
                        <div className="text-2xl sm:text-3xl font-extrabold mb-1">{card.value}</div>
                        <div className="text-gray-500 text-xs font-medium">{card.label}</div>
                    </motion.div>
                ))}
            </motion.div>

            {/* Monitor Toggle */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
            >
                <button
                    onClick={() => setShowMonitor(!showMonitor)}
                    className="w-full glass-card rounded-2xl p-4 flex items-center justify-between card-hover border border-white/5 group"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500/10 to-orange-500/5 flex items-center justify-center border border-rose-500/20">
                            <Monitor className="w-5 h-5 text-rose-400" />
                        </div>
                        <div className="text-right">
                            <div className="font-bold group-hover:text-rose-400 transition-colors text-sm">مراقبة الأداء</div>
                            <div className="text-xs text-gray-400">سرعة الموقع، قاعدة البيانات، queue، الأخطاء</div>
                        </div>
                    </div>
                    {showMonitor ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                </button>
                {showMonitor && (
                    <div className="mt-4">
                        <MonitorPanel />
                    </div>
                )}
            </motion.div>

            {/* Quick Access */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
            >
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-indigo-400" />
                    وصول سريع
                </h2>
                <div className="grid sm:grid-cols-2 gap-4">
                    {shortcuts.map((s, i) => (
                        <motion.button
                            key={i}
                            onClick={() => navigate(s.path)}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.5 + i * 0.1 }}
                            whileHover={{ scale: 1.02, x: -4 }}
                            whileTap={{ scale: 0.98 }}
                            className="glass-card rounded-2xl p-5 flex items-center gap-4 text-right card-hover w-full group border border-white/5"
                        >
                            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${s.color === 'indigo' ? 'from-indigo-500/10 to-indigo-500/5 border-indigo-500/20' : s.color === 'emerald' ? 'from-emerald-500/10 to-emerald-500/5 border-emerald-500/20' : s.color === 'amber' ? 'from-amber-500/10 to-amber-500/5 border-amber-500/20' : 'from-purple-500/10 to-purple-500/5 border-purple-500/20'} flex items-center justify-center shrink-0 border`}>
                                <s.icon className={`w-6 h-6 ${s.color === 'indigo' ? 'text-indigo-400' : s.color === 'emerald' ? 'text-emerald-400' : s.color === 'amber' ? 'text-amber-400' : 'text-purple-400'}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="font-bold group-hover:text-indigo-400 transition-colors">{s.label}</div>
                                <div className="text-gray-400 text-xs mt-1">{s.desc}</div>
                            </div>
                            <ArrowLeft className="w-4 h-4 text-gray-500 shrink-0 group-hover:translate-x-[-4px] transition-transform" />
                        </motion.button>
                    ))}
                </div>
            </motion.div>

            {/* Recent Activity / Info */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="glass-card rounded-[2rem] p-6 sm:p-8 border border-white/5"
            >
                <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
                    <Globe className="w-4 h-4 text-indigo-400" />
                    نظرة عامة
                </h2>
                <div className="grid sm:grid-cols-3 gap-6">
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            حالة النظام
                        </div>
                        <p className="text-xl font-bold text-emerald-400">يعمل بشكل طبيعي</p>
                    </div>
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                            <Zap className="w-4 h-4 text-amber-400" />
                            آخر تحديث
                        </div>
                        <p className="text-xl font-bold">منذ دقائق</p>
                    </div>
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                            <BarChart3 className="w-4 h-4 text-purple-400" />
                            الأداء
                        </div>
                        <p className="text-xl font-bold text-purple-400">ممتاز</p>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default AdminDashboard;
