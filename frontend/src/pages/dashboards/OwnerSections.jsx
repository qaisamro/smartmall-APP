import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FolderTree, Package, Plus, Pencil, Trash2, X, Loader2, Layers, AlertTriangle, Check, Eye, EyeOff, Milk, Coffee, Candy, Cookie, CookingPot, Snowflake, Beef, Croissant, SprayCan as Spray, Newspaper, Sparkles, Home, Cigarette } from 'lucide-react';
import api from '../../api/axios';

const SECTION_ICONS = {
  1: { icon: Milk, color: 'from-blue-500/20 to-cyan-500/20', border: 'border-blue-500/20', text: 'text-blue-400', bg: 'bg-blue-500/10' },
  2: { icon: Coffee, color: 'from-amber-600/20 to-orange-500/20', border: 'border-amber-600/20', text: 'text-amber-500', bg: 'bg-amber-600/10' },
  3: { icon: Candy, color: 'from-pink-500/20 to-rose-500/20', border: 'border-pink-500/20', text: 'text-pink-400', bg: 'bg-pink-500/10' },
  4: { icon: Cookie, color: 'from-orange-500/20 to-amber-500/20', border: 'border-orange-500/20', text: 'text-orange-400', bg: 'bg-orange-500/10' },
  5: { icon: Package, color: 'from-amber-500/20 to-yellow-500/20', border: 'border-amber-500/20', text: 'text-amber-400', bg: 'bg-amber-500/10' },
  6: { icon: CookingPot, color: 'from-orange-600/20 to-red-500/20', border: 'border-orange-600/20', text: 'text-orange-500', bg: 'bg-orange-600/10' },
  7: { icon: Snowflake, color: 'from-sky-500/20 to-indigo-500/20', border: 'border-sky-500/20', text: 'text-sky-400', bg: 'bg-sky-500/10' },
  8: { icon: Beef, color: 'from-red-500/20 to-rose-500/20', border: 'border-red-500/20', text: 'text-red-400', bg: 'bg-red-500/10' },
  9: { icon: Croissant, color: 'from-yellow-500/20 to-amber-500/20', border: 'border-yellow-500/20', text: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  10: { icon: Spray, color: 'from-teal-500/20 to-cyan-500/20', border: 'border-teal-500/20', text: 'text-teal-400', bg: 'bg-teal-500/10' },
  11: { icon: Newspaper, color: 'from-slate-500/20 to-stone-500/20', border: 'border-slate-500/20', text: 'text-slate-400', bg: 'bg-slate-500/10' },
  12: { icon: Sparkles, color: 'from-purple-500/20 to-fuchsia-500/20', border: 'border-purple-500/20', text: 'text-purple-400', bg: 'bg-purple-500/10' },
  13: { icon: Home, color: 'from-stone-500/20 to-neutral-500/20', border: 'border-stone-500/20', text: 'text-stone-400', bg: 'bg-stone-500/10' },
  14: { icon: Cigarette, color: 'from-gray-500/20 to-zinc-500/20', border: 'border-gray-500/20', text: 'text-gray-400', bg: 'bg-gray-500/10' },
  15: { icon: Coffee, color: 'from-amber-500/20 to-orange-500/20', border: 'border-amber-500/20', text: 'text-amber-400', bg: 'bg-amber-500/10' },
};

const OwnerSections = () => {
    const queryClient = useQueryClient();
    const [renamingId, setRenamingId] = useState(null);
    const [renameDraft, setRenameDraft] = useState('');
    const [addingParentId, setAddingParentId] = useState(null);
    const [newChildName, setNewChildName] = useState('');
    const [showAddMain, setShowAddMain] = useState(false);
    const [newMainName, setNewMainName] = useState('');
    const [formError, setFormError] = useState('');

    const { data: mallsData = [] } = useQuery({
        queryKey: ['owner-malls'],
        queryFn: async () => (await api.get('/owner/my-malls')).data
    });
    const ownerMallId = mallsData?.[0]?.id;

    const { data: sectionsData = {}, isLoading } = useQuery({
        queryKey: ['owner-mall-sections', ownerMallId],
        enabled: Boolean(ownerMallId),
        queryFn: async () => (await api.get('/owner/sections', { params: { mall_id: ownerMallId } })).data
    });

    const sections = sectionsData.sections || [];

    const invalidate = () => {
        queryClient.invalidateQueries(['owner-mall-sections']);
        queryClient.invalidateQueries(['owner-products']);
        queryClient.invalidateQueries(['mall-sections-tree']);
    };

    const getErrorMessage = (error) => {
        const data = error?.response?.data;
        const firstValErr = data?.errors ? Object.values(data.errors)?.[0]?.[0] : null;
        return firstValErr || data?.message || 'حدث خطأ، حاول مرة أخرى.';
    };

    const renameMutation = useMutation({
        mutationFn: ({ id, data }) => api.put(`/owner/sections/${id}`, data),
        onSuccess: () => { invalidate(); setRenamingId(null); setRenameDraft(''); },
        onError: (err) => setFormError(getErrorMessage(err))
    });

    const addChildMutation = useMutation({
        mutationFn: (data) => api.post('/owner/sections', data),
        onSuccess: () => { invalidate(); setAddingParentId(null); setNewChildName(''); setFormError(''); },
        onError: (err) => setFormError(getErrorMessage(err))
    });

    const addMainMutation = useMutation({
        mutationFn: (data) => api.post('/owner/sections', data),
        onSuccess: () => { invalidate(); setShowAddMain(false); setNewMainName(''); setFormError(''); },
        onError: (err) => setFormError(getErrorMessage(err))
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => api.delete(`/owner/sections/${id}`),
        onSuccess: () => invalidate(),
        onError: (err) => setFormError(getErrorMessage(err))
    });

    const startRename = (sec) => { setRenamingId(sec.id); setRenameDraft(sec.name_ar || ''); setFormError(''); };
    const saveRename = (sec) => {
        const name = renameDraft.trim();
        if (!name) return;
        renameMutation.mutate({ id: sec.id, data: { name_ar: name, name_en: sec.name_en } });
    };
    const renameKeyDown = (e, sec) => {
        if (e.key === 'Enter') { e.preventDefault(); saveRename(sec); }
        if (e.key === 'Escape') setRenamingId(null);
    };

    const startAddChild = (sec) => { setAddingParentId(sec.id); setNewChildName(''); setFormError(''); };
    const saveAddChild = (parent) => {
        const name = newChildName.trim();
        if (!name) return;
        addChildMutation.mutate({ mall_id: ownerMallId, parent_id: parent.id, name_ar: name, name_en: name });
    };
    const childKeyDown = (e, parent) => {
        if (e.key === 'Enter') { e.preventDefault(); saveAddChild(parent); }
        if (e.key === 'Escape') { setAddingParentId(null); setNewChildName(''); }
    };

    const saveAddMain = () => {
        const name = newMainName.trim();
        if (!name) return;
        addMainMutation.mutate({ mall_id: ownerMallId, name_ar: name, name_en: name });
    };
    const mainKeyDown = (e) => {
        if (e.key === 'Enter') { e.preventDefault(); saveAddMain(); }
        if (e.key === 'Escape') { setShowAddMain(false); setNewMainName(''); }
    };

    const handleDelete = (sec) => {
        const isCustom = sec.is_custom;
        const msg = isCustom
            ? `سيتم حذف القسم الفرعي "${sec.name_ar}" نهائياً. هل أنت متأكد؟`
            : `سيتم إخفاء القسم "${sec.name_ar}" عن الزبائن في مولك (يمكنك إعادة تفعيله لاحقاً). متابعة؟`;
        if (window.confirm(msg)) {
            deleteMutation.mutate(sec.id);
        }
    };

    return (
        <div className="space-y-8 pb-10">
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-right">
                <div>
                    <h2 className="text-2xl sm:text-3xl font-extrabold flex items-center gap-3">
                        <FolderTree className="w-7 h-7 text-purple-400" />
                        إدارة أقسام المتجر
                    </h2>
                    <p className="text-gray-400 mt-1">غيّر أسماء الأقسام، أضف أقساماً رئيسية جديدة أو فرعية، أو أخفِ الأقسام حسب متجرك</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    {sections.length > 0 && (
                        <span className="badge badge-purple hidden sm:inline-flex">الأقسام الفرعية تظهر للزبون عند تصفح المنتجات</span>
                    )}
                    <button
                        onClick={() => { setShowAddMain(v => !v); setFormError(''); if (!showAddMain) setTimeout(() => document.getElementById('new-main-input')?.focus(), 50); }}
                        className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm transition-all shadow-lg shadow-purple-600/20 shrink-0"
                    >
                        <Plus className="w-4 h-4" />
                        إضافة قسم جديد
                    </button>
                </div>
            </header>

            <AnimatePresence>
                {showAddMain && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: 'auto' }}
                        exit={{ opacity: 0, y: -10, height: 0 }}
                        className="glass-card rounded-3xl border border-purple-500/20 p-5 flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
                    >
                        <div className="flex items-center gap-2 text-sm font-bold text-purple-300 shrink-0">
                            <Layers className="w-4 h-4" />
                            اسم القسم الجديد
                        </div>
                        <input
                            id="new-main-input"
                            autoFocus
                            type="text"
                            placeholder="مثال: قسم الألبان، قسم المنظفات..."
                            value={newMainName}
                            onChange={(e) => setNewMainName(e.target.value)}
                            onKeyDown={mainKeyDown}
                            className="input-field flex-1 !py-3 text-sm"
                        />
                        <div className="flex items-center gap-2 shrink-0">
                            <button
                                onClick={saveAddMain}
                                disabled={addMainMutation.isPending || !newMainName.trim()}
                                className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm flex items-center gap-2 transition-all"
                            >
                                {addMainMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                حفظ القسم
                            </button>
                            <button
                                onClick={() => { setShowAddMain(false); setNewMainName(''); setFormError(''); }}
                                className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors"
                            >
                                <X className="w-4 h-4 text-gray-400" />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {formError && (
                <div className="rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 p-4 text-sm flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 shrink-0" />
                    {formError}
                </div>
            )}

            {isLoading ? (
                <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
                    {[...Array(6)].map((_, i) => <div key={i} className="h-64 rounded-3xl bg-white/5 shimmer" />)}
                </div>
            ) : sections.length === 0 ? (
                <div className="col-span-full py-20 text-center text-gray-500 glass-card rounded-3xl border border-white/5">
                    <Package className="w-16 h-16 mx-auto mb-4 opacity-20" />
                    <p className="font-bold text-lg">لا توجد أقسام في متجرك حالياً</p>
                    <p className="text-sm mt-2">اضغط "إضافة قسم جديد" أعلاه لإنشاء أول قسم خاص بمتجرك</p>
                </div>
            ) : (
                <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
                    {sections.map((sec, i) => {
                        const si = SECTION_ICONS[sec.section_id] || {};
                        const IconComp = si.icon || Package;
                        const isRenaming = renamingId === sec.id;
                        const isAdding = addingParentId === sec.id;
                        return (
                            <motion.div
                                key={sec.id}
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className="glass-card rounded-3xl overflow-hidden flex flex-col"
                            >
                                <div className={`p-5 bg-gradient-to-br ${si.color || 'from-gray-800 to-gray-900'} border-b border-white/5`}>
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className={`w-12 h-12 rounded-2xl ${si.bg || 'bg-white/10'} flex items-center justify-center shrink-0 border ${si.border || 'border-white/10'}`}>
                                                <IconComp className={`w-6 h-6 ${si.text || 'text-gray-300'}`} />
                                            </div>
                                            <div className="min-w-0">
                                                {isRenaming ? (
                                                    <div className="flex items-center gap-1.5">
                                                        <input
                                                            autoFocus
                                                            type="text"
                                                            value={renameDraft}
                                                            onChange={(e) => setRenameDraft(e.target.value)}
                                                            onKeyDown={(e) => renameKeyDown(e, sec)}
                                                            className="input-field !py-1.5 !px-2 text-sm w-36"
                                                        />
                                                        <button onClick={() => saveRename(sec)} disabled={renameMutation.isPending} className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 disabled:opacity-50 shrink-0">
                                                            {renameMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <h3 className="font-bold text-lg leading-snug break-words">{sec.name_ar}</h3>
                                                )}
                                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                    <span className="text-xs text-gray-300 opacity-80">{sec.product_count || 0} منتج</span>
                                                    {sec.is_custom && <span className="text-[10px] font-bold text-purple-300 bg-purple-500/15 py-0.5 px-2 rounded-full border border-purple-500/20">قسم خاص</span>}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                            <button onClick={() => startRename(sec)} title="تغيير الاسم" className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors">
                                                <Pencil className="w-4 h-4 text-gray-300" />
                                            </button>
                                            <button onClick={() => handleDelete(sec)} title={sec.is_custom ? 'حذف' : 'إخفاء'} className="p-2 rounded-xl bg-white/10 hover:bg-red-500/20 transition-colors">
                                                <Trash2 className="w-4 h-4 text-gray-300" />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-5 flex-1 flex flex-col">
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="text-sm font-bold text-gray-300 flex items-center gap-1.5">
                                            <Layers className="w-4 h-4 text-purple-400" />
                                            الأقسام الفرعية
                                        </h4>
                                        <button onClick={() => isAdding ? setAddingParentId(null) : startAddChild(sec)} className="text-xs font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors">
                                            <Plus className="w-3.5 h-3.5" />
                                            {isAdding ? 'إلغاء' : 'إضافة'}
                                        </button>
                                    </div>

                                    {isAdding && (
                                        <div className="flex items-center gap-2 mb-3">
                                            <input
                                                autoFocus
                                                type="text"
                                                placeholder="اسم القسم الفرعي..."
                                                value={newChildName}
                                                onChange={(e) => setNewChildName(e.target.value)}
                                                onKeyDown={(e) => childKeyDown(e, sec)}
                                                className="input-field !py-2 !px-3 text-sm flex-1"
                                            />
                                            <button onClick={() => saveAddChild(sec)} disabled={addChildMutation.isPending} className="p-2 rounded-xl bg-purple-500/15 text-purple-400 hover:bg-purple-500/25 disabled:opacity-50 shrink-0">
                                                {addChildMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    )}

                                    {sec.children?.length > 0 ? (
                                        <div className="space-y-2">
                                            {sec.children.map(child => {
                                                const isChildRenaming = renamingId === child.id;
                                                return (
                                                    <div key={child.id} className="flex items-center justify-between gap-2 bg-white/[0.03] rounded-xl px-3 py-2 border border-white/5">
                                                        {isChildRenaming ? (
                                                            <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                                                <input
                                                                    autoFocus
                                                                    type="text"
                                                                    value={renameDraft}
                                                                    onChange={(e) => setRenameDraft(e.target.value)}
                                                                    onKeyDown={(e) => renameKeyDown(e, child)}
                                                                    className="input-field !py-1 !px-2 text-xs flex-1 min-w-0"
                                                                />
                                                                <button onClick={() => saveRename(child)} disabled={renameMutation.isPending} className="p-1 rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 shrink-0">
                                                                    {renameMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <div className="flex items-center gap-2 min-w-0">
                                                                    <Package className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                                                                    <span className="text-sm font-medium truncate">{child.name_ar}</span>
                                                                    {child.product_count > 0 && (
                                                                        <span className="text-[10px] text-gray-500 shrink-0">({child.product_count})</span>
                                                                    )}
                                                                </div>
                                                                <div className="flex items-center gap-1 shrink-0">
                                                                    <button onClick={() => startRename(child)} title="تغيير الاسم" className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 transition-colors">
                                                                        <Pencil className="w-3.5 h-3.5 text-gray-400" />
                                                                    </button>
                                                                    <button onClick={() => handleDelete(child)} title="حذف" className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 transition-colors">
                                                                        <Trash2 className="w-3.5 h-3.5 text-gray-400" />
                                                                    </button>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-gray-500 text-center py-3">لا توجد أقسام فرعية بعد — اضغط "إضافة" لإنشاء واحد</p>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default OwnerSections;