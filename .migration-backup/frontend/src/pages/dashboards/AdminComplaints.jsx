import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import { MessageSquare, User, Mail, Store, X, Loader2, CheckCircle2, ArrowUpRight, Clock, AlertCircle, Phone, MapPin, CalendarDays, Send, ChevronDown, ChevronUp, MessageCircle } from 'lucide-react';

const statusConfig = {
    pending: { label: 'قيد المراجعة', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
    in_progress: { label: 'قيد المعالجة', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
    replied: { label: 'تم الرد', color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20' },
    resolved: { label: 'تم الحل', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
    rejected: { label: 'مرفوض', color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
};

const AdminComplaints = () => {
    const queryClient = useQueryClient();
    const [chatComplaint, setChatComplaint] = useState(null);
    const [messageInput, setMessageInput] = useState('');
    const [filter, setFilter] = useState('all');
    const [showStatusMenu, setShowStatusMenu] = useState(false);
    const messagesEndRef = useRef(null);

    const { data: complaints, isLoading } = useQuery({
        queryKey: ['admin-complaints'],
        queryFn: async () => {
            const r = await api.get('/admin/complaints');
            return r.data;
        }
    });

    const { data: messages } = useQuery({
        queryKey: ['complaint-messages', chatComplaint?.id],
        queryFn: async () => {
            const r = await api.get(`/admin/complaints/${chatComplaint.id}/messages`);
            return r.data;
        },
        enabled: !!chatComplaint,
        refetchInterval: 5000,
    });

    const sendMessageMutation = useMutation({
        mutationFn: async (message) => {
            const r = await api.post(`/admin/complaints/${chatComplaint.id}/messages`, { message });
            return r.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['complaint-messages', chatComplaint?.id] });
            queryClient.invalidateQueries({ queryKey: ['admin-complaints'] });
            setMessageInput('');
        }
    });

    const updateStatusMutation = useMutation({
        mutationFn: async (status) => {
            const r = await api.put(`/admin/complaints/${chatComplaint.id}/status`, { status });
            return r.data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['complaint-messages', chatComplaint?.id] });
            queryClient.invalidateQueries({ queryKey: ['admin-complaints'] });
            setChatComplaint(prev => prev ? { ...prev, status: data.status } : prev);
            setShowStatusMenu(false);
        }
    });

    const handleSend = (e) => {
        e.preventDefault();
        if (!messageInput.trim()) return;
        sendMessageMutation.mutate(messageInput.trim());
    };

    const handleStatusChange = (status) => {
        if (status === chatComplaint.status) return;
        updateStatusMutation.mutate(status);
    };

    const list = Array.isArray(complaints) ? complaints : complaints?.data || [];
    const filtered = filter === 'all' ? list : list.filter(c => c.status === filter);
    const msgList = Array.isArray(messages) ? messages : [];

    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [msgList.length]);

    return (
        <div className="space-y-8 pb-10">
            <header className="text-right">
                <h2 className="text-2xl sm:text-3xl font-extrabold flex items-center gap-3">
                    إدارة الشكاوى
                    <MessageSquare className="w-8 h-8 text-rose-400" />
                </h2>
                <p className="text-gray-400 mt-1">دردشة مباشرة مع الزبائن</p>
            </header>

            {/* Filter Tabs */}
            <div className="flex flex-wrap gap-2">
                {[
                    { id: 'all', label: 'الكل' },
                    { id: 'pending', label: 'قيد المراجعة' },
                    { id: 'in_progress', label: 'قيد المعالجة' },
                    { id: 'replied', label: 'تم الرد' },
                    { id: 'resolved', label: 'تم الحل' },
                    { id: 'rejected', label: 'مرفوض' },
                ].map(tab => (
                    <button key={tab.id} onClick={() => setFilter(tab.id)}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${filter === tab.id ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-white/5 text-gray-400 hover:text-white border border-white/10'}`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="space-y-4">
                {isLoading ? (
                    [...Array(4)].map((_, i) => <div key={i} className="h-32 rounded-[2rem] bg-white/5 shimmer" />)
                ) : filtered.length === 0 ? (
                    <div className="text-center py-20 glass-card rounded-[2rem]">
                        <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-20 text-gray-600" />
                        <p className="font-bold text-lg text-gray-400">لا توجد شكاوى</p>
                    </div>
                ) : (
                    filtered.map((c, i) => {
                        const cfg = statusConfig[c.status] || statusConfig.pending;
                        return (
                            <motion.div key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                                className="glass-card rounded-[2rem] p-6 border border-white/10 text-right"
                            >
                                <div className="flex items-start gap-3 mb-4">
                                    <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${cfg.bg} ${cfg.color} ${cfg.border} border shrink-0`}>{cfg.label}</span>
                                    <div className="text-right flex-1">
                                        <p className="font-bold">{c.title}</p>
                                        <p className="text-xs text-gray-500 mt-1">{new Date(c.created_at).toLocaleDateString('ar-EG')}</p>
                                    </div>
                                    {c.messages_count > 0 && (
                                        <span className="flex items-center gap-1 text-[11px] text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-full shrink-0">
                                            <MessageCircle className="w-3 h-3" />
                                            {c.messages_count}
                                        </span>
                                    )}
                                </div>

                                <p className="text-sm text-gray-400 mb-4 bg-white/5 p-4 rounded-2xl">{c.description}</p>

                                <div className="flex items-center gap-6 text-xs text-gray-500 mb-3 flex-wrap">
                                    <span className="flex items-center gap-1"><User className="w-3 h-3" /> {c.user?.name}</span>
                                    <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {c.user?.email}</span>
                                    {c.user?.phone && <a href={`tel:${c.user.phone}`} className="flex items-center gap-1 hover:text-indigo-400 hover:underline" dir="ltr"><Phone className="w-3 h-3" /> {c.user.phone}</a>}
                                    {c.mall && <span className="flex items-center gap-1"><Store className="w-3 h-3" /> {c.mall.name_ar}</span>}
                                </div>

                                {(c.user?.address || c.user?.gender || c.user?.birthdate) && (
                                    <div className="flex items-center gap-3 text-xs text-gray-500 mb-4 flex-wrap bg-white/3 p-3 rounded-2xl">
                                        <span className="text-[10px] font-bold text-gray-600">تفاصيل الزبون:</span>
                                        {c.user?.address && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {c.user.address}</span>}
                                        {c.user?.gender && <span className="flex items-center gap-1"><User className="w-3 h-3" /> {c.user.gender === 'male' ? 'ذكر' : c.user.gender === 'female' ? 'أنثى' : c.user.gender}</span>}
                                        {c.user?.birthdate && <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" /> {new Date(c.user.birthdate).toLocaleDateString('en-GB')}</span>}
                                    </div>
                                )}

                                <button onClick={() => setChatComplaint(c)} className="w-full py-3 rounded-xl bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white font-bold text-sm transition-all border border-rose-500/20 flex items-center justify-center gap-2">
                                    <MessageCircle className="w-4 h-4" />
                                    فتح المحادثة
                                </button>
                            </motion.div>
                        );
                    })
                )}
            </div>

            {/* Chat Panel */}
            <AnimatePresence>
                {chatComplaint && (
                    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm">
                        <motion.div initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 60 }}
                            className="w-full sm:max-w-xl glass-dark p-0 rounded-t-[2.5rem] sm:rounded-[2.5rem] border border-white/10 relative flex flex-col max-h-[90vh]"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-5 border-b border-white/10 shrink-0">
                                <button onClick={() => setChatComplaint(null)} className="p-2 rounded-full hover:bg-white/10 transition-colors">
                                    <X className="w-5 h-5 text-gray-400" />
                                </button>
                                <div className="text-right">
                                    <h3 className="text-lg font-bold">{chatComplaint.title}</h3>
                                    <p className="text-xs text-gray-500 flex items-center gap-2">
                                        <span>{chatComplaint.user?.name}</span>
                                        <div className="relative">
                                            <button onClick={() => setShowStatusMenu(!showStatusMenu)}
                                                className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all flex items-center gap-1.5 ${statusConfig[chatComplaint.status]?.bg} ${statusConfig[chatComplaint.status]?.color} border ${statusConfig[chatComplaint.status]?.border} hover:opacity-80`}>
                                                {statusConfig[chatComplaint.status]?.label}
                                                <ChevronDown className="w-3 h-3" />
                                            </button>
                                            {showStatusMenu && (
                                                <div className="absolute top-full mt-1 left-0 bg-gray-900 border border-white/10 rounded-2xl p-1.5 shadow-2xl z-50 min-w-[130px]">
                                                    {[
                                                        { id: 'pending', label: 'قيد المراجعة' },
                                                        { id: 'in_progress', label: 'قيد المعالجة' },
                                                        { id: 'replied', label: 'تم الرد' },
                                                        { id: 'resolved', label: 'تم الحل' },
                                                        { id: 'rejected', label: 'مرفوض' },
                                                    ].map(s => (
                                                        <button key={s.id} onClick={() => handleStatusChange(s.id)}
                                                            disabled={updateStatusMutation.isPending}
                                                            className={`w-full text-right px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${chatComplaint.status === s.id ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
                                                            {s.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </p>
                                </div>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-5 space-y-3 min-h-[300px] max-h-[50vh]">
                                <div className="text-center">
                                    <p className="text-xs text-gray-600 bg-white/5 rounded-2xl p-3 inline-block">
                                        {chatComplaint.description}
                                    </p>
                                </div>
                                {msgList.length === 0 && (
                                    <div className="text-center py-10 text-gray-500 text-sm">لا توجد رسائل بعد</div>
                                )}
                                {msgList.map((m) => {
                                    const isAdmin = m.user_id !== chatComplaint.user_id;
                                    const isSystem = m.message?.startsWith('تم تغيير الحالة');
                                    if (isSystem) {
                                        return (
                                            <div key={m.id} className="flex justify-center">
                                                <div className="bg-white/5 rounded-2xl px-4 py-2 text-center">
                                                    <p className="text-[11px] text-gray-500">{m.message}</p>
                                                    <p className="text-[9px] text-gray-600 mt-0.5">{new Date(m.created_at).toLocaleString('en-GB')}</p>
                                                </div>
                                            </div>
                                        );
                                    }
                                    return (
                                        <div key={m.id} className={`flex ${isAdmin ? 'justify-start' : 'justify-start'}`}>
                                            <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${isAdmin ? 'bg-rose-500/20 text-gray-200 rounded-br-sm' : 'bg-indigo-500/20 text-gray-200 rounded-bl-sm'}`}>
                                                {!isAdmin && <p className="text-[10px] text-indigo-400 font-bold mb-0.5">{m.user?.name}</p>}
                                                <p className="text-sm">{m.message}</p>
                                                <p className="text-[10px] text-gray-500 mt-1 text-right">{new Date(m.created_at).toLocaleString('en-GB')}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input */}
                            <form onSubmit={handleSend} className="flex items-center gap-3 p-4 border-t border-white/10 shrink-0">
                                <input
                                    type="text" value={messageInput} onChange={e => setMessageInput(e.target.value)}
                                    placeholder="اكتب رسالتك..."
                                    className="input-field flex-1 py-3 px-4"
                                />
                                <button type="submit" disabled={sendMessageMutation.isPending || !messageInput.trim()}
                                    className="w-11 h-11 rounded-xl bg-rose-500 text-white hover:bg-rose-600 transition-all disabled:opacity-40 flex items-center justify-center shrink-0">
                                    {sendMessageMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AdminComplaints;
