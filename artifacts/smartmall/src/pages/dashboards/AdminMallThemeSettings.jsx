import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Check, Eye, Loader2, Palette, Save, SlidersHorizontal, QrCode, Download, Share2 } from 'lucide-react';
import api from '../../api/axios';
import { defaultTheme, predefinedThemes, themeToCssVars } from '../../utils/theme';

const colorFields = [
    { key: 'primary_color', label: 'Primary Color' },
    { key: 'secondary_color', label: 'Secondary Color' },
    { key: 'accent_color', label: 'Accent Color' },
    { key: 'background_color', label: 'Background Color' },
    { key: 'text_color', label: 'Text Color' },
];

const fontOptions = ['Cairo', 'Inter', 'Tahoma', 'Arial', 'system-ui'];
const radiusOptions = [
    { value: 'modern', label: 'Modern' },
    { value: 'sharp', label: 'Sharp' },
    { value: 'rounded', label: 'Rounded' },
];

const clamp = (value) => Math.max(0, Math.min(255, value));

const hexToRgb = (hex) => {
    const clean = hex.replace('#', '');
    return {
        r: parseInt(clean.slice(0, 2), 16),
        g: parseInt(clean.slice(2, 4), 16),
        b: parseInt(clean.slice(4, 6), 16),
    };
};

const rgbToHex = ({ r, g, b }) => `#${[r, g, b].map((value) => clamp(Math.round(value)).toString(16).padStart(2, '0')).join('')}`;

const shiftColor = (hex, amount) => {
    const rgb = hexToRgb(hex);
    const target = amount >= 0 ? 255 : 0;
    const ratio = Math.abs(amount) / 100;
    return rgbToHex({
        r: rgb.r + (target - rgb.r) * ratio,
        g: rgb.g + (target - rgb.g) * ratio,
        b: rgb.b + (target - rgb.b) * ratio,
    });
};

