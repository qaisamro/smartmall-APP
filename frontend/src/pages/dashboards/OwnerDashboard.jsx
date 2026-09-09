import React from 'react';
import { motion } from 'framer-motion';
import { Package, Map, Sparkles, ShoppingBag, TrendingUp, Plus, ArrowLeft, Store, CreditCard, DollarSign, ScanLine, Warehouse, Receipt, FileCheck } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import useAuthStore from '../../store/useAuthStore';
import { themeToCssVars } from '../../utils/theme';

const OwnerDashboard = () => {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const isSupermarket = user?.mall?.type === 'supermarket';
    const enableQuantitySystem = user?.mall?.enable_quantity_system;

    const { data: stats } = useQuery({
        queryKey: ['owner-stats'],
        queryFn: async () => {
            const r = await api.get('/owner/stats');
            return r.data;
        }
    });

    const { data: recentProducts, isLoading: productsLoading } = useQuery({
        queryKey: ['owner-recent-products'],
        queryFn: async () => {
            const r = await api.get('/owner/products');
            return r.data?.data?.slice(0, 5) || [];
        }
    });

    const { data: ownerMalls } = useQuery({
        queryKey: ['owner-malls-theme'],
        queryFn: async () => {
            const r = await api.get('/owner/my-malls');
            return r.data;
        }
    });

    const noMall = Array.isArray(ownerMalls) && ownerMalls.length === 0;

    const { data: currentSub } = useQuery({
        queryKey: ['owner-current-sub-dash', ownerMalls?.[0]?.id],
        enabled: !!ownerMalls?.[0],
        queryFn: async () => (await api.get('/owner/subscription/current', { params: { mall_id: ownerMalls[0].id } })).data
    });

    const cards = [
        { label: "إجمالي المنتجات", value: stats?.products_count ?? '—', icon: Package, bg: 'bg-blue-500/10', text: 'text-blue-400' },
        { label: "مبيعات اليوم", value: `${stats?.daily_sales ?? '0'} ₪`, icon: ShoppingBag, bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
        ...(enableQuantitySystem
            ? [{ label: "المنتجات المنخفضة", value: stats?.low_stock_count ?? '—', icon: Warehouse, bg: 'bg-amber-500/10', text: 'text-amber-400' }]
            : []),
        { label: "أرباح الشهر", value: `${stats?.monthly_revenue ?? '0'} ₪`, icon: TrendingUp, bg: 'bg-amber-500/10', text: 'text-amber-400' },
    ];

    return noMall ? (
        <div className="mall-theme-scope rounded-3xl p-1 sm:p-3" style={themeToCssVars(ownerMalls?.[0]?.theme)}>
            <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-20 h-20 bg-gray-100 rounded-3xl flex items-center justify-center mb-6">
                    <Store className="w-10 h-10 text-gray-400" />
                </div>
                <h2 className="text-2xl font-extrabold text-gray-800 mb-2">لا يوجد لديك أي مول معين حالياً.</h2>
                <p className="text-gray-500">تواصل مع الإدارة لتفعيل حسابك أو لتعيين مول لك</p>
            </div>
        </div>
    ) : (
        <div className="mall-theme-scope space-y-8 pb-10 rounded-3xl p-1 sm:p-3" style={themeToCssVars(ownerMalls?.[0]?.theme)}>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Store className={isSupermarket ? 'w-5 h-5 text-emerald-400' : 'w-5 h-5 text-purple-400'} />
                        <span className={`badge ${isSupermarket ? 'badge-emerald' : 'badge-purple'}`}>
                            {isSupermarket ? 'صاحب سوبرماركت' : 'صاحب مول'}
                        </span>
                        {currentSub && (
                            <span className="badge badge-emerald flex items-center gap-1">
                                <CreditCard className="w-3 h-3" />
                                باقة: {currentSub.plan?.name_ar}
                            </span>
                        )}
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold">مرحباً، {user?.name?.split(' ')[0]} 👋</h1>
                    <p className="text-gray-500 mt-1 text-sm">
                        {user?.mall?.name_ar ? (
                            <span className={`font-bold ${isSupermarket ? 'text-emerald-400' : 'text-purple-400'}`}>{user.mall.name_ar}</span>
                        ) : isSupermarket ? 'لوحة تحكم السوبرماركت' : 'لوحة تحكم مولك'} — تابع منتجاتك ومبيعاتك بلحظة
                    </p>
                </div>
                <button
                    onClick={() => navigate('/owner/products')}
                    className="theme-primary !rounded-2xl !py-3 !px-6 shrink-0 inline-flex items-center justify-center gap-2 font-bold"
                >
                    <Plus className="w-4 h-4" />
                    إضافة منتج
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                {cards.map((card, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.08 }}
                        className="glass-card rounded-3xl p-5 sm:p-6 card-hover"
                    >
                        <div className={`w-11 h-11 rounded-2xl ${card.bg} flex items-center justify-center mb-4`}>
                            <card.icon className={`w-5 h-5 ${card.text}`} />
                        </div>
                        <div className="text-2xl sm:text-3xl font-extrabold mb-1">{card.value}</div>
                        <div className="text-gray-500 text-xs font-medium">{card.label}</div>
                    </motion.div>
                ))}
            </div>

            {/* Shortcuts */}
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {isSupermarket ? (
                    <motion.button
                        onClick={() => navigate('/owner/scanner')}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="glass-card rounded-3xl p-6 flex flex-col items-center justify-center text-center space-y-4 card-hover group w-full border border-emerald-500/10"
                    >
                        <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <ScanLine className="w-8 h-8 text-emerald-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold">الماسح اللاسلكي</h3>
                            <p className="text-gray-500 text-xs mt-1">استخدم جوالك كقارئ باركود للـ POS</p>
                        </div>
                    </motion.button>
                ) : (
                    <motion.button
                        onClick={() => navigate('/owner/scanner')}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="glass-card rounded-3xl p-6 flex flex-col items-center justify-center text-center space-y-4 card-hover group w-full border border-indigo-500/10"
                    >
                        <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <ScanLine className="w-8 h-8 text-indigo-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold">الماسح اللاسلكي</h3>
                            <p className="text-gray-500 text-xs mt-1">استخدم جوالك كقارئ باركود للـ POS</p>
                        </div>
                    </motion.button>
                )}

                <motion.button
                    onClick={() => navigate('/owner/invoice-scanner')}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="glass-card rounded-3xl p-6 flex flex-col items-center justify-center text-center space-y-4 card-hover group w-full"
                >
                    <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <FileCheck className="w-8 h-8 text-emerald-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold">قارئ فواتير الزبائن</h3>
                        <p className="text-gray-500 text-xs mt-1">امسح باركود السلة لإتمام البيع</p>
                    </div>
                </motion.button>

                <motion.button
                    onClick={() => navigate('/owner/offers')}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="glass-card rounded-3xl p-6 flex flex-col items-center justify-center text-center space-y-4 card-hover group w-full"
                >
                    <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Sparkles className="w-8 h-8 text-amber-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold">العروض الخاصة</h3>
                        <p className="text-gray-500 text-xs mt-1">إنشاء عروض وتخفيضات تظهر في صفحة متجرك</p>
                    </div>
                </motion.button>

                {/* Map shortcut — temporarily disabled
                <motion.button
                    onClick={() => navigate('/owner/branches')}
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="glass-card rounded-3xl p-6 flex flex-col items-center justify-center text-center space-y-4 card-hover group w-full"
                >
                    <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Map className="w-8 h-8 text-purple-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold">الخريطة الداخلية</h3>
                        <p className="text-gray-500 text-xs mt-1">تحديث مواقع الأقسام والرفوف</p>
                    </div>
                </motion.button>
                */}
            </div>
        </div>
    );
};

export default OwnerDashboard;
