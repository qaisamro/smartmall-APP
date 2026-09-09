import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Building2, Shield, Sparkles, Rocket,
  CheckCircle2, ShoppingCart, Store, Gift, Clock, Tag, Zap,
  ChevronLeft, ChevronRight, Globe, Smartphone, Truck,
  Users, Package, TrendingUp, ChevronDown, X, ShoppingBag,
  QrCode, LayoutGrid, Info, Sun, DollarSign, Coins,
  Pill, Newspaper, Thermometer, Droplets, Wind, AlertTriangle,
  TrendingDown, Phone, MapPin, RefreshCw, Eye, EyeOff
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';
import { getDashboardPath } from '../utils/role';
import useCartStore from '../store/useCartStore';
import api from '../api/axios';
import PwaInstructions from '../components/PwaInstructions';
import MallPartners from '../components/MallPartners';

const stats = [
    { value: '50+', label: 'مول وسوبر ماركت', icon: Building2 },
    { value: '10K+', label: 'منتج متنوع', icon: Package },
    { value: '99%', label: 'رضا العملاء', icon: TrendingUp },
];

const features = [
  {
    icon: QrCode, title: 'مسح بالباركود', desc: 'امسح أي باركود لتعرف السعر والمنتج فوراً',
    gradient: 'from-blue-600 to-cyan-500', shadowColor: 'shadow-blue-500/20',
  },
  {
    icon: Truck, title: 'توصيل سريع', desc: 'طلباتك توصل لباب البيت في أقل من ساعة',
    gradient: 'from-emerald-600 to-teal-500', shadowColor: 'shadow-emerald-500/20',
  },
  {
    icon: Sparkles, title: 'عروض حصرية', desc: 'صفقات يومية وأسبوعية لا تفوّت',
    gradient: 'from-amber-600 to-orange-500', shadowColor: 'shadow-amber-500/20',
  },
  {
    icon: Globe, title: 'مولات متعددة', desc: 'تسوق من كل المولات والسوبر ماركت بمكان واحد',
    gradient: 'from-purple-600 to-pink-500', shadowColor: 'shadow-purple-500/20',
  },
  {
    icon: Smartphone, title: 'تطبيق جوال', desc: 'جرّب التجربة الكاملة على جوالك',
    gradient: 'from-rose-600 to-red-500', shadowColor: 'shadow-rose-500/20',
  },
];

const steps = [
  { num: '01', title: 'تصفح المولات', desc: 'اختر المول أو السوبر ماركت اللي تبي', icon: Store },
  { num: '02', title: 'اختار منتجاتك', desc: 'تصفح المنتجات أو امسح الباركود', icon: ShoppingBag },
  { num: '03', title: 'اطلب واستلم', desc: 'توصيل سريع أو استلام من المعرض', icon: Truck },
];

const floatingShapes = [
  { size: 300, color: 'from-indigo-500/10 to-purple-500/5', duration: 20, x: '10%', y: '10%', delay: 0 },
  { size: 400, color: 'from-emerald-500/8 to-cyan-500/3', duration: 25, x: '70%', y: '20%', delay: -5 },
  { size: 250, color: 'from-amber-500/8 to-orange-500/3', duration: 18, x: '50%', y: '70%', delay: -8 },
  { size: 350, color: 'from-rose-500/6 to-pink-500/3', duration: 22, x: '20%', y: '60%', delay: -12 },
  { size: 200, color: 'from-blue-500/6 to-cyan-500/3', duration: 15, x: '80%', y: '80%', delay: -3 },
];

const sectionAccents = {
  weather: { from: 'from-sky-500', to: 'to-cyan-600', iconColor: 'text-sky-400', bgGlow: 'bg-sky-500/5' },
  currencies: { from: 'from-emerald-500', to: 'to-green-600', iconColor: 'text-emerald-400', bgGlow: 'bg-emerald-500/5' },
  gold: { from: 'from-amber-500', to: 'to-yellow-600', iconColor: 'text-amber-400', bgGlow: 'bg-amber-500/5' },
  prayer_times: { from: 'from-purple-500', to: 'to-indigo-600', iconColor: 'text-purple-400', bgGlow: 'bg-purple-500/5' },
  pharmacies: { from: 'from-rose-500', to: 'to-pink-600', iconColor: 'text-rose-400', bgGlow: 'bg-rose-500/5' },
  news: { from: 'from-slate-500', to: 'to-gray-600', iconColor: 'text-slate-400', bgGlow: 'bg-slate-500/5' },
};

