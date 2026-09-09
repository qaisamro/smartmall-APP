import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import { 
    Bell, User, Mail, Phone, MapPin, Calendar, ArrowRight, 
    Save, Loader2, Lock, CheckCircle2, AlertCircle, VenusAndMars, Smartphone 
} from 'lucide-react';
import { subscribeToPush, isPushSubscribed, unsubscribeFromPush } from '../utils/pwa';

const CustomerSettings = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const { data: profile, isLoading } = useQuery({
        queryKey: ['customer-profile'],
        queryFn: async () => {
            const r = await api.get('/customer/profile');
            return r.data;
        }
    });

    const { data: completion } = useQuery({
        queryKey: ['profile-completion'],
        queryFn: async () => {
            const r = await api.get('/customer/profile/completion');
            return r.data;
        }
    });

    const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', birthdate: '', gender: '' });
    const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '', new_password_confirmation: '' });
    const [msg, setMsg] = useState(null);

    useEffect(() => {
        if (profile) {
            setForm({
                name: profile.name || '',
                email: profile.email || '',
                phone: profile.phone || '',
                address: profile.address || '',
                birthdate: profile.birthdate ? profile.birthdate.split('T')[0] : '',
                gender: profile.gender || '',
            });
        }
    }, [profile]);

    const updateMutation = useMutation({
        mutationFn: async (data) => {
            const r = await api.put('/customer/profile', data);
            return r.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['customer-profile']);
            queryClient.invalidateQueries(['profile-completion']);
            setMsg({ type: 'success', text: 'تم تحديث الملف الشخصي بنجاح' });
        },
        onError: (err) => setMsg({ type: 'error', text: err.response?.data?.message || 'فشل التحديث' })
    });

    const passwordMutation = useMutation({
        mutationFn: async (data) => {
            const r = await api.put('/customer/profile/password', data);
            return r.data;
        },
        onSuccess: () => {
            setPasswordForm({ current_password: '', new_password: '', new_password_confirmation: '' });
            setMsg({ type: 'success', text: 'تم تغيير كلمة المرور بنجاح' });
        },
        onError: (err) => setMsg({ type: 'error', text: err.response?.data?.message || 'فشل تغيير كلمة المرور' })
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        updateMutation.mutate(form);
    };

    const handlePasswordSubmit = (e) => {
        e.preventDefault();
        passwordMutation.mutate(passwordForm);
    };

    const [pushSubscribed, setPushSubscribed] = useState(false);
    const [pushChecking, setPushChecking] = useState(true);

    useEffect(() => {
        isPushSubscribed().then(setPushSubscribed).finally(() => setPushChecking(false));
    }, []);

    const handleTogglePush = async () => {
        if (pushSubscribed) {
            await unsubscribeFromPush();
            setPushSubscribed(false);
        } else {
            if (Notification.permission === 'default') {
                const result = await Notification.requestPermission();
                if (result !== 'granted') return;
            }
            await subscribeToPush();
            const subscribed = await isPushSubscribed();
            setPushSubscribed(subscribed);
        }
    };

    if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-indigo-400" /></div>;

    return (
        <div className="w-full min-h-screen bg-[#0a0a0b] text-white pb-12" dir="rtl">
            {/* Header الممتد بكامل العرض من اليمين لليسار */}
            <header className="w-full bg-[#121214] border-b border-white/5 py-5 px-6 sm:px-12 flex items-center justify-between sticky top-0 z-50 backdrop-blur-md bg-opacity-95">
                <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-gradient-to-tr from-indigo-500/20 to-purple-500/10 rounded-xl border border-indigo-500/20">
                        <User className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                        <h2 className="text-lg sm:text-xl font-bold tracking-tight">إعدادات الحساب</h2>
                        <p className="text-[11px] text-gray-400 mt-0.5 hidden sm:block">إدارة بيانات ملفك الشخصي والأمان وتفضيلات الإشعارات</p>
                    </div>
                </div>
                <button 
                    onClick={() => navigate(-1)} 
                    className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 text-gray-400 hover:text-white transition-all duration-200"
                >
                    <ArrowRight className="w-4 h-4" />
                </button>
            </header>

            {/* محتوى الصفحة الداخلي الموزع بشكل مريح وعريض */}
            <div className="w-full px-4 sm:px-12 mt-8 space-y-6 max-w-[1600px] mx-auto">
                
                {/* رسائل التنبيه والنجاح */}
                <AnimatePresence>
                    {msg && (
                        <motion.div 
                            initial={{ opacity: 0, y: -10 }} 
                            animate={{ opacity: 1, y: 0 }} 
                            exit={{ opacity: 0 }}
                            className={`flex items-center gap-3 p-4 rounded-xl ${msg.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'}`}
                        >
                            {msg.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
                            <span className="text-xs font-bold">{msg.text}</span>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Profile Completion */}
                {completion && (
                    <div className="bg-[#121214] border border-white/5 rounded-2xl p-5 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-400">اكتمال الحساب: {completion.filled_fields} من أصل {completion.total_fields}</span>
                            <span className={`text-xs font-bold ${completion.percentage === 100 ? 'text-emerald-400' : 'text-amber-400'}`}>
                                {completion.percentage}%
                            </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-700 ${completion.percentage === 100 ? 'bg-emerald-500' : 'bg-gradient-to-l from-indigo-500 to-purple-500'}`} style={{ width: `${completion.percentage}%` }} />
                        </div>
                        {completion.percentage < 100 && (
                            <p className="text-[11px] text-gray-500">أكمل بيانات ملفك الشخصي المتبقية للاستفادة من جميع مزايا النظام والخدمات الكاملة.</p>
                        )}
                    </div>
                )}

                {/* معلومات الحساب الأساسية وكتابة البيانات */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                    
                    {/* فورم البيانات الشخصية */}
                    <form onSubmit={handleSubmit} className="bg-[#121214] border border-white/5 rounded-2xl p-6 sm:p-8 shadow-xl space-y-5 lg:col-span-2">
                        <h3 className="text-sm font-bold flex items-center gap-2">
                            <span className="w-1.5 h-4 bg-indigo-500 rounded-full block"></span>
                            المعلومات الشخصية
                        </h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-400 mb-2">الاسم بالكامل</label>
                                <div className="relative">
                                    <User className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                    <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl pr-11 pl-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 transition-all" required />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-400 mb-2">البريد الإلكتروني</label>
                                <div className="relative">
                                    <Mail className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                    <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl pr-11 pl-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 transition-all" required />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-400 mb-2">رقم الهاتف</label>
                                <div className="relative">
                                    <Phone className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                    <input type="text" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl pr-11 pl-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 transition-all" placeholder="05xxxxxxxx" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-400 mb-2">العنوان السكني</label>
                                <div className="relative">
                                    <MapPin className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                    <input type="text" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl pr-11 pl-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 transition-all" placeholder="المدينة - الشارع" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-400 mb-2">تاريخ الميلاد</label>
                                <div className="relative">
                                    <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                    <input type="date" value={form.birthdate} onChange={e => setForm({ ...form, birthdate: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl pr-11 pl-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-all" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-400 mb-2">الجنس</label>
                                <div className="relative">
                                    <VenusAndMars className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                    <select value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl pr-11 pl-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-all appearance-none cursor-pointer">
                                        <option value="" className="bg-[#121214]">اختر الجنس</option>
                                        <option value="male" className="bg-[#121214]">ذكر</option>
                                        <option value="female" className="bg-[#121214]">أنثى</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="pt-2 flex justify-end">
                            <button type="submit" disabled={updateMutation.isPending} className="w-full sm:w-auto px-6 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white font-medium text-xs py-3 rounded-xl flex items-center justify-center gap-2 transition-all">
                                {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                حفظ بيانات الملف الشخصي
                            </button>
                        </div>
                    </form>

                    {/* العمود الثاني: إعدادات الأمان والإشعارات */}
                    <div className="space-y-6 lg:col-span-1">
                        
                        {/* فورم كلمة المرور */}
                        <form onSubmit={handlePasswordSubmit} className="bg-[#121214] border border-white/5 rounded-2xl p-6 shadow-xl space-y-4">
                            <h3 className="text-sm font-bold flex items-center gap-2">
                                <span className="w-1.5 h-4 bg-amber-500 rounded-full block"></span>
                                أمان الحساب
                            </h3>

                            <div>
                                <label className="block text-xs text-gray-400 mb-1.5">كلمة المرور الحالية</label>
                                <input type="password" value={passwordForm.current_password} onChange={e => setPasswordForm({ ...passwordForm, current_password: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500/50 transition-all" required />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-400 mb-1.5">كلمة المرور الجديدة</label>
                                <input type="password" value={passwordForm.new_password} onChange={e => setPasswordForm({ ...passwordForm, new_password: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500/50 transition-all" required minLength={8} />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-400 mb-1.5">تأكيد كلمة المرور الجديدة</label>
                                <input type="password" value={passwordForm.new_password_confirmation} onChange={e => setPasswordForm({ ...passwordForm, new_password_confirmation: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500/50 transition-all" required minLength={8} />
                            </div>

                            <button type="submit" disabled={passwordMutation.isPending} className="w-full bg-amber-500 hover:bg-amber-600 text-white font-medium text-xs py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-amber-500/5">
                                {passwordMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                                تحديث كلمة المرور
                            </button>
                        </form>

                        {/* إعدادات الإشعارات الفورية */}
                        <div className="bg-[#121214] border border-white/5 rounded-2xl p-6 shadow-xl space-y-4">
                            <h3 className="text-sm font-bold flex items-center gap-2">
                                <span className="w-1.5 h-4 bg-purple-500 rounded-full block"></span>
                                تفضيلات الإشعارات
                            </h3>

                            <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                                <div className="flex items-center gap-3">
                                    <Smartphone className="w-4 h-4 text-gray-400" />
                                    <div>
                                        <p className="text-xs font-bold text-white">إشعارات الجهاز (Push)</p>
                                        <p className="text-[10px] text-gray-500 mt-0.5">
                                            {pushChecking ? 'جارِ الفحص...' : pushSubscribed ? 'نشطة ومفعلة حالياً' : 'معطلة'}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleTogglePush}
                                    disabled={pushChecking}
                                    type="button"
                                    className={`relative w-12 h-6 rounded-full transition-all ${pushSubscribed ? 'bg-indigo-500' : 'bg-white/10'} ${pushChecking ? 'opacity-50' : ''}`}
                                >
                                    <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all ${pushSubscribed ? 'right-0.5' : 'right-6.5'}`} />
                                </button>
                            </div>

                            {!('Notification' in navigator) && (
                                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                                    <p className="text-[11px] text-amber-400">المتصفح الحالي لا يدعم ميزة الإشعارات الفورية</p>
                                </div>
                            )}

                            {'Notification' in navigator && Notification.permission === 'denied' && (
                                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
                                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                                    <p className="text-[11px] text-rose-400">تم حظر الوصول؛ يرجى تفعيل الصلاحية من إعدادات المتصفح</p>
                                </div>
                            )}
                        </div>

                    </div>
                </div>

            </div>
        </div>
    );
};

export default CustomerSettings;