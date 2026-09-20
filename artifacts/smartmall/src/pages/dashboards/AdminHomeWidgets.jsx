import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import {
    Sun, DollarSign, Coins, Clock, Pill, Newspaper,
    AlertTriangle, Map, GripVertical, Eye, EyeOff, Plus, Trash2, Save, Loader2, LayoutDashboard
} from 'lucide-react';

const TABS = [
    { key: 'sections', label: 'ترتيب الأقسام', icon: GripVertical },
    { key: 'weather', label: 'الطقس', icon: Sun },
    { key: 'currencies', label: 'العملات', icon: DollarSign },
    { key: 'gold', label: 'الذهب', icon: Coins },
    { key: 'prayers', label: 'أوقات الصلاة', icon: Clock },
    { key: 'pharmacies', label: 'الصيدليات', icon: Pill },
    { key: 'news', label: 'الأخبار', icon: Newspaper },
    { key: 'alerts', label: 'التنبيهات', icon: AlertTriangle },
    { key: 'roads', label: 'حالة الطرق', icon: Map },
];

const AdminHomeWidgets = () => {
    const queryClient = useQueryClient();
    const [tab, setTab] = useState('sections');
    const [editItem, setEditItem] = useState(null);
    const [showForm, setShowForm] = useState(false);

    const { data: sections } = useQuery({ queryKey: ['admin-widget-sections'], queryFn: async () => (await api.get('/admin/widgets/sections')).data });

    const base = (s) => `/admin/widgets/${s}`;

    const sectionKeys = ['weather', 'currencies', 'gold', 'prayers', 'pharmacies', 'news', 'alerts', 'roads'];
    const queries = {};
    for (const k of sectionKeys) {
        queries[k] = useQuery({
            queryKey: ['admin-widgets', k],
            queryFn: async () => (await api.get(base(k))).data,
            enabled: tab === k,
        });
    }

    const delMut = useMutation({
        mutationFn: async ({ section, id }) => api.delete(`${base(section)}/${id}`),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-widgets'] }); },
    });

    const saveSectionOrder = useMutation({
        mutationFn: async (sectionsData) => api.put('/admin/widgets/sections', { sections: sectionsData }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-widget-sections'] }),
    });

    const handleToggleSection = async (key, isVisible) => {
        const updated = (sections || []).map(s => s.key === key ? { ...s, is_visible: !isVisible } : s);
        await saveSectionOrder.mutateAsync(updated);
    };

    const FormModal = ({ section, item, onClose }) => {
        const [f, setF] = useState(item || getDefaults(section));
        const saveMut = useMutation({
            mutationFn: async () => {
                const hasId = f.id;
                if (hasId) return api.put(`${base(section)}/${f.id}`, f);
                return api.post(base(section), f);
            },
            onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-widgets', section] }); onClose(); },
        });

        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && onClose()}>
                <div className="w-full max-w-lg glass-dark rounded-2xl p-6 border border-white/10 max-h-[80vh] overflow-y-auto">
                    <h3 className="text-lg font-bold mb-4 text-right">{item ? 'تعديل' : 'إضافة'}</h3>
                    {renderFormFields(section, f, setF)}
                    <div className="flex gap-3 mt-6">
                        <button onClick={() => saveMut.mutate()} disabled={saveMut.isPending} className="btn-primary flex-1">
                            {saveMut.isPending ? <Loader2 className="animate-spin w-4 h-4 mx-auto" /> : <Save className="w-4 h-4" />} حفظ
                        </button>
                        <button onClick={onClose} className="btn-secondary flex-1">إلغاء</button>
                    </div>
                </div>
            </div>
        );
    };

    const renderList = (section) => {
        const data = queries[section]?.data || [];
        return (
            <div className="space-y-3">
                <button onClick={() => { setEditItem(null); setShowForm(true); }} className="btn-primary !py-2 !px-4">
                    <Plus className="w-4 h-4" /> إضافة
                </button>
                <div className="grid gap-3 mt-4">
                    {data.map(item => (
                        <div key={item.id} className="glass-card rounded-2xl border border-white/5 p-4 flex items-center justify-between gap-3">
                            <div className="flex-1 text-right">{item.title || item.name || item.type || item.road_name || item.code}</div>
                            <div className="flex gap-2 shrink-0">
                                <button onClick={() => { setEditItem({ ...item, section }); setShowForm(true); }} className="p-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-indigo-400 transition-colors">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                </button>
                                <button onClick={() => { if (window.confirm('حذف؟')) delMut.mutate({ section, id: item.id }); }} className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-colors">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
                {showForm && <FormModal section={editItem?.section || section} item={editItem?.section ? editItem : null} onClose={() => { setShowForm(false); setEditItem(null); }} />}
            </div>
        );
    };

    return (
        <div className="space-y-6 pb-10 text-right">
            <header className="flex items-center gap-3">
                <LayoutDashboard className="w-7 h-7 text-indigo-400" />
                <h2 className="text-3xl font-extrabold text-white">الواجهة الرئيسية</h2>
            </header>

            {/* Tabs */}
            <div className="flex flex-wrap gap-2">
                {TABS.map(t => (
                    <button key={t.key} onClick={() => setTab(t.key)}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${tab === t.key ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-white/5 text-gray-400 hover:text-white border border-transparent'}`}>
                        <t.icon className="w-4 h-4 inline ml-1.5" />{t.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            {tab === 'sections' && (
                <div className="space-y-3">
                    {(sections || []).map(s => (
                        <div key={s.key} className="glass-card rounded-2xl border border-white/5 p-4 flex items-center justify-between">
                            <button onClick={() => handleToggleSection(s.key, s.is_visible)}
                                className={`p-2 rounded-xl transition-colors ${s.is_visible ? 'bg-emerald-500/10 text-emerald-400' : 'bg-gray-500/10 text-gray-500'}`}>
                                {s.is_visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                            </button>
                            <span className="text-white font-bold">{s.label_ar}</span>
                        </div>
                    ))}
                    <button onClick={() => saveSectionOrder.mutate(sections)} disabled={saveSectionOrder.isPending}
                        className="btn-primary !py-2.5 !px-6">
                        <Save className="w-4 h-4" /> حفظ الترتيب
                    </button>
                </div>
            )}

            {tab !== 'sections' && renderList(tab)}
        </div>
    );
};

const fieldConfig = {
    weather: [
        { name: 'temperature', label: 'درجة الحرارة', type: 'number' },
        { name: 'condition', label: 'حالة الجو', type: 'text' },
        { name: 'icon', label: 'أيقونة', type: 'text' },
        { name: 'humidity', label: 'الرطوبة', type: 'number' },
        { name: 'wind_speed', label: 'سرعة الرياح', type: 'number' },
        { name: 'forecast_short', label: 'التوقعات', type: 'textarea' },
    ],
    currencies: [
        { name: 'code', label: 'الكود (مثال: USD)', type: 'text', required: true },
        { name: 'name', label: 'الاسم', type: 'text', required: true },
        { name: 'buy_rate', label: 'سعر الشراء', type: 'number', required: true },
        { name: 'sell_rate', label: 'سعر البيع', type: 'number', required: true },
    ],
    gold: [
        { name: 'type', label: 'النوع (24k, 21k, ...)', type: 'text', required: true },
        { name: 'price', label: 'السعر', type: 'number', required: true },
        { name: 'change', label: 'التغير', type: 'number' },
    ],
    prayers: [
        { name: 'city', label: 'المدينة', type: 'text' },
        { name: 'date', label: 'التاريخ', type: 'date' },
        { name: 'fajr', label: 'الفجر', type: 'text', required: true },
        { name: 'sunrise', label: 'الشروق', type: 'text', required: true },
        { name: 'dhuhr', label: 'الظهر', type: 'text', required: true },
        { name: 'asr', label: 'العصر', type: 'text', required: true },
        { name: 'maghrib', label: 'المغرب', type: 'text', required: true },
        { name: 'isha', label: 'العشاء', type: 'text', required: true },
    ],
    pharmacies: [
        { name: 'name', label: 'الاسم', type: 'text', required: true },
        { name: 'city', label: 'المدينة', type: 'text' },
        { name: 'address', label: 'العنوان', type: 'textarea' },
        { name: 'phone', label: 'الهاتف', type: 'text' },
        { name: 'duty_date', label: 'تاريخ المناوبة', type: 'date' },
    ],
    news: [
        { name: 'title', label: 'العنوان', type: 'text', required: true },
        { name: 'summary', label: 'الملخص', type: 'textarea' },
        { name: 'source', label: 'المصدر', type: 'text' },
        { name: 'source_url', label: 'رابط المصدر', type: 'text' },
        { name: 'published_at', label: 'تاريخ النشر', type: 'datetime-local' },
    ],
    alerts: [
        { name: 'type', label: 'النوع (info/warning/danger/success)', type: 'text' },
        { name: 'title', label: 'العنوان', type: 'text', required: true },
        { name: 'body', label: 'المحتوى', type: 'textarea' },
        { name: 'expires_at', label: 'ينتهي في', type: 'datetime-local' },
    ],
    roads: [
        { name: 'road_name', label: 'اسم الطريق', type: 'text', required: true },
        { name: 'city', label: 'المدينة', type: 'text' },
        { name: 'status', label: 'الحالة (clear/moderate/heavy/closed)', type: 'text', required: true },
        { name: 'notes', label: 'ملاحظات', type: 'textarea' },
    ],
};

function getDefaults(section) {
    const fields = fieldConfig[section] || [];
    const defs = {};
    fields.forEach(f => { defs[f.name] = ''; });
    defs.is_active = true;
    return defs;
}

function renderFormFields(section, form, setForm) {
    const fields = fieldConfig[section] || [];
    return fields.map(f => (
        <div key={f.name} className="mb-3 text-right">
            <label className="block text-sm text-gray-400 mb-1">{f.label}{f.required ? ' *' : ''}</label>
            {f.type === 'textarea' ? (
                <textarea value={form[f.name] || ''} onChange={e => setForm({ ...form, [f.name]: e.target.value })} className="input-field min-h-[80px]" />
            ) : (
                <input type={f.type} value={form[f.name] || ''} onChange={e => setForm({ ...form, [f.name]: e.target.value })} className="input-field" />
            )}
        </div>
    ));
}

export default AdminHomeWidgets;