const AnimatedOrbs = () => (
  <div className="fixed inset-0 pointer-events-none overflow-hidden">
    {floatingShapes.map((s, i) => (
      <motion.div
        key={i}
        className={`absolute rounded-full bg-gradient-to-br ${s.color} blur-3xl`}
        style={{ width: s.size, height: s.size, left: s.x, top: s.y }}
        animate={{
          x: [0, 30, -20, 40, 0],
          y: [0, -40, 20, -30, 0],
          scale: [1, 1.05, 0.95, 1.02, 1],
        }}
        transition={{ duration: s.duration, repeat: Infinity, ease: 'easeInOut', delay: s.delay }}
      />
    ))}
    <div className="absolute inset-0 opacity-[0.03]"
      style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
        backgroundSize: '80px 80px'
      }}
    />
  </div>
);

const GlowButton = ({ children, onClick, variant = 'primary', className = '', icon: Icon }) => {
  const base = 'relative overflow-hidden rounded-2xl font-bold text-sm sm:text-base transition-all duration-500 active:scale-95 group';
  const variants = {
    primary:
      'bg-gradient-to-l from-indigo-600 via-violet-600 to-purple-600 text-white shadow-2xl shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.02] hover:brightness-110',
    secondary:
      'bg-white/5 text-white border border-white/10 hover:bg-white/10 hover:border-white/20 backdrop-blur-sm',
    outline:
      'bg-transparent text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/10 hover:border-indigo-500/50',
  };
  return (
    <button onClick={onClick} className={`${base} ${variants[variant]} ${className}`}>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
      <div className="relative flex items-center justify-center gap-2.5 px-6 sm:px-8 py-3.5 sm:py-4">
        {Icon && <Icon className="w-5 h-5" />}
        {children}
      </div>
    </button>
  );
};

