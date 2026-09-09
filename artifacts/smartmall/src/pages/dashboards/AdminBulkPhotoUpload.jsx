import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import { Upload, Search, Image, Barcode, Loader2, ChevronLeft, ChevronRight, FileSpreadsheet, CheckCircle, XCircle, X, Edit, Trash2, RefreshCw, Printer, ZoomIn, AlertCircle, Download, ScanBarcode } from 'lucide-react';
import QRScanner from '../../components/QRScanner';

const storageUrl = (path) => {
    if (!path) return '';
    if (/^https?:\/\//.test(path)) return path;
    if (path.startsWith('/storage/')) return path;
    return `/storage/${path}`;
};

const PER_PAGE = 20;

const AdminBulkPhotoUpload = () => {
    const queryClient = useQueryClient();
    const [file, setFile] = useState(null);
    const [showUploadForm, setShowUploadForm] = useState(false);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [page, setPage] = useState(1);
    const [pageInput, setPageInput] = useState('1');
    const [editRowId, setEditRowId] = useState(null);
    const [editForm, setEditForm] = useState({});
    const [zoomImage, setZoomImage] = useState(null);
    const [scanOpen, setScanOpen] = useState(false);
    const [scanning, setScanning] = useState(false);
    const [lookedRow, setLookedRow] = useState(null);
    const [lastScannedCode, setLastScannedCode] = useState('');
    const [notFoundName, setNotFoundName] = useState('');
    const [lookupLoading, setLookupLoading] = useState(false);

    const { data: mismatchReport = [], refetch: refetchReport } = useQuery({
        queryKey: ['missing-image-report'],
        queryFn: async () => {
            const res = await api.get('/admin/products/bulk-update-photos/missing-report');
            return res.data?.data || [];
        },
        staleTime: 0,
    });

    // One-time migration: upload any legacy localStorage records to the DB (old app version saved locally)
    useEffect(() => {
        let legacy;
        try {
            legacy = JSON.parse(localStorage.getItem('bulk-photo-missing-report') || '[]');
        } catch (e) {
            legacy = [];
        }
        if (!Array.isArray(legacy) || legacy.length === 0) return;
        const upload = async () => {
            for (const item of legacy) {
                try {
                    await api.post('/admin/products/bulk-update-photos/missing-report', {
                        barcode: item.barcode,
                        name: item.name,
                        type: item.type,
                    });
                } catch (e) { /* duplicate or network — skip */ }
            }
            try { localStorage.removeItem('bulk-photo-missing-report'); } catch (e) { }
            queryClient.invalidateQueries(['missing-image-report']);
        };
        upload();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    const { data: resultsData, isLoading, refetch } = useQuery({
        queryKey: ['bulk-photo-results', debouncedSearch, page],
        queryFn: async () => {
            const res = await api.get('/admin/products/bulk-update-photos/results', {
                params: { search: debouncedSearch || undefined, page }
            });
            return res.data;
        },
        staleTime: 0,
    });

    const results = resultsData?.data || [];
    const uploadedFileName = resultsData?.file_name || '';
    const errorsList = resultsData?.errors || [];
    const total = resultsData?.total || 0;
    const totalPages = resultsData?.last_page || 1;
    const safePage = Math.min(page, totalPages);

    useEffect(() => { setPageInput(String(safePage)); }, [safePage]);

    const { data: sections = [] } = useQuery({
        queryKey: ['admin-sections-upload'],
        queryFn: async () => (await api.get('/admin/sections')).data,
    });

    const uploadMutation = useMutation({
        mutationFn: async (formData) => {
            const res = await api.post('/admin/products/bulk-update-photos', formData);
            return res.data;
        },
        onSuccess: () => {
            setShowUploadForm(false);
            setFile(null);
            setPage(1);
            setSearch('');
            setDebouncedSearch('');
            queryClient.invalidateQueries(['bulk-photo-results']);
        },
    });

    const updateRowMutation = useMutation({
        mutationFn: ({ id, data }) => api.put(`/admin/products/bulk-update-photos/rows/${id}`, data),
        onSuccess: () => {
            setEditRowId(null);
            setEditForm({});
            queryClient.invalidateQueries(['bulk-photo-results']);
        },
        onError: (err) => alert(err.response?.data?.message || 'فشل التحديث'),
    });

    const deleteRowMutation = useMutation({
        mutationFn: (id) => api.delete(`/admin/products/bulk-update-photos/rows/${id}`),
        onSuccess: () => queryClient.invalidateQueries(['bulk-photo-results']),
    });

    const addReportMutation = useMutation({
        mutationFn: (payload) => api.post('/admin/products/bulk-update-photos/missing-report', payload),
        onSuccess: () => queryClient.invalidateQueries(['missing-image-report']),
        onError: (err) => alert(err.response?.data?.message || 'فشل الحفظ في التقرير'),
    });

    const deleteReportRowMutation = useMutation({
        mutationFn: (id) => api.delete(`/admin/products/bulk-update-photos/missing-report/${id}`),
        onSuccess: () => queryClient.invalidateQueries(['missing-image-report']),
    });

    const clearReportMutation = useMutation({
        mutationFn: () => api.delete('/admin/products/bulk-update-photos/missing-report'),
        onSuccess: () => queryClient.invalidateQueries(['missing-image-report']),
    });

    const handleUpload = (e) => {
        e.preventDefault();
        if (!file) return;
        const formData = new FormData();
        formData.append('file', file);
        uploadMutation.mutate(formData);
    };

    const startEdit = (item) => {
        setEditRowId(item.id);
        setEditForm({ barcode: item.barcode || '', link_photo: item.link_photo || '', section_id: item.section_id?.toString() || '' });
    };

    const saveEdit = () => {
        updateRowMutation.mutate({
            id: editRowId,
            data: {
                barcode: editForm.barcode,
                link_photo: editForm.link_photo,
                section_id: editForm.section_id ? Number(editForm.section_id) : null,
            },
        });
    };

    const handleDelete = (item) => {
        if (!window.confirm(`حذف الصف ${item.barcode}؟`)) return;
        deleteRowMutation.mutate(item.id);
    };

    const exportExcel = async () => {
        try {
            const res = await api.get('/admin/products/bulk-update-photos/export', { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const a = document.createElement('a'); a.href = url; a.download = 'bulk-photo-template.xlsx'; a.click();
            window.URL.revokeObjectURL(url);
        } catch (e) {
            alert('فشل التصدير');
            console.error('Export failed', e);
        }
    };

    const printReport = () => {
        const w = window.open('', '_blank', 'width=900,height=700');
        if (!w) return;
        const rowsHtml = resultsData?.data?.map(item => `
            <tr>
                <td>${item.barcode || '-'}</td>
                <td>${item.product_name || '-'}</td>
                <td>${item.mall_name || '-'}</td>
                <td>${item.section_name || item.section_id || '-'}</td>
                <td>${item.status === 'updated' ? 'تم التحديث في كل المولات' : item.status === 'override' ? 'محفوظ للمستقبل (لا يطابق حالياً)' : 'تم التجاهل'}</td>
            </tr>
        `).join('') || '';

        const errorsHtml = (resultsData?.errors || []).map(e => `<li>${e}</li>`).join('') || '<li>لا توجد أخطاء</li>';

        w.document.write(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="utf-8">
            <title>تقرير تحديث صور وأقسام المنتجات</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 30px; color: #111; }
                h1 { font-size: 20px; margin-bottom: 5px; }
                .meta { color: #555; font-size: 13px; margin-bottom: 20px; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
                th, td { border: 1px solid #ccc; padding: 7px 10px; font-size: 13px; text-align: right; }
                th { background: #f0f0f0; }
                h2 { font-size: 16px; margin: 20px 0 10px; }
                ul { margin: 0; padding-right: 20px; font-size: 13px; }
                li { margin-bottom: 3px; }
            </style></head><body>
            <h1>تقرير تحديث صور وأقسام المنتجات</h1>
            <div class="meta">اسم الملف: ${uploadedFileName || '-'}</div>
            <div class="meta">تاريخ التقرير: ${new Date().toLocaleString('ar-SA')}</div>
            <div class="meta">إجمالي المنتجات: ${total} — تم التحديث: ${resultsData?.updated || 0} — تم التجاهل: ${resultsData?.skipped || 0}</div>
            <h2>المنتجات</h2>
            <table><thead><tr><th>الباركود</th><th>المنتج</th><th>المول</th><th>القسم</th><th>الحالة</th></tr></thead><tbody>${rowsHtml}</tbody></table>
            <h2>الأخطاء</h2>
            <ul>${errorsHtml}</ul>
            <script>window.onload = function(){ window.print(); }<\/script>
        </body></html>`);
        w.document.close();
    };

    const handleBarcodeScan = async (code) => {
        if (lookupLoading || !code) return;
        setLastScannedCode(code);
        setLookedRow(null);
        setNotFoundName('');
        setScanning(true);
        setLookupLoading(true);
        try {
            const res = await api.get('/admin/products/bulk-update-photos/lookup', { params: { barcode: code } });
            setLookedRow(res.data?.found ? res.data.data : null);
        } catch (e) {
            setLookedRow(null);
        } finally {
            setLookupLoading(false);
            setScanning(false);
        }
    };

    const addMismatchRow = () => {
        if (!notFoundName.trim() || !lastScannedCode) return;
        addReportMutation.mutate({ barcode: lastScannedCode, name: notFoundName.trim(), type: 'غير موجود في الملف' });
        setNotFoundName('');
        setLookedRow(null);
        setLastScannedCode('');
    };

    const addNoImageRow = () => {
        if (!lookedRow) return;
        const name = lookedRow.product_name || lookedRow.barcode || 'بدون اسم';
        addReportMutation.mutate({ barcode: lookedRow.barcode, name, type: 'لا توجد صورة' });
        setLookedRow(null);
        setLastScannedCode('');
    };

    const clearMismatchReport = () => {
        if (!window.confirm('حذف جميع السجلات من التقرير؟')) return;
        clearReportMutation.mutate();
    };

    const printMismatchReport = () => {
        if (mismatchReport.length === 0) { alert('لا توجد باركودات مسجلة'); return; }
        const w = window.open('', '_blank', 'width=800,height=600');
        if (!w) return;
        const rowsHtml = mismatchReport.map(item => `
            <tr>
                <td>${item.barcode}</td>
                <td>${item.name}</td>
                <td>${item.type || '-'}</td>
            </tr>
        `).join('') || '';
        w.document.write(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="utf-8">
            <title>تقرير المنتجات بدون صورة</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 30px; color: #111; }
                h1 { font-size: 20px; margin-bottom: 5px; }
                .meta { color: #555; font-size: 13px; margin-bottom: 20px; }
                table { width: 100%; border-collapse: collapse; }
                th, td { border: 1px solid #ccc; padding: 7px 10px; font-size: 13px; text-align: right; }
                th { background: #f0f0f0; }
            </style></head><body>
            <h1>تقرير المنتجات بدون صورة</h1>
            <div class="meta">تاريخ التقرير: ${new Date().toLocaleString('ar-SA')} — عدد السجلات: ${mismatchReport.length}</div>
            <table><thead><tr><th>الباركود</th><th>اسم المنتج</th><th>الحالة</th></tr></thead><tbody>${rowsHtml}</tbody></table>
            <script>window.onload = function(){ window.print(); }<\/script>
        </body></html>`);
        w.document.close();
    };

    return (
        <div className="space-y-6 pb-10">
            <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-right">
                <div>
                    <h2 className="text-2xl sm:text-3xl font-extrabold flex items-center gap-3">
                        <Image className="w-8 h-8 text-blue-400" />
                        تحديث صور وأقسام المنتجات
                    </h2>
                    <p className="text-gray-400 mt-1">رفع ملف Excel يحتوي على barcode, link_photo, section_id — يُطبَّق على كل المنتجات بنفس الباركود في جميع المولات</p>
                </div>
                <div className="flex items-center gap-2">
                    {uploadedFileName && (
                        <>
                            <button onClick={exportExcel} className="btn-outline !py-2 !px-3 text-sm flex items-center gap-1.5">
                                <Download className="w-4 h-4" /> تصدير Excel
                            </button>
                            <button onClick={printReport} className="btn-outline !py-2 !px-3 text-sm flex items-center gap-1.5">
                                <Printer className="w-4 h-4" /> طباعة التقرير
                            </button>
                        </>
                    )}
                    <button onClick={() => setScanOpen(true)} className="btn-outline !py-2 !px-3 text-sm flex items-center gap-1.5 text-emerald-300 border-emerald-400/30 hover:bg-emerald-500/10">
                        <ScanBarcode className="w-4 h-4" /> مسح بالكاميرا
                    </button>
                    <button onClick={() => refetch()} className="btn-outline !py-2 !px-3 text-sm flex items-center gap-1.5">
                        <RefreshCw className="w-4 h-4" /> تحديث
                    </button>
                    <button onClick={() => setShowUploadForm(true)} className="btn-primary !py-2 !px-3 text-sm flex items-center gap-1.5">
                        <Upload className="w-4 h-4" /> رفع ملف جديد
                    </button>
                </div>
            </header>

            {showUploadForm && (
                <div className="glass-card rounded-[2rem] p-6 sm:p-8 text-right space-y-6 relative">
                    <button onClick={() => { setShowUploadForm(false); setFile(null); }}
                        className="absolute top-4 left-4 p-2 rounded-full hover:bg-white/10 transition-colors">
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                    <div className="flex items-center gap-3">
                        <FileSpreadsheet className="w-10 h-10 text-emerald-400" />
                        <div>
                            <h3 className="font-bold text-lg">رفع ملف Excel</h3>
                            <p className="text-gray-400 text-sm">الأعمدة المطلوبة: barcode, link_photo, section_id</p>
                        </div>
                    </div>
                    <form onSubmit={handleUpload} className="space-y-5">
                        <div className="border-2 border-dashed border-gray-600 rounded-2xl p-8 text-center hover:border-blue-500 transition-colors">
                            <input type="file" accept=".xlsx,.xls,.csv"
                                onChange={(e) => setFile(e.target.files[0])}
                                className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-blue-500/10 file:text-blue-400 hover:file:bg-blue-500/20" />
                            <p className="text-gray-500 text-sm mt-2">Excel أو CSV - 30MB كحد أقصى</p>
                        </div>
                        <button type="submit" disabled={!file || uploadMutation.isPending}
                            className="btn-primary w-full !py-4 flex items-center justify-center gap-2">
                            {uploadMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                            {uploadMutation.isPending ? 'جاري الرفع والمعالجة...' : 'رفع الملف وتحديث المنتجات'}
                        </button>
                    </form>
                    {uploadMutation.isError && (
                        <div className="rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 p-4 text-sm">
                            {uploadMutation.error?.response?.data?.message || 'فشل الرفع'}
                        </div>
                    )}
                </div>
            )}

            {/* Persistent summary + errors */}
            {uploadedFileName && (
                <div className="glass-card rounded-[2rem] p-5 border border-white/5 text-right space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <FileSpreadsheet className="w-8 h-8 text-emerald-400" />
                            <div>
                                <p className="text-sm text-gray-400">آخر ملف مرفوع</p>
                                <p className="font-bold text-white flex items-center gap-1">
                                    <Barcode className="w-4 h-4 text-blue-400" /> {uploadedFileName}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                            <span className="text-emerald-400 font-bold">تم التحديث: {resultsData?.updated || 0}</span>
                            <span className="text-amber-400 font-bold">تم التجاهل: {resultsData?.skipped || 0}</span>
                            <span className="text-gray-400">الإجمالي: {total}</span>
                        </div>
                    </div>
                    {errorsList.length > 0 && (
                        <div className="rounded-2xl p-4 bg-yellow-500/5 border border-yellow-500/15">
                            <details open>
                                <summary className="cursor-pointer font-bold text-yellow-300 text-sm flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4" /> عرض الأخطاء ({errorsList.length})
                                </summary>
                                <ul className="mt-3 space-y-1 list-disc list-inside text-yellow-200/70 text-xs max-h-40 overflow-y-auto">
                                    {errorsList.map((err, i) => <li key={i}>{err}</li>)}
                                </ul>
                            </details>
                        </div>
                    )}
                </div>
            )}

            {/* Shared missing-photo report (stored in DB — visible to all admins on any device) */}
            <div className="glass-card rounded-[2rem] p-5 border border-amber-400/20 text-right space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <AlertCircle className="w-8 h-8 text-amber-400" />
                        <div>
                            <p className="font-bold text-white flex items-center gap-2">
                                تقرير المنتجات بدون صورة
                                {mismatchReport.length > 0 && (
                                    <span className="bg-amber-500/20 text-amber-300 rounded-full px-2.5 py-0.5 text-xs font-bold">
                                        {mismatchReport.length}
                                    </span>
                                )}
                            </p>
                            <p className="text-gray-400 text-sm mt-0.5">محفوظ في قاعدة البيانات — يظهر لجميع الأدمنز على أي جهاز</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={printMismatchReport} disabled={mismatchReport.length === 0}
                            className="btn-primary !py-2 !px-3 text-sm flex items-center gap-1.5 disabled:opacity-40">
                            <Printer className="w-4 h-4" /> طباعة التقرير PDF
                        </button>
                        <button onClick={clearMismatchReport} disabled={mismatchReport.length === 0}
                            className="btn-outline !py-2 !px-3 text-sm flex items-center gap-1.5 !text-red-400 !border-red-400/30 disabled:opacity-40">
                            <Trash2 className="w-4 h-4" /> مسح الكل
                        </button>
                    </div>
                </div>
                {mismatchReport.length === 0 ? (
                    <div className="rounded-2xl bg-white/5 border border-white/5 p-4 text-center text-gray-500 text-sm">
                        لا توجد سجلات محفوظة بعد — امسح الباركود وستُحفظ المنتجات التي لا توجد لها صورة هنا تلقائياً
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-white/5 text-gray-400">
                                    <th className="py-2 px-2 text-right">الباركود</th>
                                    <th className="py-2 px-2 text-right">اسم المنتج</th>
                                    <th className="py-2 px-2 text-right">الحالة</th>
                                    <th className="py-2 px-2 text-center"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {mismatchReport.map((item, i) => (
                                    <tr key={i} className="border-b border-white/5">
                                        <td className="py-2 px-2 font-mono text-xs" dir="ltr">{item.barcode}</td>
                                        <td className="py-2 px-2">{item.name}</td>
                                        <td className="py-2 px-2">
                                            <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold ${item.type === 'لا توجد صورة' ? 'bg-amber-500/10 text-amber-300' : 'bg-red-500/10 text-red-300'}`}>
                                                {item.type || 'غير موجود'}
                                            </span>
                                        </td>
                                        <td className="py-2 px-2 text-center">
                                            <button onClick={() => deleteReportRowMutation.mutate(item.id)}
                                                className="text-red-400 hover:text-red-300 transition-colors p-1">
                                                <X className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className="glass-card rounded-[2rem] p-6 text-right space-y-5">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                        <h3 className="font-bold text-lg flex items-center gap-2">
                            <Barcode className="w-5 h-5 text-blue-400" />
                            النتائج
                            <span className="text-sm text-gray-400 font-normal">({total} منتج)</span>
                        </h3>
                    </div>
                    <div className="relative">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                            placeholder="بحث بالباركود..."
                            className="input-field pr-10 py-2 text-sm w-56" />
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
                    </div>
                ) : results.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">لا توجد بيانات — ارفع ملف Excel أولاً</div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-white/5 text-gray-400">
                                        <th className="py-3 px-2 text-right">الصورة</th>
                                        <th className="py-3 px-2 text-right">الباركود</th>
                                        <th className="py-3 px-2 text-right">المنتج</th>
                                        <th className="py-3 px-2 text-right">المولات المطابقة</th>
                                        <th className="py-3 px-2 text-right">القسم</th>
                                        <th className="py-3 px-2 text-center">الحالة</th>
                                        <th className="py-3 px-2 text-center"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {results.map((item) => {
                                        const isEditing = editRowId === item.id;
                                        return (
                                            <tr key={item.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                                {isEditing ? (
                                                    <>
                                                        <td className="py-3 px-2">
                                                            {editForm.link_photo ? (
                                                                <img src={storageUrl(editForm.link_photo)} alt=""
                                                                    className="w-14 h-14 rounded-xl object-cover border border-white/10 cursor-pointer"
                                                                    onClick={() => setZoomImage(editForm.link_photo)} />
                                                            ) : (
                                                                <div className="w-14 h-14 rounded-xl bg-gray-800 flex items-center justify-center text-gray-500">
                                                                    <Image className="w-5 h-5" />
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="py-3 px-2">
                                                            <input type="text" value={editForm.barcode}
                                                                onChange={e => setEditForm({ ...editForm, barcode: e.target.value })}
                                                                className="input-field text-xs font-mono w-32" />
                                                        </td>
                                                        <td className="py-3 px-2 text-sm">{item.product_name || '-'}</td>
                                                        <td className="py-3 px-2 text-sm text-gray-400">{item.mall_name || '-'}</td>
                                                        <td className="py-3 px-2">
                                                            <select value={editForm.section_id || ''}
                                                                onChange={e => setEditForm({ ...editForm, section_id: e.target.value })}
                                                                className="input-field text-xs w-44">
                                                                <option value="">بدون قسم</option>
                                                                {sections.map(s => (
                                                                    <option key={s.id} value={s.id}>{s.id} - {s.name_ar}</option>
                                                                ))}
                                                            </select>
                                                        </td>
                                                        <td className="py-3 px-2 text-center">
                                                            <input type="text" value={editForm.link_photo}
                                                                onChange={e => setEditForm({ ...editForm, link_photo: e.target.value })}
                                                                className="input-field text-xs font-mono w-40" dir="ltr" placeholder="رابط الصورة" />
                                                        </td>
                                                        <td className="py-3 px-2 text-center">
                                                            <div className="flex items-center justify-center gap-1">
                                                                <button onClick={saveEdit}
                                                                    disabled={updateRowMutation.isPending}
                                                                    className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20" title="حفظ">
                                                                    <CheckCircle className="w-4 h-4" />
                                                                </button>
                                                                <button onClick={() => { setEditRowId(null); setEditForm({}); }}
                                                                    className="p-1.5 rounded-lg bg-white/5 text-gray-400 hover:bg-white/10" title="إلغاء">
                                                                    <X className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </>
                                                ) : (
                                                    <>
                                                        <td className="py-3 px-2">
                                                            {item.link_photo ? (
                                                                <div className="relative group">
                                                                    <img src={storageUrl(item.link_photo)} alt="product"
                                                                        className="w-14 h-14 rounded-xl object-cover border border-white/10 cursor-pointer"
                                                                        onClick={() => setZoomImage(item.link_photo)} />
                                                                    <div className="absolute inset-0 rounded-xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                                                        <ZoomIn className="w-5 h-5 text-white" />
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="w-14 h-14 rounded-xl bg-gray-800 flex items-center justify-center text-gray-500">
                                                                    <Image className="w-5 h-5" />
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="py-3 px-2 font-mono text-xs dir-ltr text-left">{item.barcode}</td>
                                                        <td className="py-3 px-2 text-sm">{item.product_name || '-'}</td>
                                                        <td className="py-3 px-2 text-sm text-gray-400">{item.mall_name || '-'}</td>
                                                        <td className="py-3 px-2">
                                                            <span className="bg-white/5 px-3 py-1 rounded-lg text-xs font-bold">
                                                                {item.section_name || item.section_id || '-'}
                                                            </span>
                                                        </td>
                                                        <td className="py-3 px-2 text-center">
                                                            {item.status === 'updated' ? (
                                                                <span title="تم تطبيقه على كل المولات المطابقة"><CheckCircle className="w-5 h-5 text-emerald-400 inline" /></span>
                                                            ) : item.status === 'override' ? (
                                                                <span title="لا يطابق منتجات حالياً — سيُطبَّق تلقائياً على أي منتج بنفس الباركود في كل المولات"><Download className="w-5 h-5 text-blue-400 inline" /></span>
                                                            ) : (
                                                                <XCircle className="w-5 h-5 text-gray-500 inline" />
                                                            )}
                                                        </td>
                                                        <td className="py-3 px-2 text-center">
                                                            <div className="flex items-center justify-center gap-1">
                                                                <button onClick={() => startEdit(item)}
                                                                    className="p-1.5 rounded-lg hover:bg-blue-500/10 text-gray-400 hover:text-blue-400" title="تعديل">
                                                                    <Edit className="w-4 h-4" />
                                                                </button>
                                                                <button onClick={() => handleDelete(item)}
                                                                    className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-400" title="حذف">
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </>
                                                )}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex items-center justify-center gap-3 mt-4 pt-4 border-t border-white/5 flex-wrap">
                            <button onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={safePage === 1}
                                className="btn-secondary !py-2 !px-4 text-sm disabled:opacity-30">
                                <ChevronRight className="w-4 h-4 inline" /> السابق
                            </button>
                            <span className="text-sm text-gray-400 flex items-center gap-1.5">
                                صفحة
                                <input
                                    type="number"
                                    min={1}
                                    max={totalPages}
                                    value={pageInput}
                                    onChange={(e) => setPageInput(e.target.value)}
                                    onBlur={() => {
                                        const v = parseInt(pageInput, 10);
                                        if (!isNaN(v)) setPage(Math.min(Math.max(1, v), totalPages));
                                        else setPageInput(String(safePage));
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            const v = parseInt(pageInput, 10);
                                            if (!isNaN(v)) setPage(Math.min(Math.max(1, v), totalPages));
                                            e.currentTarget.blur();
                                        }
                                    }}
                                    className="w-16 text-center bg-white/5 border border-white/10 rounded-lg py-1.5 text-sm text-white focus:outline-none focus:border-blue-500/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                                من {totalPages}
                            </span>
                            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={safePage === totalPages}
                                className="btn-secondary !py-2 !px-4 text-sm disabled:opacity-30">
                                التالي <ChevronLeft className="w-4 h-4 inline" />
                            </button>
                        </div>
                    </>
                )}
            </div>

            {/* Barcode scanner modal */}
            {scanOpen && (
                <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm"
                    onClick={() => { setScanOpen(false); setLookedRow(null); setScanning(false); setLastScannedCode(''); setNotFoundName(''); }}>
                    <div className="glass-card rounded-[2rem] p-6 sm:p-8 w-full max-w-lg text-right space-y-5 relative max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => { setScanOpen(false); setLookedRow(null); setScanning(false); setLastScannedCode(''); setNotFoundName(''); }}
                            className="absolute top-4 left-4 p-2 rounded-full hover:bg-white/10 transition-colors">
                            <X className="w-5 h-5 text-gray-400" />
                        </button>
                        <div className="flex items-center gap-3">
                            <ScanBarcode className="w-8 h-8 text-emerald-400" />
                            <div>
                                <h3 className="font-bold text-lg">مسح الباركود بالكاميرا</h3>
                                <p className="text-gray-400 text-sm">امسح الباركود — إذا كان موجوداً في الملف المرفوع سيتم عرض صورته وتفاصيله</p>
                            </div>
                        </div>

                        <div className="relative bg-black rounded-2xl overflow-hidden aspect-square border-2 border-emerald-400/30">
                            {scanning ? (
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70 z-[2]">
                                    <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
                                    <p className="text-sm text-gray-300">جاري البحث عن الباركود في الملف المرفوع...</p>
                                </div>
                            ) : lastScannedCode && !lookupLoading ? (
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center p-5">
                                    {lookedRow ? (
                                        <CheckCircle className="w-12 h-12 text-emerald-400" />
                                    ) : (
                                        <XCircle className="w-12 h-12 text-red-400" />
                                    )}
                                    <p className={`font-bold ${lookedRow ? 'text-emerald-300' : 'text-red-300'}`}>
                                        {lookedRow ? 'تم العثور على الباركود' : 'الباركود غير موجود في الملف المرفوع'}
                                    </p>
                                    <p className="text-gray-400 text-sm font-mono" dir="ltr">{lastScannedCode}</p>
                                    <button onClick={() => { setLastScannedCode(''); setLookedRow(null); setNotFoundName(''); }}
                                        className="w-full max-w-[220px] py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-bold text-sm text-white transition-all">
                                        مسح باركود آخر
                                    </button>
                                </div>
                            ) : (
                                <QRScanner onResult={handleBarcodeScan} onClose={() => setScanOpen(false)} variant="inline"
                                    lastScannedCode={lastScannedCode} />
                            )}
                        </div>

                        {lookedRow && (
                            <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/5 p-4 space-y-3">
                                <div className="flex items-start gap-4">
                                    {lookedRow.link_photo ? (
                                        <img src={storageUrl(lookedRow.link_photo)} alt=""
                                            className="w-20 h-20 rounded-xl object-cover border border-white/10 cursor-pointer"
                                            onClick={() => setZoomImage(lookedRow.link_photo)} />
                                    ) : (
                                        <div className="w-20 h-20 rounded-xl bg-gray-800 flex items-center justify-center text-gray-500">
                                            <Image className="w-7 h-7" />
                                        </div>
                                    )}
                                    <div className="text-sm space-y-1.5">
                                        <p className="text-gray-400">المنتج: <span className="font-bold text-white">{lookedRow.product_name || '-'}</span></p>
                                        <p className="text-gray-400">المولات: <span className="text-white">{lookedRow.mall_name || '-'}</span></p>
                                        <p className="text-gray-400">القسم: <span className="text-white">{lookedRow.section_name || lookedRow.section_id || '-'}</span></p>
                                        <p className="text-xs text-gray-500">
                                            {lookedRow.status === 'updated' ? 'تم التحديث في كل المولات' : lookedRow.status === 'override' ? 'محفوظ للمستقبل (لا يطابق حالياً)' : 'تم التجاهل'}
                                        </p>
                                        {!lookedRow.link_photo && (
                                            <button onClick={addNoImageRow}
                                                className="mt-2 py-2 px-4 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-300 hover:bg-amber-500/30 font-bold text-xs transition-all flex items-center gap-1.5">
                                                <Printer className="w-4 h-4" /> حفظ بالتقرير (لا توجد صورة)
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {lastScannedCode && lookedRow === null && !scanning && !lookupLoading && (
                            <div className="rounded-2xl border border-red-400/30 bg-red-500/5 p-4 space-y-3">
                                <p className="text-gray-300 text-sm">لم نعثر على الباركود <span className="font-mono text-white" dir="ltr">{lastScannedCode}</span> في الملف المرفوع — أدخل اسم المنتج لحفظه في التقرير:</p>
                                <div className="flex gap-2">
                                    <input type="text" value={notFoundName} onChange={(e) => setNotFoundName(e.target.value)}
                                        placeholder="اسم المنتج"
                                        className="input-field py-2 text-sm flex-1" />
                                    <button onClick={addMismatchRow} disabled={!notFoundName.trim()}
                                        className="btn-primary !py-2 !px-4 text-sm whitespace-nowrap disabled:opacity-40">
                                        حفظ للتقرير
                                    </button>
                                </div>
                            </div>
                        )}

                        {mismatchReport.length > 0 && (
                            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <p className="font-bold text-sm">سجل الباركود غير الموجودة ({mismatchReport.length})</p>
                                    <button onClick={printMismatchReport} className="btn-outline !py-1.5 !px-3 text-xs flex items-center gap-1.5">
                                        <Printer className="w-4 h-4" /> طباعة التقرير PDF
                                    </button>
                                </div>
                                <ul className="space-y-1.5 max-h-40 overflow-y-auto text-sm">
                                    {mismatchReport.map((item, i) => (
                                        <li key={i} className="flex items-center justify-between gap-3 text-gray-300">
                                            <span className="font-mono text-xs" dir="ltr">{item.barcode}</span>
                                            <span>{item.name}</span>
                                            <button onClick={() => deleteReportRowMutation.mutate(item.id)}
                                                className="text-red-400 hover:text-red-300 transition-colors">
                                                <X className="w-4 h-4" />
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Image zoom modal */}
            {zoomImage && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm"
                    onClick={() => setZoomImage(null)}>
                    <button className="absolute top-5 left-5 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
                        <X className="w-6 h-6 text-white" />
                    </button>
                    <img src={storageUrl(zoomImage)} alt="zoom"
                        className="max-w-full max-h-[90vh] object-contain rounded-2xl"
                        onClick={(e) => e.stopPropagation()} />
                </div>
            )}
        </div>
    );
};

export default AdminBulkPhotoUpload;
