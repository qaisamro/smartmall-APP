import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import useAuthStore from '../../store/useAuthStore';
import { Upload, Download, FileSpreadsheet, Loader2, CheckCircle2, AlertCircle, Barcode, Store, Building2, History, Trash2, XCircle, Clock } from 'lucide-react';

const statusBadge = (status) => {
    const map = {
        completed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        completed_with_errors: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        failed: 'bg-red-500/10 text-red-400 border-red-500/20',
        processing: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        queued: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
        cancelled: 'bg-white/5 text-gray-500 border-white/10',
    };
    const labels = {
        completed: 'تم بنجاح',
        completed_with_errors: 'تم مع أخطاء',
        failed: 'فشل',
        processing: 'قيد المعالجة',
        queued: 'قيد الانتظار',
        cancelled: 'ملغي',
    };
    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${map[status] || map.queued}`}>
            {status === 'completed' ? <CheckCircle2 className="w-3 h-3" /> :
             status === 'failed' || status === 'cancelled' ? <XCircle className="w-3 h-3" /> :
             <Clock className="w-3 h-3" />}
            {labels[status] || status}
        </span>
    );
};

const ImportHistoryTable = ({ imports, isLoading, type, onDelete }) => {
    if (isLoading) return <div className="flex justify-center py-6"><Loader2 className="animate-spin w-5 h-5 text-gray-400" /></div>;
    const list = Array.isArray(imports) ? imports : imports?.data || [];
    const filtered = list.filter(i => !type || i.import_type === type);
    if (!filtered.length) return <p className="text-gray-500 text-sm text-center py-4">لا توجد سجلات استيراد سابقة</p>;
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
                <thead>
                    <tr className="border-b border-white/5 text-gray-500 text-xs">
                        <th className="py-2 px-2 font-medium">الملف</th>
                        <th className="py-2 px-2 font-medium">النوع</th>
                        <th className="py-2 px-2 font-medium">الحالة</th>
                        <th className="py-2 px-2 font-medium text-center">تم إدراجها</th>
                        <th className="py-2 px-2 font-medium text-center">تحديث</th>
                        <th className="py-2 px-2 font-medium text-center">تخطي</th>
                        <th className="py-2 px-2 font-medium text-center">أخطاء</th>
                        <th className="py-2 px-2 font-medium">التاريخ</th>
                        {onDelete && <th className="py-2 px-2 font-medium text-center"></th>}
                    </tr>
                </thead>
                <tbody>
                    {filtered.map(imp => (
                        <tr key={imp.id} className="border-b border-white/[0.02] hover:bg-white/[0.02] transition-colors">
                            <td className="py-2.5 px-2 text-white text-xs truncate max-w-[120px]">{imp.file_name}</td>
                            <td className="py-2.5 px-2 text-xs">{imp.import_type === 'sub' ? 'باركودات فرعية' : 'منتجات أساسية'}</td>
                            <td className="py-2.5 px-2">{statusBadge(imp.status)}</td>
                            <td className="py-2.5 px-2 text-center text-emerald-400 font-bold">{imp.inserted_rows ?? imp.imported_rows ?? 0}</td>
                            <td className="py-2.5 px-2 text-center text-blue-400">{imp.updated_rows ?? 0}</td>
                            <td className="py-2.5 px-2 text-center text-gray-500">{imp.skipped_rows ?? 0}</td>
                            <td className="py-2.5 px-2 text-center">
                                {imp.failed_rows > 0 ? (
                                    <span className="text-red-400 font-bold">{imp.failed_rows}</span>
                                ) : (
                                    <span className="text-gray-600">0</span>
                                )}
                            </td>
                            <td className="py-2.5 px-2 text-gray-500 text-[11px] whitespace-nowrap">
                                {new Date(imp.created_at).toLocaleDateString('ar-SA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </td>
                            {onDelete && (
                                <td className="py-2.5 px-2 text-center">
                                    <button
                                        onClick={() => { if (window.confirm('حذف سجل الاستيراد؟')) onDelete(imp.id); }}
                                        className="text-rose-400 hover:text-rose-300 transition-colors"
                                        title="حذف"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const OwnerExcelUpload = () => {
    const { user } = useAuthStore();
    const queryClient = useQueryClient();
    const apiBase = api.defaults.baseURL.replace('/api/v1', '');

    const { data: malls } = useQuery({
        queryKey: ['owner-my-malls-upload'],
        queryFn: async () => (await api.get('/owner/my-malls')).data,
    });

    const isSupermarket = useMemo(() => {
        const role = user?.roles?.[0]?.name;
        return role === 'supermarket-owner';
    }, [user]);

    const userMall = useMemo(() => {
        const list = Array.isArray(malls) ? malls : malls?.data || [];
        return list[0] || user?.mall || null;
    }, [malls, user]);

    // Main products state
    const [mainFile, setMainFile] = useState(null);
    const [mainDragOver, setMainDragOver] = useState(false);
    const [mainUploaded, setMainUploaded] = useState(false);

    // Sub barcodes state
    // const [subFile, setSubFile] = useState(null);
    // const [subDragOver, setSubDragOver] = useState(false);

    const { data: mainImports, isLoading: mainLoading } = useQuery({
        queryKey: ['owner-import-logs-main'],
        queryFn: async () => (await api.get('/owner/product-imports?type=main&per_page=10')).data,
    });

    /*const { data: subImports, isLoading: subLoading } = useQuery({
        queryKey: ['owner-import-logs-sub'],
        queryFn: async () => (await api.get('/owner/product-imports?type=sub&per_page=10')).data,
        enabled: isSupermarket,
    });*/

    const uploadMain = useMutation({
        mutationFn: async (fd) => (await api.post('/owner/products/import-main-excel', fd)).data,
        onSuccess: () => {
            setMainFile(null);
            setMainUploaded(true);
        },
        onError: (err) => alert(err.response?.data?.message || 'فشل رفع المنتجات'),
    });

    /*const uploadSub = useMutation({
        mutationFn: async (fd) => (await api.post('/owner/products/import-sub-excel', fd)).data,
        onSuccess: () => {
            setSubFile(null);
            alert('تم بدء معالجة الباركودات الفرعية في الخلفية');
        },
        onError: (err) => alert(err.response?.data?.message || 'فشل رفع الباركودات'),
    });*/

    const downloadTemplate = (type) => {
        const cols = type === 'sub'
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
   <Row>${cols.map(h => `<Cell><Data ss:Type="String">${h}</Data></Cell>`).join('')}</Row>
  </Table>
 </Worksheet>
</Workbook>`;
        const blob = new Blob([xml], { type: 'application/vnd.ms-excel' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
        window.URL.revokeObjectURL(url);
    };

    const deleteImportMutation = useMutation({
        mutationFn: (id) => api.delete(`/owner/product-imports/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries(['owner-import-logs-main']);
            queryClient.invalidateQueries(['owner-import-logs-sub']);
        },
    });

    const handleSubmitMain = (e) => {
        e.preventDefault();
        if (!mainFile) return;
        const fd = new FormData();
        fd.append('file', mainFile);
        uploadMain.mutate(fd);
    };

    /*const handleSubmitSub = (e) => {
        e.preventDefault();
        if (!subFile) return;
        const fd = new FormData();
        fd.append('file', subFile);
        uploadSub.mutate(fd);
    };*/

    return (
        <div className="space-y-8 pb-10">
            <header className="text-right">
                <h2 className="text-2xl sm:text-3xl font-extrabold flex items-center gap-3 justify-start">
                    <FileSpreadsheet className="w-8 h-8 text-emerald-400" />
                    رفع المنتجات (Excel)
                </h2>
                <p className="text-gray-400 mt-1">
                    {isSupermarket
                        ? 'رفع المنتجات الأساسية '
                        : 'رفع المنتجات الأساسية'}
                </p>
            </header>

            {/* Mall info */}
            {userMall && (
                <div className="glass-card rounded-3xl p-5 border border-white/5 flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${isSupermarket ? 'bg-emerald-500/10' : 'bg-blue-500/10'}`}>
                        {isSupermarket ? <Store className="w-6 h-6 text-emerald-400" /> : <Building2 className="w-6 h-6 text-blue-400" />}
                    </div>
                    <div className="text-right">
                        <p className="font-bold text-white">{userMall.name_ar}</p>
                        <p className="text-xs text-gray-500">
                            {isSupermarket ? 'سوبر ماركت — يمكن رفع ملفين' : 'مول — يمكن رفع ملف واحد'}
                        </p>
                    </div>
                </div>
            )}

            {/* Main products upload (always shown) */}
            <motion.form onSubmit={handleSubmitMain}
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                className="glass-card rounded-3xl p-6 sm:p-8 border border-white/5 space-y-5">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-bold flex items-center gap-2 justify-start">
                            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                            المنتجات الأساسية
                        </h3>
                        <p className="text-gray-500 text-xs mt-0.5">مطلوب — ارفع ملف المنتجات أولاً</p>
                    </div>
                    <button onClick={() => downloadTemplate('main')}
                        className="btn-outline !py-2 !px-4 flex items-center gap-1.5 text-xs">
                        <Download className="w-3.5 h-3.5" />
                        تحميل القالب
                    </button>
                </div>

                <div onDragOver={e => { e.preventDefault(); setMainDragOver(true); }}
                    onDragLeave={() => setMainDragOver(false)}
                    onDrop={e => { e.preventDefault(); setMainDragOver(false); setMainFile(e.dataTransfer.files[0]); }}
                    className={`relative rounded-2xl border-2 border-dashed p-6 sm:p-8 text-center transition-all cursor-pointer ${mainDragOver ? 'border-emerald-500 bg-emerald-500/5' : 'border-white/10 hover:border-indigo-500/50 bg-white/[0.02]'}`}
                    onClick={() => document.getElementById('owner-main-file').click()}>
                    <input id="owner-main-file" type="file" accept=".xlsx,.xls,.csv" className="hidden"
                        onChange={e => setMainFile(e.target.files[0])} />
                    {mainFile ? (
                        <div className="flex items-center justify-center gap-3">
                            <CheckCircle2 className="w-8 h-8 text-emerald-400 shrink-0" />
                            <div className="text-right">
                                <p className="text-white font-bold text-sm">{mainFile.name}</p>
                                <p className="text-gray-500 text-xs">{(mainFile.size / 1024).toFixed(1)} KB</p>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <Upload className="w-10 h-10 mx-auto mb-2 text-gray-500" />
                            <p className="text-gray-400 text-sm">اسحب ملف المنتجات أو اضغط للاختيار</p>
                            <p className="text-gray-600 text-xs mt-1">xlsx, xls, csv — حتى 30MB</p>
                        </div>
                    )}
                </div>

                <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/10 flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div className="text-xs text-amber-400/80 text-right leading-relaxed">
                        <p className="font-bold mb-0.5">أعمدة الملف:</p>
                                        <code className="text-amber-300 text-[10px]">barcode | name | selling_price | unit</code>
                    </div>
                </div>

                <button type="submit" disabled={!mainFile || uploadMain.isPending}
                    className="btn-primary w-full !py-3.5 flex items-center justify-center gap-2 text-sm">
                    {uploadMain.isPending ? <Loader2 className="animate-spin w-4 h-4" /> : <Upload className="w-4 h-4" />}
                    {uploadMain.isPending ? 'جاري الرفع...' : 'رفع المنتجات الأساسية'}
                </button>
            </motion.form>

            {/* Sub barcodes upload — DISABLED
            {isSupermarket && (
                ...
            )}
            */}

            {/* Main products import history */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                className="glass-card rounded-3xl p-6 border border-white/5">
                <div className="flex items-center gap-2 mb-4">
                    <History className="w-5 h-5 text-emerald-400" />
                    <h3 className="text-lg font-bold">سجل استيراد المنتجات الأساسية</h3>
                </div>
                <ImportHistoryTable imports={mainImports} isLoading={mainLoading} type="main" onDelete={deleteImportMutation.mutate} />
            </motion.div>

            {/* Sub barcodes import history — DISABLED
            {isSupermarket && (
                <motion.div ...>
                    ...
                </motion.div>
            )}
            */}
        </div>
    );
};

export default OwnerExcelUpload;
