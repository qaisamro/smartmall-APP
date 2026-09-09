import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api/axios';
import { 
    ShoppingBag, Calendar, Clock, Package, Store, 
    History as HistoryIcon, AlertCircle, Loader2, 
    CheckCircle2, ArrowRight, MapPin, Truck, Building2, ListFilter,
    ChevronRight, ChevronLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const deliveryLabels = {
    'in-mall': { label: 'استلام من المول', icon: Building2, color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' },
    'delivery': { label: 'توصيل منزلي', icon: Truck, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
    'direct_purchase': { label: 'مشتريات سريعة', icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
};

const deliveryStatusBadge = {
    none: null,
    pending: { label: 'قيد الانتظار', color: 'text-amber-400', bg: 'bg-amber-500/10' },
    accepted: { label: 'تم القبول', color: 'text-blue-400', bg: 'bg-blue-500/10' },
    delivering: { label: 'في الطريق', color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
    delivered: { label: 'تم التوصيل', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    failed: { label: 'فشل التوصيل', color: 'text-rose-400', bg: 'bg-rose-500/10' },
};

const filters = [
    { key: 'all', label: 'الكل' },
    { key: 'in-mall', label: 'داخل المول', icon: Building2 },
    { key: 'delivery', label: 'توصيل منزلي', icon: Truck },
    { key: 'direct_purchase', label: 'مشتريات سريعة', icon: CheckCircle2 },
];

const MyPurchases = () => {
    const navigate = useNavigate();
    const [filter, setFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 3;

    const { data: purchasesData, isLoading } = useQuery({
        queryKey: ['customer-purchases'],
        queryFn: async () => {
            const r = await api.get('/customer/purchases');
            return r.data;
        }
    });
    const purchases = Array.isArray(purchasesData) ? purchasesData : (purchasesData?.data || []);

    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        return {
            full: date.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
            time: date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
            day: date.toLocaleDateString('ar-EG', { day: 'numeric' }),
            month: date.toLocaleDateString('ar-EG', { month: 'short' }),
        };
    };

    const handleFilterChange = (key) => {
        setFilter(key);
        setCurrentPage(1);
    };

    if (isLoading) {
        return (
            <div dir="rtl" className="min-h-screen bg-[#0B0F19] text-slate-200 flex items-center justify-center p-4">
                <div className="text-center space-y-4">
                    <div className="relative flex items-center justify-center">
                        <Loader2 className="w-14 h-14 text-indigo-500 animate-spin" />
                        <ShoppingBag className="w-5 h-5 text-indigo-400 absolute" />
                    </div>
                    <p className="text-gray-400 font-medium text-sm animate-pulse">جاري تحميل سجل المشتريات...</p>
                </div>
            </div>
        );
    }

    return (
        <div dir="rtl" className="min-h-screen bg-[#0B0F19] text-slate-200 pt-2 pb-16 px-4 md:px-6 font-sans antialiased selection:bg-indigo-500/30">
            <div className="max-w-4xl mx-auto space-y-4 text-right">
                
                {/* Header Section */}
                <header className="flex items-center justify-between gap-4 bg-white/[0.02] backdrop-blur-md border border-white/[0.05] p-3.5 rounded-xl">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-inner">
                            <HistoryIcon className="w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="text-lg sm:text-xl font-black text-white tracking-tight">مشترياتي</h1>
                            <p className="text-gray-400 text-[11px] font-medium">عرض وإدارة العمليات الناجحة</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => navigate(-1)} 
                        className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 hover:border-white/20 transition-all duration-200 active:scale-95 group shrink-0"
                    >
                        <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" />
                    </button>
                </header>

                {/* Filter Bar */}
                {purchases && purchases.length > 0 && (
                    <div className="flex items-center gap-2 bg-white/[0.02] backdrop-blur-sm rounded-xl p-1 border border-white/[0.05] overflow-x-auto no-scrollbar">
                        <div className="p-1 text-gray-400 shrink-0">
                            <ListFilter className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex gap-1">
                            {filters.map((f) => {
                                const Icon = f.icon;
                                const active = filter === f.key;
                                return (
                                    <button
                                        key={f.key}
                                        onClick={() => handleFilterChange(f.key)}
                                        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 whitespace-nowrap ${
                                            active 
                                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' 
                                            : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                                        }`}
                                    >
                                        {Icon && <Icon className="w-3.5 h-3.5" />}
                                        {f.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Main Content Area */}
                {(() => {
                    const filtered = filter === 'all' ? purchases : purchases?.filter((o) => o.delivery_method === filter);
                    
                    if (!filtered || filtered.length === 0) {
                        return (
                            <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-8 text-center backdrop-blur-sm">
                                <div className="w-14 h-14 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-3">
                                    <ShoppingBag className="w-6 h-6 text-gray-500" />
                                </div>
                                <h2 className="text-base font-bold text-white mb-1">لا توجد مشتريات</h2>
                                <p className="text-gray-400 mb-4 text-xs max-w-xs mx-auto">
                                    {filter === 'all' ? 'ستظهر هنا فواتيرك بعد إتمام عمليات الشراء بنجاح.' : 'لا توجد طلبات متوافقة مع الفلتر الحالي.'}
                                </p>
                                <button 
                                    onClick={() => navigate('/malls')} 
                                    className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2 rounded-lg transition-all"
                                >
                                    <Store className="w-3.5 h-3.5" />
                                    ابدأ التسوق الآن
                                </button>
                            </div>
                        );
                    }
                    
                    const totalPages = Math.ceil(filtered.length / itemsPerPage);
                    const indexOfLastItem = currentPage * itemsPerPage;
                    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
                    const currentItems = filtered.slice(indexOfFirstItem, indexOfLastItem);
                    
                    return (
                        <div className="space-y-4">
                            <div className="space-y-3.5">
                                <AnimatePresence mode="wait">
                                    {currentItems.map((order, idx) => {
                                        const date = formatDate(order.created_at);
                                        const dl = deliveryLabels[order.delivery_method] || deliveryLabels['in-mall'];
                                        const DeliveryIcon = dl.icon;
                                        const ds = order.delivery_method === 'delivery' ? deliveryStatusBadge[order.delivery_status] : null;
                                        
                                        return (
                                            <motion.div
                                                key={order.id}
                                                initial={{ opacity: 0, y: 6 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -6 }}
                                                transition={{ duration: 0.15 }}
                                                className="bg-white/[0.02] border border-white/[0.05] rounded-xl overflow-hidden flex flex-col md:flex-row hover:border-white/[0.1] hover:bg-white/[0.03] transition-all duration-200"
                                            >
                                                {/* شريط التاريخ الجانبي (تم تقليص عرضه وعمل محاذاة لصيقة) */}
                                                <div className="bg-white/[0.01] px-3 py-3 md:py-0 flex flex-row md:flex-col items-center justify-between md:justify-center gap-1 border-b md:border-b-0 md:border-l border-white/[0.05] md:w-20 shrink-0 text-center">
                                                    <div className="flex md:flex-col items-center gap-1 md:gap-0">
                                                        <span className="text-xl font-black text-indigo-400 leading-none">{date.day}</span>
                                                        <span className="text-[10px] font-bold text-gray-400 md:mt-1">{date.month}</span>
                                                    </div>
                                                    <div className="flex items-center gap-0.5 text-[9px] font-medium text-gray-500 bg-white/5 px-1 py-0.5 rounded">
                                                        <Clock className="w-2.5 h-2.5 text-indigo-400" />
                                                        {date.time}
                                                    </div>
                                                </div>

                                                {/* محتويات الفاتورة (تمت إزالة الفراغات المفرطة pr-2 لتقترب تماماً من الشريط الجانبي) */}
                                                <div className="flex-1 p-4 pr-2.5 md:pr-3 flex flex-col justify-between gap-3">
                                                    <div className="flex items-center justify-between gap-3 flex-wrap">
                                                        <div>
                                                            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                                                                <Store className="w-3.5 h-3.5 text-indigo-400" />
                                                                {order.mall?.name_ar || 'متجر غير معروف'}
                                                            </h3>
                                                            <p className="text-[10px] text-gray-500 font-mono">ID: #{order.id}</p>
                                                        </div>
                                                        <div className="flex items-center gap-1.5">
                                                            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${dl.border} ${dl.bg} ${dl.color}`}>
                                                                <DeliveryIcon className="w-3 h-3" />
                                                                {dl.label}
                                                            </div>
                                                            {ds && (
                                                                <div className={`px-2 py-0.5 rounded-md text-[10px] font-bold border border-white/5 ${ds.bg} ${ds.color}`}>
                                                                    {ds.label}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* قائمة المنتجات */}
                                                    <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-0.5 custom-scrollbar">
                                                        {order.items?.map((item) => (
                                                            <div key={item.id} className="flex items-center justify-between gap-4 p-2 rounded-lg bg-white/[0.01] border border-white/[0.02]">
                                                                <div className="flex items-center gap-2 min-w-0">
                                                                    <div className="w-7 h-7 rounded-md bg-white/5 flex items-center justify-center border border-white/5 shrink-0 text-gray-400">
                                                                        <Package className="w-3.5 h-3.5" />
                                                                    </div>
                                                                    <div className="min-w-0">
                                                                        <p className="font-bold text-xs text-gray-200 truncate">{item.product?.name_ar || 'منتج'}</p>
                                                                        <p className="text-[10px] text-gray-400">
                                                                            الكمية: <span className="text-white font-mono">{item.quantity}</span> × {item.price_at_sale} ₪
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                <span className="text-xs font-mono font-bold text-gray-300">{(item.price_at_sale * item.quantity).toFixed(2)} ₪</span>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {/* المجموع والتاريخ السفلي */}
                                                    <div className="pt-2 border-t border-white/[0.05] flex items-center justify-between gap-3 flex-wrap">
                                                        <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                                                            <Calendar className="w-3.5 h-3.5 text-gray-500" />
                                                            {date.full}
                                                            {order.delivery_address && (
                                                                <span className="flex items-center gap-1 text-gray-300 truncate max-w-[150px] border-r border-white/10 pr-1.5 mr-1.5">
                                                                    <MapPin className="w-3 h-3 text-rose-400/70 shrink-0" />
                                                                    {order.delivery_address}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2 bg-indigo-500/5 border border-indigo-500/10 px-2.5 py-1 rounded-lg">
                                                            <span className="text-[10px] text-gray-400 font-bold">الإجمالي:</span>
                                                            <div className="text-sm font-black text-indigo-400 flex items-baseline font-mono">
                                                                {parseFloat(order.total_amount).toFixed(2)}
                                                                <span className="text-[11px] font-bold mr-0.5">₪</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </AnimatePresence>
                            </div>

                            {/* أزرار الترقيم */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between bg-white/[0.01] border border-white/[0.04] p-2 rounded-xl mt-2">
                                    <button
                                        onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                                        disabled={currentPage === totalPages}
                                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg text-gray-400 border border-white/5 bg-white/5 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                        السابق
                                    </button>
                                    
                                    <span className="text-xs text-gray-400 font-medium">
                                        صفحة <span className="text-indigo-400 font-bold">{currentPage}</span> من <span className="text-white font-bold">{totalPages}</span>
                                    </span>

                                    <button
                                        onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                                        disabled={currentPage === 1}
                                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg text-gray-400 border border-white/5 bg-white/5 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                                    >
                                        التالي
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })()}

                {/* التنبيه السفلي */}
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/5 border border-amber-500/10 backdrop-blur-sm">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-amber-300/80 leading-relaxed font-medium">
                        <span className="font-bold text-amber-400">تنبيه:</span> تحتفظ هذه الواجهة بسجلات آخر 30 يوماً فقط لتوفير أفضل وأسرع أداء لتصفح حسابك.
                    </p>
                </div>
                
            </div>
        </div>
    );
};

export default MyPurchases;