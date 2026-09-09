import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, LogIn, ArrowLeft, Eye, EyeOff, Sparkles, ShoppingCart, ShieldCheck, Zap } from 'lucide-react';
import useAuthStore from '../store/useAuthStore';
import { useNavigate, Link, useLocation, useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import { subscribeToPush } from '../utils/pwa';
import { getRole, getDashboardPath } from '../utils/role';

const FloatingShape = ({ className, delay = 0 }) => (
    <motion.div
        className={`absolute rounded-full opacity-20 ${className}`}
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{
            y: [0, -30, 0],
            scale: [1, 1.2, 1],
            opacity: [0.15, 0.25, 0.15],
        }}
        transition={{ duration: 8, delay, repeat: Infinity, ease: 'easeInOut' }}
    />
);

const FEATURES = [
    { icon: ShoppingCart, text: 'إدارة متاجر ومولات متعددة' },
    { icon: Zap, text: 'نقاط بيع سريعة مع ماسح ضوئي' },
    { icon: ShieldCheck, text: 'تتبع الطلبات والتوصيل آنياً' },
    { icon: Sparkles, text: 'تقارير وإحصائيات ذكية' },
];

const Login = () => {
    const { login, loading } = useAuthStore();
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [remember, setRemember] = useState(true);
    const [error, setError] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
    const cardRef = useRef(null);

    useEffect(() => {
        const err = searchParams.get('error') || new URLSearchParams(location.search).get('error');
        const details = searchParams.get('details') || new URLSearchParams(location.search).get('details');
        if (err) {
            const messages = {
                google_auth_failed: 'فشل تسجيل الدخول عبر Google، حاول مرة أخرى أو تأكد من إعدادات Google',
                account_suspended: 'حسابك موقوف، يرجى التواصل مع الإدارة',
                login_failed: 'فشل تسجيل الدخول، حاول مرة أخرى',
            };
            const base = messages[err] || 'حدث خطأ، حاول مرة أخرى';
            setError(details ? `${base} — ${decodeURIComponent(details)}` : base);
        }
    }, [location.search, searchParams]);

    useEffect(() => {
        const handleMove = (e) => {
            if (cardRef.current) {
                const rect = cardRef.current.getBoundingClientRect();
                setMousePos({
                    x: (e.clientX - rect.left) / rect.width,
                    y: (e.clientY - rect.top) / rect.height,
                });
            }
        };
        const el = cardRef.current;
        if (el) el.addEventListener('mousemove', handleMove);
        return () => { if (el) el.removeEventListener('mousemove', handleMove); };
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        const result = await login({ email, password }, remember);
        if (result.success) {
            const path = getDashboardPath(result.user);
            subscribeToPush();
            navigate(path);
        } else {
            setError(result.message);
        }
    };

    const glowX = mousePos.x * 100;
    const glowY = mousePos.y * 100;

    return (
        <div className="min-h-screen flex relative overflow-hidden bg-[#0d0d14]">
            {/* ===== LEFT PANEL — HERO BRANDING ===== */}
            <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center p-12 overflow-hidden">
                {/* Gradient background */}
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/40 via-[#0d0d14] to-purple-900/30" />
                <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)', backgroundSize: '40px 40px' }} />

                {/* Floating orbs */}
                <FloatingShape className="w-96 h-96 bg-indigo-500 -top-20 -left-20 blur-[120px]" />
                <FloatingShape className="w-80 h-80 bg-purple-500 -bottom-20 -right-20 blur-[120px]" delay={3} />
                <FloatingShape className="w-64 h-64 bg-emerald-500 top-1/2 left-1/2 blur-[100px]" delay={6} />

                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className="relative z-10 text-center max-w-lg"
                >
                    {/* Logo */}
                    <div className="w-52 h-52 mx-auto mb-10 relative group">
                        <div className="absolute inset-2 bg-gradient-to-br from-indigo-400 via-purple-400 to-pink-400 rounded-[3rem] blur-3xl opacity-60 group-hover:opacity-80 transition-all duration-700" />
                        <div className="relative w-full h-full rounded-[2.5rem] bg-white flex items-center justify-center shadow-2xl p-6 border border-white/20">
                            <img src="/logo.webp" alt="Smart Mall" className="w-full h-full object-contain" />
                        </div>
                    </div>

                    <h1 className="text-5xl font-black mb-4 tracking-tight text-white">
                        سمارت مول
                    </h1>
                    <p className="text-gray-400 text-lg leading-relaxed mb-12">
                        منصة متكاملة لإدارة المولات والمتاجر — نقاط بيع، تتبع طلبات، تقارير لحظية
                    </p>

                    {/* Feature pills */}
                    <div className="flex flex-col gap-3 items-center">
                        {FEATURES.map((f, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, x: -30 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.3 + i * 0.1 }}
                                className="flex items-center gap-3 bg-white/5 backdrop-blur-xl rounded-full px-6 py-3 border border-white/10 w-fit"
                            >
                                <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center">
                                    <f.icon className="w-4 h-4 text-indigo-400" />
                                </div>
                                <span className="text-sm text-gray-300 font-medium whitespace-nowrap">{f.text}</span>
                            </motion.div>
                        ))}
                    </div>

                    {/* Trust badges */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1 }}
                        className="mt-14 flex items-center justify-center gap-8 text-xs text-gray-600"
                    >
                        <span>نظام آمن</span>
                        <span className="w-1 h-1 rounded-full bg-gray-700" />
                        <span>دعم فني 24/7</span>
                        <span className="w-1 h-1 rounded-full bg-gray-700" />
                        <span>تشفير كامل</span>
                    </motion.div>
                </motion.div>
            </div>

            {/* ===== RIGHT PANEL — FORM ===== */}
            <div className="w-full lg:w-1/2 min-h-screen flex items-center justify-center p-4 sm:p-8 relative">
                {/* Background glow for mobile */}
                <div className="absolute inset-0 lg:hidden pointer-events-none">
                    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse" />
                    <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
                </div>

                <motion.div
                    ref={cardRef}
                    initial={{ opacity: 0, x: 60 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="relative w-full max-w-[440px]"
                >
                    {/* Mouse-follow gradient glow */}
                    <div
                        className="absolute -inset-6 rounded-[3.5rem] opacity-40 blur-3xl pointer-events-none transition-all duration-700 hidden lg:block"
                        style={{
                            background: `radial-gradient(600px circle at ${glowX}% ${glowY}%, rgba(99,102,241,0.15), transparent 60%)`,
                        }}
                    />

                    {/* Card */}
                    <div className="relative glass-card rounded-[2.5rem] p-8 sm:p-10 border border-white/10 shadow-2xl bg-[#12121c]/90 backdrop-blur-xl">
                        {/* Mobile-only logo */}
                        <div className="lg:hidden text-center mb-8">
                            <div className="w-24 h-24 mx-auto mb-4 relative">
                                <div className="absolute inset-0 bg-indigo-500/30 blur-2xl rounded-2xl" />
                                <div className="relative w-full h-full rounded-2xl bg-white flex items-center justify-center p-3 shadow-lg">
                                    <img src="/logo.webp" alt="Smart Mall" className="w-full h-full object-contain" />
                                </div>
                            </div>
                            <h2 className="text-2xl font-black text-white">أهلاً بك</h2>
                            <p className="text-gray-500 text-sm mt-1">سجّل دخولك للمنصة</p>
                        </div>

                        {/* Desktop-only header */}
                        <div className="hidden lg:block text-center mb-10">
                            <h2 className="text-3xl font-black text-white mb-2">تسجيل الدخول</h2>
                            <p className="text-gray-500 text-sm">أهلاً بعودتك! أدخل بيانات حسابك</p>
                        </div>

                        {/* Error */}
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-rose-500/10 border border-rose-500/20 rounded-2xl px-5 py-3.5 text-rose-400 text-sm font-bold text-center mb-6 flex items-center justify-center gap-2"
                            >
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse shrink-0" />
                                {error}
                            </motion.div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="space-y-1.5">
                                <label className="block text-sm font-bold text-gray-400">البريد الإلكتروني</label>
                                <div className="relative group">
                                    <Mail className="absolute right-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-500 group-focus-within:text-indigo-400 transition-colors" />
                                    <input
                                        type="email"
                                        placeholder="example@email.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        autoComplete="email"
                                        className="input-field !bg-white/[0.03] pr-12 !py-4 !rounded-2xl border-white/10 focus:border-indigo-500/50 focus:bg-white/[0.06] transition-all text-right"
                                        
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-sm font-bold text-gray-400">كلمة المرور</label>
                                <div className="relative group">
                                    <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-500 group-focus-within:text-indigo-400 transition-colors" />
                                    <input
                                        type={showPass ? 'text' : 'password'}
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        autoComplete="current-password"
                                        className="input-field !bg-white/[0.03] pr-12 !py-4 !rounded-2xl border-white/10 focus:border-indigo-500/50 focus:bg-white/[0.06] transition-all text-right"
                                        
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPass(!showPass)}
                                        className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                                    >
                                        {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-1">
                                <label className="flex items-center gap-2.5 cursor-pointer group">
                                    <button
                                        type="button"
                                        onClick={() => setRemember(!remember)}
                                        className={`w-10 h-5 rounded-full transition-all relative ${remember ? 'bg-indigo-500' : 'bg-white/10'}`}
                                    >
                                        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all shadow-md ${remember ? 'right-0.5' : 'right-[22px]'}`} />
                                    </button>
                                    <span className="text-sm text-gray-500 group-hover:text-gray-300 transition-colors font-medium">تذكرني</span>
                                </label>
                                <Link to="/forgot-password" className="text-sm text-gray-600 hover:text-indigo-400 transition-colors font-bold">
                                    نسيت كلمة المرور؟
                                </Link>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="btn-primary w-full !py-4 !rounded-2xl !text-base font-black shadow-xl shadow-indigo-500/25 relative overflow-hidden group"
                            >
                                <span className="relative z-10 flex items-center justify-center gap-2.5">
                                    {loading ? (
                                        <>
                                            <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                            </svg>
                                            جاري الدخول...
                                        </>
                                    ) : (
                                        <>
                                            دخول للمنصة
                                            <LogIn className="w-5 h-5 group-hover:translate-x-[-3px] transition-transform" />
                                        </>
                                    )}
                                </span>
                            </button>
                        </form>

                        {/* Divider */}
                        <div className="relative my-8">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-white/[0.06]" />
                            </div>
                            <div className="relative flex justify-center">
                                <span className="px-4 text-xs font-bold text-gray-600 bg-[#12121c]">أو الدخول عبر</span>
                            </div>
                        </div>

                        {/* Google */}
                        <button
                            onClick={async () => {
                                setError('');
                                try {
                                    const res = await api.get('/auth/google/redirect');
                                    window.location.href = res.data.url;
                                } catch (e) {
                                    setError(e.response?.data?.message || 'تعذر الاتصال بخدمة Google، حاول مرة أخرى');
                                }
                            }}
                            className="flex items-center justify-center gap-3 w-full py-3.5 px-4 rounded-2xl font-bold text-gray-300 bg-white/[0.03] hover:bg-white/[0.08] transition-all border border-white/10 hover:border-white/20 group"
                        >
                            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            <span>Google تسجيل الدخول عبر</span>
                        </button>

                        {/* Register link */}
                        <div className="mt-8 text-center">
                            <p className="text-gray-500 text-sm">
                                ليس لديك حساب؟{' '}
                                <Link to="/register" className="text-indigo-400 hover:text-indigo-300 font-bold transition-colors">
                                    أنشئ حساباً جديداً
                                </Link>
                            </p>
                        </div>
                    </div>

                    {/* Back link */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.6 }}
                        className="mt-8 text-center"
                    >
                        <Link to="/" className="inline-flex items-center gap-2 text-gray-600 hover:text-indigo-400 transition-colors font-bold text-sm">
                            <ArrowLeft className="w-4 h-4" />
                            العودة للصفحة الرئيسية
                        </Link>
                    </motion.div>
                </motion.div>
            </div>
        </div>
    );
};

export default Login;
