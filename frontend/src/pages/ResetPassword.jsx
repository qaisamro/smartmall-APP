import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, ArrowRight, Loader2, CheckCircle, Store } from 'lucide-react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import api from '../api/axios';

const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token') || '';
    const email = searchParams.get('email') || '';
    const navigate = useNavigate();

    const [password, setPassword] = useState('');
    const [passwordConfirmation, setPasswordConfirmation] = useState('');
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState('');

    if (!token || !email) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-[#0a0a0f] to-[#12121a] flex items-center justify-center p-4">
                <div className="glass-card rounded-[2rem] p-8 border border-white/10 max-w-md w-full text-center">
                    <h2 className="text-xl font-bold text-red-400 mb-3">رابط غير صالح</h2>
                    <p className="text-gray-400 text-sm mb-6">رابط إعادة تعيين كلمة المرور غير صالح أو ناقص</p>
                    <Link to="/forgot-password" className="btn-primary inline-flex !py-3 !px-8">طلب رابط جديد</Link>
                </div>
            </div>
        );
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (password !== passwordConfirmation) {
            setError('كلمتا المرور غير متطابقتين');
            return;
        }
        setLoading(true);
        setError('');
        try {
            await api.post('/reset-password', {
                email, token, password, password_confirmation: passwordConfirmation
            });
            setDone(true);
        } catch (err) {
            setError(err.response?.data?.message || 'حدث خطأ، حاول مرة أخرى');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-[#0a0a0f] to-[#12121a] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-indigo-500/20">
                        <Store className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-3xl font-extrabold text-white">SmartMall</h2>
                    <p className="text-gray-500 mt-1 text-right">تعيين كلمة مرور جديدة</p>
                </div>

                <div className="glass-card rounded-[2rem] p-8 border border-white/10">
                    {done ? (
                        <div className="text-center space-y-4">
                            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto">
                                <CheckCircle className="w-8 h-8 text-emerald-400" />
                            </div>
                            <h3 className="text-xl font-bold text-white">تم التغيير بنجاح</h3>
                            <p className="text-gray-400 text-sm">تم تغيير كلمة المرور الخاصة بك بنجاح</p>
                            <button onClick={() => navigate('/login')} className="btn-primary w-full !py-3.5 mt-4">
                                تسجيل الدخول الآن
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-5 text-right">
                            <h3 className="text-xl font-bold text-white">أدخل كلمة المرور الجديدة</h3>
                            <p className="text-gray-400 text-sm">للمستخدم: <span className="text-indigo-400 font-bold">{email}</span></p>

                            {error && <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-bold">{error}</div>}

                            <div>
                                <label className="block text-sm font-semibold text-gray-400 mb-2">كلمة المرور الجديدة</label>
                                <div className="relative group">
                                    <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-500 group-focus-within:text-indigo-400" />
                                    <input type="password" required minLength={8}
                                        value={password} onChange={e => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="input-field pr-11" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-400 mb-2">تأكيد كلمة المرور</label>
                                <div className="relative group">
                                    <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-500 group-focus-within:text-indigo-400" />
                                    <input type="password" required minLength={8}
                                        value={passwordConfirmation} onChange={e => setPasswordConfirmation(e.target.value)}
                                        placeholder="••••••••"
                                        className="input-field pr-11" />
                                </div>
                            </div>

                            <button type="submit" disabled={loading}
                                style={{ color: '#ffffff' }}
                                className="w-full py-4 rounded-2xl font-extrabold text-base flex items-center justify-center gap-2 transition-all bg-gradient-to-r from-emerald-600 to-green-700 hover:from-emerald-500 hover:to-green-600 shadow-lg shadow-emerald-500/30 disabled:opacity-50">
                                {loading ? <Loader2 className="animate-spin w-5 h-5" style={{ color: '#ffffff' }} /> : (
                                    <>
                                        <span style={{ color: '#ffffff' }}>تعيين كلمة مرور جديدة</span>
                                        <ArrowRight className="w-5 h-5" style={{ color: '#ffffff' }} />
                                    </>
                                )}
                            </button>
                        </form>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default ResetPassword;
