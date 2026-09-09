import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import { 
    ArrowRight, Send, Loader2, CheckCircle2, Store, 
    MessageSquare, ChevronDown, Calendar, Hash 
} from 'lucide-react';

const statusConfig = {
    pending: { label: 'قيد المراجعة', color: 'text-amber-400 bg-amber-500/10 border border-amber-500/20' },
    in_progress: { label: 'قيد المعالجة', color: 'text-blue-400 bg-blue-500/10 border border-blue-500/20' },
    replied: { label: 'تم الرد', color: 'text-violet-400 bg-violet-500/10 border border-violet-500/20' },
    resolved: { label: 'تم الحل', color: 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' },
    rejected: { label: 'مرفوض', color: 'text-rose-400 bg-rose-500/10 border border-rose-500/20' },
};

const SubmitComplaint = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [mallId, setMallId] = useState('');
    const [orderId, setOrderId] = useState('');
    const [expandedId, setExpandedId] = useState(null);
    const [messageInput, setMessageInput] = useState('');
    const messagesEndRef = useRef(null);

    const { data: malls } = useQuery({
        queryKey: ['malls-for-complaint'],
        queryFn: async () => (await api.get('/malls')).data
    });

    const { data: myComplaints } = useQuery({
        queryKey: ['my-complaints'],
        queryFn: async () => (await api.get('/customer/complaints')).data,
        refetchInterval: 15000,
    });

    const { data: chatMessages } = useQuery({
        queryKey: ['complaint-chat-messages', expandedId],
        queryFn: async () => {
            const r = await api.get(`/customer/complaints/${expandedId}/messages`);
            return r.data;
        },
        enabled: !!expandedId,
        refetchInterval: 5000,
    });

    const complaintMutation = useMutation({
        mutationFn: async (data) => {
            const r = await api.post('/customer/complaints', data);
            return r.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['my-complaints']);
            setTitle('');
            setDescription('');
            setMallId('');
            setOrderId('');
        }
    });

    const sendMessageMutation = useMutation({
        mutationFn: async (message) => {
            const r = await api.post(`/customer/complaints/${expandedId}/messages`, { message });
            return r.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['complaint-chat-messages', expandedId] });
            queryClient.invalidateQueries({ queryKey: ['my-complaints'] });
            setMessageInput('');
        }
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        complaintMutation.mutate({ title, description, mall_id: mallId || null, order_id: orderId || null });
    };

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!messageInput.trim() || !expandedId) return;
        sendMessageMutation.mutate(messageInput.trim());
    };

    const complaintsList = Array.isArray(myComplaints) ? myComplaints : myComplaints?.data || [];
    const msgList = Array.isArray(chatMessages) ? chatMessages : [];

    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [msgList.length]);

    return (
        <div className="w-full min-h-screen bg-[#0a0a0b] text-white pb-12" dir="rtl">
            {/* Header الممتد بكامل العرض من اليمين لليسار */}
            <header className="w-full bg-[#121214] border-b border-white/5 py-5 px-6 sm:px-12 flex items-center justify-between sticky top-0 z-50 backdrop-blur-md bg-opacity-95">
                <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-gradient-to-tr from-rose-500/20 to-orange-500/10 rounded-xl border border-rose-500/20">
                        <MessageSquare className="w-5 h-5 text-rose-400" />
                    </div>
                    <div>
                        <h2 className="text-lg sm:text-xl font-bold tracking-tight">الشكاوى والاقتراحات</h2>
                        <p className="text-[11px] text-gray-400 mt-0.5 hidden sm:block">يمكنك تقديم شكوى جديدة أو متابعة شكاواك السابقة</p>
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
            <div className="w-full px-4 sm:px-12 mt-8 space-y-8 max-w-[1600px] mx-auto">
                
                {/* Submit Form */}
                <section className="bg-[#121214] border border-white/5 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
                    <h3 className="text-base font-bold flex items-center gap-2">
                        <span className="w-1.5 h-4 bg-rose-500 rounded-full block"></span>
                        تقديم شكوى جديدة
                    </h3>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-xs font-semibold text-gray-400 mb-2">عنوان الشكوى</label>
                            <input 
                                type="text" 
                                value={title} 
                                onChange={e => setTitle(e.target.value)} 
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/50 transition-all" 
                                placeholder="اكتب ملخصاً موجزاً للمشكلة" 
                                required 
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-400 mb-2">وصف التفاصيل</label>
                            <textarea 
                                value={description} 
                                onChange={e => setDescription(e.target.value)} 
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/50 transition-all h-32 resize-none" 
                                placeholder="يرجى كتابة تفاصيل الشكوى بوضوح لمساعدتنا في حلها سريعاً..." 
                                required 
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-400 mb-2">المول ذو الصلة (اختياري)</label>
                                <div className="relative">
                                    <select 
                                        value={mallId} 
                                        onChange={e => setMallId(e.target.value)} 
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-rose-500/50 transition-all appearance-none cursor-pointer"
                                    >
                                        <option value="" className="bg-[#121214]">اختر المول المَعني</option>
                                        {(Array.isArray(malls) ? malls : []).map(m => (
                                            <option key={m.id} value={m.id} className="bg-[#121214]">{m.name_ar}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="w-4 h-4 text-gray-400 absolute left-4 top-3.5 pointer-events-none" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-400 mb-2">رقم الطلب (اختياري)</label>
                                <input 
                                    type="text" 
                                    value={orderId} 
                                    onChange={e => setOrderId(e.target.value)} 
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-rose-500/50 transition-all" 
                                    placeholder="مثال: ORD-1234" 
                                />
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            disabled={complaintMutation.isPending} 
                            className="w-full sm:w-auto px-8 bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white font-medium text-sm py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-rose-500/10 hover:shadow-rose-500/20 active:scale-[0.99] transition-all duration-200 mr-auto"
                        >
                            {complaintMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-4 h-4 rotate-180" />}
                            إرسال الشكوى الآن
                        </button>

                        <AnimatePresence>
                            {complaintMutation.isSuccess && (
                                <motion.div 
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0 }}
                                    className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium"
                                >
                                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                                    <span>تم إرسال شكواك بنجاح. سيقوم فريق الدعم بمراجعتها والرد عليك في أقرب وقت.</span>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </form>
                </section>

                {/* My Previous Complaints */}
                {complaintsList.length > 0 && (
                    <div className="space-y-4">
                        <h3 className="text-base font-bold flex items-center gap-2">
                            <span className="w-1.5 h-4 bg-indigo-500 rounded-full block"></span>
                            الشكاوى السابقة والمتابعة
                        </h3>

                        <div className="space-y-3">
                            {complaintsList.map(c => {
                                const cfg = statusConfig[c.status] || statusConfig.pending;
                                const isExpanded = expandedId === c.id;
                                return (
                                    <div 
                                        key={c.id} 
                                        className={`bg-[#121214] border rounded-2xl overflow-hidden transition-all duration-300 ${isExpanded ? 'border-indigo-500/30 shadow-xl' : 'border-white/5 hover:border-white/10'}`}
                                    >
                                        {/* Accordion Header */}
                                        <button 
                                            onClick={() => setExpandedId(isExpanded ? null : c.id)} 
                                            className="w-full p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-right hover:bg-white/[0.01] transition-colors"
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className="mt-1">
                                                    <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-indigo-400' : ''}`} />
                                                </div>
                                                <div>
                                                    <h4 className="font-semibold text-sm text-white line-clamp-1">{c.title}</h4>
                                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2 text-xs text-gray-400">
                                                        <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-gray-500" /> {new Date(c.created_at).toLocaleDateString('ar-EG')}</span>
                                                        {c.order_id && <span className="flex items-center gap-1"><Hash className="w-3.5 h-3.5 text-gray-500" /> {c.order_id}</span>}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 border-white/5 pt-3 sm:pt-0">
                                                {c.messages_count > 0 && (
                                                    <span className="text-[11px] font-medium text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 rounded-full">
                                                        {c.messages_count} رسائل
                                                    </span>
                                                )}
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide ${cfg.color}`}>
                                                    {cfg.label}
                                                </span>
                                            </div>
                                        </button>

                                        {/* Accordion Content */}
                                        {isExpanded && (
                                            <motion.div 
                                                initial={{ height: 0, opacity: 0 }} 
                                                animate={{ height: 'auto', opacity: 1 }} 
                                                className="border-t border-white/5 bg-white/[0.01]"
                                            >
                                                <div className="p-5 space-y-5">
                                                    <div className="bg-white/5 border border-white/5 rounded-xl p-4 space-y-3">
                                                        <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{c.description}</p>
                                                        {c.mall && (
                                                            <div className="flex items-center gap-1.5 text-xs text-gray-400 border-t border-white/5 pt-2.5">
                                                                <Store className="w-3.5 h-3.5 text-rose-400" />
                                                                <span>المول: <b className="text-gray-200">{c.mall.name_ar}</b></span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Chat Messages Log */}
                                                    <div className="space-y-4 max-h-[350px] overflow-y-auto border border-white/5 bg-[#0a0a0b] rounded-xl p-4 custom-scrollbar">
                                                        {msgList.length === 0 ? (
                                                            <p className="text-xs text-gray-500 text-center py-6">لا توجد رسائل متبادلة بعد.</p>
                                                        ) : (
                                                            msgList.map((m) => {
                                                                const isCustomer = m.user_id === c.user_id;
                                                                const isSystem = m.message?.startsWith('تم تغيير الحالة');

                                                                if (isSystem) {
                                                                    return (
                                                                        <div key={m.id} className="flex justify-center my-2">
                                                                            <div className="bg-white/5 border border-white/5 rounded-full px-4 py-1.5 max-w-md text-center">
                                                                                <p className="text-[11px] text-gray-400">{m.message}</p>
                                                                                <p className="text-[9px] text-gray-500 mt-0.5" dir="ltr">{new Date(m.created_at).toLocaleString('en-GB', {hour: '2-digit', minute:'2-digit', day:'2-digit', month:'2-digit'})}</p>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                }

                                                                return (
                                                                    <div key={m.id} className={`flex ${isCustomer ? 'justify-end' : 'justify-start'}`}>
                                                                        <div className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ${
                                                                            isCustomer 
                                                                                ? 'bg-rose-500/10 border border-rose-500/20 text-rose-200 rounded-tl-none text-right' 
                                                                                : 'bg-white/5 border border-white/10 text-gray-200 rounded-tr-none text-right'
                                                                        }`}>
                                                                            {!isCustomer && (
                                                                                <p className="text-[10px] text-indigo-400 font-bold mb-1">{m.user?.name || 'الدعم الفني'}</p>
                                                                            )}
                                                                            <p className="text-sm leading-relaxed">{m.message}</p>
                                                                            <p className="text-[9px] text-gray-500 mt-1.5 text-left block" dir="ltr">
                                                                                {new Date(m.created_at).toLocaleString('en-GB', {hour: '2-digit', minute:'2-digit'})}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })
                                                        )}
                                                        <div ref={messagesEndRef} />
                                                    </div>

                                                    {/* Reply Form */}
                                                    <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                                                        <input
                                                            type="text" 
                                                            value={messageInput} 
                                                            onChange={e => setMessageInput(e.target.value)}
                                                            placeholder="اكتب رداً أو استفساراً..."
                                                            className="w-full bg-[#0a0a0b] border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 transition-all"
                                                        />
                                                        <button 
                                                            type="submit" 
                                                            disabled={sendMessageMutation.isPending || !messageInput.trim()}
                                                            className="w-10 h-10 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white disabled:opacity-30 disabled:hover:bg-indigo-500 transition-all flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/10"
                                                        >
                                                            {sendMessageMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 rotate-180" />}
                                                        </button>
                                                    </form>
                                                </div>
                                            </motion.div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SubmitComplaint;