const widgetRenderers = {
  weather: (s, d) => (
    <div className="flex items-center gap-4">
      <div className="text-4xl font-black text-white">{d.temperature}°</div>
      <div>
        <div className="text-sm font-medium text-gray-300">{d.condition}</div>
        <div className="flex gap-3 mt-1">
          {d.humidity != null && <span className="flex items-center gap-1 text-[11px] text-gray-500"><Droplets className="w-3 h-3 text-sky-400" />{d.humidity}%</span>}
          {d.wind_speed != null && <span className="flex items-center gap-1 text-[11px] text-gray-500"><Wind className="w-3 h-3 text-cyan-400" />{d.wind_speed} كم/س</span>}
        </div>
      </div>
    </div>
  ),
  currencies: (s, d) => (
    <div className="space-y-2">
      <div className="flex items-center text-[10px] text-gray-600 font-bold pb-1 border-b border-white/5">
        <span className="flex-1">العملة</span><span className="w-[4.5rem] text-right">شراء</span><span className="w-[4.5rem] text-right">بيع</span>
      </div>
      {d.map(c => (
        <div key={c.id} className="flex items-center text-sm py-1">
          <span className="flex-1 font-bold text-white">{c.code}</span>
          <span className="w-[4.5rem] text-right font-mono text-gray-400">{Number(c.buy_rate).toLocaleString()}</span>
          <span className="w-[4.5rem] text-right font-mono text-gray-400">{Number(c.sell_rate).toLocaleString()}</span>
        </div>
      ))}
    </div>
  ),
  gold: (s, d) => (
    <div className="space-y-2">
      {d.map(g => (
        <div key={g.id} className="flex items-center justify-between py-1.5 border-b border-white/[0.02] last:border-0">
          <span className="text-sm text-gray-400">{g.type}</span>
          <div className="flex items-center gap-2">
            <span className="font-bold text-white font-mono">{Number(g.price).toLocaleString()}</span>
            {g.change != null && (
              <span className={`flex items-center gap-0.5 text-xs font-bold ${g.change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {g.change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {g.change >= 0 ? '+' : ''}{g.change}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  ),
  prayer_times: (s, d) => (
    <div className="grid grid-cols-2 gap-1.5">
      {[['الفجر', d.fajr], ['الظهر', d.dhuhr], ['العصر', d.asr], ['المغرب', d.maghrib], ['العشاء', d.isha]].map(([label, time]) => (
        <div key={label} className="flex items-center justify-between px-2.5 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06]">
          <span className="text-xs text-gray-500 font-medium">{label}</span>
          <span className="text-xs font-bold text-white font-mono">{time}</span>
        </div>
      ))}
    </div>
  ),
  pharmacies: (s, d) => (
    <div className="space-y-2">
      {d.map(p => (
        <div key={p.id} className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.06] space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-bold text-sm text-white">{p.name}</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">مناوبة</span>
          </div>
          {p.address && <div className="flex items-center gap-1.5 text-xs text-gray-500"><MapPin className="w-3 h-3 text-rose-400" />{p.address}</div>}
          {p.phone && <a href={`tel:${p.phone}`} className="flex items-center gap-1.5 text-xs text-indigo-400 font-medium hover:underline" dir="ltr"><Phone className="w-3 h-3" />{p.phone}</a>}
        </div>
      ))}
    </div>
  ),
  news: (s, d) => (
    <div className="space-y-2">
      {d.slice(0, 5).map((n, i) => (
        <div key={n.id} className={`pb-2 ${i < 4 ? 'border-b border-white/[0.04]' : ''}`}>
          <div className="text-sm font-bold text-white leading-snug line-clamp-2">{n.title}</div>
          {n.summary && <div className="text-xs text-gray-500 mt-1 leading-relaxed line-clamp-2">{n.summary}</div>}
        </div>
      ))}
    </div>
  ),
  alerts: (s, d) => (
    <div className="space-y-2">
      {d.map(a => (
        <div key={a.id} className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <div className="min-w-0">
              <div className="text-sm font-bold text-red-400 truncate">{a.title}</div>
              {a.body && <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">{a.body}</div>}
            </div>
          </div>
        </div>
      ))}
    </div>
  ),
  road_conditions: (s, d) => (
    <div className="space-y-1">
      {d.map(r => {
        const statusMap = { clear: { label: 'مفتوح', dot: 'bg-emerald-400', text: 'text-emerald-400' }, moderate: { label: 'مزدحم', dot: 'bg-amber-400', text: 'text-amber-400' }, heavy: { label: 'مزدحم جداً', dot: 'bg-red-400', text: 'text-red-400' }, closed: { label: 'مغلق', dot: 'bg-gray-400', text: 'text-gray-400' } };
        const st = statusMap[r.status] || { label: r.status, dot: 'bg-gray-400', text: 'text-gray-400' };
        return (
          <div key={r.id} className="flex items-center justify-between py-2 border-b border-white/[0.02] last:border-0">
            <div className="flex items-center gap-2 min-w-0">
              <span className={`w-2 h-2 rounded-full shrink-0 ${st.dot}`} />
              <span className="text-sm text-gray-400 truncate">{r.road_name}</span>
            </div>
            <span className={`text-xs font-bold shrink-0 px-2.5 py-0.5 rounded-full ${st.text} bg-white/[0.04] border border-white/[0.06]`}>
              {st.label}
            </span>
          </div>
        );
      })}
    </div>
  ),
};

const sectionIcons = {
  weather: Sun, currencies: DollarSign, gold: Coins, prayer_times: Clock,
  pharmacies: Pill, news: Newspaper, alerts: AlertTriangle, road_conditions: MapPin,
};

const LiveInfoPanel = ({ sections, sectionData, onClose }) => {
  const panelRef = useRef(null);
  const startY = useRef(0);
  const [deltaY, setDeltaY] = useState(0);
  const [closing, setClosing] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const sectionMap = {};

  (Array.isArray(sections) ? sections : []).forEach(s => {
    const renderer = widgetRenderers[s.key];
    const rawData = sectionData?.[s.key];
    const hasData = Array.isArray(rawData) ? rawData.length > 0 : !!rawData;
    if (renderer && hasData) {
      sectionMap[s.key] = { label: s.label_ar, icon: sectionIcons[s.key] || Info, data: rawData, renderer };
    }
  });

  const sectionKeys = Object.keys(sectionMap);
  if (sectionKeys.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-end bg-black/60 backdrop-blur-sm"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="w-full rounded-t-3xl bg-[#0a0a0f] border-t border-white/10 p-8 text-center"
        >
          <div className="w-12 h-1 rounded-full bg-white/20 mx-auto mb-6" />
          <Info className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 font-bold">لا توجد معلومات حية متاحة حالياً</p>
          <button onClick={onClose} className="mt-4 px-6 py-2 rounded-xl bg-white/10 text-white text-sm font-bold">إغلاق</button>
        </motion.div>
      </motion.div>
    );
  }

  const handleTouchStart = (e) => { startY.current = e.touches[0].clientY; };
  const handleTouchMove = (e) => {
    const diff = e.touches[0].clientY - startY.current;
    if (diff > 0) setDeltaY(diff);
  };
  const handleTouchEnd = () => {
    if (deltaY > 120) { setClosing(true); setTimeout(onClose, 250); }
    setDeltaY(0);
  };

  const activeSec = sectionMap[sectionKeys[activeTab]];
  const ActiveIcon = activeSec.icon;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-end bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        ref={panelRef}
        initial={{ y: '100%' }}
        animate={{ y: closing ? '100%' : 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="relative w-full max-h-[85dvh] bg-gradient-to-t from-[#0a0a0f] to-[#12121a] border-t border-white/10 rounded-t-3xl overflow-hidden shadow-2xl"
        style={{ y: deltaY }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-12 h-1 rounded-full bg-white/20" />
        </div>

        <div className="flex items-center justify-between px-5 pb-4 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Info className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">معلومات حية</h3>
              <p className="text-[10px] text-gray-500">بيانات محدثة لحظياً</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* ─── Tab bar ─── */}
        <div className="overflow-x-auto px-5 pb-3 shrink-0 [&::-webkit-scrollbar]:hidden">
          <div className="flex gap-2 min-w-max">
            {sectionKeys.map((key, i) => {
              const sec = sectionMap[key];
              const SecIcon = sec.icon;
              const isActive = i === activeTab;
              return (
                <button
                  key={key}
                  onClick={() => setActiveTab(i)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-gradient-to-l from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-200 border border-white/10'
                  }`}
                >
                  <SecIcon className="w-4 h-4" />
                  {sec.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ─── Active tab content ─── */}
        <div className="overflow-y-auto px-5 pb-5" style={{ maxHeight: 'calc(85dvh - 180px)' }}>
          <motion.div
            key={sectionKeys[activeTab]}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.02] p-4"
          >
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-l from-indigo-500 to-purple-600 opacity-80" />
            <h4 className="text-xs font-bold text-gray-500 flex items-center gap-1.5 mb-3">
              <ActiveIcon className="w-3.5 h-3.5 text-indigo-400" />
              {activeSec.label}
            </h4>
            {activeSec.renderer(sectionKeys[activeTab], activeSec.data)}
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
};

const Home = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [liveInfoOpen, setLiveInfoOpen] = useState(false);
  const heroRef = useRef(null);

  const { data: widgetsData, isSuccess: widgetsLoaded } = useQuery({
    queryKey: ['home-widgets'],
    queryFn: async () => (await api.get('/home-widgets')).data,
    refetchInterval: 300000,
  });

  const { data: mallList } = useQuery({
    queryKey: ['home-malls-list'],
    queryFn: async () => {
      const res = await api.get('/malls');
      return Array.isArray(res.data) ? res.data.length : 0;
    },
    staleTime: 5 * 60 * 1000,
  });

  const statsData = useMemo(() => {
    const malls = mallList ?? 0;
    return [
      { value: malls >= 50 ? `${malls}+` : malls, label: 'مول وسوبر ماركت', icon: Building2 },
      { value: '10K+', label: 'منتج متنوع', icon: Package },
      { value: '99%', label: 'رضا العملاء', icon: TrendingUp },
    ];
  }, [mallList]);

  const role = user?.roles?.[0]?.name;
  const dashboardPath = getDashboardPath(user);

  useEffect(() => {
    if (isAuthenticated && dashboardPath !== '/') {
      navigate(dashboardPath, { replace: true });
    }
  }, [isAuthenticated, user, dashboardPath, navigate]);

  const handleStartShopping = () => {
    if (isAuthenticated) {
      if (role === 'mall-owner' || role === 'supermarket-owner') navigate('/owner');
      else navigate('/malls');
    } else setShowAuthModal(true);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.12, delayChildren: 0.2 } }
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] } }
  };

  return (
    <div className="relative">
      <AnimatedOrbs />

      {/* ─── HERO ─── */}
      <section ref={heroRef} className="relative min-h-screen flex flex-col items-center justify-center text-center px-4 pt-24 pb-12 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-gradient-to-br from-indigo-600/12 via-violet-600/8 to-purple-600/12 blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />

        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="relative z-10 space-y-8 max-w-6xl mx-auto">
          {/* Badge */}
          <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md shadow-xl">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-xs sm:text-sm font-bold text-gray-300">
              {isAuthenticated ? `مرحباً بعودتك، ${user?.name || 'عميلنا العزيز'} 👋` : 'التكنولوجيا تلتقي بالتسوق'}
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1 variants={itemVariants} className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold leading-[0.95] tracking-tight">
            <span className="text-white">تسوق</span>{' '}
            <span className="bg-gradient-to-l from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">أذكى</span>
            <br />
            <span className="text-white">وفر وقتك وجهدك</span>
          </motion.h1>

          <motion.p variants={itemVariants} className="text-gray-400 text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed">
            منصتك المتكاملة لاكتشاف أفضل المنتجات من كل المولات والسوبر ماركت،
            مسح سريع، دفع سهل، وتوصيل لباب البيت.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <GlowButton onClick={handleStartShopping} icon={ShoppingCart}>
              ابدأ التسوق الآن
              <ArrowLeft className="w-5 h-5 group-hover:translate-x-[-5px] transition-transform duration-300" />
            </GlowButton>
            <GlowButton onClick={() => navigate('/malls?type=mall')} variant="secondary" icon={Store}>
              تصفح المولات
            </GlowButton>
            <GlowButton onClick={() => navigate('/malls?type=supermarket')} variant="outline" icon={Building2}>
              السوبر ماركت
            </GlowButton>
          </motion.div>

          {/* Trust badges */}
          <motion.div variants={itemVariants} className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 pt-6">
            {['بدون رسوم خفية', 'آمن 100%', 'دعم فوري', 'توصيل سريع'].map((text, i) => (
              <span key={i} className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.03] border border-white/[0.06] text-xs sm:text-sm text-gray-500 backdrop-blur-sm hover:bg-white/[0.06] transition-all">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                {text}
              </span>
            ))}
          </motion.div>

          {/* Scroll indicator */}
          <motion.div variants={itemVariants} className="pt-8">
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="inline-flex flex-col items-center gap-1.5 text-gray-600 cursor-pointer"
              onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })}
            >
              <span className="text-[10px] font-bold tracking-widest uppercase">اكتشف المزيد</span>
              <ChevronDown className="w-4 h-4" />
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* ─── OFFERS (logged-in only) ─── */}
      {isAuthenticated && (
        <section className="relative max-w-6xl mx-auto px-4 mb-20">
          <HomeOffersSection />
        </section>
      )}

      {/* ─── STATISTICS ─── */}
      <motion.section
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        className="relative max-w-6xl mx-auto px-4 mb-20"
      >
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {statsData.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.04] to-white/[0.01] backdrop-blur-xl p-5 sm:p-6 text-center hover:border-white/[0.12] hover:shadow-xl transition-all duration-500"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/0 via-transparent to-purple-500/0 group-hover:from-indigo-500/5 group-hover:to-purple-500/5 transition-all duration-500" />
              <s.icon className="w-5 h-5 mx-auto mb-3 text-indigo-400/60 group-hover:text-indigo-300 transition-colors" />
              <div className="text-2xl sm:text-3xl font-black text-white mb-0.5">{s.value}</div>
              <div className="text-xs sm:text-sm text-gray-500 font-medium">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* ─── FEATURES ─── */}
      <section className="relative max-w-6xl mx-auto px-4 mb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12 space-y-3"
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            مميزات SmartMall
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold">
            كل ما تحتاجه في{' '}
            <span className="bg-gradient-to-l from-indigo-400 to-purple-400 bg-clip-text text-transparent">مكان واحد</span>
          </h2>
          <p className="text-gray-500 text-base sm:text-lg max-w-xl mx-auto">نقدم لك تجربة تسوق استثنائية تجمع بين التكنولوجيا والراحة</p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.04] to-white/[0.01] backdrop-blur-xl p-6 sm:p-7 hover:border-white/[0.12] transition-all duration-500 hover:-translate-y-1"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${f.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />
              <div className={`relative w-12 h-12 rounded-xl bg-gradient-to-br ${f.gradient} flex items-center justify-center mb-4 shadow-lg ${f.shadowColor} group-hover:scale-110 transition-transform duration-500`}>
                <f.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-white mb-1.5 group-hover:text-indigo-300 transition-colors">{f.title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
              <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-l ${f.gradient} scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-right`} />
            </motion.div>
          ))}
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section className="relative max-w-6xl mx-auto px-4 mb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12 space-y-3"
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-bold">
            <Rocket className="w-3.5 h-3.5" />
            سهولة الاستخدام
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold">
            ابدأ في{' '}
            <span className="bg-gradient-to-l from-emerald-400 to-teal-400 bg-clip-text text-transparent">3 خطوات</span>
          </h2>
        </motion.div>

        <div className="grid sm:grid-cols-3 gap-6 sm:gap-8 relative">
          <div className="hidden sm:block absolute top-16 left-[calc(16.66%+2rem)] right-[calc(16.66%+2rem)] h-0.5 bg-gradient-to-r from-indigo-500/30 via-violet-500/30 to-purple-500/30" />
          {steps.map((s, i) => (
            <motion.div
              key={s.num}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="relative flex flex-col items-center text-center group"
            >
              <div className="relative mb-6">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/[0.08] flex items-center justify-center group-hover:border-indigo-500/30 group-hover:shadow-xl group-hover:shadow-indigo-500/10 transition-all duration-500 group-hover:scale-105">
                  <s.icon className="w-8 h-8 sm:w-10 sm:h-10 text-indigo-400 group-hover:text-indigo-300 transition-colors" />
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-black text-white shadow-lg shadow-indigo-500/30">
                  {s.num}
                </div>
              </div>
              <h3 className="text-lg font-bold text-white mb-1.5">{s.title}</h3>
              <p className="text-sm text-gray-500 max-w-[220px]">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ─── PWA ─── */}
      <section className="relative max-w-6xl mx-auto px-4 mb-20">
        <PwaInstructions />
      </section>

      {/* ─── Partners ─── */}
      <section className="relative max-w-7xl mx-auto px-4 mb-20">
        <MallPartners />
      </section>

      {/* ─── CTA (guests only) ─── */}
      {!isAuthenticated && (
        <motion.section
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          className="relative max-w-6xl mx-auto px-4 mb-20"
        >
          <div className="relative overflow-hidden rounded-3xl border border-white/[0.06] bg-gradient-to-br from-indigo-600/10 via-violet-600/5 to-purple-600/10 p-8 sm:p-12 lg:p-16 text-center">
            <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-500/15 rounded-full blur-[120px]" />
            <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-500/15 rounded-full blur-[120px]" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-br from-indigo-500/8 to-violet-500/8 rounded-full blur-[100px]" />
            <div className="relative space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-bold">
                <Rocket className="w-4 h-4" />
                ابدأ الآن مجاناً
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold">
                انضم إلى{' '}
                <span className="bg-gradient-to-l from-indigo-400 to-purple-400 bg-clip-text text-transparent">SmartMall</span>
                {' '}اليوم
              </h2>
              <p className="text-gray-400 text-base sm:text-lg max-w-xl mx-auto">
                أكثر من 5,000 مستخدم يثقون بنا. ابدأ رحلة التسوق الذكي الآن.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
                <GlowButton onClick={() => navigate('/register')} icon={Rocket} className="!px-10">
                  أنشئ حساباً مجاناً
                </GlowButton>
                <GlowButton onClick={() => navigate('/login')} variant="secondary" icon={Shield}>
                  تسجيل الدخول
                </GlowButton>
              </div>
            </div>
          </div>
        </motion.section>
      )}

      {/* ─── AUTH MODAL ─── */}
      <AnimatePresence>
        {showAuthModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
            onClick={() => setShowAuthModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 30 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-md rounded-3xl border border-white/[0.08] bg-gradient-to-br from-gray-900 to-gray-950 p-8 sm:p-10 text-center space-y-6 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute -top-40 -right-40 w-80 h-80 bg-indigo-500/10 rounded-full blur-[100px]" />
              <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-[100px]" />
              <button onClick={() => setShowAuthModal(false)} className="absolute top-4 left-4 w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors border border-white/10 z-10">
                <X className="w-4 h-4 text-gray-400" />
              </button>
              <div className="relative">
                <div className="w-20 h-20 mx-auto mb-6 rounded-[1.75rem] bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-indigo-500/30">
                  <ShoppingCart className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-extrabold mb-3">تسجيل الدخول مطلوب</h3>
                <p className="text-gray-400 leading-relaxed mb-2">
                  للاستفادة من خدمات التوصيل والعروض الحصرية، يرجى تسجيل الدخول.
                </p>
                <p className="text-gray-500 text-sm">يمكنك تصفح المنتجات بدون حساب، لكن التوصيل والعروض للأعضاء فقط.</p>
                <div className="flex flex-col sm:flex-row gap-3 mt-8">
                  <button onClick={() => { setShowAuthModal(false); navigate('/login'); }}
                    className="flex-1 py-4 rounded-2xl font-bold text-sm bg-gradient-to-l from-indigo-600 to-violet-600 text-white shadow-xl shadow-indigo-500/25 hover:brightness-110 transition-all">
                    تسجيل الدخول
                  </button>
                  <button onClick={() => { setShowAuthModal(false); navigate('/register'); }}
                    className="flex-1 py-4 rounded-2xl font-bold text-sm bg-white/5 text-white border border-white/10 hover:bg-white/10 transition-all">
                    إنشاء حساب
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── FLOATING LIVE INFO BUTTON ─── */}
      {widgetsLoaded && widgetsData && (
        <>
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 1.5, type: 'spring', damping: 20 }}
            onClick={() => setLiveInfoOpen(true)}
            className="fixed bottom-24 lg:bottom-6 left-4 sm:left-6 z-[150] group"
          >
            <div className="relative flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-gradient-to-l from-indigo-600 via-violet-600 to-purple-600 text-white shadow-2xl shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-105 transition-all duration-300">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-l from-indigo-600 via-violet-600 to-purple-600 animate-ping opacity-20" style={{ animationDuration: '3s' }} />
              <div className="relative flex items-center gap-2.5">
                <div className="relative">
                  <Info className="w-5 h-5" />
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-400 rounded-full">
                    <span className="absolute inset-0 bg-emerald-400 rounded-full animate-ping opacity-75" />
                  </span>
                </div>
                <span className="text-sm font-bold whitespace-nowrap">معلومات حية</span>
                <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-white/70 border-r border-white/20 pr-3">
                  <RefreshCw className="w-3 h-3" />
                  لحظي
                </div>
              </div>
            </div>
          </motion.button>

          {/* Live Info Panel */}
          <AnimatePresence>
            {liveInfoOpen && widgetsData && (
              <LiveInfoPanel
                sections={widgetsData.sections}
                sectionData={widgetsData.data}
                onClose={() => setLiveInfoOpen(false)}
              />
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
};

/* ─── Home Offers Section ─── */
const HomeOffersSection = () => {
  const { data: offers } = useQuery({
    queryKey: ['home-offers'],
    queryFn: async () => (await api.get('/offers')).data,
  });
  const list = Array.isArray(offers) ? offers : offers?.data || [];
  if (list.length === 0) return null;

  return <OffersDisplay list={list} />;
};

const OffersDisplay = ({ list }) => {
  const { addItem } = useCartStore();
  const [toastMsg, setToastMsg] = useState(null);
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const updateScrollButtons = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  const scroll = (dir) => {
    const el = scrollRef.current;
    if (!el) return;
    const cardW = el.querySelector('button')?.offsetWidth || 320;
    el.scrollBy({ left: dir * (cardW + 20), behavior: 'smooth' });
    setTimeout(updateScrollButtons, 400);
  };

  const handleAddToCart = (offer, e) => {
    e?.stopPropagation?.();
    if (!offer?.product) return;
    const offerPrice = offer.offer_price ?? offer.product.discount_price ?? offer.product.price;
    const details = [
      offer.title_ar ? `عرض: ${offer.title_ar}` : '',
      offer.description_ar ? offer.description_ar : '',
      `سعر العرض: ${offerPrice} ₪ (بدل ${offer.product.price} ₪)`,
    ].filter(Boolean).join(' — ');
    const productToAdd = {
      ...offer.product,
      id: offer.product.id,
      price: offerPrice,
      original_price: offer.product.price,
      mall_id: offer.mall_id,
      notes: details,
    };
    addItem(productToAdd, 1);
    setToastMsg(`✅ تمت إضافة ${offer.product.name_ar} إلى السلة مع تفاصيل العرض`);
    setTimeout(() => setToastMsg(null), 3000);
  };

  return (
    <>
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] bg-emerald-600 text-white px-6 py-3.5 rounded-2xl shadow-2xl shadow-emerald-600/30 text-sm font-bold flex items-center gap-2.5 whitespace-nowrap"
          >
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            {toastMsg}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-white/[0.06] bg-gradient-to-br from-amber-600/8 via-orange-600/5 to-rose-600/8 p-4 sm:p-12">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-amber-500/10 rounded-full blur-[120px]" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-rose-500/10 rounded-full blur-[120px]" />

        <div className="relative space-y-5 sm:space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-bold mb-2 sm:mb-3">
                <Sparkles className="w-3 h-3" />
                عروض حصرية
              </span>
              <h2 className="text-lg sm:text-3xl font-extrabold text-white">صفقات لا تفوّت</h2>
            </div>
            <Link to="/offers" className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-bold text-gray-300 hover:text-white transition-all">
              عرض الكل <ArrowLeft className="w-4 h-4" />
            </Link>
          </div>

          <div className="relative">
            {list.length > 3 && canScrollRight && (
              <button onClick={() => scroll(1)}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-amber-600/80 backdrop-blur-md border border-amber-400/30 flex items-center justify-center hover:bg-amber-500 transition-all shadow-xl shadow-amber-600/30 -ml-3 sm:-ml-4">
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </button>
            )}
            {list.length > 3 && canScrollLeft && (
              <button onClick={() => scroll(-1)}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-amber-600/80 backdrop-blur-md border border-amber-400/30 flex items-center justify-center hover:bg-amber-500 transition-all shadow-xl shadow-amber-600/30 -mr-3 sm:-mr-4">
                <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </button>
            )}
            <div ref={scrollRef} onScroll={updateScrollButtons}
              className={`${list.length > 3 ? 'flex overflow-x-auto scroll-smooth snap-x snap-mandatory gap-3 sm:gap-5 pb-2' : 'grid sm:grid-cols-2 lg:grid-cols-3 gap-5'}`}
              style={list.length > 3 ? { scrollbarWidth: 'none', msOverflowStyle: 'none' } : {}}>
              {list.slice(0, list.length > 3 ? list.length : 6).map((offer, i) => (
                <motion.div
                  key={offer.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.06 }}
                  className={`group relative text-right overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.04] to-white/[0.01] backdrop-blur-sm hover:border-amber-500/30 hover:shadow-xl hover:shadow-amber-500/10 transition-all duration-500 ${list.length > 3 ? 'snap-start shrink-0 w-[72vw] sm:w-[320px]' : 'w-full'}`}
                >
                  {offer.image ? (
                    <div className="relative h-36 sm:h-48 overflow-hidden">
                      <img src={offer.image} alt={offer.title_ar} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                      <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/40 to-transparent" />
                      <div className="absolute top-2 right-2 sm:top-3 sm:right-3">
                        <span className="inline-flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-1.5 rounded-full bg-gradient-to-l from-amber-500 to-orange-500 text-white text-[9px] sm:text-[10px] font-bold shadow-lg shadow-amber-500/30">
                          <Zap className="w-2.5 h-2.5 sm:w-3 sm:h-3" />عرض حصري
                        </span>
                      </div>
                      {offer.product && (
                        <div className="absolute bottom-2 left-2 sm:bottom-3 sm:left-3">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-emerald-500/20 backdrop-blur-md border border-emerald-500/30 text-emerald-400 text-[9px] sm:text-[10px] font-bold">
                            <ShoppingCart className="w-2.5 h-2.5 sm:w-3 sm:h-3" />تسوق الآن
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="h-28 sm:h-36 bg-gradient-to-br from-amber-500/10 to-orange-500/10 flex items-center justify-center relative">
                      <Gift className="w-10 h-10 sm:w-12 sm:h-12 text-amber-500/30" />
                      <div className="absolute top-2 right-2 sm:top-3 sm:right-3">
                        <span className="inline-flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-1.5 rounded-full bg-gradient-to-l from-amber-500 to-orange-500 text-white text-[9px] sm:text-[10px] font-bold shadow-lg shadow-amber-500/30">
                          <Zap className="w-2.5 h-2.5 sm:w-3 sm:h-3" />عرض حصري
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="p-3 sm:p-5 space-y-2 sm:space-y-3">
                    <h3 className="font-bold text-sm sm:text-base text-white group-hover:text-amber-300 transition-colors line-clamp-1">{offer.title_ar}</h3>
                    {offer.description_ar && (
                      <p className="text-gray-400 text-[11px] sm:text-xs line-clamp-2">{offer.description_ar}</p>
                    )}

                    {offer.product && (
                      <div className="flex items-center justify-between p-2 sm:p-3 rounded-xl bg-gradient-to-l from-emerald-500/10 to-transparent border border-emerald-500/10">
                        <span className="text-emerald-400 text-[11px] sm:text-xs font-bold flex items-center gap-1">
                          <Tag className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                          {offer.product.discount_price ? (
                            <><span className="line-through text-gray-500 ml-1">{offer.product.price} ₪</span>{offer.product.discount_price} ₪</>
                          ) : (`${offer.product.price} ₪`)}
                        </span>
                        <span className="text-[9px] sm:text-[10px] text-gray-500 line-clamp-1 max-w-[40%]">{offer.product.name_ar}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1.5 sm:pt-2 border-t border-white/5 text-[9px] sm:text-[10px]">
                      {offer.mall && (
                        <span className="text-indigo-400 flex items-center gap-1"><Store className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> {offer.mall.name_ar}</span>
                      )}
                      {offer.ends_at && (
                        <span className="text-gray-500 flex items-center gap-1"><Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> {new Date(offer.ends_at).toLocaleDateString('ar-EG')}</span>
                      )}
                    </div>

                    <button onClick={(e) => handleAddToCart(offer, e)}
                      className="w-full py-2.5 sm:py-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 bg-gradient-to-l from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 shadow-lg shadow-amber-500/20 transition-all active:scale-95">
                      <ShoppingCart className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> أضف إلى السلة
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <Link to="/offers" className="sm:hidden inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300 transition-all">
            عرض الكل <ArrowLeft className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </>
  );
};

export default Home;