const AdminMallThemeSettings = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [theme, setTheme] = useState(defaultTheme);
    const [saved, setSaved] = useState(false);
    const [colorAdjustments, setColorAdjustments] = useState({});
    const [qrGenerated, setQrGenerated] = useState(false);

    const { data, isLoading } = useQuery({
        queryKey: ['admin-mall-theme', id],
        queryFn: async () => {
            const res = await api.get(`/admin/malls/${id}/theme`);
            return res.data;
        },
    });

    const { data: malls } = useQuery({
        queryKey: ['admin-malls'],
        queryFn: async () => {
            const res = await api.get('/malls');
            return res.data;
        },
    });

    useEffect(() => {
        if (data?.theme) {
            setTheme({ ...defaultTheme, ...data.theme });
        }
    }, [data]);

    const saveMutation = useMutation({
        mutationFn: async () => {
            const payload = {
                primary_color: theme.primary_color,
                secondary_color: theme.secondary_color,
                accent_color: theme.accent_color,
                background_color: theme.background_color,
                text_color: theme.text_color,
                dark_mode: Boolean(theme.dark_mode),
                font_family: theme.font_family,
                border_radius: theme.border_radius,
            };
            const res = await api.put(`/admin/malls/${id}/theme`, payload);
            return res.data;
        },
        onSuccess: () => {
            setSaved(true);
            queryClient.invalidateQueries({ queryKey: ['admin-mall-theme', id] });
            queryClient.invalidateQueries({ queryKey: ['admin-malls'] });
            setTimeout(() => setSaved(false), 2200);
        },
    });

    const generateQrMutation = useMutation({
        mutationFn: async () => {
            const res = await api.post(`/admin/malls/${id}/generate-qr`);
            return res.data;
        },
        onSuccess: () => {
            setQrGenerated(true);
            queryClient.invalidateQueries({ queryKey: ['admin-mall-theme', id] });
            setTimeout(() => setQrGenerated(false), 3000);
        },
    });

    const backendPresets = data?.predefined_themes || predefinedThemes;
    const mall = data?.mall;
    const mallList = Array.isArray(malls) ? malls : malls?.data || [];
    const cssVars = useMemo(() => themeToCssVars(theme), [theme]);

    const setThemeValue = (key, value) => {
        setTheme((current) => ({ ...current, [key]: value }));
        setSaved(false);
    };

    const applyAdjustment = (key, value) => {
        const amount = Number(value);
        setColorAdjustments((current) => ({ ...current, [key]: amount }));
        setTheme((current) => ({ ...current, [key]: shiftColor(current[key], amount) }));
    };

    const applyPreset = (preset) => {
        setTheme({ ...defaultTheme, ...preset });
        setColorAdjustments({});
        setSaved(false);
    };

    if (isLoading) {
        return (
            <div className="py-24 flex justify-center">
                <Loader2 className="w-10 h-10 animate-spin text-blue-400" />
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-12">
            <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-right">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="badge badge-blue">Mall Appearance & Theme Settings</span>
                        <Palette className="w-6 h-6 text-blue-400" />
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold">إعدادات الهوية البصرية</h1>
                    <p className="text-gray-500 text-sm mt-1">{mall?.name_ar || mall?.name_en} - تخصيص ألوان وتجربة المول</p>
                </div>
                <button onClick={() => navigate('/admin/malls')} className="btn-secondary !rounded-2xl !py-3">
                    <ArrowRight className="w-4 h-4" />
                    رجوع للمولات
                </button>
            </header>

            <div className="grid xl:grid-cols-[360px_1fr] gap-6">
                <aside className="space-y-5">
                    <div className="glass-card rounded-3xl p-5 space-y-4">
                        <label className="text-sm font-bold text-gray-300">اختيار مول</label>
                        <select
                            value={id}
                            onChange={(e) => navigate(`/admin/malls/${e.target.value}/theme`)}
                            className="input-field bg-[#0f0f1a]"
                        >
                            {mallList.map((item) => (
                                <option key={item.id} value={item.id}>{item.name_ar || item.name_en}</option>
                            ))}
                        </select>
                    </div>

                    <div className="glass-card rounded-3xl p-5 space-y-4">
                        <h2 className="font-bold flex items-center gap-2">
                            رمز QR للمول
                            <QrCode className="w-4 h-4 text-emerald-400" />
                        </h2>
                        {mall?.qr_code_path ? (
                            <div className="space-y-3">
                                <div className="bg-white p-4 rounded-2xl flex items-center justify-center">
                                    <img
                                        src={`/storage/${mall.qr_code_path}`}
                                        alt="Mall QR Code"
                                        className="w-32 h-32 object-contain"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <a
                                        href={`/storage/${mall.qr_code_path}`}
                                        download={`mall-${mall.slug}-qr.png`}
                                        className="flex-1 py-2.5 rounded-xl bg-blue-500/10 text-blue-300 font-bold text-sm flex items-center justify-center gap-2 hover:bg-blue-500/20 transition-all border border-blue-500/15"
                                    >
                                        <Download className="w-4 h-4" />
                                        تحميل QR
                                    </a>
                                    <button
                                        onClick={() => {
                                            const url = window.location.origin + '/mall/' + mall.slug;
                                            navigator.clipboard.writeText(url);
                                        }}
                                        className="flex-1 py-2.5 rounded-xl bg-emerald-500/10 text-emerald-300 font-bold text-sm flex items-center justify-center gap-2 hover:bg-emerald-500/20 transition-all border border-emerald-500/15"
                                    >
                                        <Share2 className="w-4 h-4" />
                                        نسخ الرابط
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={() => {
                                    if (window.confirm('هل أنت متأكد من توليد رمز QR جديد للمول؟')) {
                                        generateQrMutation.mutate();
                                    }
                                }}
                                disabled={generateQrMutation.isPending}
                                className="w-full py-3 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 font-bold text-sm flex items-center justify-center gap-2 transition-all border border-emerald-500/15 disabled:opacity-50"
                            >
                                {generateQrMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
                                {qrGenerated ? 'تم توليد QR بنجاح!' : 'توليد رمز QR للمول'}
                            </button>
                        )}
                    </div>

                    <div className="glass-card rounded-3xl p-5 space-y-3">
                        <h2 className="font-bold flex items-center gap-2">
                            ثيمات جاهزة
                            <Palette className="w-4 h-4 text-blue-400" />
                        </h2>
                        <div className="grid gap-3">
                            {Object.entries(backendPresets).map(([key, preset]) => (
                                <button
                                    key={key}
                                    onClick={() => applyPreset(preset)}
                                    className="rounded-2xl border border-white/8 bg-white/4 hover:bg-white/8 p-3 text-right transition-all"
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex gap-1">
                                            {[preset.primary_color, preset.secondary_color, preset.accent_color].map((color) => (
                                                <span key={color} className="w-5 h-5 rounded-full border border-white/20" style={{ backgroundColor: color }} />
                                            ))}
                                        </div>
                                        <span className="font-bold text-sm">{preset.name}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="glass-card rounded-3xl p-5 space-y-4">
                        <h2 className="font-bold flex items-center gap-2">
                            إعدادات متقدمة
                            <SlidersHorizontal className="w-4 h-4 text-emerald-400" />
                        </h2>

                        <label className="flex items-center justify-between rounded-2xl bg-white/5 p-3">
                            <input
                                type="checkbox"
                                checked={Boolean(theme.dark_mode)}
                                onChange={(e) => setThemeValue('dark_mode', e.target.checked)}
                                className="w-5 h-5 accent-blue-500"
                            />
                            <span className="font-bold text-sm">Dark Mode</span>
                        </label>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-300">Font Family</label>
                            <select value={theme.font_family || ''} onChange={(e) => setThemeValue('font_family', e.target.value)} className="input-field bg-[#0f0f1a]">
                                {fontOptions.map((font) => <option key={font} value={font}>{font}</option>)}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-300">Border Radius</label>
                            <div className="grid grid-cols-3 gap-2">
                                {radiusOptions.map((option) => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => setThemeValue('border_radius', option.value)}
                                        className={`py-2 rounded-xl text-xs font-bold border ${theme.border_radius === option.value ? 'border-blue-400 bg-blue-500/15 text-blue-300' : 'border-white/8 bg-white/4 text-gray-400'}`}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </aside>

                <main className="grid lg:grid-cols-2 gap-6">
                    <section className="glass-card rounded-3xl p-5 sm:p-6 space-y-5">
                        <h2 className="text-xl font-extrabold text-right">Custom Theme Builder</h2>
                        {colorFields.map((field) => (
                            <div key={field.key} className="rounded-2xl bg-white/4 border border-white/6 p-4 space-y-3">
                                <div className="flex items-center justify-between gap-4">
                                    <input
                                        type="text"
                                        value={theme[field.key]}
                                        onChange={(e) => setThemeValue(field.key, e.target.value)}
                                        className="w-28 bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm font-mono text-right"
                                    />
                                    <label className="font-bold text-sm">{field.label}</label>
                                </div>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="color"
                                        value={theme[field.key]}
                                        onChange={(e) => setThemeValue(field.key, e.target.value)}
                                        className="w-14 h-10 rounded-xl bg-transparent"
                                    />
                                    <input
                                        type="range"
                                        min="-18"
                                        max="18"
                                        value={colorAdjustments[field.key] || 0}
                                        onChange={(e) => applyAdjustment(field.key, e.target.value)}
                                        className="flex-1 accent-blue-500"
                                    />
                                </div>
                            </div>
                        ))}

                        {saveMutation.error && (
                            <div className="rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 p-3 text-sm text-right">
                                تعذر حفظ الثيم. تأكد من القيم وحاول مرة أخرى.
                            </div>
                        )}

                        <button
                            onClick={() => saveMutation.mutate()}
                            disabled={saveMutation.isPending}
                            className="btn-primary w-full !rounded-2xl !py-4"
                        >
                            {saveMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : saved ? <Check className="w-5 h-5" /> : <Save className="w-5 h-5" />}
                            {saved ? 'تم الحفظ وتطبيق الثيم' : 'حفظ الثيم'}
                        </button>
                    </section>

                    <section className="space-y-4">
                        <div className="flex items-center gap-2">
                            <span className="font-bold">Live Preview</span>
                            <Eye className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div className="mall-theme-scope rounded-3xl overflow-hidden border border-white/10 min-h-[620px]" style={cssVars}>
                            <div className="h-44 relative" style={{ background: `linear-gradient(135deg, ${theme.primary_color}, ${theme.accent_color})` }}>
                                <div className="absolute inset-0 bg-black/10" />
                                <div className="absolute bottom-5 right-5 left-5 flex items-end gap-4">
                                    <div className="w-20 h-20 rounded-2xl bg-white/90 flex items-center justify-center shadow-2xl" style={{ borderRadius: 'var(--theme-radius)' }}>
                                        <Palette className="w-9 h-9" style={{ color: theme.primary_color }} />
                                    </div>
                                    <div className="text-right">
                                        <h3 className="text-2xl font-extrabold">{mall?.name_ar || 'Mall Brand'}</h3>
                                        <p className="text-sm opacity-80">واجهة مول مخصصة بهوية مستقلة</p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-5 space-y-5">
                                <div className="theme-card p-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <button className="theme-primary px-5 py-3 font-bold" style={{ borderRadius: 'var(--theme-radius)' }}>
                                            ابدأ التسوق
                                        </button>
                                        <div className="text-right">
                                            <p className="font-bold">قسم العروض</p>
                                            <p className="text-sm opacity-70">تجربة ألوان النصوص والخلفية</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid sm:grid-cols-2 gap-3">
                                    {[1, 2].map((item) => (
                                        <div key={item} className="theme-card p-4 space-y-3">
                                            <div className="h-24 rounded-2xl" style={{ background: item === 1 ? theme.primary_color : theme.accent_color, borderRadius: 'var(--theme-radius)' }} />
                                            <div className="text-right">
                                                <h4 className="font-bold">منتج مميز</h4>
                                                <p className="theme-accent-text font-extrabold">₪ 49.90</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="theme-card p-4">
                                    <input
                                        readOnly
                                        value="بحث داخل المول..."
                                        className="w-full bg-white/10 border theme-primary-border px-4 py-3 outline-none"
                                        style={{ borderRadius: 'var(--theme-radius)', color: theme.text_color }}
                                    />
                                </div>
                            </div>
                        </div>
                    </section>
                </main>
            </div>
        </div>
    );
};

export default AdminMallThemeSettings;
