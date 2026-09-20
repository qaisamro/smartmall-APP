import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import { Settings, Save, MapPin, Image as ImageIcon, Loader2, Store, QrCode } from 'lucide-react';

const storageUrl = (path, timestamp = 0) => {
    if (!path) return '';
    if (path instanceof File) return URL.createObjectURL(path);
    if (/^https?:\/\//.test(path) || path.startsWith('/')) {
        // Add timestamp to break cache for server images
        if (timestamp > 0 && !path.startsWith('blob:')) {
            return `${path}${path.includes('?') ? '&' : '?'}v=${timestamp}`;
        }
        return path;
    }
    const url = `/storage/${path}`;
    // Add timestamp to break cache
    return timestamp > 0 ? `${url}?v=${timestamp}` : url;
};

const OwnerSettings = () => {
    const queryClient = useQueryClient();
    const [selectedMallId, setSelectedMallId] = useState('');
    const [formData, setFormData] = useState({});
    const [coverKey, setCoverKey] = useState(0); // Forces image re-render after save

    const { data: malls, isLoading: loadingMalls } = useQuery({
        queryKey: ['owner-malls'],
        queryFn: async () => {
            const res = await api.get('/owner/my-malls');
            if (res.data?.length > 0) {
                const m = res.data[0];
                setSelectedMallId(m.id);
                setFormData({
                    name_ar: m.name_ar || '',
                    name_en: m.name_en || '',
                    slug: m.slug || '',
                    description: m.description || '',
                    location_arabic: m.location_arabic || '',
                    qr_code_path: m.qr_code_path || '',
                    cover_image: m.cover_image || '',
                    logo: m.logo || '',
                });
            }
            return res.data;
        }
    });

    const activeMall = malls?.find(m => m.id == selectedMallId);

    const updateMallMutation = useMutation({
        mutationFn: async (payload) => {
            // Using POST with _method=PUT to allow file uploads in Laravel
            return await api.post(`/owner/malls/${selectedMallId}`, payload);
        },
        onError: (err) => {
            const errors = err.response?.data?.errors;
            if (errors) {
                alert('حدثت مشكلة في البيانات:\n' + Object.values(errors).flat().join('\n'));
            } else {
                alert('فشل الدخول، جرب لاحقاً');
            }
        },
        onSuccess: (res) => {
            const m = res.data;
            // Use the server-returned path so the image updates immediately
            setFormData({
                name_ar: m.name_ar || '',
                name_en: m.name_en || '',
                slug: m.slug || '',
                description: m.description || '',
                location_arabic: m.location_arabic || '',
                qr_code_path: m.qr_code_path || '',
                cover_image: m.cover_image || '',
                logo: m.logo || '',
            });
            setCoverKey(k => k + 1); // Force image tag to re-render
            queryClient.invalidateQueries(['owner-malls']);
            alert('تم حفظ البيانات بنجاح! ✅');
        }
    });

    const handleSave = (e) => {
        e.preventDefault();
        if (!selectedMallId) return;

        const payload = new FormData();
        payload.append('_method', 'PUT');
        if (formData.name_ar) payload.append('name_ar', formData.name_ar);
        if (formData.slug) payload.append('slug', formData.slug);
        if (formData.description) payload.append('description', formData.description);
        payload.append('location_arabic', formData.location_arabic || '');
        if (formData.cover_image instanceof File) {
            payload.append('cover_image', formData.cover_image);
        }

        updateMallMutation.mutate(payload);
    };

    if (loadingMalls) return <div className="text-center py-20"><Loader2 className="w-10 h-10 animate-spin text-blue-500 mx-auto" /></div>;
    if (!malls || malls.length === 0) return <div className="text-center py-20 text-gray-500">لا يوجد لديك أي مول معين حالياً.</div>;

    const coverUrl = storageUrl(formData.cover_image, coverKey);

    return (
        <div className="space-y-8 pb-10">
            <header className="flex items-center gap-4 text-right">
                <div>
                    <h2 className="text-2xl sm:text-3xl font-extrabold flex items-center gap-3">
                        <Settings className="w-8 h-8 text-blue-400" />
                        إعدادات وهوية المول
                    </h2>
                    <p className="text-gray-400 mt-1">قم بتخصيص بيانات المول وصورة الغلاف</p>
                </div>
            </header>

            <div className="grid xl:grid-cols-3 gap-6">

                {/* Form Content */}
                <div className="xl:col-span-2 glass-card rounded-[2rem] p-6 sm:p-8 text-right space-y-6">
                    {malls.length > 1 && (
                        <div>
                            <label className="block text-sm font-semibold text-gray-400 mb-2">اختر المول</label>
                            <select
                                value={selectedMallId}
                                onChange={(e) => {
                                    const m = malls.find(x => x.id == e.target.value);
                                    setSelectedMallId(m.id);
                                    setFormData({ ...m });
                                }}
                                className="input-field bg-gray-900 appearance-none"
                            >
                                {malls.map(m => <option key={m.id} value={m.id}>{m.name_ar}</option>)}
                            </select>
                        </div>
                    )}

                    <form onSubmit={handleSave} className="space-y-5">
                        <div className="grid sm:grid-cols-2 gap-5">
                            <div>
                                <label className="block text-sm font-semibold text-gray-400 mb-2">اسم المول (عربي)</label>
                                <input type="text" value={formData.name_ar || ''} onChange={e => setFormData({ ...formData, name_ar: e.target.value })} className="input-field" placeholder="اسم المول..." required />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-400 mb-2">المميز (Slug - الرابط القصير)</label>
                                <input type="text" value={formData.slug || ''} onChange={e => setFormData({ ...formData, slug: e.target.value })} className="input-field dir-ltr text-right" placeholder="my-mall" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-400 mb-2">موقع المول بالتحديد</label>
                            <div className="relative group">
                                <MapPin className="absolute right-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-500" />
                                <input
                                    type="text"
                                    value={formData.location_arabic || ''}
                                    onChange={e => setFormData({ ...formData, location_arabic: e.target.value })}
                                    className="input-field pr-11"
                                    placeholder="مثال: رام الله - شارع الإرسال - قرب..."
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-400 mb-2">وصف المول للمتسوقين</label>
                            <textarea value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })} className="input-field h-24 custom-scrollbar" placeholder="نبذة تعريفية تعرض في صفحة المول..."></textarea>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-400 mb-2">صورة الغلاف (Cover)</label>
                            <div className="relative group">
                                <ImageIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-500" />
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={e => setFormData({ ...formData, cover_image: e.target.files[0] })}
                                    className="input-field pr-11 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                />
                            </div>
                            {typeof formData.cover_image === 'string' && formData.cover_image && (
                                <p className="text-xs text-blue-400 mt-2">يوجد صورة غلاف مرفوعة مسبقاً.</p>
                            )}
                            {coverUrl && (
                                <img
                                    key={coverKey}
                                    src={coverUrl}
                                    alt="صورة الغلاف"
                                    className="mt-3 h-36 w-full rounded-2xl object-cover border border-white/10"
                                    onError={(e) => {
                                        e.target.src = '/placeholder.webp';
                                    }}
                                />
                            )}
                        </div>

                        <button type="submit" disabled={updateMallMutation.isLoading} className="btn-primary w-full !py-4 mt-4 flex items-center justify-center gap-2">
                            {updateMallMutation.isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5" /> حفظ البيانات</>}
                        </button>
                    </form>
                </div>

                {/* QR Sidebar — يتم توليد QR فقط من لوحة الأدمن */}
                <div className="glass-card rounded-[2rem] p-6 text-center space-y-6 flex flex-col items-center">
                    <div className="w-16 h-16 rounded-2xl bg-gray-500/10 flex items-center justify-center border border-gray-500/20">
                        <QrCode className="w-8 h-8 text-gray-400" />
                    </div>
                    <div>
                        <h3 className="font-bold text-xl text-gray-400">رمز QR للمول</h3>
                        <p className="text-gray-500 text-sm mt-1">يمكن للإدارة فقط توليد رمز QR الخاص بالمول. تواصل مع الإدارة للحصول على الرمز.</p>
                    </div>
                    <div className="bg-white/5 p-2 rounded-2xl w-48 h-48 flex items-center justify-center border border-dashed border-gray-600">
                        <span className="text-gray-500 text-sm">متاح عبر الإدارة</span>
                    </div>
                    <div className="w-full pt-4 border-t border-white/5">
                        <span className="text-gray-500 text-sm block">رمز QR غير متاح للتوليد من هنا</span>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default OwnerSettings;
