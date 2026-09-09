import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, ArrowRight, Loader2, CheckCircle, Store } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await api.post('/forgot-password', { email });
            setSent(true);
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
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-indigo-500/20">
                        <Store className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-3xl font-extrabold text-white">SmartMall</h2>
                    <p className="text-gray-500 mt-1 text-right">استعادة كلمة المرور</p>
                </div>

                <div className="glass-card rounded-[2rem] p-8 border border-white/10">
                    {sent ? (
                        <div className="text-center space-y-4">
                            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto">
                                <CheckCircle className="w-8 h-8 text-emerald-400" />
                            </div>
                            <h3 className="text-xl font-bold text-white">تم الإرسال</h3>
                            <p className="text-gray-400 text-sm">تم إرسال رابط إعادة تعيين كلمة المرور إلى <span className="text-indigo-400 font-bold">{email}</span></p>
                            <p className="text-gray-500 text-xs">يرجى التحقق من بريدك الإلكتروني (بما في مجلد البريد المزعج)</p>
                            <button onClick={() => navigate('/login')} className="btn-primary w-full !py-3.5 mt-4">
                                العودة إلى تسجيل الدخول
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-5 text-right">
                            <h3 className="text-xl font-bold text-white">نسيت كلمة المرور؟</h3>
                            <p className="text-gray-400 text-sm">أدخل بريدك الإلكتروني وسنرسل لك رابطاً لإعادة تعيين كلمة المرور</p>

                            {error && <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-bold">{error}</div>}

                            <div>
                                <label className="block text-sm font-semibold text-gray-400 mb-2">البريد الإلكتروني</label>
                                <div className="relative group">
                                    <Mail className="absolute right-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-500 group-focus-within:text-indigo-400" />
                                    <input type="email" required 
                                        value={email} onChange={e => setEmail(e.target.value)}
                                        placeholder="email@example.com"
                                        className="input-field pr-11 text-right" />
                                </div>
                            </div>

                            <button type="submit" disabled={loading}
                                className="btn-primary w-full !py-3.5 flex items-center justify-center gap-2">
                                {loading ? <Loader2 className="animate-spin w-5 h-5" /> : (
                                    <>
                                        إرسال رابط إعادة التعيين
                                        <ArrowRight className="w-4 h-4" />
                                    </>
                                )}
                            </button>

                            <div className="text-center pt-2">
                                <Link to="/login" className="text-sm text-gray-500 hover:text-indigo-400 transition-colors font-bold">
                                    ← العودة لتسجيل الدخول
                                </Link>
                            </div>
                        </form>
                    )}
                </div>

                <div className="text-center mt-6">
                    <p className="text-xs text-gray-600">للاستفسار: <span className="text-gray-400">info@samrtmall.cloud</span> | للدعم: <span className="text-gray-400">support@samrtmall.cloud</span></p>
                </div>
            </motion.div>
        </div>
    );
};

export default ForgotPassword;
