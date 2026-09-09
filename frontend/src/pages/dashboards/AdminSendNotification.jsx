import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bell, Users, Loader2, CheckCircle2, Search, ArrowRight, Link } from 'lucide-react';
import api from '../../api/axios';

const targets = [
    { value: 'all', label: 'جميع المستخدمين', icon: Users },
    { value: 'customers', label: 'الزبائن', icon: Users },
    { value: 'mall-owners', label: 'أصحاب المولات والسوبر ماركت', icon: Users },
    { value: 'delivery-persons', label: 'مندوبي التوصيل', icon: Users },
    { value: 'custom', label: 'اختيار مخصص', icon: Search },
];

const AdminSendNotification = () => {
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [actionUrl, setActionUrl] = useState('');
    const [targetType, setTargetType] = useState('all');
    const [users, setUsers] = useState([]);
    const [selectedIds, setSelectedIds] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [sending, setSending] = useState(false);
    const [done, setDone] = useState(false);
    const [result, setResult] = useState('');

    useEffect(() => {
        if (targetType !== 'custom') return;
        api.get('/admin/users').then(res => setUsers(res.data)).catch(() => {});
    }, [targetType]);

    const filtered = users.filter(u => {
        const name = (u.name || '').toLowerCase();
        const email = (u.email || '').toLowerCase();
        const s = searchTerm.toLowerCase();
        return name.includes(s) || email.includes(s);
    });

    const toggleUser = (id) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const handleSend = async () => {
        if (!title.trim() || !body.trim()) return;
        setSending(true);
        setDone(false);
        try {
            const payload = { title, body, target_type: targetType };
            if (actionUrl.trim()) payload.action_url = actionUrl.trim();
            if (targetType === 'custom') {
                payload.user_ids = selectedIds;
                payload.target_type = 'custom';
            }
            const res = await api.post('/admin/notifications/send', payload);
            setResult(res.data.message);
            setDone(true);
            setTimeout(() => { setDone(false); setTitle(''); setBody(''); setSelectedIds([]); }, 3000);
        } catch (err) {
            setResult(err.response?.data?.message || 'حدث خطأ ما أثناء الإرسال');
        }
        setSending(false);
    };

    return (
        <div className="w-full min-h-screen bg-[#0a0a0b] text-white pb-12" dir="rtl">
            {/* Header الممتد بكامل العرض من اليمين لليسار */}
            <header className="w-full bg-[#121214] border-b border-white/5 py-5 px-6 sm:px-12 flex items-center justify-between sticky top-0 z-50 backdrop-blur-md bg-opacity-95">
                <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-gradient-to-tr from-indigo-500/20 to-purple-500/10 rounded-xl border border-indigo-500/20">
                        <Bell className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                        <h2 className="text-lg sm:text-xl font-bold tracking-tight">إرسال إشعار فوري</h2>
                        <p className="text-[11px] text-gray-400 mt-0.5 hidden sm:block">بث الإشعارات الجماعية أو المخصصة إلى فئات النظام المختلفة</p>
                    </div>
                </div>
                <button 
                    onClick={() => window.history.back()} 
                    className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 text-gray-400 hover:text-white transition-all duration-200"
                >
                    <ArrowRight className="w-4 h-4" />
                </button>
            </header>

            {/* محتوى الصفحة الداخلي الموزع بشكل مريح وعريض */}
            <div className="w-full px-4 sm:px-12 mt-8 space-y-6 max-w-[1600px] mx-auto">
                
                {/* رسائل التنبيه والنجاح */}
                <AnimatePresence>
                    {done && (
                        <motion.div 
                            initial={{ opacity: 0, y: -10 }} 
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400"
                        >
                            <CheckCircle2 className="w-5 h-5 shrink-0" />
                            <p className="text-xs font-bold">{result}</p>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                    
                    {/* العمود الأول: تحديد المستهدفين */}
                    <div className="bg-[#121214] border border-white/5 rounded-2xl p-6 shadow-xl space-y-5 lg:col-span-1">
                        <h3 className="text-sm font-bold flex items-center gap-2">
                            <span className="w-1.5 h-4 bg-purple-500 rounded-full block"></span>
                            الجمهور المستهدف
                        </h3>

                        <div className="flex flex-col gap-2.5">
                            {targets.map(t => (
                                <button 
                                    key={t.value}
                                    type="button"
                                    onClick={() => setTargetType(t.value)}
                                    className={`flex items-center gap-3 p-3.5 rounded-xl border text-xs font-medium transition-all text-right w-full ${
                                        targetType === t.value
                                            ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-300'
                                            : 'bg-white/[0.02] border-white/5 text-gray-400 hover:bg-white/5 hover:text-white'
                                    }`}
                                >
                                    <t.icon className="w-4 h-4 shrink-0" />
                                    <span>{t.label}</span>
                                </button>
                            ))}
                        </div>

                        {/* Custom user selection */}
                        {targetType === 'custom' && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-3 pt-2 border-t border-white/5">
                                <div className="relative">
                                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                    <input 
                                        type="text" 
                                        value={searchTerm} 
                                        onChange={e => setSearchTerm(e.target.value)}
                                        placeholder="ابحث عن مستخدم معين..."
                                        className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pr-9 pl-4 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 transition-all"
                                    />
                                </div>
                                
                                <div className="max-h-52 overflow-y-auto space-y-1 rounded-xl bg-white/[0.01] p-1.5 border border-white/5">
                                    {filtered.length === 0 && (
                                        <p className="text-gray-500 text-xs text-center py-4">لم يتم العثور على نتائج</p>
                                    )}
                                    {filtered.map(u => {
                                        const role = u.roles?.[0]?.name || 'مستخدم';
                                        const selected = selectedIds.includes(u.id);
                                        return (
                                            <label 
                                                key={u.id}
                                                className={`flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-colors ${
                                                    selected ? 'bg-indigo-500/10 border border-indigo-500/20' : 'hover:bg-white/5 border border-transparent'
                                                }`}
                                            >
                                                <input 
                                                    type="checkbox" 
                                                    checked={selected} 
                                                    onChange={() => toggleUser(u.id)}
                                                    className="w-3.5 h-3.5 rounded accent-indigo-500" 
                                                />
                                                <div className="flex-1 min-w-0 text-right">
                                                    <div className="text-xs font-semibold text-gray-200 truncate">{u.name}</div>
                                                    <div className="text-[10px] text-gray-500 truncate">{u.email}</div>
                                                </div>
                                                <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/5 text-gray-400 shrink-0">{role}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                                <p className="text-[11px] text-gray-400 px-1">تم تحديد {selectedIds.length} مستخدم حالياً.</p>
                            </motion.div>
                        )}
                    </div>

                    {/* العمود الثاني: محتوى وطبيعة الإشعار */}
                    <div className="bg-[#121214] border border-white/5 rounded-2xl p-6 sm:p-8 shadow-xl space-y-5 lg:col-span-2">
                        <h3 className="text-sm font-bold flex items-center gap-2">
                            <span className="w-1.5 h-4 bg-indigo-500 rounded-full block"></span>
                            تفاصيل ومحتوى الإشعار
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-400 mb-2">عنوان الإشعار</label>
                                <input 
                                    type="text" 
                                    value={title} 
                                    onChange={e => setTitle(e.target.value)}
                                    placeholder="أدخل عنواناً جذاباً ومختصراً..."
                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-400 mb-2">محتوى الإشعار (نص الرسالة)</label>
                                <textarea 
                                    value={body} 
                                    onChange={e => setBody(e.target.value)} 
                                    rows={5}
                                    placeholder="اكتب تفاصيل الإشعار بدقة هنا..."
                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 transition-all resize-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-400 mb-2 flex items-center gap-1.5">
                                    <Link className="w-3.5 h-3.5 text-gray-500" />
                                    رابط التوجيه المباشر عند النقر (اختياري)
                                </label>
                                <input 
                                    type="text" 
                                    value={actionUrl} 
                                    onChange={e => setActionUrl(e.target.value)}
                                    placeholder="مثال: /orders أو /offers/12"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 transition-all"
                                />
                                <p className="text-[10px] text-gray-500 mt-1.5">سيتم توجيه المستخدم تلقائياً إلى هذا المسار الداخلي عند قيامه بالنقر فوق الإشعار المستلم.</p>
                            </div>
                        </div>

                        <div className="pt-2 flex justify-end">
                            <button 
                                onClick={handleSend} 
                                disabled={sending || !title.trim() || !body.trim() || (targetType === 'custom' && selectedIds.length === 0)}
                                className="w-full sm:w-auto px-8 py-3 bg-gradient-to-l from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:opacity-40 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-500/10"
                            >
                                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                إرسال وبث الإشعار الآن
                            </button>
                        </div>
                    </div>

                </div>

            </div>
        </div>
    );
};

export default AdminSendNotification;