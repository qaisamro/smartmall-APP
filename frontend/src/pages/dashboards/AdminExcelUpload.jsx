import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import useAuthStore from '../../store/useAuthStore';
import { Upload, Download, FileSpreadsheet, Loader2, CheckCircle2, Building2, AlertCircle, Barcode, Store, History, Trash2, XCircle, Clock } from 'lucide-react';

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

const AdminExcelUpload = () => {
    const { user } = useAuthStore();
    const queryClient = useQueryClient();
    const apiBase = api.defaults.baseURL.replace('/api/v1', '');
    const [selectedMallId, setSelectedMallId] = useState('');
    const [mainFile, setMainFile] = useState(null);
    /*const [subFile, setSubFile] = useState(null);*/
    const [mainDragOver, setMainDragOver] = useState(false);
    /*const [subDragOver, setSubDragOver] = useState(false);*/

    const { data: malls } = useQuery({
        queryKey: ['admin-malls-upload'],
        queryFn: async () => (await api.get('/admin/malls')).data,
    });

    const mallsList = useMemo(() => {
        const raw = Array.isArray(malls) ? malls : malls?.data || [];
        return raw.map(m => ({
            ...m,
            is_supermarket: m.type === 'supermarket' || m.mall_type === 'supermarket',
        }));
    }, [malls]);

    const selectedMall = useMemo(() => {
        return mallsList.find(m => m.id == selectedMallId);
    }, [selectedMallId, mallsList]);

    const { data: mainImports, isLoading: mainLoading } = useQuery({
        queryKey: ['admin-import-logs-main', selectedMallId],
        queryFn: async () => (await api.get(`/admin/product-imports?mall_id=${selectedMallId}&type=main&per_page=10`)).data,
        enabled: !!selectedMallId,
    });

    /*const { data: subImports, isLoading: subLoading } = useQuery({
        queryKey: ['admin-import-logs-sub', selectedMallId],
        queryFn: async () => (await api.get(`/admin/product-imports?mall_id=${selectedMallId}&type=sub&per_page=10`)).data,
        enabled: !!selectedMallId && !!selectedMall?.is_supermarket,
    });*/

    const uploadMain = useMutation({
        mutationFn: async (fd) => (await api.post('/admin/products/import-main-excel', fd)).data,
        onSuccess: () => setMainFile(null),
        onError: (err) => alert(err.response?.data?.message || 'فشل رفع المنتجات'),
    });

    /*const uploadSub = useMutation({
        mutationFn: async (fd) => (await api.post('/admin/products/import-sub-excel', fd)).data,
        onSuccess: () => setSubFile(null),
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
        mutationFn: (id) => api.delete(`/admin/product-imports/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries(['admin-import-logs-main', selectedMallId]);
            queryClient.invalidateQueries(['admin-import-logs-sub', selectedMallId]);
        },
    });

    const handleSubmitMain = (e) => {
        e.preventDefault();
        if (!selectedMallId || !mainFile) return;
        const fd = new FormData();
        fd.append('mall_id', selectedMallId);
        fd.append('file', mainFile);
        uploadMain.mutate(fd);
    };

    /*const handleSubmitSub = (e) => {
        e.preventDefault();
        if (!selectedMallId || !subFile) return;
        const fd = new FormData();
        fd.append('mall_id', selectedMallId);
        fd.append('file', subFile);
        uploadSub.mutate(fd);
    };*/

    return (
        <div className="space-y-8 pb-10">
            <header className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 text-right">
                <div>
                    <h2 className="text-2xl sm:text-3xl font-extrabold flex items-center gap-3 justify-start">
                        <FileSpreadsheet className="w-8 h-8 text-emerald-400" />
                        رفع المنتجات (Excel)
                    </h2>
                    <p className="text-gray-400 mt-1">رفع المنتجات للمولات والمتاجر</p>
                </div>
            </header>

            {/* Mall selector */}
            <div className="glass-card rounded-3xl p-6 border border-white/5">
                <label className="block text-sm font-semibold text-gray-400 mb-2 flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    اختر المول / السوبر ماركت
                </label>
                <select value={selectedMallId} onChange={e => { setSelectedMallId(e.target.value); setMainFile(null); }}
                    className="input-field w-full appearance-none">
                    <option value="">-- اختر --</option>
                    {mallsList.map(m => (
                        <option key={m.id} value={m.id}>
                            {m.name_ar} {m.is_supermarket ? '(سوبر ماركت)' : '(مول)'}
                        </option>
                    ))}
                </select>
                {selectedMall && (
                    <div className="mt-3 flex items-center gap-2 text-xs">
                        {selectedMall.is_supermarket ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                <Store className="w-3 h-3" /> سوبر ماركت — يمكن رفع ملف واحد
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                <Building2 className="w-3 h-3" /> مول — ملف واحد
                            </span>
                        )}
                    </div>
                )}
            </div>

            {selectedMallId && (
                <>
                    {/* Main products upload */}
                    <motion.form onSubmit={handleSubmitMain}
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                        className="glass-card rounded-3xl p-6 sm:p-8 border border-white/5 space-y-5">
                          <div className="flex items-center justify-between">
                              <div>
                                  <h3 className="text-lg font-bold flex items-center gap-2 justify-start">
                                      <FileSpreadsheet className="w-5 h-5 text-indigo-400" />
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
                            onClick={() => document.getElementById('admin-main-file').click()}>
                            <input id="admin-main-file" type="file" accept=".xlsx,.xls,.csv" className="hidden"
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
                                    <p className="text-gray-400 text-sm">اسحب الملف أو اضغط للاختيار</p>
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
                    {selectedMall?.is_supermarket && (
                        <motion.form ...>
                            ...
                        </motion.form>
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
                    {selectedMall?.is_supermarket && (
                        <motion.div ...>
                            ...
                        </motion.div>
                    )}
                    */}
                </>
            )}
        </div>
    );
};

export default AdminExcelUpload;
