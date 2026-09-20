import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, User, UserPlus, Loader2, ArrowLeft, LogIn, Eye, EyeOff, Sparkles, TrendingUp, Users, Globe } from 'lucide-react';
import useAuthStore from '../store/useAuthStore';
import { useNavigate, Link } from 'react-router-dom';
import { getDashboardPath } from '../utils/role';

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

const BENEFITS = [
    { icon: Users, text: 'انضم إلى آلاف المستخدمين' },
    { icon: TrendingUp, text: 'طور أعمالك براحة' },
    { icon: Globe, text: 'منصة عربية بالكامل' },
    { icon: Sparkles, text: 'تجربة مستخدم استثنائية' },
];

const Register = () => {
    const { register, loading } = useAuthStore();
    const navigate = useNavigate();

    const [formData, setFormData] = useState({ name: '', email: '', password: '', password_confirmation: '', role: 'customer' });
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState({});
    const [showPass, setShowPass] = useState(false);
    const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });

    const translateError = (field, msg) => {
        if (!msg) return msg;
        const m = msg.toLowerCase();
        if (field === 'email' && m.includes('already been taken')) return 'البريد الإلكتروني مستخدم بالفعل، جرب بريدًا آخر أو سجّل الدخول.';
        if (field === 'email' && m.includes('valid email')) return 'صيغة البريد الإلكتروني غير صحيحة.';
        if (field === 'email' && m.includes('required')) return 'البريد الإلكتروني مطلوب.';
        if (field === 'name' && m.includes('required')) return 'الاسم الكامل مطلوب.';
        if (field === 'password' && m.includes('at least 8')) return 'كلمة المرور يجب أن تكون 8 أحرف على الأقل.';
        if (field === 'password' && m.includes('confirmation')) return 'تأكيد كلمة المرور غير متطابق.';
        if (field === 'password' && m.includes('required')) return 'كلمة المرور مطلوبة.';
        return msg;
    };
    const cardRef = useRef(null);

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
        setFieldErrors({});

        if (formData.password !== formData.password_confirmation) {
            return setError('لم يتم تأكيد كلمة المرور بشكل صحيح.');
        }
        if (formData.password.length < 8) {
            return setError('كلمة المرور يجب أن تكون 8 أحرف على الأقل.');
        }

        const result = await register(formData);
        if (result && result.success) {
            const user = useAuthStore.getState().user;
            navigate(getDashboardPath(user));
        } else {
            // ترجمة أخطاء التحقق حسب الحقل لعرضها بدقة
            if (result?.errors) {
                const translated = {};
                Object.entries(result.errors).forEach(([field, msgs]) => {
                    translated[field] = msgs.map(m => translateError(field, m));
                });
                setFieldErrors(translated);
                // رسالة عامة = أول خطأ مترجم
                const firstField = Object.keys(translated)[0];
                const firstMsg = translated[firstField]?.[0];
                setError(firstMsg || result?.message || 'حدث خطأ أثناء التسجيل. تأكد من البيانات.');
            } else {
                const msg = result?.message || 'حدث خطأ أثناء التسجيل. البريد الإلكتروني قد يكون مستخدماً.';
                setError(msg);
            }
        }
    };

    const glowX = mousePos.x * 100;
    const glowY = mousePos.y * 100;

    return (
        <div className="min-h-screen flex relative overflow-hidden bg-[#0d0d14]">
            {/* ===== LEFT PANEL — HERO BRANDING ===== */}
            <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center p-12 overflow-hidden">
                {/* Gradient background */}
                <div className="absolute inset-0 bg-gradient-to-br from-purple-900/40 via-[#0d0d14] to-pink-900/30" />
                <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)', backgroundSize: '40px 40px' }} />

                {/* Floating orbs */}
                <FloatingShape className="w-96 h-96 bg-purple-500 -top-20 -left-20 blur-[120px]" />
                <FloatingShape className="w-80 h-80 bg-pink-500 -bottom-20 -right-20 blur-[120px]" delay={3} />
                <FloatingShape className="w-64 h-64 bg-violet-500 top-1/2 left-1/2 blur-[100px]" delay={6} />

                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className="relative z-10 text-center max-w-lg"
                >
                    {/* Logo */}
                    <div className="w-52 h-52 mx-auto mb-10 relative group">
                        <div className="absolute inset-2 bg-gradient-to-br from-purple-400 via-pink-400 to-rose-400 rounded-[3rem] blur-3xl opacity-60 group-hover:opacity-80 transition-all duration-700" />
                        <div className="relative w-full h-full rounded-[2.5rem] bg-white flex items-center justify-center shadow-2xl p-6 border border-white/20">
                            <img src="/logo.webp" alt="logo" className="w-full h-full object-contain" />
                        </div>
                    </div>

                    <h1 className="text-5xl font-black mb-4 tracking-tight text-white">
                        انضم إلينا
                    </h1>
                    <p className="text-gray-400 text-lg leading-relaxed mb-12">
                        حساب مجاني يتيح لك تصفح المنتجات، تتبع الطلبات، وإدارة مشترياتك بذكاء
                    </p>

                    {/* Benefit pills */}
                    <div className="flex flex-col gap-3 items-center">
                        {BENEFITS.map((f, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, x: -30 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.3 + i * 0.1 }}
                                className="flex items-center gap-3 bg-white/5 backdrop-blur-xl rounded-full px-6 py-3 border border-white/10 w-fit"
                            >
                                <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                                    <f.icon className="w-4 h-4 text-purple-400" />
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
                        <span>تسجيل مجاني</span>
                        <span className="w-1 h-1 rounded-full bg-gray-700" />
                        <span>خصوصية تامة</span>
                        <span className="w-1 h-1 rounded-full bg-gray-700" />
                        <span>دعم متواصل</span>
                    </motion.div>
                </motion.div>
            </div>

            {/* ===== RIGHT PANEL — FORM ===== */}
            <div className="w-full lg:w-1/2 min-h-screen flex items-center justify-center p-4 sm:p-8 relative">
                {/* Background glow for mobile */}
                <div className="absolute inset-0 lg:hidden pointer-events-none">
                    <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[120px] animate-pulse" />
                    <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-pink-600/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
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
                            background: `radial-gradient(600px circle at ${glowX}% ${glowY}%, rgba(168,85,247,0.15), transparent 60%)`,
                        }}
                    />

                    {/* Card */}
                    <div className="relative glass-card rounded-[2.5rem] p-8 sm:p-10 border border-white/10 shadow-2xl bg-[#12121c]/90 backdrop-blur-xl">
                        {/* Mobile-only logo */}
                        <div className="lg:hidden text-center mb-8">
                            <div className="w-24 h-24 mx-auto mb-4 relative">
                                <div className="absolute inset-0 bg-purple-500/30 blur-2xl rounded-2xl" />
                                <div className="relative w-full h-full rounded-2xl bg-white flex items-center justify-center p-3 shadow-lg">
                                    <img src="/logo.webp" alt="logo" className="w-full h-full object-contain" />
                                </div>
                            </div>
                            <h2 className="text-2xl font-black text-white">انضم إلينا</h2>
                            <p className="text-gray-500 text-sm mt-1">أنشئ حسابك المجاني</p>
                        </div>

                        {/* Desktop-only header */}
                        <div className="hidden lg:block text-center mb-10">
                            <h2 className="text-3xl font-black text-white mb-2">إنشاء حساب جديد</h2>
                            <p className="text-gray-500 text-sm">املأ البيانات لبدء رحلتك مع سمارت مول</p>
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
                                <label className="block text-sm font-bold text-gray-400">الاسم الكامل</label>
                                <div className="relative group">
                                    <User className="absolute right-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-500 group-focus-within:text-purple-400 transition-colors" />
                                    <input
                                        type="text"
                                                                                required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className={`input-field !bg-white/[0.03] pr-12 !py-4 !rounded-2xl transition-all ${fieldErrors.name ? 'border-rose-500/50 focus:border-rose-500/50' : 'border-white/10 focus:border-purple-500/50 focus:bg-white/[0.06]'}`}
                                    />
                                </div>
                                {fieldErrors.name && <p className="text-xs text-rose-400 font-medium">{fieldErrors.name[0]}</p>}
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-sm font-bold text-gray-400">البريد الإلكتروني</label>
                                <div className="relative group">
                                    <Mail className="absolute right-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-500 group-focus-within:text-purple-400 transition-colors" />
                                    <input
                                        type="email"
                                        
                                        required
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className={`input-field !bg-white/[0.03] pr-12 !py-4 !rounded-2xl transition-all text-right ${fieldErrors.email ? 'border-rose-500/50 focus:border-rose-500/50' : 'border-white/10 focus:border-purple-500/50 focus:bg-white/[0.06]'}`}
                                        
                                    />
                                </div>
                                {fieldErrors.email && <p className="text-xs text-rose-400 font-medium">{fieldErrors.email[0]}</p>}
                            </div>

                            <div className="grid sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="block text-sm font-bold text-gray-400">كلمة المرور</label>
                                    <div className="relative group">
                                        <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-purple-400 transition-colors" />
                                        <input
                                            type={showPass ? 'text' : 'password'}
                                            
                                            required
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            className="input-field !bg-white/[0.03] pr-10 !py-4 !rounded-2xl border-white/10 focus:border-purple-500/50 focus:bg-white/[0.06] transition-all text-right"
                                            
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPass(!showPass)}
                                            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                                        >
                                            {showPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                        </button>
                                    </div>
                                    {fieldErrors.password && <p className="text-xs text-rose-400 font-medium">{fieldErrors.password[0]}</p>}
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-sm font-bold text-gray-400">تأكيد المرور</label>
                                    <div className="relative group">
                                        <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-purple-400 transition-colors" />
                                        <input
                                            type={showPass ? 'text' : 'password'}
                                            
                                            required
                                            value={formData.password_confirmation}
                                            onChange={(e) => setFormData({ ...formData, password_confirmation: e.target.value })}
                                            className="input-field !bg-white/[0.03] pr-10 !py-4 !rounded-2xl border-white/10 focus:border-purple-500/50 focus:bg-white/[0.06] transition-all text-right"
                                            
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPass(!showPass)}
                                            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                                        >
                                            {showPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                        </button>
                                    </div>
                                    {fieldErrors.password_confirmation && <p className="text-xs text-rose-400 font-medium">{fieldErrors.password_confirmation[0]}</p>}
                                </div>
                            </div>

                            {/* Password hint */}
                            <p className="text-xs text-gray-600 -mt-2">يجب أن تكون كلمة المرور 8 أحرف على الأقل</p>

                            <button
                                type="submit"
                                disabled={loading}
                                className="btn-primary w-full !py-4 !rounded-2xl !text-base font-black shadow-xl shadow-purple-500/25 relative overflow-hidden group"
                                style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)' }}
                            >
                                <span className="relative z-10 flex items-center justify-center gap-2.5">
                                    {loading ? (
                                        <>
                                            <Loader2 className="animate-spin w-5 h-5" />
                                            جاري إنشاء الحساب...
                                        </>
                                    ) : (
                                        <>
                                            إنشاء الحساب
                                            <UserPlus className="w-5 h-5 group-hover:translate-x-[-3px] transition-transform" />
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
                                <span className="px-4 text-xs font-bold text-gray-600 bg-[#12121c]">لديك حساب بالفعل؟</span>
                            </div>
                        </div>

                        {/* Login link */}
                        <Link
                            to="/login"
                            className="flex items-center justify-center gap-2.5 w-full py-3.5 px-4 rounded-2xl font-bold text-gray-300 bg-white/[0.03] hover:bg-white/[0.08] transition-all border border-white/10 hover:border-white/20 group"
                        >
                            <LogIn className="w-5 h-5 group-hover:translate-x-[-3px] transition-transform" />
                            تسجيل الدخول
                        </Link>
                    </div>

                    {/* Back link */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.6 }}
                        className="mt-8 text-center"
                    >
                        <Link to="/" className="inline-flex items-center gap-2 text-gray-600 hover:text-purple-400 transition-colors font-bold text-sm">
                            <ArrowLeft className="w-4 h-4" />
                            العودة للصفحة الرئيسية
                        </Link>
                    </motion.div>
                </motion.div>
            </div>
        </div>
    );
};

export default Register;
