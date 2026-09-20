import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';
import { MapPin, Star, ArrowLeft, Store, Clock, Search, Truck, PauseCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { optimizeCloudinaryUrl } from '../utils/imageOptimizer';
import { useDebounce } from '../hooks/useDebounce';

const Malls = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearchQuery = useDebounce(searchQuery, 400);
    const location = useLocation();
    const [typeFilter, setTypeFilter] = useState(() => {
        const params = new URLSearchParams(location.search);
        return params.get('type') || 'all';
    });
    const [userCoords, setUserCoords] = useState(null);

    // مزامنة الفلتر مع تغير الرابط عند التنقل من الصفحة الرئيسية
    React.useEffect(() => {
        const params = new URLSearchParams(location.search);
        const t = params.get('type') || 'all';
        if (t !== typeFilter) setTypeFilter(t);
    }, [location.search]);
    const [isLocating, setIsLocating] = useState(false);
    const navigate = useNavigate();

    const { data: malls, isLoading } = useQuery({
        queryKey: ['malls', debouncedSearchQuery, typeFilter, userCoords],
        queryFn: async ({ signal }) => {
            let url = debouncedSearchQuery.length >= 2 ? `/malls?search=${encodeURIComponent(debouncedSearchQuery)}` : '/malls';
            const params = new URLSearchParams();

            if (typeFilter !== 'all') params.append('type', typeFilter);
            if (userCoords?.lat) {
                params.append('lat', userCoords.lat);
                params.append('lng', userCoords.lng);
                params.append('radius', 20); // 20km radius by default
            }

            const queryString = params.toString();
            if (queryString) {
                url += (url.includes('?') ? '&' : '?') + queryString;
            }

            const r = await api.get(url, { signal });
            return r.data;
        }
    });

    const handleNearby = () => {
        if (userCoords) {
            setUserCoords(null);
            return;
        }

        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                setIsLocating(false);
            },
            (err) => {
                console.error(err);
                alert('فشل تحديد الموقع. تأكد من تفعيل الـ GPS في متصفحك.');
                setIsLocating(false);
            }
        );
    };

    const mallList = Array.isArray(malls) ? malls : malls?.data || [];

    const isDisabled = (mall) =>
        mall.is_active === false || mall.is_active === 0 || mall.is_active === '0';

    const parseHM = (t) => {
        const m = t ? /^(\d{1,2}):(\d{2})/.exec(String(t)) : null;
        return m ? { h: +m[1], m: +m[2] } : null;
    };

    const isOpenNow = (mall, now = new Date()) => {
        const o = parseHM(mall?.open_time);
        const c = parseHM(mall?.close_time);
        if (!o || !c) return true;
        const mins = now.getHours() * 60 + now.getMinutes();
        const start = o.h * 60 + o.m;
        const end = c.h * 60 + c.m;
        if (start === end) return true;
        if (start < end) return mins >= start && mins < end;
        return mins >= start || mins < end;
    };

    const [showDisabledModal, setShowDisabledModal] = useState(false);
    const [disabledMallName, setDisabledMallName] = useState('');

    const handleMallClick = (mall) => {
        if (isDisabled(mall)) {
            setDisabledMallName(mall.name_ar || mall.name_en || 'هذا المتجر');
            setShowDisabledModal(true);
            return;
        }
        navigate(`/mall/${mall.slug}`);
    };

    return (
        <div className="space-y-12 pb-16">
            {/* Header */}
            <header className="text-right space-y-4">
                <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <Store className="w-7 h-7 text-white" />
                    </div>
                    <div>
                        <h2 className="text-3xl sm:text-4xl font-extrabold text-white">المراكز والمتاجر</h2>
                        <p className="text-gray-400 text-sm mt-1">تصفح المولات والسوبر ماركت الذكية المتاحة  </p>
                    </div>
                </div>
            </header>

            {/* Filters Section */}
            <div className="flex flex-col md:flex-row gap-6 items-center">
                {/* Search Bar */}
                <div className="relative flex-1 w-full">
                    <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none z-10">
                        <Search className="h-5 w-5 text-gray-500" />
                    </div>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="input-field pl-4 pr-12 py-4 !text-base"
                        placeholder="ابحث عن مول أو متجر..."
                    />
                </div>

                {/* Type Filter Tabs */}
                <div className="flex flex-wrap gap-4 items-center justify-center">
                    <div className="flex p-1 bg-white/5 rounded-2xl border border-white/10 shrink-0">
                        {[
                            { id: 'all', label: 'الكل' },
                            { id: 'mall', label: 'مولات' },
                            { id: 'supermarket', label: 'سوبر ماركت' }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setTypeFilter(tab.id)}
                                className={`px-4 sm:px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${typeFilter === tab.id
                                    ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={handleNearby}
                        disabled={isLocating}
                        className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold transition-all border ${userCoords
                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-lg shadow-emerald-500/10'
                            : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10'
                            }`}
                    >
                        <MapPin className={`w-4 h-4 ${isLocating ? 'animate-bounce' : ''}`} />
                        {isLocating ? 'جاري التحديد...' : userCoords ? 'قريب مني (مفعل)' : 'الأقرب لي'}
                    </button>
                </div>
            </div>

            {/* Results Info */}
            {!isLoading && mallList.length > 0 && (
                <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>تم العثور على {mallList.length} نتيجة</span>
                    {searchQuery && <span>نتائج البحث عن "{searchQuery}"</span>}
                </div>
            )}

            {/* Malls Grid */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {isLoading ? (
                    // Skeleton Loaders
                    [...Array(8)].map((_, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: i * 0.05 }}
                            className="h-[340px] rounded-[2rem] bg-white/5 shimmer overflow-hidden"
                        />
                    ))
                ) : mallList.length === 0 ? (
                    // Empty State
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="col-span-full py-24 text-center glass-card rounded-[2rem]"
                    >
                        <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-white/5 flex items-center justify-center">
                            <Store className="w-12 h-12 text-gray-600" />
                        </div>
                        <p className="text-xl font-bold text-gray-300 mb-2">
                            {typeFilter === 'supermarket' ? 'لا يوجد سوبر ماركت متاح حالياً' : 'لا يوجد مراجر متاحة حالياً'}
                        </p>
                        <p className="text-gray-500 text-sm">جرب تغيير فلتر البحث أو ابحث بكلمات أخرى</p>
                    </motion.div>
                ) : (
                    mallList.map((mall, i) => (
                        <motion.div
                            key={mall.id}
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.06, duration: 0.5 }}
                            whileHover={{ y: -6 }}
                            onClick={() => handleMallClick(mall)}
                            className="glass-card rounded-[2rem] overflow-hidden group card-hover flex flex-col h-full border border-white/10 cursor-pointer select-none"
                        >
                            {/* Cover Image */}
                            <div className="h-44 sm:h-48 bg-gradient-to-br from-gray-800 to-gray-900 relative overflow-hidden">
                                {mall.cover_image ? (
                                    <img
                                        src={optimizeCloudinaryUrl(/^https?:\/\//.test(mall.cover_image) || mall.cover_image.startsWith('/') ? mall.cover_image : `/storage/${mall.cover_image}`)}
                                        alt={mall.name_ar}
                                        loading="lazy"
                                        decoding="async"
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                    />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center opacity-20 group-hover:scale-105 transition-transform duration-700">
                                        <Store className="w-16 h-16 mb-2" />
                                        <span className="text-xs font-bold font-mono">NO COVER</span>
                                    </div>
                                )}

                                {/* Gradient Overlay */}
                                <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent" />

                                {/* Suspension Badge */}
                                {isDisabled(mall) && (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="backdrop-blur-[2px] bg-black/30 px-6 py-3 rounded-2xl border border-amber-400/30 shadow-lg">
                                            <span className="flex items-center gap-2 text-amber-400 font-extrabold text-sm tracking-wide">
                                                <PauseCircle className="w-4 h-4" />
                                                معلق مؤقتاً
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {/* Store Type Badge */}
                                <div className={`absolute top-4 left-4 backdrop-blur-md px-3 py-1.5 rounded-full text-[10px] font-bold shadow-lg flex items-center gap-1.5 ${mall.type === 'supermarket' ? 'bg-amber-500/90 text-white' : 'bg-indigo-500/90 text-white'
                                    }`}>
                                    {mall.type === 'supermarket' ? 'سوبر ماركت' : 'مول تجاري'}
                                </div>

                                {/* Status Badge */}
                                {isDisabled(mall) ? (
                                    <div className="absolute top-4 right-4 bg-amber-500/90 backdrop-blur-md text-white px-3 py-1.5 rounded-full text-[10px] font-bold shadow-lg flex items-center gap-1.5">
                                        <PauseCircle className="w-3 h-3" />
                                        معلق مؤقتاً
                                    </div>
                                ) : !isOpenNow(mall) ? (
                                    <div className="absolute top-4 right-4 bg-rose-600/90 backdrop-blur-md text-white px-3 py-1.5 rounded-full text-[10px] font-bold shadow-lg flex items-center gap-1.5"
                                        title={mall.open_time && mall.close_time ? `ساعات الدوام: ${String(mall.open_time).slice(0, 5)} - ${String(mall.close_time).slice(0, 5)}` : ''}>
                                        <Clock className="w-3 h-3" />
                                        مغلق حالياً
                                    </div>
                                ) : (
                                    <div className="absolute top-4 right-4 bg-emerald-500/90 backdrop-blur-md text-white px-3 py-1.5 rounded-full text-[10px] font-bold shadow-lg flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                        {mall.open_time && mall.close_time ? `مفتوح حتى ${String(mall.close_time).slice(0, 5)}` : 'مفتوح الآن'}
                                    </div>
                                )}

                                {/* Delivery Badge */}
                                {mall.delivery_enabled && (
                                    <div className="absolute bottom-4 left-4 bg-gradient-to-l from-indigo-600/95 to-blue-600/95 backdrop-blur-md text-white px-3 py-1.5 rounded-full text-[10px] font-bold shadow-lg flex items-center gap-1.5 border border-indigo-400/30">
                                        <Truck className="w-3 h-3" />
                                        توصيل منزلي
                                    </div>
                                )}
                            </div>

                            {/* Content */}
                            <div className="p-5 flex flex-col flex-1 text-right">
                                <h3 className="text-lg sm:text-xl font-extrabold mb-1 group-hover:text-indigo-400 transition-colors line-clamp-1">
                                    {mall.name_ar}
                                </h3>
                                {mall.name_en && (
                                    <p className="text-xs text-gray-500 mb-3 font-medium">{mall.name_en}</p>
                                )}

                                {/* Rating & Location */}
                                <div className="flex items-center justify-between mt-auto pt-4 mb-4 border-t border-white/5 text-sm">
                                    <span className="flex items-center gap-1.5 text-yellow-400 font-bold">
                                        <Star className="w-4 h-4 fill-yellow-400" />
                                        5.0
                                    </span>
                                    <span className="flex items-center gap-1.5 text-gray-400 font-medium">
                                        <MapPin className="w-4 h-4 text-indigo-400 shrink-0" />
                                        <span className="line-clamp-1">{mall.location_arabic || mall.city || 'منطقة التسوق'}</span>
                                    </span>
                                </div>

                                {/* View Button */}
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleMallClick(mall); }}
                                    className={`w-full py-3.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${isDisabled(mall)
                                        ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 hover:border-amber-500/40'
                                        : 'bg-gradient-to-r from-indigo-500/10 to-purple-500/10 hover:from-indigo-500 hover:to-purple-600 text-indigo-300 hover:text-white border border-indigo-500/20 hover:border-transparent group-hover:shadow-[0_0_30px_rgba(99,102,241,0.3)]'
                                        }`}
                                >
                                    {isDisabled(mall) ? (
                                        <>
                                            <PauseCircle className="w-4 h-4" />
                                            معلق مؤقتاً — عرض التفاصيل
                                        </>
                                    ) : (
                                        <>
                                            عرض التفاصيل
                                            <ArrowLeft className="w-4 h-4" />
                                        </>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    ))
                )}
            </div>

            {/* Disabled Mall Modal */}
            {showDisabledModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setShowDisabledModal(false)}>
                    <div className="bg-[#1a2332] rounded-3xl border border-white/10 p-6 w-full max-w-sm text-center" onClick={e => e.stopPropagation()}>
                        <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
                            <PauseCircle className="w-8 h-8 text-amber-400" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">{disabledMallName}</h3>
                        <p className="text-gray-400 text-sm mb-6">هذا المتجر معلق مؤقتاً وسيكون متوفراً قريباً</p>
                        <button onClick={() => setShowDisabledModal(false)} className="w-full py-3 rounded-xl bg-amber-500 text-white font-bold hover:bg-amber-600 transition-colors">
                            حسناً
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Malls;
