import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit, Loader2, Package, Plus, ScanBarcode, Trash2, X, AlertCircle, MapPin, AlertTriangle, Warehouse, RefreshCcw, Download, FileSpreadsheet, XCircle, Check, FolderTree, ChevronUp, ChevronDown, ZoomIn, Milk, Coffee, Candy, Cookie, CookingPot, Snowflake, Beef, Croissant, SprayCan as Spray, Newspaper, Sparkles, Home, Cigarette } from 'lucide-react';
import api from '../../api/axios';
import QRScanner from '../../components/QRScanner';
import { Link, useSearchParams } from 'react-router-dom';

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

const emptyForm = { name_ar: '', price: '', category_id: '', section_id: '', mall_section_id: '', barcode: '', description_ar: '', shelf_location: '', link_photo: '', stock_quantity: '', min_stock_alert: '5' };

const OwnerProducts = () => {
    const queryClient = useQueryClient();
    const [searchParams, setSearchParams] = useSearchParams();
    const [showModal, setShowModal] = useState(false);
    const [scanMode, setScanMode] = useState(false);
    const [editProduct, setEditProduct] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [formError, setFormError] = useState('');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [activeSectionId, setActiveSectionId] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
    const [historyPage, setHistoryPage] = useState(1);
    const [activeImportId, setActiveImportId] = useState(null);
    const [inlineEditId, setInlineEditId] = useState(null);
    const [zoomProduct, setZoomProduct] = useState(null);
    const [inlineDraft, setInlineDraft] = useState({ name_ar: '', price: '', barcode: '' });
    const [inlineError, setInlineError] = useState('');
    const productsTopRef = useRef(null);

    const scrollToProducts = () => {
        productsTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1);
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    useEffect(() => {
        scrollToProducts();
    }, [page]);

    // Auto-open add product modal from barcode scanner
    useEffect(() => {
        const barcode = searchParams.get('barcode');
        if (barcode) {
            setForm({ ...emptyForm, barcode });
            setShowModal(true);
            setSearchParams({}, { replace: true });
        }
    }, []);

    const { data: mallsData = [] } = useQuery({
        queryKey: ['owner-malls'],
        queryFn: async () => (await api.get('/owner/my-malls')).data
    });

    const ownerMallId = mallsData?.[0]?.id;
    const enableQuantitySystem = mallsData?.[0]?.enable_quantity_system;

    const fieldNames = { name_ar: 'اسم المنتج (عربي)', name_en: 'اسم المنتج (إنجليزي)', price: 'السعر', barcode: 'الباركود', stock_quantity: 'الكمية', min_stock_alert: 'حد التنبيه', mall_id: 'المتجر', category_id: 'القسم', mall_section_id: 'القسم', sku: 'SKU', brand: 'العلامة التجارية' };
    const getErrorMessage = (error) => {
        const data = error?.response?.data;
        if (data?.errors) {
            const firstKey = Object.keys(data.errors)[0];
            const firstVal = data.errors[firstKey]?.[0];
            const label = fieldNames[firstKey] || firstKey;
            return `${label}: ${firstVal}`;
        }
        return data?.message || 'تعذر حفظ المنتج. تأكد من الحقول وحاول مرة أخرى.';
    };

    const { data: productsData, isLoading } = useQuery({
        queryKey: ['owner-products', ownerMallId, activeSectionId, debouncedSearch, page],
        queryFn: async () => {
            const params = { search: debouncedSearch, page };
            if (ownerMallId) params.mall_id = ownerMallId;
            if (activeSectionId !== '') params.mall_section_id = activeSectionId;
            return (await api.get('/owner/products', { params })).data;
        }
    });

    const products = productsData?.data || [];
    const pagination = productsData || {};

    const { data: categories = [], isLoading: categoriesLoading } = useQuery({
        queryKey: ['owner-categories', ownerMallId],
        enabled: Boolean(ownerMallId),
        queryFn: async () => (await api.get('/owner/categories', { params: { mall_id: ownerMallId } })).data
    });

    const { data: mallSectionsData = {}, isLoading: sectionsLoading } = useQuery({
        queryKey: ['owner-mall-sections', ownerMallId],
        enabled: Boolean(ownerMallId),
        queryFn: async () => (await api.get('/owner/sections', { params: { mall_id: ownerMallId } })).data
    });

    const mallSections = mallSectionsData.sections || [];
    const noSectionCount = mallSectionsData.no_section_count || 0;

    const selectSection = (id) => { setActiveSectionId(String(id)); setPage(1); };

    const reorderMutation = useMutation({
        mutationFn: (payload) => api.post('/owner/sections/reorder', payload),
        onSuccess: () => {
            queryClient.invalidateQueries(['owner-mall-sections']);
            queryClient.invalidateQueries(['mall-sections-tree']);
        },
        onError: (err) => alert(getErrorMessage(err))
    });

    const moveMain = (sec, dir) => {
        const idx = mallSections.findIndex(s => s.id === sec.id);
        const j = idx + dir;
        if (idx < 0 || j < 0 || j >= mallSections.length) return;
        const arr = [...mallSections];
        [arr[idx], arr[j]] = [arr[j], arr[idx]];
        reorderMutation.mutate({ mall_id: ownerMallId, order: arr.map(s => s.id) });
    };

    const moveChild = (parent, child, dir) => {
        const kids = [...(parent.children || [])];
        const idx = kids.findIndex(c => c.id === child.id);
        const j = idx + dir;
        if (idx < 0 || j < 0 || j >= kids.length) return;
        [kids[idx], kids[j]] = [kids[j], kids[idx]];
        reorderMutation.mutate({ mall_id: ownerMallId, children: { [parent.id]: kids.map(c => c.id) } });
    };

    const { data: importHistory, isLoading: historyLoading } = useQuery({
        queryKey: ['owner-import-history', historyPage],
        queryFn: async () => (await api.get('/owner/product-imports', { params: { page: historyPage } })).data
    });

    const historyList = importHistory?.data || [];

    const { data: activeImport } = useQuery({
        queryKey: ['owner-active-import', activeImportId],
        enabled: !!activeImportId,
        refetchInterval: (data) => {
            if (!data) return 3000;
            if (data.status === 'completed' || data.status === 'failed') {
                setTimeout(() => { setActiveImportId(null); queryClient.invalidateQueries(['owner-import-history']); queryClient.invalidateQueries(['owner-products']); }, 2000);
                return false;
            }
            return 3000;
        },
        queryFn: async () => (await api.get(`/owner/product-imports/${activeImportId}`)).data
    });

    const deleteImportMutation = useMutation({
        mutationFn: (id) => api.delete(`/owner/product-imports/${id}`),
        onSuccess: () => queryClient.invalidateQueries(['owner-import-history'])
    });

    const createMutation = useMutation({
        mutationFn: (data) => api.post('/owner/products', data),
        onSuccess: () => { queryClient.invalidateQueries(['owner-products']); closeModal(); },
        onError: (err) => setFormError(getErrorMessage(err))
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => api.delete(`/owner/products/${id}`),
        onSuccess: () => queryClient.invalidateQueries(['owner-products'])
    });

    const deleteAllMutation = useMutation({
        mutationFn: () => api.delete('/owner/products/delete-all'),
        onSuccess: () => {
            queryClient.invalidateQueries(['owner-products']);
            setShowDeleteAllConfirm(false);
        },
        onError: (err) => {
            setShowDeleteAllConfirm(false);
            alert(getErrorMessage(err) || 'فشل حذف المنتجات');
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => api.put(`/owner/products/${id}`, data),
        onSuccess: () => { queryClient.invalidateQueries(['owner-products']); closeModal(); },
        onError: (err) => setFormError(getErrorMessage(err))
    });

    const inlineUpdateMutation = useMutation({
        mutationFn: ({ id, data }) => api.put(`/owner/products/${id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries(['owner-products']);
            cancelInlineEdit();
        },
        onError: (err) => setInlineError(getErrorMessage(err))
    });

    const changeSectionMutation = useMutation({
        mutationFn: ({ id, mall_section_id }) => api.put(`/owner/products/${id}`, { mall_section_id }),
        onSuccess: () => queryClient.invalidateQueries(['owner-products']),
        onError: (err) => alert(getErrorMessage(err))
    });

    const prodMainId = (product) => {
        if (product.mall_section_id) {
            if (mallSections.some(s => s.id === product.mall_section_id)) return product.mall_section_id;
            const parent = mallSections.find(s => s.children?.some(c => c.id === product.mall_section_id));
            if (parent) return parent.id;
        }
        return null;
    };

    const prodChildId = (product) => {
        if (!product.mall_section_id) return null;
        const parent = mallSections.find(s => s.children?.some(c => c.id === product.mall_section_id));
        return parent ? product.mall_section_id : null;
    };

    const changeProductSection = (product, mainId, childId, parentMainId) => {
        const target = childId || mainId || parentMainId || null;
        changeSectionMutation.mutate({ id: product.id, mall_section_id: target });
    };

    const startInlineEdit = (product) => {
        setInlineEditId(product.id);
        setInlineDraft({ name_ar: product.name_ar || '', price: product.price?.toString() || '', barcode: product.barcode || '' });
        setInlineError('');
    };

    const cancelInlineEdit = () => {
        setInlineEditId(null);
        setInlineDraft({ name_ar: '', price: '', barcode: '' });
        setInlineError('');
    };

    const saveInlineEdit = (product) => {
        const name = inlineDraft.name_ar.trim();
        const price = parseFloat(inlineDraft.price);
        if (!name) { setInlineError('اسم المنتج مطلوب'); return; }
        if (isNaN(price) || price < 0) { setInlineError('السعر غير صحيح'); return; }
        inlineUpdateMutation.mutate({
            id: product.id,
            data: { name_ar: name, name_en: name, price, barcode: inlineDraft.barcode.trim(), mall_id: ownerMallId }
        });
    };

    const inlineKeyDown = (e, product) => {
        if (e.key === 'Enter') { e.preventDefault(); saveInlineEdit(product); }
        if (e.key === 'Escape') cancelInlineEdit();
    };

    const lookupBarcodeMutation = useMutation({
        mutationFn: (barcode) => api.get(`/owner/products/lookup-by-barcode/${encodeURIComponent(barcode)}`).then(r => r.data),
        onSuccess: (data) => {
            if (data.link_photo || data.section_id) {
                setForm(prev => ({
                    ...prev,
                    link_photo: data.link_photo || prev.link_photo,
                    section_id: data.section_id?.toString() || prev.section_id,
                    mall_section_id: data.mall_section_id?.toString() || prev.mall_section_id,
                }));
            }
        },
    });

    const closeModal = () => { setShowModal(false); setScanMode(false); setEditProduct(null); setForm(emptyForm); setFormError(''); };

    const openCreate = () => { setForm({ ...emptyForm }); setFormError(''); setShowModal(true); };

    const openEdit = (prod) => {
        setEditProduct(prod);
        setForm({
            name_ar: prod.name_ar || '',
            price: prod.price || '',
            category_id: prod.category_id?.toString() || '',
            section_id: prod.section_id?.toString() || '',
            mall_section_id: prod.mall_section_id?.toString() || '',
            barcode: prod.barcode || '', description_ar: prod.description_ar || '', shelf_location: prod.shelf_location || '', link_photo: prod.link_photo || '',
            stock_quantity: prod.stock_quantity?.toString() || '',
            min_stock_alert: prod.min_stock_alert?.toString() || '5'
        });
        setFormError(''); setShowModal(true);
    };

    const handleSubmit = (e) => {
        e.preventDefault(); setFormError('');
        const payload = { ...form, name_en: form.name_ar, mall_id: Number(ownerMallId), price: Number(form.price) };
        if (form.stock_quantity) payload.stock_quantity = Number(form.stock_quantity);
        if (form.min_stock_alert) payload.min_stock_alert = Number(form.min_stock_alert);
        if (form.category_id) payload.category_id = Number(form.category_id);
        if (form.section_id) payload.section_id = Number(form.section_id);
        if (form.mall_section_id) payload.mall_section_id = Number(form.mall_section_id);
        editProduct ? updateMutation.mutate({ id: editProduct.id, data: payload }) : createMutation.mutate(payload);
    };

    const handleScanResult = (barcode) => { setForm({ ...form, barcode }); setScanMode(false); };

    const handleBarcodeKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const barcode = e.target.value.trim();
            if (barcode) lookupBarcodeMutation.mutate(barcode);
        }
    };

    const saving = createMutation.isPending || updateMutation.isPending;

    return (
        <div className="space-y-8 pb-10">
            <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 text-right">
                <div>
                    <h2 className="text-2xl sm:text-3xl font-extrabold flex items-center gap-3">
                        <Warehouse className="w-7 h-7 text-blue-400" />
                        إدارة المنتجات والمخزون
                        {pagination.total > 0 && (
                            <span className="bg-blue-500/20 text-blue-400 text-base py-1 px-4 rounded-2xl border border-blue-500/20 font-mono">
                                {pagination.total}
                            </span>
                        )}
                    </h2>
                    <p className="text-gray-400 mt-1">إدارة المخزون، إضافة وتعديل المنتجات، واستيرادها بسهولة</p>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto">
                    <div className="relative w-full sm:w-64">
                        <input
                            type="text"
                            placeholder="بحث بالاسم أو الباركود..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="input-field !py-3 !pr-10 w-full"
                        />
                        <ScanBarcode className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    </div>
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <button onClick={openCreate} className="btn-primary flex-1 sm:flex-none !py-3 flex items-center gap-2 justify-center">
                            <Plus className="w-4 h-4" /> إضافة منتج
                        </button>
                        <Link to="/owner/excel-upload" className="btn-secondary !py-3 flex items-center gap-2">
                            <FileSpreadsheet className="w-4 h-4" /> رفع منتجات Excel
                        </Link>
                        <Link to="/owner/sections" className="btn-secondary !py-3 flex items-center gap-2">
                            <FolderTree className="w-4 h-4" /> إدارة الأقسام
                        </Link>
                        {products.length > 0 && (
                            <button onClick={() => setShowDeleteAllConfirm(true)} className="btn-danger !py-3 flex items-center gap-2">
                                <Trash2 className="w-4 h-4" /> حذف الكل
                            </button>
                        )}
                    </div>
                </div>
            </header>

            {/* Active Import Progress */}
            {activeImport && (
                <div className="glass-card rounded-[2rem] p-6 border border-t-[4px] border-indigo-500/50 text-center space-y-4">
                    {activeImport.status === 'processing' && (
                        <>
                            <Loader2 className="w-10 h-10 animate-spin text-indigo-400 mx-auto" />
                            <h3 className="text-xl font-bold">جاري معالجة الملف...</h3>
                            <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
                                {(() => {
                                    const done = (activeImport.imported_rows || 0) + (activeImport.failed_rows || 0);
                                    const total = activeImport.total_rows || 1;
                                    const pct = Math.round((done / total) * 100);
                                    return <div className="bg-indigo-500 h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(pct, 100)}%` }} />;
                                })()}
                            </div>
                            <p className="text-sm text-gray-400">
                                تمت معالجة {(activeImport.imported_rows || 0) + (activeImport.failed_rows || 0)} من {activeImport.total_rows} —
                                <span className="text-emerald-400"> {activeImport.imported_rows || 0} مستورد</span>
                                {activeImport.failed_rows > 0 && <span className="text-rose-400"> / {activeImport.failed_rows} فاشل</span>}
                            </p>
                        </>
                    )}
                    {activeImport.status === 'completed' && (
                        <>
                            <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto" />
                            <h3 className="text-2xl font-bold text-emerald-400">تم الاستيراد بنجاح!</h3>
                            <p className="text-gray-400">تم استيراد {activeImport.imported_rows} منتج</p>
                        </>
                    )}
                    {activeImport.status === 'failed' && (
                        <>
                            <XCircle className="w-16 h-16 text-rose-400 mx-auto" />
                            <h3 className="text-2xl font-bold text-rose-400">فشل الاستيراد</h3>
                            <p className="text-gray-400">{activeImport.errors?.[0]?.message}</p>
                        </>
                    )}
                </div>
            )}

            {/* Sections Browser */}
            <div className="glass-card rounded-[2rem] p-6 border border-white/5">
                <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
                    <div>
                        <h3 className="text-xl font-bold flex items-center gap-2">
                            <FolderTree className="w-5 h-5 text-purple-400" />
                            الأقسام المصنفة
                        </h3>
                        <p className="text-gray-500 text-xs mt-1">اختر قسماً لتصفح منتجاته، ورتّب ظهور الأقسام للزبائن بالأسهم ▲▼</p>
                    </div>
                    <span className="badge badge-purple">ترتيب الأقسام يظهر للزبون بنفس الترتيب</span>
                </div>

                {sectionsLoading ? (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {[...Array(4)].map((_, i) => <div key={i} className="h-28 rounded-2xl bg-white/5 shimmer" />)}
                    </div>
                ) : (
                    <>
                        <div className="flex flex-wrap gap-2 mb-4">
                            <button
                                onClick={() => selectSection('')}
                                className={`px-3.5 py-2 rounded-xl border text-xs font-bold transition-all ${activeSectionId === '' ? 'bg-blue-500/15 text-blue-300 border-blue-500/40' : 'bg-white/5 hover:bg-white/10 text-gray-300 border-white/5'}`}
                            >
                                كل المنتجات
                            </button>
                            {noSectionCount > 0 && (
                                <button
                                    onClick={() => selectSection('-1')}
                                    className={`px-3.5 py-2 rounded-xl border text-xs font-bold transition-all ${activeSectionId === '-1' ? 'bg-blue-500/15 text-blue-300 border-blue-500/40' : 'bg-white/5 hover:bg-white/10 text-gray-300 border-white/5'}`}
                                >
                                    منتجات أخرى ({noSectionCount})
                                </button>
                            )}
                        </div>

                        {mallSections.length === 0 ? (
                            <p className="text-center py-10 text-gray-500 text-sm">لا توجد أقسام في متجرك حالياً — أضف أقساماً من "إدارة الأقسام".</p>
                        ) : (
                            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {mallSections.map((sec, i) => {
                                    const si = SECTION_ICONS[sec.section_id] || {};
                                    const IconComp = si.icon || Package;
                                    const active = String(sec.id) === activeSectionId;
                                    const subActive = activeSectionId !== '' && activeSectionId !== '-1' && sec.children?.some(c => String(c.id) === activeSectionId);
                                    return (
                                        <div key={sec.id} className={`rounded-2xl border p-4 transition-all ${active || subActive ? 'bg-indigo-500/10 border-indigo-500/40' : 'bg-white/[0.03] border-white/5 hover:border-white/15'}`}>
                                            <div className="flex items-start justify-between gap-2">
                                                <button onClick={() => selectSection(sec.id)} className="flex items-center gap-2.5 min-w-0 text-right flex-1">
                                                    <div className={`w-9 h-9 rounded-xl ${si.bg || 'bg-white/10'} flex items-center justify-center shrink-0 border ${si.border || 'border-white/10'}`}>
                                                        <IconComp className={`w-4 h-4 ${si.text || 'text-gray-300'}`} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="font-bold text-sm truncate">{sec.name_ar}</div>
                                                        <div className="text-[11px] text-gray-400">{sec.product_count || 0} منتج</div>
                                                    </div>
                                                </button>
                                                <div className="flex flex-col shrink-0">
                                                    <button onClick={() => moveMain(sec, -1)} disabled={i === 0 || reorderMutation.isPending} title="تحريك لأعلى" className="p-1 rounded-md hover:bg-white/10 disabled:opacity-20 text-gray-400 transition-colors"><ChevronUp className="w-3.5 h-3.5" /></button>
                                                    <button onClick={() => moveMain(sec, 1)} disabled={i === mallSections.length - 1 || reorderMutation.isPending} title="تحريك لأسفل" className="p-1 rounded-md hover:bg-white/10 disabled:opacity-20 text-gray-400 transition-colors"><ChevronDown className="w-3.5 h-3.5" /></button>
                                                </div>
                                            </div>

                                            {sec.children?.length > 0 && (
                                                <div className="mt-3 space-y-1.5">
                                                    {sec.children.map((child, ci) => (
                                                        <div key={child.id} className="flex items-center justify-between gap-1.5">
                                                            <button onClick={() => selectSection(child.id)} className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all truncate ${String(child.id) === activeSectionId ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' : 'bg-white/5 text-gray-300 border-white/5 hover:border-white/20'}`}>
                                                                {child.name_ar} {child.product_count > 0 && `(${child.product_count})`}
                                                            </button>
                                                            <div className="flex shrink-0">
                                                                <button onClick={() => moveChild(sec, child, -1)} disabled={ci === 0 || reorderMutation.isPending} title="تحريك لأعلى" className="p-0.5 rounded-md hover:bg-white/10 disabled:opacity-20 text-gray-500 transition-colors"><ChevronUp className="w-3 h-3" /></button>
                                                                <button onClick={() => moveChild(sec, child, 1)} disabled={ci === sec.children.length - 1 || reorderMutation.isPending} title="تحريك لأسفل" className="p-0.5 rounded-md hover:bg-white/10 disabled:opacity-20 text-gray-500 transition-colors"><ChevronDown className="w-3 h-3" /></button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}
            </div>

            <div ref={productsTopRef} className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {isLoading ? (
                    [...Array(8)].map((_, i) => <div key={i} className="h-64 rounded-3xl bg-white/5 shimmer" />)
                ) : products?.length === 0 ? (
                    <div className="col-span-full py-20 text-center text-gray-500 glass-card rounded-3xl border border-white/5">
                        <Package className="w-16 h-16 mx-auto mb-4 opacity-20" />
                        <p className="font-bold text-lg">لم تقم بإضافة أي منتجات بعد</p>
                    </div>
                ) : (
                    products?.map((product, i) => {
                        const isInline = inlineEditId === product.id;
                        const mainId = prodMainId(product);
                        const currentMain = mainId ? mallSections.find(s => s.id === mainId) || null : null;
                        const childId = prodChildId(product);
                        return (
                        <motion.div key={product.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="glass-card rounded-3xl overflow-hidden card-hover group flex flex-col h-full">
                            <div className="h-40 bg-gradient-to-br from-blue-500/10 to-purple-500/10 flex items-center justify-center relative border-b border-white/5">
                                {(product.image || product.link_photo) ? (
                                    <div
                                        className="product-image-frame w-full h-full cursor-zoom-in group/img relative"
                                        onClick={() => setZoomProduct(product)}
                                        title="انقر لتكبير الصورة"
                                    >
                                        <img src={product.image || product.link_photo} alt={product.name_ar} loading="lazy" decoding="async" className="product-image" />
                                        <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm p-1.5 rounded-lg opacity-0 group-hover/img:opacity-100 transition-opacity pointer-events-none">
                                            <ZoomIn className="w-3.5 h-3.5 text-white" />
                                        </div>
                                    </div>
                                ) : <Package className="w-12 h-12 text-gray-600" />}
                            </div>
                            <div className="p-5 flex-1 flex flex-col justify-between text-right">
                                <div>
                                    {isInline ? (
                                        <input
                                            autoFocus
                                            type="text"
                                            value={inlineDraft.name_ar}
                                            onChange={(e) => setInlineDraft(d => ({ ...d, name_ar: e.target.value }))}
                                            onKeyDown={(e) => inlineKeyDown(e, product)}
                                            className="input-field !py-1.5 !px-2 mb-2 w-full"
                                        />
                                    ) : (
                                        <h3 className="font-bold text-lg mb-1" title="انقر للتعديل السريع">
                                            <button type="button" onClick={() => startInlineEdit(product)} className="hover:text-blue-300 transition-colors text-left w-full leading-snug">{product.name_ar}</button>
                                        </h3>
                                    )}
                                    <p className="text-xs text-gray-500 line-clamp-1 mb-1">{product.category?.name_ar || 'بدون قسم'}</p>
                                    <div className="space-y-1.5 mb-2">
                                        <div className="flex items-center gap-1.5">
                                            <FolderTree className="w-3 h-3 text-emerald-500/70 shrink-0" />
                                            <select
                                                value={mainId ? String(mainId) : ''}
                                                onChange={(e) => changeProductSection(product, e.target.value, null, null)}
                                                disabled={changeSectionMutation.isPending}
                                                title="القسم الرئيسي"
                                                className="bg-white/5 border border-white/10 rounded-lg text-[11px] font-bold text-emerald-400 py-1 px-1.5 w-full min-w-0 appearance-none cursor-pointer disabled:opacity-50 focus:border-emerald-500/40 outline-none"
                                            >
                                                <option value="">بدون قسم</option>
                                                {mallSections.map(s => (
                                                    <option key={s.id} value={String(s.id)}>{s.name_ar}</option>
                                                ))}
                                            </select>
                                        </div>
                                        {currentMain?.children?.length > 0 && (
                                            <div className="flex items-center gap-1.5">
                                                <Package className="w-3 h-3 text-blue-500/70 shrink-0" />
                                                <select
                                                    value={childId ? String(childId) : ''}
                                                    onChange={(e) => changeProductSection(product, null, e.target.value, mainId)}
                                                    disabled={changeSectionMutation.isPending}
                                                    title="القسم الفرعي"
                                                    className="bg-white/5 border border-white/10 rounded-lg text-[11px] font-bold text-blue-400 py-1 px-1.5 w-full min-w-0 appearance-none cursor-pointer disabled:opacity-50 focus:border-blue-500/40 outline-none"
                                                >
                                                    <option value="">بدون قسم فرعي</option>
                                                    {currentMain.children.map(c => (
                                                        <option key={c.id} value={String(c.id)}>{c.name_ar}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                    </div>
                                    {product.shelf_location && (
                                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-blue-400 mb-3 bg-blue-500/5 py-1 px-2 rounded-lg border border-blue-500/10 w-fit">
                                            <MapPin className="w-3 h-3" />
                                            موقع: {product.shelf_location}
                                        </div>
                                    )}
                                </div>

                                {isInline ? (
                                    <>
                                        <div className="flex items-center gap-2 mb-3">
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={inlineDraft.price}
                                                onChange={(e) => setInlineDraft(d => ({ ...d, price: e.target.value }))}
                                                onKeyDown={(e) => inlineKeyDown(e, product)}
                                                className="input-field !py-1.5 !px-2 w-24 shrink-0 rounded-lg text-sm font-bold text-blue-400"
                                            />
                                            <input
                                                type="text"
                                                dir="ltr"
                                                value={inlineDraft.barcode}
                                                onChange={(e) => setInlineDraft(d => ({ ...d, barcode: e.target.value }))}
                                                onKeyDown={(e) => inlineKeyDown(e, product)}
                                                placeholder="الباركود"
                                                className="input-field !py-1.5 !px-2 flex-1 min-w-0 rounded-lg text-xs font-mono text-left"
                                            />
                                        </div>
                                        <div className="mb-4">
                                            {inlineError && <p className="text-[11px] text-rose-400 mb-2 font-bold">{inlineError}</p>}
                                            <div className="flex gap-2">
                                                <button type="button" onClick={() => saveInlineEdit(product)} disabled={inlineUpdateMutation.isPending} className="flex-1 py-2 rounded-xl bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 transition-all text-xs font-bold flex items-center justify-center gap-1 disabled:opacity-50">
                                                    {inlineUpdateMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} حفظ
                                                </button>
                                                <button type="button" onClick={cancelInlineEdit} className="flex-1 py-2 rounded-xl bg-white/5 text-gray-400 hover:bg-white/10 transition-all text-xs font-bold">إلغاء</button>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex items-center justify-between mb-4">
                                        <button type="button" onClick={() => startInlineEdit(product)} title="انقر لتحرير السعر" className="text-xl font-extrabold text-blue-400 hover:text-blue-300 transition-colors">₪{product.price}</button>
                                        <button type="button" onClick={() => startInlineEdit(product)} title="انقر لتحرير الباركود" className="text-xs text-gray-500 font-mono hover:text-gray-300 transition-colors">{product.barcode || '—'}</button>
                                    </div>
                                )}

                                {enableQuantitySystem && (
                                    <div className="mb-4">
                                        {product.stock_quantity !== undefined && (
                                            <div className={`flex items-center justify-between py-2 px-3 rounded-xl text-xs font-bold ${product.stock_quantity <= (product.min_stock_alert || 5) && product.stock_quantity > 0 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : product.stock_quantity === 0 ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                                                <span>{product.stock_quantity <= (product.min_stock_alert || 5) ? (product.stock_quantity === 0 ? 'نفذ من المخزون' : 'مخزون منخفض') : 'متوفر'}</span>
                                                <span><span className="opacity-60">الكمية:</span> {product.stock_quantity}</span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="flex gap-2 border-t border-white/5 pt-4">
                                    <button onClick={() => { if (window.confirm('هل أنت متأكد؟')) deleteMutation.mutate(product.id) }} className="flex-1 py-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all text-xs font-bold flex justify-center items-center gap-1"><Trash2 className="w-3.5 h-3.5" /> حذف</button>
                                    <button onClick={() => openEdit(product)} className="flex-1 py-2 rounded-xl bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-all text-xs font-bold flex justify-center items-center gap-1"><Edit className="w-3.5 h-3.5" /> تعديل</button>
                                </div>
                            </div>
                        </motion.div>
                        );
                    })
                )}
            </div>

            {/* Pagination Controls */}
            {pagination.last_page > 1 && (
                <div className="mt-10 flex items-center justify-center gap-2">
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="p-3 rounded-xl glass-card disabled:opacity-30 hover:bg-white/10 transition-all"
                    >
                        السابق
                    </button>

                    <div className="flex items-center gap-1">
                        {[...Array(pagination.last_page)].map((_, i) => {
                            const p = i + 1;
                            // Show first, last, and pages around current
                            if (p === 1 || p === pagination.last_page || (p >= page - 2 && p <= page + 2)) {
                                return (
                                    <button
                                        key={p}
                                        onClick={() => setPage(p)}
                                        className={`w-10 h-10 rounded-xl font-bold transition-all ${page === p ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' : 'glass-card hover:bg-white/10 text-gray-400'}`}
                                    >
                                        {p}
                                    </button>
                                );
                            }
                            if (p === page - 3 || p === page + 3) return <span key={p} className="text-gray-600">...</span>;
                            return null;
                        })}
                    </div>

                    <button
                        onClick={() => setPage(p => Math.min(pagination.last_page, p + 1))}
                        disabled={page === pagination.last_page}
                        className="p-3 rounded-xl glass-card disabled:opacity-30 hover:bg-white/10 transition-all font-bold"
                    >
                        التالي
                    </button>
                </div>
            )}

            {/* Import History */}
            <div className="glass-card rounded-[2rem] p-6 border border-white/5">
                <div className="flex items-center justify-between mb-4">
                    <button
                        onClick={() => { setHistoryPage(1); queryClient.invalidateQueries(['owner-import-history']); }}
                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-gray-400"
                    >
                        <RefreshCcw className="w-4 h-4" />
                    </button>
                    <h3 className="text-xl font-bold flex items-center gap-2">
                        <Package className="w-5 h-5 text-blue-400" />
                        سجل استيراد المنتجات
                    </h3>
                </div>
                {historyLoading ? (
                    <div className="text-center py-8 text-gray-500"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
                ) : historyList.length === 0 ? (
                    <p className="text-center py-8 text-gray-500">لا توجد سجلات استيراد بعد.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-right">
                            <thead>
                                <tr className="text-gray-400 border-b border-white/5">
                                    <th className="py-3 px-3 font-semibold">التاريخ</th>
                                    <th className="py-3 px-3 font-semibold">المول</th>
                                    <th className="py-3 px-3 font-semibold">بواسطة</th>
                                    <th className="py-3 px-3 font-semibold">تم</th>
                                    <th className="py-3 px-3 font-semibold">أخطاء</th>
                                    <th className="py-3 px-3 font-semibold">الحالة</th>
                                    <th className="py-3 px-3 font-semibold"></th>
                                    <th className="py-3 px-3 font-semibold"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {historyList.map((imp) => (
                                    <tr key={imp.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                        <td className="py-4 px-3 text-gray-300 text-xs">{new Date(imp.created_at).toLocaleDateString('ar-EG')}</td>
                                        <td className="py-4 px-3 text-blue-400 font-medium">{imp.mall?.name_ar || '—'}</td>
                                        <td className="py-4 px-3 text-gray-400">{imp.user?.name || '—'}</td>
                                        <td className="py-4 px-3 text-emerald-400 font-mono">{imp.imported_rows ?? imp.imported_count ?? '—'}</td>
                                        <td className="py-4 px-3 text-rose-400 font-mono">{imp.failed_rows ?? imp.error_count ?? '—'}</td>
                                        <td className="py-4 px-3">
                                            {imp.status === 'processing' ? (
                                                <div className="flex flex-col gap-1 min-w-[140px]">
                                                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400">
                                                        <Loader2 className="w-3 h-3 animate-spin" />
                                                        قيد التنفيذ
                                                    </span>
                                                    <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                                                        {(() => {
                                                            const done = (imp.imported_rows || 0) + (imp.failed_rows || 0);
                                                            const total = imp.total_rows || 1;
                                                            return <div className="bg-amber-400 h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(Math.round((done / total) * 100), 100)}%` }} />;
                                                        })()}
                                                    </div>
                                                    <span className="text-[10px] text-gray-500">
                                                        {(imp.imported_rows || 0) + (imp.failed_rows || 0)}/{imp.total_rows}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className={`badge ${imp.status === 'completed' ? 'badge-emerald' : imp.status === 'failed' ? 'badge-rose' : 'badge-gray'}`}>
                                                    {imp.status === 'completed' ? 'مكتمل' : imp.status === 'failed' ? 'فشل' : 'قيد الانتظار'}
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-4 px-3">
                                            {imp.status === 'completed' && imp.failed_rows > 0 && (
                                                <button
                                                    onClick={async () => {
                                                        const res = await api.get(`/owner/product-imports/${imp.id}/report`, { responseType: 'blob' });
                                                        const url = window.URL.createObjectURL(new Blob([res.data]));
                                                        const a = document.createElement('a');
                                                        a.href = url; a.download = `report-${imp.id}.csv`; a.click();
                                                        window.URL.revokeObjectURL(url);
                                                    }}
                                                    className="text-amber-400 hover:text-amber-300 text-xs font-bold flex items-center gap-1">
                                                    <Download className="w-3 h-3" /> التقرير
                                                </button>
                                            )}
                                        </td>
                                        <td className="py-4 px-3">
                                            <button
                                                onClick={() => { if (window.confirm('حذف سجل الاستيراد؟')) deleteImportMutation.mutate(imp.id); }}
                                                className="text-rose-400 hover:text-rose-300 text-xs font-bold"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {importHistory?.last_page > 1 && (
                            <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-white/5">
                                <button
                                    onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                                    disabled={historyPage === 1}
                                    className="px-4 py-2 rounded-xl bg-white/5 disabled:opacity-30 hover:bg-white/10 transition-all text-sm"
                                >
                                    السابق
                                </button>
                                <span className="text-sm text-gray-400">صفحة {historyPage} من {importHistory.last_page}</span>
                                <button
                                    onClick={() => setHistoryPage(p => Math.min(importHistory.last_page, p + 1))}
                                    disabled={historyPage === importHistory.last_page}
                                    className="px-4 py-2 rounded-xl bg-white/5 disabled:opacity-30 hover:bg-white/10 transition-all text-sm"
                                >
                                    التالي
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <AnimatePresence>
                {showModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-lg glass-dark p-6 sm:p-8 rounded-[2rem] border border-white/10 relative max-h-[90vh] overflow-y-auto">
                            <button onClick={closeModal} className="absolute top-6 left-6 p-2 rounded-full hover:bg-white/10 transition-colors"><X className="w-5 h-5 text-gray-400" /></button>
                            <h3 className="text-2xl font-bold text-right mb-6">{editProduct ? 'تعديل المنتج' : 'إضافة منتج جديد'}</h3>

                            {scanMode ? (
                                <div className="space-y-4">
                                    <div className="bg-black/50 rounded-2xl overflow-hidden aspect-square flex items-center justify-center border border-white/10">
                                        <QRScanner onResult={handleScanResult} onClose={() => setScanMode(false)} variant="inline" />
                                    </div>
                                    <button onClick={() => setScanMode(false)} className="btn-secondary w-full text-red-400">إلغاء الكاميرا</button>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-4 text-right">
                                    {formError && <div className="rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 p-3 text-sm">{formError}</div>}

                                    <div>
                                        <label className="block text-xs font-semibold text-gray-400 mb-1.5 ml-2">اسم المنتج</label>
                                        <input type="text" required value={form.name_ar} onChange={e => setForm({ ...form, name_ar: e.target.value })} className="input-field" />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-gray-400 mb-1.5 ml-2">السعر (₪)</label>
                                        <input type="number" min="0" step="0.01" required value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} className="input-field text-right font-mono"  />
                                    </div>

                                    {enableQuantitySystem && (
                                        <div className="grid sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-400 mb-1.5 ml-2">الكمية المتاحة</label>
                                                <input type="number" min="0" value={form.stock_quantity} onChange={e => setForm({ ...form, stock_quantity: e.target.value })} className="input-field text-right font-mono"  placeholder="0" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-400 mb-1.5 ml-2">تنبيه عند (حد أدنى)</label>
                                                <input type="number" min="0" value={form.min_stock_alert} onChange={e => setForm({ ...form, min_stock_alert: e.target.value })} className="input-field text-right font-mono"  placeholder="5" />
                                            </div>
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-xs font-semibold text-gray-400 mb-1.5 ml-2">مكان وجود المنتج (مثال: رف A1)</label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                placeholder="حدد الرف أو القسم الخاص بالمنتج"
                                                value={form.shelf_location}
                                                onChange={e => setForm({ ...form, shelf_location: e.target.value })}
                                                className="input-field !pr-10"
                                            />
                                            <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                        </div>
                                    </div>

                                    {!editProduct && (
                                        <>
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-400 mb-1.5 ml-2">رابط الصورة</label>
                                                <input type="text" placeholder="https://example.com/image.jpg" value={form.link_photo} onChange={e => setForm({ ...form, link_photo: e.target.value })} className="input-field text-left font-mono text-xs" dir="ltr" />
                                            </div>
                                        </>
                                    )}

                                    <div>
                                        <label className="block text-xs font-semibold text-gray-400 mb-1.5 ml-2">القسم</label>
                                        <select value={form.mall_section_id} onChange={e => setForm({ ...form, mall_section_id: e.target.value })} className="input-field text-right">
                                            <option value="">-- اختر القسم --</option>
                                            {mallSections.map(s => (
                                                s.children?.length > 0 ? (
                                                    <optgroup key={s.id} label={s.name_ar}>
                                                        <option value={s.id}>{s.name_ar}</option>
                                                        {s.children.map(c => (
                                                            <option key={c.id} value={c.id}>{c.name_ar}</option>
                                                        ))}
                                                    </optgroup>
                                                ) : (
                                                    <option key={s.id} value={s.id}>{s.name_ar}</option>
                                                )
                                            ))}
                                        </select>
                                        {editProduct && (
                                            <p className="text-[11px] text-gray-500 mt-1.5">غيّر القسم لتحريك المنتج إلى قسم أو قسم فرعي آخر</p>
                                        )}
                                    </div>

                                    <div className="pt-2">
                                        <label className="block text-xs font-semibold text-gray-400 mb-1.5 ml-2">الباركود</label>
                                        <div className="flex gap-2">
                                            <input type="text" placeholder="اكتب أو امسح الباركود" value={form.barcode} onChange={e => setForm({ ...form, barcode: e.target.value })} onKeyDown={handleBarcodeKeyDown} className="input-field flex-1 text-right font-mono"  />
                                            <button type="button" onClick={() => setScanMode(true)} className="p-3.5 rounded-xl bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition-colors shrink-0" title="مسح بالكاميرا"><ScanBarcode className="w-5 h-5" /></button>
                                        </div>
                                    </div>

                                    <button type="submit" disabled={saving || categoriesLoading} className="btn-primary w-full !py-4 mt-4">
                                        {saving ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : editProduct ? 'اعتماد التعديلات' : 'إضافة المنتج للمول'}
                                    </button>
                                </form>
                            )}
                        </motion.div>
                    </div>
                )
                }
            </AnimatePresence>

            {/* Image Zoom Lightbox */}
            <AnimatePresence>
                {zoomProduct && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[120] flex flex-col items-center justify-center p-4 bg-black/90 backdrop-blur-sm"
                        onClick={() => setZoomProduct(null)}
                    >
                        <button
                            onClick={() => setZoomProduct(null)}
                            className="absolute top-4 left-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                        >
                            <X className="w-6 h-6 text-white" />
                        </button>
                        {(zoomProduct.image || zoomProduct.link_photo) && (
                            <img
                                src={zoomProduct.image || zoomProduct.link_photo}
                                alt={zoomProduct.name_ar}
                                className="max-w-full max-h-[70vh] object-contain rounded-2xl shadow-2xl"
                                onClick={(e) => e.stopPropagation()}
                            />
                        )}
                        <div className="mt-4 text-center max-w-lg" onClick={(e) => e.stopPropagation()}>
                            <h3 className="text-white font-bold text-lg">{zoomProduct.name_ar}</h3>
                            {zoomProduct.price && <p className="text-blue-300 mt-1 font-bold">{zoomProduct.price} ₪</p>}
                            {zoomProduct.barcode && <p className="text-gray-400 mt-1 text-xs font-mono">{zoomProduct.barcode}</p>}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Delete All Confirmation Modal */}
            <AnimatePresence>
                {showDeleteAllConfirm && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="w-full max-w-md glass-dark p-6 sm:p-8 rounded-[2rem] border border-white/10 relative"
                        >
                            <div className="flex flex-col items-center text-center space-y-6">
                                <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20">
                                    <AlertTriangle className="w-10 h-10 text-red-400" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-2xl font-bold text-white">تأكيد حذف جميع المنتجات</h3>
                                    <p className="text-gray-400 text-sm">
                                        هل أنت متأكد من حذف جميع المنتجات؟<br />
                                        هذا الإجراء لا يمكن التراجع عنه وسيتم حذف <span className="text-red-400 font-bold">{products.length}</span> منتج.
                                    </p>
                                </div>
                                <div className="flex items-center gap-3 w-full">
                                    <button
                                        onClick={() => setShowDeleteAllConfirm(false)}
                                        disabled={deleteAllMutation.isPending}
                                        className="flex-1 py-3 rounded-xl bg-white/5 text-gray-300 hover:bg-white/10 transition-all font-bold border border-white/8 disabled:opacity-50"
                                    >
                                        إلغاء
                                    </button>
                                    <button
                                        onClick={() => deleteAllMutation.mutate()}
                                        disabled={deleteAllMutation.isPending}
                                        className="flex-1 py-3 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-all font-bold disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {deleteAllMutation.isPending ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                جاري الحذف...
                                            </>
                                        ) : (
                                            <>
                                                <Trash2 className="w-4 h-4" />
                                                نعم، احذف الكل
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence >
        </div >
    );
};

export default OwnerProducts;
