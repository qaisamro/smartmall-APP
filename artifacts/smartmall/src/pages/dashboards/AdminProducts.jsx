import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import useAuthStore from '../../store/useAuthStore';
// v2: تصدير محدث يشمل القسم الرئيسي/الفرعي وتاريخ التحديث - 2026-08-28
import { Package, Search, Building2, Trash2, Loader2, AlertTriangle, X, FileSpreadsheet, Barcode, Download, Plus, Edit, MapPin, Warehouse, ScanBarcode, CheckCircle2, XCircle } from 'lucide-react';
import QRScanner from '../../components/QRScanner';

const emptyForm = { name_ar: '', price: '', category_id: '', section_id: '', barcode: '', link_photo: '', stock_quantity: '', shelf_location: '' };

const AdminProducts = () => {
    const { user } = useAuthStore();
    const queryClient = useQueryClient();
    const [selectedMallId, setSelectedMallId] = useState('');
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [page, setPage] = useState(1);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [editProduct, setEditProduct] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [formError, setFormError] = useState('');
    const [scanOpen, setScanOpen] = useState(false);
    const [scanTarget, setScanTarget] = useState('main');
    const [lastScannedCode, setLastScannedCode] = useState('');
    const [subBarcodes, setSubBarcodes] = useState([]);
    const [subInput, setSubInput] = useState('');

    React.useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1);
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    const { data: malls } = useQuery({
        queryKey: ['admin-malls-products'],
        queryFn: async () => (await api.get('/admin/malls')).data,
    });

    const mallsList = useMemo(() => {
        const raw = Array.isArray(malls) ? malls : malls?.data || [];
        return raw;
    }, [malls]);

    const { data: categories = [] } = useQuery({
        queryKey: ['admin-categories', selectedMallId],
        enabled: !!selectedMallId,
        queryFn: async () => (await api.get('/admin/categories', { params: { mall_id: selectedMallId } })).data,
    });

    const { data: sections = [] } = useQuery({
        queryKey: ['admin-sections'],
        queryFn: async () => (await api.get('/sections')).data,
    });

    const { data: productsData, isLoading } = useQuery({
        queryKey: ['admin-products', selectedMallId, debouncedSearch, page],
        queryFn: async () => (await api.get('/admin/products', {
            params: { mall_id: selectedMallId || undefined, search: debouncedSearch || undefined, page }
        })).data,
        enabled: !!selectedMallId,
    });

    const products = productsData?.data || [];
    const pagination = productsData || {};

    const downloadTemplate = (type) => {
        const headers = type === 'sub'
            ? ['sub_barcode', 'main_barcode']
            : ['barcode', 'name', 'selling_price', 'unit'];
        const filename = type === 'sub' ? 'smartmall-sub-barcodes-template.xls' : 'smartmall-products-template.xls';
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Worksheet ss:Name="Sheet1">
  <Table>
   <Row>${headers.map(h => `<Cell><Data ss:Type="String">${h}</Data></Cell>`).join('')}</Row>
  </Table>
 </Worksheet>
</Workbook>`;
        const blob = new Blob([xml], { type: 'application/vnd.ms-excel' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
        window.URL.revokeObjectURL(url);
    };

    const exportExcel = async () => {
        try {
            const params = {};
            if (selectedMallId) params.mall_id = selectedMallId;
            if (debouncedSearch) params.search = debouncedSearch;
            const res = await api.get('/admin/products/export', { params, responseType: 'blob' });
            // اسم الملف من السيرفر: المول_التاريخ_الوقت.xlsx — يظهر بالعربية كما هو
            let filename = 'products-export.xlsx';
            const disposition = res.headers?.['content-disposition'] || res.headers?.['Content-Disposition'];
            if (disposition) {
                // أولوية لـ filename*=UTF-8'' (الاسم العربي الحقيقي)، ثم fallback لـ filename العادي
                const utf8Match = disposition.match(/filename\*=UTF-8''([^;\n]+)/i);
                if (utf8Match && utf8Match[1]) {
                    try { filename = decodeURIComponent(utf8Match[1].replace(/"/g, '').trim()); } catch { filename = utf8Match[1].replace(/"/g, '').trim(); }
                } else {
                    const match = disposition.match(/filename="?([^";\n]+)"?/i);
                    if (match && match[1]) {
                        try { filename = decodeURIComponent(match[1].replace(/"/g, '').trim()); } catch { filename = match[1].replace(/"/g, '').trim(); }
                    }
                }
            }
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
            window.URL.revokeObjectURL(url);
        } catch (e) {
            console.error('Export failed', e);
        }
    };

    const closeModal = () => { setShowModal(false); setEditProduct(null); setForm(emptyForm); setFormError(''); setScanOpen(false); setScanTarget('main'); setLastScannedCode(''); setSubBarcodes([]); setSubInput(''); };

    const openCreate = () => { setForm({ ...emptyForm, mall_id: selectedMallId }); setFormError(''); setScanOpen(false); setScanTarget('main'); setLastScannedCode(''); setSubBarcodes([]); setSubInput(''); setShowModal(true); };

    const openScan = (target) => {
        setScanTarget(target || 'main');
        setLastScannedCode('');
        setScanOpen(true);
    };

    const handleBarcodeScan = async (code) => {
        if (!code || !selectedMallId) return;
        setLastScannedCode(code);
        const target = scanTarget;
        setScanOpen(false);
        if (target === 'sub') {
            setSubBarcodes(list => list.includes(code) ? list : [...list, code]);
            return;
        }
        setForm(f => ({ ...f, barcode: code }));
        try {
            const res = await api.get('/admin/products/lookup', { params: { mall_id: selectedMallId, barcode: code } });
            if (res.data?.found && res.data.data) {
                const d = res.data.data;
                setForm(f => ({
                    ...f,
                    barcode: d.barcode || code,
                    name_ar: d.name_ar || f.name_ar,
                    price: d.price != null ? String(d.price) : f.price,
                    category_id: d.category_id ? String(d.category_id) : f.category_id,
                    section_id: d.section_id ? String(d.section_id) : f.section_id,
                    link_photo: d.link_photo || f.link_photo,
                }));
            }
        } catch (e) {
            console.error('Lookup failed', e);
        }
    };

    const addSubBarcode = (code) => {
        const normalized = (code || '').trim();
        if (!normalized) return;
        setSubBarcodes(list => list.includes(normalized) ? list : [...list, normalized]);
    };

    const openEdit = (prod) => {
        setEditProduct(prod);
        setForm({
            name_ar: prod.name_ar || '',
            price: prod.price || '',
            category_id: prod.category_id?.toString() || '',
            section_id: prod.section_id?.toString() || '',
            barcode: prod.barcode || '',
            link_photo: prod.link_photo || '',
            stock_quantity: prod.stock_quantity?.toString() || '',
            shelf_location: prod.shelf_location || '',
            mall_id: selectedMallId,
        });
        setFormError(''); setShowModal(true);
    };

    const createMutation = useMutation({
        mutationFn: (data) => {
            const payloads = Array.isArray(data) ? data : [data];
            return Promise.all(payloads.map(p => api.post('/admin/products', p)));
        },
        onSuccess: () => { queryClient.invalidateQueries(['admin-products', selectedMallId, debouncedSearch, page]); closeModal(); },
        onError: (err) => setFormError(err.response?.data?.message || 'فشل إضافة المنتج'),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => api.put(`/admin/products/${id}`, data),
        onSuccess: () => { queryClient.invalidateQueries(['admin-products', selectedMallId, debouncedSearch, page]); closeModal(); },
        onError: (err) => setFormError(err.response?.data?.message || 'فشل تحديث المنتج'),
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => api.delete(`/admin/products/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries(['admin-products', selectedMallId, debouncedSearch, page]);
            setDeleteTarget(null);
        },
    });

    const handleSubmit = (e) => {
        e.preventDefault(); setFormError('');
        if (saving) return;
        const payload = {
            ...form, name_en: form.name_ar, mall_id: Number(selectedMallId), price: Number(form.price)
        };
        if (form.category_id) payload.category_id = Number(form.category_id);
        if (form.section_id) payload.section_id = Number(form.section_id);
        if (form.stock_quantity) payload.stock_quantity = Number(form.stock_quantity);
        if (editProduct) {
            updateMutation.mutate({ id: editProduct.id, data: payload });
        } else if (subBarcodes.length > 0) {
            const mainCode = (form.barcode || '').trim();
            const unique = [...new Set(subBarcodes.map(c => String(c).trim()).filter(c => c && c !== mainCode))];
            const payloads = [payload, ...unique.map(code => ({ ...payload, barcode: code }))];
            createMutation.mutate(payloads);
        } else {
            createMutation.mutate(payload);
        }
    };

    const saving = createMutation.isPending || updateMutation.isPending;

    return (
        <div className="space-y-8 pb-10">
            <header className="text-right">
                <h2 className="text-2xl sm:text-3xl font-extrabold flex items-center gap-3 justify-start">
                    <Package className="w-8 h-8 text-indigo-400" />
                    إدارة المنتجات
                    {pagination.total > 0 && (
                        <span className="bg-indigo-500/20 text-indigo-400 text-base py-1 px-4 rounded-2xl border border-indigo-500/20 font-mono">
                            {pagination.total}
                        </span>
                    )}
                </h2>
                <p className="text-gray-400 mt-1">إدارة منتجات جميع المنشآت مع إضافة وتعديل وحذف</p>
            </header>

            {/* Filters */}
            <div className="glass-card rounded-3xl p-6 border border-white/5 space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                        <input type="text" placeholder="بحث بالاسم أو الباركود..."
                            value={search} onChange={e => setSearch(e.target.value)}
                            className="input-field !pr-10 w-full" />
                    </div>
                    <div className="w-full sm:w-72 relative">
                        <Building2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
                        <select value={selectedMallId} onChange={e => { setSelectedMallId(e.target.value); setPage(1); }}
                            className="input-field !pr-10 w-full appearance-none">
                            <option value="">-- اختر منشأة --</option>
                            {mallsList.map(m => (
                                <option key={m.id} value={m.id}>{m.name_ar}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {selectedMallId && (
                    <div className="flex items-center gap-3 pt-2 border-t border-white/5">
                        <button onClick={openCreate}
                            className="btn-primary !py-1.5 !px-3 flex items-center gap-1.5 text-xs">
                            <Plus className="w-3.5 h-3.5" /> إضافة منتج
                        </button>
                        <span className="text-xs text-gray-500 shrink-0 mr-2">تحميل القوالب:</span>
                        <button onClick={() => downloadTemplate('main')}
                            className="btn-outline !py-1.5 !px-3 flex items-center gap-1.5 text-xs">
                            <FileSpreadsheet className="w-3.5 h-3.5" /> منتجات أساسية
                        </button>
                        <button onClick={() => downloadTemplate('sub')}
                            className="btn-outline !py-1.5 !px-3 flex items-center gap-1.5 text-xs">
                            <Barcode className="w-3.5 h-3.5" /> باركودات فرعية
                        </button>
                        <div className="mr-auto" />
                        <button onClick={exportExcel}
                            className="btn-primary !py-1.5 !px-3 flex items-center gap-1.5 text-xs">
                            <Download className="w-3.5 h-3.5" /> تصدير إكسل
                        </button>
                    </div>
                )}
            </div>

            {/* Products Table */}
            {selectedMallId && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    className="glass-card rounded-3xl p-6 border border-white/5">
                    {isLoading ? (
                        <div className="flex justify-center py-12"><Loader2 className="animate-spin w-6 h-6 text-gray-400" /></div>
                    ) : products.length === 0 ? (
                        <p className="text-gray-500 text-sm text-center py-8">
                            {debouncedSearch ? 'لا توجد نتائج للبحث' : 'لا توجد منتجات في هذه المنشأة'}
                        </p>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full text-right text-sm">
                                    <thead>
                                        <tr className="border-b border-white/5 text-gray-500 text-xs">
                                            <th className="py-3 px-3 font-medium">المنتج</th>
                                            <th className="py-3 px-3 font-medium">الباركود</th>
                                            <th className="py-3 px-3 font-medium text-center">السعر</th>
                                            <th className="py-3 px-3 font-medium text-center">الكمية</th>
                                            <th className="py-3 px-3 font-medium text-center">المنشأة</th>
                                            <th className="py-3 px-3 font-medium text-center"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {products.map(product => (
                                            <tr key={product.id} className="border-b border-white/[0.02] hover:bg-white/[0.02] transition-colors">
                                                <td className="py-3 px-3">
                                                    <p className="text-white text-sm font-bold">{product.name_ar}</p>
                                                    {product.name_en && <p className="text-gray-500 text-[10px]">{product.name_en}</p>}
                                                </td>
                                                <td className="py-3 px-3">
                                                    <span className="font-mono text-xs text-gray-300">{product.barcode || '—'}</span>
                                                </td>
                                                <td className="py-3 px-3 text-center font-bold text-emerald-400">{Number(product.price).toFixed(2)}</td>
                                                <td className="py-3 px-3 text-center">
                                                    <span className={`text-xs font-bold ${product.stock_quantity > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                        {product.stock_quantity ?? '—'}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-3 text-center text-xs text-gray-400">{product.mall?.name_ar || '—'}</td>
                                                <td className="py-3 px-3 text-center flex items-center justify-center gap-1">
                                                    <button onClick={() => openEdit(product)}
                                                        className="p-2 rounded-xl hover:bg-blue-500/10 text-gray-500 hover:text-blue-400 transition-all"
                                                        title="تعديل">
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => setDeleteTarget(product)}
                                                        className="p-2 rounded-xl hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-all"
                                                        title="حذف">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {pagination.last_page > 1 && (
                                <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-white/5">
                                    <button onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                        className="px-4 py-2 rounded-xl bg-white/5 disabled:opacity-30 hover:bg-white/10 transition-all text-sm">
                                        السابق
                                    </button>
                                    <span className="text-sm text-gray-400">صفحة {page} من {pagination.last_page}</span>
                                    <button onClick={() => setPage(p => Math.min(pagination.last_page, p + 1))}
                                        disabled={page === pagination.last_page}
                                        className="px-4 py-2 rounded-xl bg-white/5 disabled:opacity-30 hover:bg-white/10 transition-all text-sm">
                                        التالي
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </motion.div>
            )}

            {/* Add/Edit Modal */}
            <AnimatePresence>
                {showModal && (
                    <div className="fixed inset-0 z-[110] flex items-start justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto"
                        onClick={closeModal}>
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                            className="w-full max-w-xl glass-dark p-6 sm:p-8 rounded-[2rem] border border-white/10 relative my-auto"
                            onClick={e => e.stopPropagation()}>
                            <button onClick={closeModal} className="absolute top-6 left-6 p-2 rounded-full hover:bg-white/10 transition-colors">
                                <X className="w-5 h-5 text-gray-400" />
                            </button>

                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 flex items-center justify-center">
                                    {editProduct ? <Edit className="w-6 h-6 text-indigo-400" /> : <Plus className="w-6 h-6 text-indigo-400" />}
                                </div>
                                <div>
                                    <h3 className="text-2xl font-bold">{editProduct ? 'تعديل المنتج' : 'إضافة منتج جديد'}</h3>
                                    <p className="text-gray-500 text-sm">{editProduct ? 'تعديل بيانات المنتج' : 'إضافة منتج للمنشأة'}</p>
                                </div>
                            </div>

                            {formError && (
                                <div className="mb-5 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm text-right">
                                    {formError}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-5" onClick={e => e.stopPropagation()}>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-400 mb-1.5">اسم المنتج</label>
                                    <input type="text" required value={form.name_ar} onChange={e => setForm({ ...form, name_ar: e.target.value })} className="input-field text-right" placeholder="اسم المنتج بالعربية" />
                                </div>

                                <div className="grid sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-400 mb-1.5">السعر</label>
                                        <input type="number" min="0" step="0.01" required value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} className="input-field text-right font-mono" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-400 mb-1.5">الباركود</label>
                                        <div className="relative">
                                            <input type="text" value={form.barcode} onChange={e => setForm({ ...form, barcode: e.target.value })} className="input-field text-right font-mono !pr-10" placeholder="اتركه فارغاً لإنشاء تلقائي" />
                                            <button type="button" onClick={() => openScan('main')}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-400 transition-colors" title="مسح الباركود بالكاميرا">
                                                <ScanBarcode className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {scanOpen && (
                                    <div>
                                        <div className="h-48 overflow-hidden rounded-2xl border border-white/10 bg-black">
                                            <QRScanner onResult={handleBarcodeScan} onClose={() => setScanOpen(false)} variant="inline"
                                                lastScannedCode={lastScannedCode} />
                                        </div>
                                        {lastScannedCode && (
                                            <p className="mt-2 text-xs text-gray-400 flex items-center gap-1.5" dir="ltr">
                                                <Barcode className="w-3.5 h-3.5 text-emerald-400" />
                                                <span className="text-emerald-400 font-mono">{lastScannedCode}</span>
                                                <span className="text-gray-500 mr-auto">
                                                    {scanTarget === 'sub' ? 'تمت إضافة الكود إلى الباركودات الفرعية' : 'تم قراءة الباركود — تم تعبئة الاسم والسعر تلقائياً إن وجد في ملف المنشأة'}
                                                </span>
                                            </p>
                                        )}
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs font-semibold text-gray-400 mb-1.5">باركودات فرعية (كل كود يُنشأ منتجاً بنفس الاسم والسعر)</label>
                                    <div className="flex flex-wrap gap-2">
                                        <input type="text" value={subInput || ''}
                                            onChange={e => { setSubInput(e.target.value); }}
                                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSubBarcode(subInput); setSubInput(''); } }}
                                            className="input-field text-right font-mono !pr-3 flex-1 min-w-[140px]" placeholder="أدخل كود فرعي ثم Enter..."
                                            disabled={!!editProduct} dir="ltr" />
                                        <button type="button" onClick={() => openScan('sub')}
                                            disabled={!!editProduct}
                                            className="btn-outline !py-2 !px-4 flex items-center gap-1.5 text-xs disabled:opacity-40" title="مسح باركود فرعي بالكاميرا">
                                            <ScanBarcode className="w-3.5 h-3.5" /> مسح بالكاميرا
                                        </button>
                                        <button type="button" onClick={() => { addSubBarcode(subInput); setSubInput(''); }}
                                            disabled={editProduct || !subInput?.trim()}
                                            className="btn-outline !py-2 !px-4 flex items-center gap-1.5 text-xs disabled:opacity-40">
                                            <Plus className="w-3.5 h-3.5" /> إضافة
                                        </button>
                                        {subBarcodes.length > 0 && (
                                            <div className="flex flex-col gap-1.5 w-full">
                                                {subBarcodes.map(code => (
                                                    <div key={code} className="flex items-center justify-between gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
                                                        <span className="font-mono text-xs text-emerald-300" dir="ltr">{code}</span>
                                                        <button type="button" onClick={() => setSubBarcodes(list => list.filter(c => c !== code))}
                                                            className="p-1 rounded-lg hover:bg-red-500/15 text-gray-500 hover:text-red-400 transition-colors">
                                                            <X className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="grid sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-400 mb-1.5">القسم</label>
                                        <select value={form.section_id} onChange={e => setForm({ ...form, section_id: e.target.value })} className="input-field text-right">
                                            <option value="">-- اختر القسم --</option>
                                            {sections.map(s => <option key={s.id} value={s.id}>{s.name_ar}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-400 mb-1.5">التصنيف</label>
                                        <select value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })} className="input-field text-right">
                                            <option value="">-- اختر التصنيف --</option>
                                            {categories.map(c => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-400 mb-1.5">رابط الصورة</label>
                                    <input type="text" value={form.link_photo} onChange={e => setForm({ ...form, link_photo: e.target.value })} className="input-field text-left font-mono text-xs" dir="ltr" placeholder="https://example.com/image.jpg" />
                                </div>

                                <div className="grid sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-400 mb-1.5">الكمية</label>
                                        <input type="number" min="0" value={form.stock_quantity} onChange={e => setForm({ ...form, stock_quantity: e.target.value })} className="input-field text-right font-mono" placeholder="0" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-400 mb-1.5">مكان الرف</label>
                                        <div className="relative">
                                            <input type="text" value={form.shelf_location} onChange={e => setForm({ ...form, shelf_location: e.target.value })} className="input-field !pr-10" placeholder="مثال: رف A1" />
                                            <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                        </div>
                                    </div>
                                </div>

                                <button type="submit" disabled={saving} className="btn-primary w-full !py-4 flex items-center justify-center gap-2">
                                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : editProduct ? 'حفظ التعديلات' : 'إضافة المنتج'}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Delete Confirmation Modal */}
            {deleteTarget && (
                <div className="fixed inset-0 z-[110] flex items-start justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto"
                    onClick={() => setDeleteTarget(null)}>
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 0.95 }}
                        className="w-full max-w-md glass-dark p-6 sm:p-8 rounded-[2rem] border border-white/10 relative my-auto"
                        onClick={e => e.stopPropagation()}>
                        <button onClick={() => setDeleteTarget(null)} className="absolute top-6 left-6 p-2 rounded-full hover:bg-white/10 transition-colors">
                            <X className="w-5 h-5 text-gray-400" />
                        </button>
                        <div className="flex flex-col items-center text-center space-y-6">
                            <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20">
                                <AlertTriangle className="w-10 h-10 text-red-400" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-2xl font-bold text-white">تأكيد حذف المنتج</h3>
                                <p className="text-gray-400 text-sm">
                                    هل أنت متأكد من حذف المنتج<br />
                                    <span className="text-red-400 font-bold">{deleteTarget.name_ar}</span>؟
                                </p>
                                <p className="text-gray-500 text-xs">هذا الإجراء لا يمكن التراجع عنه</p>
                            </div>
                            <div className="flex items-center gap-3 w-full">
                                <button onClick={() => setDeleteTarget(null)}
                                    disabled={deleteMutation.isPending}
                                    className="flex-1 py-3 rounded-xl bg-white/5 text-gray-300 hover:bg-white/10 transition-all font-bold border border-white/8 disabled:opacity-50">
                                    إلغاء
                                </button>
                                <button onClick={() => deleteMutation.mutate(deleteTarget.id)}
                                    disabled={deleteMutation.isPending}
                                    className="flex-1 py-3 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-all font-bold disabled:opacity-50 flex items-center justify-center gap-2">
                                    {deleteMutation.isPending ? (
                                        <><Loader2 className="w-4 h-4 animate-spin" /> جاري الحذف...</>
                                    ) : (
                                        <><Trash2 className="w-4 h-4" /> نعم، احذف</>
                                    )}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default AdminProducts;
