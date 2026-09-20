import { useMemo, useState, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, CheckCircle, Clock, Cloud, Download, Loader2, XCircle, FileSpreadsheet, Upload, Trash2, Ban } from 'lucide-react';
import useAuthStore from '../../store/useAuthStore';
import api from '../../api/axios';

const ACCEPTED_TYPES = '.xlsx,.xls,.csv';

export default function ProductImports() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [selectedMallId, setSelectedMallId] = useState('');
  const [file, setFile] = useState(null);
  const [dupStrategy, setDupStrategy] = useState('update');
  const [validateResult, setValidateResult] = useState(null);
  const [validating, setValidating] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);

  const isAdmin = useMemo(() => {
    const role = user?.roles?.[0]?.name;
    return role === 'super-admin' || role === 'admin';
  }, [user]);

  const basePath = isAdmin ? '/admin/product-imports' : '/owner/product-imports';

  const { data: mallsData = [] } = useQuery({
    queryKey: ['import-malls', isAdmin],
    enabled: !!user,
    queryFn: async () => {
      const url = isAdmin ? '/admin/malls' : '/owner/my-malls';
      return (await api.get(url)).data;
    },
  });

  const ownerMall = useMemo(() => {
    if (isAdmin) return null;
    return mallsData?.[0] || user?.mall || null;
  }, [isAdmin, mallsData, user]);

  useState(() => {
    if (!isAdmin && ownerMall?.id) setSelectedMallId(String(ownerMall.id));
  });

  const { data: historyData = { data: [] }, refetch: refetchHistory } = useQuery({
    queryKey: ['import-history', basePath, historyPage],
    queryFn: async () => (await api.get(basePath, { params: { page: historyPage } })).data,
  });

  const historyList = historyData.data || [];

  const [activeImport, setActiveImport] = useState(null);

  const { data: activeImportProgress } = useQuery({
    queryKey: ['import-progress', activeImport?.id],
    enabled: activeImport?.id && ['queued', 'processing'].includes(activeImport.status),
    refetchInterval: 3000,
    queryFn: async () => {
      const res = await api.get(`${basePath}/${activeImport.id}`);
      const data = res.data;
      setActiveImport(data);
      if (['completed', 'failed', 'cancelled'].includes(data.status)) {
        setTimeout(() => {
          setActiveImport(null);
          refetchHistory();
          queryClient.invalidateQueries({ queryKey: ['owner-products'] });
        }, 3000);
      }
      return data;
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (formData) => (await api.post(`${basePath}/upload`, formData)).data,
    onSuccess: (data) => {
      setActiveImport(data.import);
      setFile(null);
      setValidateResult(null);
      refetchHistory();
    },
    onError: (err) => alert(err.response?.data?.message || 'فشل رفع الملف'),
  });

  const cancelMutation = useMutation({
    mutationFn: (id) => api.post(`${basePath}/${id}/cancel`),
    onSuccess: () => {
      setActiveImport(null);
      refetchHistory();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`${basePath}/${id}`),
    onSuccess: () => refetchHistory(),
  });

  const handleValidate = useCallback(async () => {
    if (!file || !selectedMallId) return;
    setValidating(true);
    setValidateResult(null);
    try {
      const fd = new FormData();
      fd.append('mall_id', selectedMallId);
      fd.append('file', file);
      const res = await api.post(`${basePath}/validate`, fd);
      setValidateResult(res.data);
    } catch (err) {
      alert(err.response?.data?.message || 'فشل التحقق من الملف');
    } finally {
      setValidating(false);
    }
  }, [file, selectedMallId, basePath]);

  const handleUpload = () => {
    if (!file || !selectedMallId) return;
    const fd = new FormData();
    fd.append('mall_id', selectedMallId);
    fd.append('file', file);
    fd.append('duplicate_strategy', dupStrategy);
    uploadMutation.mutate(fd);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f && ['xlsx', 'xls', 'csv'].includes(f.name.split('.').pop()?.toLowerCase())) {
      setFile(f);
      setValidateResult(null);
    }
  };

  const progress = (() => {
    if (!activeImport) return 0;
    const done = (activeImport.imported_rows || 0) + (activeImport.skipped_rows || 0) + (activeImport.failed_rows || 0);
    const total = activeImport.total_rows || 1;
    return Math.min(Math.round((done / total) * 100), 100);
  })();

  const statusBadge = (status) => {
    const styles = {
      completed: 'bg-emerald-500/10 text-emerald-400',
      processing: 'bg-amber-500/10 text-amber-400',
      queued: 'bg-blue-500/10 text-blue-400',
      failed: 'bg-rose-500/10 text-rose-400',
      cancelled: 'bg-gray-500/10 text-gray-400',
    };
    const labels = {
      completed: 'مكتمل', processing: 'قيد المعالجة', queued: 'قيد الانتظار', failed: 'فشل', cancelled: 'ملغي',
    };
    const icons = {
      completed: CheckCircle, processing: Loader2, queued: Clock, failed: XCircle, cancelled: Ban,
    };
    const Icon = icons[status] || Clock;
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold ${styles[status] || 'bg-gray-500/10 text-gray-400'}`}>
        <Icon className={`w-3.5 h-3.5 ${status === 'processing' ? 'animate-spin' : ''}`} />
        {labels[status] || status}
      </span>
    );
  };

  return (
    <div className="space-y-8 pb-10 max-w-5xl mx-auto" dir="rtl">
      <header className="text-center space-y-4">
        <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 rounded-3xl flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/10">
          <FileSpreadsheet className="w-10 h-10 text-emerald-400" />
        </div>
        <div>
          <h1 className="text-4xl font-black">استيراد المنتجات</h1>
          <p className="text-gray-400 mt-2">ارفع ملف Excel أو CSV واستورد المنتجات إلى المول</p>
        </div>
      </header>

      {activeImport && ['queued', 'processing'].includes(activeImport.status) && (
        <div className="glass-card rounded-[2rem] p-6 border border-t-[4px] border-indigo-500/50 text-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-400 mx-auto" />
          <h3 className="text-xl font-bold">جاري معالجة الملف...</h3>
          <div className="w-full bg-white/10 rounded-full h-4 overflow-hidden">
            <div className="bg-indigo-500 h-full rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-sm text-gray-400">
            تمت معالجة {((activeImport.imported_rows || 0) + (activeImport.skipped_rows || 0) + (activeImport.failed_rows || 0)).toLocaleString()} من {activeImport.total_rows?.toLocaleString()} — {progress}%
          </p>
          <div className="flex justify-center gap-6 text-sm mt-2">
            <span className="text-emerald-400">إدراج: {activeImport.inserted_rows || 0}</span>
            <span className="text-blue-400">تحديث: {activeImport.updated_rows || 0}</span>
            {activeImport.failed_rows > 0 && <span className="text-rose-400">فشل: {activeImport.failed_rows}</span>}
          </div>
          <button onClick={() => cancelMutation.mutate(activeImport.id)} className="text-rose-400 hover:text-rose-300 text-sm font-bold flex items-center gap-1 mx-auto">
            <Ban className="w-4 h-4" /> إلغاء الاستيراد
          </button>
        </div>
      )}

      {activeImport && ['completed', 'failed', 'cancelled'].includes(activeImport.status) && (
        <div className={`glass-card rounded-[2rem] p-6 border border-t-[4px] text-center space-y-3 ${
          activeImport.status === 'completed' ? 'border-emerald-500/50' :
          activeImport.status === 'failed' ? 'border-rose-500/50' : 'border-gray-500/50'
        }`}>
          {activeImport.status === 'completed' ? <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto" /> :
           activeImport.status === 'failed' ? <XCircle className="w-16 h-16 text-rose-400 mx-auto" /> :
           <Ban className="w-16 h-16 text-gray-400 mx-auto" />}
          <h3 className={`text-2xl font-bold ${
            activeImport.status === 'completed' ? 'text-emerald-400' :
            activeImport.status === 'failed' ? 'text-rose-400' : 'text-gray-400'
          }`}>
            {activeImport.status === 'completed' ? 'تم الاستيراد بنجاح' :
             activeImport.status === 'failed' ? 'فشل الاستيراد' : 'تم إلغاء الاستيراد'}
          </h3>
          {activeImport.status === 'completed' && (
            <div className="flex justify-center gap-4 text-sm">
              <span>إدراج: <strong>{activeImport.inserted_rows?.toLocaleString()}</strong></span>
              <span>تحديث: <strong>{activeImport.updated_rows?.toLocaleString()}</strong></span>
              {activeImport.skipped_rows > 0 && <span className="text-gray-400">تخطي: {activeImport.skipped_rows}</span>}
              {activeImport.failed_rows > 0 && <span className="text-rose-400">أخطاء: {activeImport.failed_rows}</span>}
            </div>
          )}
        </div>
      )}

      {!activeImport && (
        <div className="glass-card rounded-[2rem] p-6 sm:p-10 border border-white/5">
          <div className="space-y-6">
            {isAdmin && (
              <div>
                <label className="block text-sm font-bold text-gray-400 mb-2">اختر المول</label>
                <select value={selectedMallId} onChange={(e) => setSelectedMallId(e.target.value)} className="input-field w-full">
                  <option value="">-- اختر مول --</option>
                  {(Array.isArray(mallsData) ? mallsData : []).map((m) => (
                    <option key={m.id} value={m.id}>{m.name_ar}</option>
                  ))}
                </select>
              </div>
            )}

            <div onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                 onDragLeave={() => setDragOver(false)}
                 onDrop={handleDrop}
                 onClick={() => document.getElementById('import-file-input')?.click()}
                 className={`border-2 border-dashed rounded-[2rem] p-10 text-center cursor-pointer transition-all ${
                   dragOver ? 'border-emerald-400 bg-emerald-500/5' : 'border-white/10 hover:border-white/20'
                 }`}>
              <input id="import-file-input" type="file" accept={ACCEPTED_TYPES} className="hidden"
                     onChange={(e) => { setFile(e.target.files?.[0] || null); setValidateResult(null); }} />
              {file ? (
                <div className="space-y-3">
                  <div className="w-16 h-16 mx-auto bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/30">
                    <CheckCircle className="w-8 h-8 text-emerald-400" />
                  </div>
                  <p className="font-bold text-lg">{file.name}</p>
                  <p className="text-sm text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  <button onClick={(e) => { e.stopPropagation(); setFile(null); setValidateResult(null); }}
                          className="text-sm text-rose-400 hover:text-rose-300">إزالة الملف</button>
                </div>
              ) : (
                <div className="space-y-4">
                  <Cloud className="w-16 h-16 text-gray-500 mx-auto" />
                  <p className="font-bold text-lg">اسحب الملف إلى هنا أو اضغط للاختيار</p>
                  <p className="text-sm text-gray-500">Excel (.xlsx, .xls) أو CSV — حد أقصى 20MB</p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-400 mb-2">عند وجود منتج مكرر (حسب الباركود)</label>
              <div className="flex gap-4">
                {[
                  { value: 'skip', label: 'تجاهل المكرر' },
                  { value: 'update', label: 'تحديث المكرر' },
                ].map((opt) => (
                  <label key={opt.value} className="flex items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition-colors">
                    <input type="radio" name="dup" value={opt.value} checked={dupStrategy === opt.value}
                           onChange={() => setDupStrategy(opt.value)} />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {validateResult && (
              <div className={`p-4 rounded-2xl ${validateResult.valid ? 'bg-emerald-500/5 border border-emerald-500/20' : 'bg-amber-500/5 border border-amber-500/20'}`}>
                <div className="flex items-center gap-2 mb-2">
                  {validateResult.valid ? <CheckCircle className="w-5 h-5 text-emerald-400" /> : <AlertCircle className="w-5 h-5 text-amber-400" />}
                  <span className="font-bold">{validateResult.valid ? 'الملف صالح' : `تم العثور على ${validateResult.error_count} خطأ`}</span>
                  <span className="text-gray-400 text-sm mr-auto">{validateResult.total_rows?.toLocaleString()} صف</span>
                </div>
                {!validateResult.valid && validateResult.errors?.slice(0, 10).map((err, i) => (
                  <p key={i} className="text-xs text-amber-300 mr-7">الصف {err.row}: {err.message}</p>
                ))}
                {(validateResult.errors?.length || 0) > 10 && (
                  <p className="text-xs text-gray-500 mr-7">...و {validateResult.errors.length - 10} خطأ آخر</p>
                )}
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-white/5">
              <button onClick={async () => {
                const res = await api.get(`${basePath}/template`, { responseType: 'blob' });
                const url = window.URL.createObjectURL(new Blob([res.data]));
                const a = document.createElement('a');
                a.href = url; a.download = 'smartmall-product-import-template.xlsx'; a.click();
                window.URL.revokeObjectURL(url);
              }} className="text-sm text-indigo-400 hover:text-indigo-300 flex items-center gap-2">
                <Download className="w-4 h-4" /> تحميل نموذج Excel
              </button>
              <div className="flex gap-3">
                <button onClick={handleValidate} disabled={!file || !selectedMallId || validating}
                        className="btn-ghost !py-3 !px-6 !rounded-2xl disabled:opacity-40 flex items-center gap-2">
                  {validating ? <Loader2 className="w-5 h-5 animate-spin" /> : <AlertCircle className="w-5 h-5" />}
                  {validating ? 'جاري التحقق...' : 'التحقق من الملف'}
                </button>
                <button onClick={handleUpload} disabled={!file || !selectedMallId || uploadMutation.isPending}
                        className="btn-primary !py-3 !px-6 !rounded-2xl disabled:opacity-40 flex items-center gap-2">
                  {uploadMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                  {uploadMutation.isPending ? 'جاري الرفع...' : 'رفع وبدء الاستيراد'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="glass-card rounded-[2rem] p-6 border border-white/5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold flex items-center gap-2">سجل استيراد المنتجات</h3>
          <button onClick={() => { setHistoryPage(1); refetchHistory(); }} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400">
            <Loader2 className="w-4 h-4" />
          </button>
        </div>

        {historyList.length === 0 ? (
          <p className="text-center py-8 text-gray-500">لا توجد سجلات استيراد بعد.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead>
                <tr className="text-gray-400 border-b border-white/5">
                  <th className="py-3 px-3 font-semibold">التاريخ</th>
                  <th className="py-3 px-3 font-semibold">الملف</th>
                  <th className="py-3 px-3 font-semibold">المول</th>
                  <th className="py-3 px-3 font-semibold">إدراج</th>
                  <th className="py-3 px-3 font-semibold">تحديث</th>
                  <th className="py-3 px-3 font-semibold">تخطي</th>
                  <th className="py-3 px-3 font-semibold">أخطاء</th>
                  <th className="py-3 px-3 font-semibold">الحالة</th>
                  <th className="py-3 px-3 font-semibold"></th>
                </tr>
              </thead>
              <tbody>
                {historyList.map((imp) => (
                  <tr key={imp.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-4 px-3 text-gray-300 text-xs whitespace-nowrap">
                      {new Date(imp.created_at).toLocaleDateString('ar-EG')}
                    </td>
                    <td className="py-4 px-3 text-gray-300 max-w-[120px] truncate">{imp.file_name || '—'}</td>
                    <td className="py-4 px-3 text-blue-400 font-medium">{imp.mall?.name_ar || '—'}</td>
                    <td className="py-4 px-3 text-emerald-400 font-mono">{imp.inserted_rows?.toLocaleString() || '—'}</td>
                    <td className="py-4 px-3 text-blue-400 font-mono">{imp.updated_rows?.toLocaleString() || '—'}</td>
                    <td className="py-4 px-3 text-gray-500 font-mono">{imp.skipped_rows || '—'}</td>
                    <td className="py-4 px-3 text-rose-400 font-mono">{imp.failed_rows || '—'}</td>
                    <td className="py-4 px-3">{statusBadge(imp.status)}</td>
                    <td className="py-4 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {imp.status === 'completed' && imp.failed_rows > 0 && (
                          <button onClick={async () => {
                            const res = await api.get(`${basePath}/${imp.id}/report`, { responseType: 'blob' });
                            const url = window.URL.createObjectURL(new Blob([res.data]));
                            const a = document.createElement('a');
                            a.href = url; a.download = `report-${imp.id}.csv`; a.click();
                            window.URL.revokeObjectURL(url);
                          }} className="text-amber-400 hover:text-amber-300 text-xs font-bold flex items-center gap-1">
                            <Download className="w-3 h-3" /> التقرير
                          </button>
                        )}
                        {['queued', 'processing'].includes(imp.status) && (
                          <button onClick={() => setActiveImport(imp)} className="text-indigo-400 hover:text-indigo-300 text-xs font-bold">
                            عرض
                          </button>
                        )}
                        <button onClick={() => { if (window.confirm('حذف سجل الاستيراد؟')) deleteMutation.mutate(imp.id); }}
                                className="text-rose-400 hover:text-rose-300 disabled:opacity-30"
                                disabled={deleteMutation.isPending}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {historyData.last_page > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            {Array.from({ length: historyData.last_page }, (_, i) => i + 1).map((p) => (
              <button key={p} onClick={() => setHistoryPage(p)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                        historyPage === p ? 'bg-indigo-500/20 text-indigo-400' : 'bg-white/5 text-gray-400 hover:bg-white/10'
                      }`}>{p}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
