import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Phone, ArrowLeft, Loader2, CheckCircle } from 'lucide-react';
import api from '../api/axios';

const countryCodes = [
    { code: '+970', label: 'فلسطين', flag: '🇵🇸' },
    { code: '+972', label: 'فلسطين (خط إسرائيلي)', flag: '🇵🇸' },
    { code: '+966', label: 'السعودية', flag: '🇸🇦' },
    { code: '+962', label: 'الأردن', flag: '🇯🇴' },
    { code: '+20', label: 'مصر', flag: '🇪🇬' },
    { code: '+971', label: 'الإمارات', flag: '🇦🇪' },
    { code: '+965', label: 'الكويت', flag: '🇰🇼' },
    { code: '+974', label: 'قطر', flag: '🇶🇦' },
    { code: '+973', label: 'البحرين', flag: '🇧🇭' },
    { code: '+968', label: 'عمان', flag: '🇴🇲' },
    { code: '+963', label: 'سوريا', flag: '🇸🇾' },
    { code: '+961', label: 'لبنان', flag: '🇱🇧' },
    { code: '+964', label: 'العراق', flag: '🇮🇶' },
    { code: '+967', label: 'اليمن', flag: '🇾🇪' },
    { code: '+218', label: 'ليبيا', flag: '🇱🇾' },
    { code: '+213', label: 'الجزائر', flag: '🇩🇿' },
    { code: '+216', label: 'تونس', flag: '🇹🇳' },
    { code: '+212', label: 'المغرب', flag: '🇲🇦' },
    { code: '+249', label: 'السودان', flag: '🇸🇩' },
];

const WhatsAppModal = ({ open, onClose, onSaved, user }) => {
    const existing = user?.whatsapp || '';
    const parsedExisting = existing.match(/^(\+\d+)(\d+)$/);
    const [countryCode, setCountryCode] = useState(parsedExisting ? parsedExisting[1] : '+970');
    const [number, setNumber] = useState(parsedExisting ? parsedExisting[2] : '');
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState('');

    const role = user?.roles?.[0]?.name;
    const allowedRoles = ['super-admin', 'admin', 'mall-owner', 'supermarket-owner', 'delivery-person'];
    const isAllowed = allowedRoles.includes(role);

    if (!open || !isAllowed) return null;

    const handleSave = async () => {
        const digits = number.replace(/\D/g, '');
        if (digits.length < 6 || digits.length > 15) {
            setError('الرجاء إدخال رقم واتساب صحيح');
            return;
        }
        const full = countryCode + digits;
        setLoading(true);
        setError('');
        try {
            await api.put('/customer/profile/whatsapp', { whatsapp: full });
            setDone(true);
            setTimeout(() => { onSaved?.(full); onClose?.(); }, 1500);
        } catch (err) {
            setError(err.response?.data?.message || 'حدث خطأ في الحفظ');
        }
        setLoading(false);
    };

    const skip = () => {
        onClose?.();
    };

    if (!open) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    onClick={skip}
                />
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
                >
                    {/* Header */}
                    <div className="bg-gradient-to-l from-green-500 to-emerald-600 p-6 text-white text-center">
                        <div className="w-16 h-16 mx-auto mb-3 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur">
                            <Phone className="w-8 h-8" />
                        </div>
                        <h2 className="text-xl font-black">ربط واتساب</h2>
                        <p className="text-sm mt-1 opacity-90">لإشعارات الطلبات والتحديثات</p>
                    </div>

                    {/* Body */}
                    <div className="p-6">
                        {done ? (
                            <div className="text-center py-8">
                                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-3" />
                                <p className="text-green-600 font-bold text-lg">تم الحفظ بنجاح ✅</p>
                                <p className="text-gray-500 text-sm mt-1">سيتم إرسال إشعارات الطلبات عبر واتساب</p>
                            </div>
                        ) : (
                            <>
                                <p className="text-gray-600 text-sm mb-4 text-center">
                                    يرجى إدخال رقم واتساب الخاص بك لإشعارات الطلبات والتوصيل
                                </p>

                                <div className="flex gap-2">
                                    <div className="relative w-32 shrink-0">
                                        <select
                                            value={countryCode}
                                            onChange={(e) => setCountryCode(e.target.value)}
                                            className="w-full h-12 bg-gray-50 border border-gray-200 rounded-xl px-3 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 appearance-none"
                                        >
                                            {countryCodes.map(cc => (
                                                <option key={cc.code} value={cc.code}>{cc.flag} {cc.code}</option>
                                            ))}
                                        </select>
                                        <ArrowLeft className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                    </div>
                                    <div className="flex-1">
                                        <input
                                            type="tel"
                                            value={number}
                                            onChange={(e) => setNumber(e.target.value)}
                                            placeholder="59xxxxxxx"
                                            className="w-full h-12 bg-gray-50 border border-gray-200 rounded-xl px-4 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 transition-all"
                                            
                                        />
                                    </div>
                                </div>

                                {error && (
                                    <p className="text-red-500 text-sm mt-2 text-center">{error}</p>
                                )}

                                <div className="flex gap-3 mt-6">
                                    <button
                                        onClick={skip}
                                        className="flex-1 h-12 rounded-xl border border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50 transition-all"
                                    >
                                        تخطي
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        disabled={loading || !number.trim()}
                                        className="flex-1 h-12 rounded-xl bg-gradient-to-l from-green-500 to-emerald-600 text-white font-bold text-sm hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                                    >
                                        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                        حفظ
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default WhatsAppModal;
