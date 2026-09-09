import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios';
import {
    ShoppingBag, Calendar, Loader2,
    Filter, Download, Store, Truck, X, Search, BarChart3, Printer, FileText, Barcode
} from 'lucide-react';
import { printThermalReceipt } from '../../utils/thermalPrint';

const BarcodeCell = ({ barcode, size = 24 }) => {
    const ref = useRef(null);
    useEffect(() => {
        if (ref.current && barcode) {
            import('jsbarcode').then(mod => {
                const JsBarcode = mod.default || mod;
                try {
                    ref.current.innerHTML = '';
                    JsBarcode(ref.current, String(barcode).trim(), {
                        format: 'CODE128',
                        width: 1.2,
                        height: 30,
                        displayValue: false,
                        margin: 0,
                        background: 'transparent',
                    });
                } catch { }
            });
        }
    }, [barcode]);
    return (
        <div className="flex flex-col items-center gap-0.5">
            <svg ref={ref} style={{ width: size * 3, height: size }} />
            <span dir="ltr" className="text-[9px] font-mono text-gray-400 tracking-wider">{barcode || '—'}</span>
        </div>
    );
};

const BarcodePrintReport = ({ orders, periodLabel, stats, onClose }) => {
    const [paperSize, setPaperSize] = useState('a4');

    const flatProducts = useMemo(() => {
        const map = new Map();
        orders.forEach(order => {
            (order.items || []).forEach(item => {
                const p = item.product || {};
                const key = p.id || p.barcode || `_${p.name_ar}`;
                if (!map.has(key)) {
                    map.set(key, { ...p, totalQty: 0, totalAmount: 0, orders: [] });
                }
                const e = map.get(key);
                e.totalQty += item.quantity;
                e.totalAmount += item.price_at_sale * item.quantity;
                if (!e.orders.includes(`#${order.id}`)) e.orders.push(`#${order.id}`);
            });
        });
        return Array.from(map.values());
    }, [orders]);

    const printBarcodeReport = () => {
        const isA4 = paperSize === 'a4';
        const itemsHtml = flatProducts.map(p => {
            const barcodeSvg = p.barcode
                ? `<svg id="bc-${p.id || Math.random()}" style="width:${isA4 ? 140 : 100}px;height:${isA4 ? 32 : 24}px"></svg><script>try{JsBarcode("#bc-${p.id || Math.random()}",${JSON.stringify(String(p.barcode).trim())},{format:"CODE128",width:${isA4 ? 1.2 : 0.8},height:${isA4 ? 30 : 20},displayValue:false,margin:0})}catch(e){}</script>`
                : '';
            const cellStyle = isA4
                ? 'padding:8px 6px;border:1px solid #ddd;text-align:center;vertical-align:middle;font-size:12px'
                : 'padding:4px 3px;border:1px solid #ccc;text-align:center;vertical-align:middle;font-size:10px';
            return `<tr>
                <td style="${cellStyle};text-align:right;font-weight:600">${p.name_ar || 'منتج'}</td>
                <td style="${cellStyle}">${p.totalQty}</td>
                <td style="${cellStyle};font-family:monospace;font-weight:bold">${p.totalAmount.toFixed(2)} ₪</td>
                <td style="${cellStyle}">
                    <div style="display:flex;flex-direction:column;align-items:center;gap:1px">
                        ${barcodeSvg}
                        <span style="font-family:monospace;font-size:${isA4 ? '10px' : '8px'};color:#666;direction:ltr">${p.barcode || '—'}</span>
                    </div>
                </td>
            </tr>`;
        }).join('');

        const pageCss = isA4 ? `
            @page { size: A4; margin: 15mm; }
            body { font-family: 'Segoe UI', 'Cairo', Arial, sans-serif; background: #fff; color: #000; }
            .page { max-width: 190mm; margin: 0 auto; padding: 0; }
            table { width: 100%; border-collapse: collapse; }
            th { background: #1e293b; color: #fff; padding: 10px 6px; font-size: 12px; text-align: center; }
            th:first-child { text-align: right; }
            td { padding: 8px 6px; border: 1px solid #ddd; text-align: center; font-size: 12px; vertical-align: middle; }
            td:first-child { text-align: right; font-weight: 600; }
            .footer { margin-top: 20px; text-align: center; color: #94a3b8; font-size: 10px; }
        ` : `
            @page { size: 80mm auto; margin: 0; }
            body { font-family: 'Segoe UI', 'Cairo', Arial, sans-serif; background: #fff; color: #000; font-size: 9px; padding: 3mm; }
            .page { max-width: 74mm; margin: 0 auto; }
            table { width: 100%; border-collapse: collapse; font-size: 8px; }
            th { background: #1e293b; color: #fff; padding: 3px 2px; font-size: 7px; text-align: center; }
            th:first-child { text-align: right; }
            td { padding: 3px 2px; border: 1px solid #ccc; text-align: center; font-size: 8px; vertical-align: middle; }
            td:first-child { text-align: right; }
            .footer { margin-top: 10px; text-align: center; color: #94a3b8; font-size: 7px; }
        `;

        const html = `<!DOCTYPE html>
<html dir="rtl">
<head><meta charset="utf-8"><title>تقرير الباركود - ${periodLabel}</title>
<script src="https://cdn.jsdelivr.net/npm/jsbarcode@3/dist/JsBarcode.all.min.js"><\/script>
<style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    ${pageCss}
    .header { text-align: center; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #1e293b; }
    .header h1 { font-size: ${isA4 ? '22px' : '14px'}; font-weight: 900; color: #000; }
    .header .meta { font-size: ${isA4 ? '13px' : '9px'}; color: #666; margin-top: 4px; }
    .summary { display: flex; gap: ${isA4 ? '12px' : '6px'}; margin-bottom: ${isA4 ? '20px' : '10px'}; flex-wrap: wrap; justify-content: center; }
    .summary div { flex: 1; min-width: ${isA4 ? '100px' : '60px'}; text-align: center; padding: ${isA4 ? '12px' : '6px'}; background: #f8f9fc; border-radius: 8px; border: 1px solid #e8e8f0; }
    .summary div .num { font-size: ${isA4 ? '18px' : '12px'}; font-weight: 800; }
    .summary div .label { font-size: ${isA4 ? '10px' : '7px'}; color: #94a3b8; }
</style></head>
<body>
<div class="page">
    <div class="header">
        <h1>تقرير الباركود - Smart Mall</h1>
        <div class="meta">${periodLabel} • ${orders.length} فاتورة • ${flatProducts.length} منتج</div>
    </div>
    <div class="summary">
        <div><div class="num">${stats.total.toFixed(2)} ₪</div><div class="label">إجمالي المبيعات</div></div>
        <div><div class="num">${stats.count}</div><div class="label">عدد الفواتير</div></div>
        <div><div class="num">${flatProducts.length}</div><div class="label">عدد المنتجات</div></div>
        <div><div class="num">${stats.qty}</div><div class="label">إجمالي القطع</div></div>
    </div>
    <table>
        <thead><tr><th>المنتج</th><th>الكمية</th><th>الإجمالي</th><th>الباركود</th></tr></thead>
        <tbody>${itemsHtml}</tbody>
    </table>
    <div class="footer">تم الإنشاء في ${new Date().toLocaleString('ar-EG')} • SmartMall</div>
</div>
<script>
    setTimeout(() => { window.print(); window.close(); }, 500);
<\/script>
</body>
</html>`;

        const win = window.open('', '_blank');
        win.document.write(html);
        win.document.close();
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="bg-[#1a2332] rounded-3xl border border-white/10 p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                        <Barcode className="w-5 h-5 text-indigo-400" />
                        طباعة تقرير الباركود
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="space-y-6">
                    <div className="bg-white/5 rounded-2xl p-5">
                        <p className="text-sm font-bold mb-3">حجم الورق</p>
                        <div className="flex gap-3">
                            {[
                                { id: 'a4', label: 'ورق A4', desc: 'مقاس A4 قياسي' },
                                { id: 'receipt', label: 'ورق فواتير', desc: '80mm × طويل' },
                            ].map(s => (
                                <button key={s.id} onClick={() => setPaperSize(s.id)}
                                    className={`flex-1 p-4 rounded-2xl border text-right transition-all ${paperSize === s.id ? 'bg-indigo-500/15 border-indigo-500/30' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
                                    <p className="font-bold text-sm">{s.label}</p>
                                    <p className="text-[11px] text-gray-400 mt-1">{s.desc}</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white/5 rounded-2xl p-5">
                        <p className="text-sm font-bold mb-3">ملخص التقرير</p>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div><span className="text-gray-400">الفواتير:</span> <span className="font-bold">{stats.count}</span></div>
                            <div><span className="text-gray-400">المنتجات:</span> <span className="font-bold">{flatProducts.length}</span></div>
                            <div><span className="text-gray-400">القطع:</span> <span className="font-bold">{stats.qty}</span></div>
                            <div><span className="text-gray-400">الإجمالي:</span> <span className="font-bold text-emerald-400">{stats.total.toFixed(2)} ₪</span></div>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button onClick={printBarcodeReport}
                            className="flex-1 py-3 px-6 bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2">
                            <Printer className="w-4 h-4" /> طباعة التقرير
                        </button>
                        <button onClick={onClose}
                            className="py-3 px-6 bg-white/5 hover:bg-white/10 text-gray-300 font-bold rounded-2xl transition-all">
                            إلغاء
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

const OwnerSalesReports = () => {
    const [tab, setTab] = useState('daily');
    const [deliveryFilter, setDeliveryFilter] = useState('all');
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });
    const [selectedDay, setSelectedDay] = useState(() => new Date().toISOString().split('T')[0]);
    const [dateFrom, setDateFrom] = useState(() => {
        const d = new Date();
        d.setDate(1);
        return d.toISOString().split('T')[0];
    });
    const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);
    const [search, setSearch] = useState('');
    const [expandedOrder, setExpandedOrder] = useState(null);
    const [printLoading, setPrintLoading] = useState(false);
    const [showBarcodePrint, setShowBarcodePrint] = useState(false);
    const barcodeRefs = useRef({});

    const buildParams = () => {
        const params = new URLSearchParams();
        if (deliveryFilter !== 'all') params.append('delivery_method', deliveryFilter);
        if (tab === 'monthly' && selectedMonth) {
            params.append('month', selectedMonth);
        } else if (tab === 'daily' && selectedDay) {
            params.append('from', selectedDay);
            params.append('to', selectedDay);
        } else if (tab === 'custom') {
            if (dateFrom) params.append('from', dateFrom);
            if (dateTo) params.append('to', dateTo);
        }
        return params.toString();
    };

    const queryKey = ['owner-sales', deliveryFilter, tab, selectedMonth, selectedDay, dateFrom, dateTo];

    const { data: sales, isLoading } = useQuery({
        queryKey,
        queryFn: async () => {
            const r = await api.get(`/owner/orders?${buildParams()}`);
            return r.data;
        }
    });

    const list = Array.isArray(sales) ? sales : (sales?.data || []);

    const filtered = useMemo(() => {
        if (!search) return list;
        const q = search.toLowerCase();
        return list.filter(o =>
            o.id.toString().includes(q) ||
            o.items?.some(i => i.product?.name_ar?.toLowerCase().includes(q)) ||
            (o.delivery_address || '').toLowerCase().includes(q)
        );
    }, [list, search]);

    const stats = useMemo(() => {
        const total = list.reduce((s, o) => s + parseFloat(o.total_amount), 0);
        const inMall = list.filter(o => o.delivery_method === 'in-mall').length;
        const d = list.filter(o => o.delivery_method === 'delivery').length;
        const qty = list.reduce((s, o) => s + (o.items?.reduce((a, i) => a + i.quantity, 0) || 0), 0);
        return { total, count: list.length, inMall, delivery: d, qty };
    }, [list]);

    const periodLabel = tab === 'daily'
        ? selectedDay
        : tab === 'monthly'
            ? selectedMonth
            : `${dateFrom || '...'} → ${dateTo || '...'}`;

    const generateReportHTML = (fullDocument = true) => {
        const rowsHtml = filtered.map(o => {
            const itemsHtml = (o.items || []).map(i => `
                <tr>
                    <td style="text-align:right;padding:10px 12px;border-bottom:1px solid #eef;font-weight:500">${i.product?.name_ar || 'منتج'}${i.notes ? `<br><small style="color:#aaa">📝 ${i.notes}</small>` : ''}</td>
                    <td style="text-align:center;padding:10px 12px;border-bottom:1px solid #eef;font-family:monospace">${i.quantity}</td>
                    <td style="text-align:center;padding:10px 12px;border-bottom:1px solid #eef;font-family:monospace;color:#64748b">${parseFloat(i.price_at_sale).toFixed(2)}</td>
                    <td style="text-align:center;padding:10px 12px;border-bottom:1px solid #eef;font-family:monospace;font-weight:bold;color:#4361ee">${(i.price_at_sale * i.quantity).toFixed(2)}</td>
                </tr>
            `).join('');
            return `
                <div style="background:#fff;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.08);margin-bottom:16px;padding:0;overflow:hidden;page-break-inside:avoid;border:1px solid #e8e8f0">
                    <div style="background:linear-gradient(135deg,#f8f9ff,#eef2ff);padding:14px 20px;border-bottom:1px solid #e0e4f0;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
                        <div style="display:flex;align-items:center;gap:12px">
                            <span style="background:#4361ee;color:#fff;font-size:11px;font-weight:bold;padding:4px 12px;border-radius:20px">#${o.id}</span>
                            <span style="color:#64748b;font-size:12px">${new Date(o.created_at).toLocaleDateString('ar-EG')}</span>
                        </div>
                        <div style="display:flex;align-items:center;gap:12px">
                            <span style="font-size:11px;padding:3px 10px;border-radius:12px;background:${o.delivery_method === 'delivery' ? '#fef3c7' : '#eef2ff'};color:${o.delivery_method === 'delivery' ? '#d97706' : '#4361ee'}">${o.delivery_method === 'delivery' ? 'توصيل' : 'داخل المول'}</span>
                            <span style="font-size:11px;color:#64748b">${o.user?.name || 'زائر'}</span>
                        </div>
                    </div>
                    <table style="width:100%;border-collapse:collapse;font-size:12px">
                        <thead>
                            <tr style="background:#fafbfe">
                                <th style="text-align:right;padding:10px 12px;color:#64748b;font-weight:600;font-size:11px">المنتج</th>
                                <th style="text-align:center;padding:10px 12px;color:#64748b;font-weight:600;font-size:11px">الكمية</th>
                                <th style="text-align:center;padding:10px 12px;color:#64748b;font-weight:600;font-size:11px">سعر الوحدة</th>
                                <th style="text-align:center;padding:10px 12px;color:#64748b;font-weight:600;font-size:11px">الإجمالي</th>
                            </tr>
                        </thead>
                        <tbody>${itemsHtml}</tbody>
                    </table>
                    <div style="background:#fafbfe;padding:12px 20px;border-top:1px solid #e0e4f0;display:flex;justify-content:space-between;align-items:center">
                        <span style="font-size:11px;color:#94a3b8">عدد القطع: ${o.items?.reduce((s, i) => s + i.quantity, 0) || 0}</span>
                        <span style="font-size:16px;font-weight:800;color:#4361ee">${parseFloat(o.total_amount).toFixed(2)} ₪</span>
                    </div>
                </div>
            `;
        }).join('');

        const content = `
            <div style="max-width:190mm;margin:0 auto;padding:32px 24px;font-family:'Segoe UI','Cairo',Arial,sans-serif;color:#1e293b;background:#f8f9fc">
                <div style="text-align:center;margin-bottom:28px">
                    <div style="font-size:24px;font-weight:900;background:linear-gradient(135deg,#1e293b,#4361ee);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin-bottom:4px;letter-spacing:-0.5px">تقرير المبيعات</div>
                    <div style="color:#64748b;font-size:13px;font-weight:500;background:#eef2ff;display:inline-block;padding:4px 20px;border-radius:20px">${periodLabel}</div>
                    <div style="color:#94a3b8;font-size:11px;margin-top:6px">${filtered.length} فاتورة • ${stats.qty} قطعة • ${stats.total.toFixed(2)} ₪ إجمالي</div>
                </div>
                <div style="display:flex;gap:12px;margin-bottom:28px;flex-wrap:wrap">
                    <div style="flex:1;min-width:120px;background:#fff;border-radius:12px;padding:18px 14px;text-align:center;box-shadow:0 1px 3px rgba(0,0,0,.06);border:1px solid #e8e8f0"><div style="font-size:20px;font-weight:800;color:#059669">${stats.total.toFixed(2)} ₪</div><div style="font-size:10px;color:#94a3b8;margin-top:4px;font-weight:500">إجمالي المبيعات</div></div>
                    <div style="flex:1;min-width:120px;background:#fff;border-radius:12px;padding:18px 14px;text-align:center;box-shadow:0 1px 3px rgba(0,0,0,.06);border:1px solid #e8e8f0"><div style="font-size:20px;font-weight:800;color:#3b82f6">${stats.count}</div><div style="font-size:10px;color:#94a3b8;margin-top:4px;font-weight:500">عدد الفواتير</div></div>
                    <div style="flex:1;min-width:120px;background:#fff;border-radius:12px;padding:18px 14px;text-align:center;box-shadow:0 1px 3px rgba(0,0,0,.06);border:1px solid #e8e8f0"><div style="font-size:20px;font-weight:800;color:#475569">${stats.qty}</div><div style="font-size:10px;color:#94a3b8;margin-top:4px;font-weight:500">عدد القطع</div></div>
                    <div style="flex:1;min-width:120px;background:#fff;border-radius:12px;padding:18px 14px;text-align:center;box-shadow:0 1px 3px rgba(0,0,0,.06);border:1px solid #e8e8f0"><div style="font-size:20px;font-weight:800;color:#4361ee">${stats.inMall}</div><div style="font-size:10px;color:#94a3b8;margin-top:4px;font-weight:500">داخل المول</div></div>
                    <div style="flex:1;min-width:120px;background:#fff;border-radius:12px;padding:18px 14px;text-align:center;box-shadow:0 1px 3px rgba(0,0,0,.06);border:1px solid #e8e8f0"><div style="font-size:20px;font-weight:800;color:#d97706">${stats.delivery}</div><div style="font-size:10px;color:#94a3b8;margin-top:4px;font-weight:500">توصيل</div></div>
                </div>
                ${rowsHtml}
                <div style="text-align:center;color:#94a3b8;font-size:9px;margin-top:28px;padding-top:16px;border-top:1px solid #e8e8f0">تم إنشاء هذا التقرير في ${new Date().toLocaleString('ar-EG')} • SmartMall</div>
            </div>
        `;

        if (!fullDocument) return content;

        return `<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"><title>تقرير المبيعات</title></head><body style="margin:0;padding:0;background:#f8f9fc">${content}</body></html>`;
    };

    const printReport = () => {
        setPrintLoading(true);
        setTimeout(() => {
            const win = window.open('', '_blank');
            win.document.write(generateReportHTML());
            win.document.close();
            win.onload = () => { win.print(); setPrintLoading(false); };
            setTimeout(() => setPrintLoading(false), 2000);
        }, 200);
    };

    const [invoicePrinting, setInvoicePrinting] = useState(null);

    const generateInvoiceHTML = (order) => {
        const mall = order.mall || {};
        const itemsHtml = (order.items || []).map((i, idx) => {
            const p = i.product || {};
            const barcodeHtml = p.barcode
                ? `<div style="text-align:center;margin-top:1mm"><svg id="bc-${idx}" style="width:80px;height:20px"></svg><br><span style="font-family:monospace;font-size:9px;color:#000;direction:ltr">${p.barcode}</span><script>try{JsBarcode("#bc-${idx}","${p.barcode}",{format:"CODE128",width:0.8,height:18,displayValue:false,margin:0})}catch(e){}</scr` + `ipt></div>`
                : '';
            return `
            <tr>
                <td style="padding:1.5mm 0.5mm;text-align:right;font-size:11px">
                    ${p.name_ar || 'منتج'}
                    ${barcodeHtml}
                </td>
                <td style="padding:1.5mm 0.5mm;text-align:center;font-size:11px;font-family:'Courier New',monospace">${i.quantity}</td>
                <td style="padding:1.5mm 0.5mm;text-align:center;font-size:11px;font-family:'Courier New',monospace">${parseFloat(i.price_at_sale).toFixed(2)}</td>
                <td style="padding:1.5mm 0.5mm;text-align:right;font-size:11px;font-family:'Courier New',monospace;font-weight:bold">${(i.price_at_sale * i.quantity).toFixed(2)}</td>
            </tr>`;
        }).join('');

        const itemCount = order.items?.reduce((s, i) => s + i.quantity, 0) || 0;
        const deliveryFee = parseFloat(order.delivery_fee || 0);
        const tax = parseFloat(order.tax_amount || 0);
        const discount = parseFloat(order.discount_amount || 0);
        const subtotal = order.items?.reduce((s, i) => s + (i.price_at_sale * i.quantity), 0) || 0;
        const total = parseFloat(order.total_amount);
        const orderNum = `ORD-${order.pending_order_id ?? order.id}`;
        const methodLabel = order.delivery_method === 'delivery' ? 'توصيل منزلي' : order.delivery_method === 'pickup' ? 'استلام شخصي من المتجر' : 'داخل المول';

        return `<div class="receipt">
    <div class="header">
        <div style="font-size:16px;font-weight:bold;letter-spacing:1px;color:#000;margin-bottom:1mm">Smart Mall</div>
        <div style="font-size:12px;font-weight:bold;color:#000;margin-bottom:0.5mm">${mall.name_ar || 'فاتورة'}</div>
        <div class="meta">
            <span style="font-weight:bold">${new Date(order.created_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
            <span style="font-size:9px">${new Date(order.created_at).toLocaleTimeString('ar-EG')}</span>
            <span style="margin-top:0.5mm;font-weight:bold;font-size:12px">رقم الفاتورة: ${orderNum}</span>
            ${order.user?.name ? `<span style="font-weight:bold">العميل: ${order.user.name}</span>` : ''}
            <span style="font-weight:bold">${methodLabel}</span>
            ${(order.delivery_method === 'delivery' && order.delivery_address) ? `<span>العنوان: ${order.delivery_address}</span>` : ''}
            ${(order.delivery_phone) ? `<span dir="ltr" style="font-weight:bold">هاتف الزبون: ${order.delivery_phone}</span>` : ''}
        </div>
    </div>
    <table>
        <thead><tr><th>المنتج</th><th>الكمية</th><th>السعر</th><th>المجموع</th></tr></thead>
        <tbody>${itemsHtml}</tbody>
    </table>
    <div class="totals">
        <div class="row"><span style="font-weight:bold">${itemCount} قطعة</span><span>إجمالي القطع</span></div>
        ${subtotal > 0 ? `<div class="row"><span style="font-weight:bold">${subtotal.toFixed(2)} ₪</span><span>مجموع المنتجات</span></div>` : ''}
        ${deliveryFee > 0 ? `<div class="row"><span style="font-weight:bold">${deliveryFee.toFixed(2)} ₪</span><span>رسوم التوصيل</span></div>` : ''}
        ${discount > 0 ? `<div class="row"><span style="font-weight:bold">-${discount.toFixed(2)} ₪</span><span>الخصم</span></div>` : ''}
        ${tax > 0 ? `<div class="row"><span style="font-weight:bold">${tax.toFixed(2)} ₪</span><span>الضريبة</span></div>` : ''}
        <div class="row grand"><span style="font-weight:bold">${total.toFixed(2)} ₪</span><span>المجموع النهائي</span></div>
    </div>
    ${(order.general_notes) ? `<div style="text-align:right;font-size:10px;font-weight:bold;padding:1mm 0;border-top:1px dashed #000;margin-top:1mm">ملاحظات الزبون: ${order.general_notes}</div>` : ''}
    <div class="footer">
        <div class="brand">Smart Mall</div>
        <p style="font-weight:bold">شكراً لتسوقكم</p>
    </div>
</div>`;
    };

    const printInvoice = (order) => {
        printThermalReceipt({
            bodyHtml: generateInvoiceHTML(order),
            title: `فاتورة ORD-${order.pending_order_id ?? order.id}`,
            extraHeadHtml: '<script src="https://cdn.jsdelivr.net/npm/jsbarcode@3/dist/JsBarcode.all.min.js"><\/script>',
            printDelay: 1200,
        });
    };

    const exportCSV = () => {
        const headers = ['رقم الفاتورة', 'التاريخ', 'نوع الطلب', 'المنتج', 'الكمية', 'سعر الوحدة', 'الإجمالي', 'المستخدم'];
        const rows = filtered.flatMap(o => {
            const items = o.items?.length ? o.items : [{ product: { name_ar: '' }, quantity: 0, price_at_sale: 0 }];
            return items.map(i => [
                o.id,
                new Date(o.created_at).toLocaleDateString('ar-EG'),
                o.delivery_method === 'delivery' ? 'توصيل' : 'داخل المول',
                i.product?.name_ar || '',
                i.quantity,
                i.price_at_sale ? parseFloat(i.price_at_sale).toFixed(2) : '',
                (i.price_at_sale * i.quantity).toFixed(2),
                o.user?.name || 'زائر'
            ]);
        });
        const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        const suffix = tab === 'daily' ? selectedDay : tab === 'monthly' ? selectedMonth : `${dateFrom}_${dateTo}`;
        link.setAttribute('download', `sales-report-${suffix}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-8 pb-10 text-right">
            {showBarcodePrint && (
                <BarcodePrintReport
                    orders={filtered}
                    periodLabel={periodLabel}
                    stats={stats}
                    onClose={() => setShowBarcodePrint(false)}
                />
            )}

            <header className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div>
                    <h2 className="text-2xl sm:text-3xl font-extrabold flex items-center gap-3 justify-start">
                        <BarChart3 className="w-7 h-7 text-emerald-400" />
                        المبيعات والتقارير المالية
                    </h2>
                    <p className="text-gray-400 mt-1">جرد الفواتير المعتمدة فقط — طلبات التوصيل غير المعتمدة لا تُحتسب حتى تعتمدها من قسم التوصيل</p>
                </div>
                <div className="flex items-center gap-2">
                    {tab === 'daily' && (
                        <input type="date" value={selectedDay} onChange={e => setSelectedDay(e.target.value)}
                            className="input-field !py-2.5 !px-4 !w-auto" />
                    )}
                    {tab === 'monthly' && (
                        <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
                            className="input-field !py-2.5 !px-4 !w-auto" />
                    )}
                    {tab === 'custom' && (
                        <div className="flex items-center gap-2">
                            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                                className="input-field !py-2.5 !px-4 !w-auto" />
                            <span className="text-gray-500 text-sm">إلى</span>
                            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                                className="input-field !py-2.5 !px-4 !w-auto" />
                        </div>
                    )}
                </div>
            </header>

            {/* Tabs */}
            <div className="flex flex-wrap gap-2 border-b border-white/10 pb-3">
                {[
                    { id: 'daily', label: 'يومي', icon: Calendar },
                    { id: 'monthly', label: 'شهري', icon: BarChart3 },
                    { id: 'custom', label: 'مخصص', icon: Filter },
                ].map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)}
                        className={`flex items-center gap-1.5 px-5 py-2.5 rounded-t-xl text-sm font-bold transition-all ${tab === t.id ? 'bg-indigo-500/15 text-indigo-400 border-b-2 border-indigo-400' : 'text-gray-400 hover:text-white'}`}>
                        <t.icon className="w-4 h-4" /> {t.label}
                    </button>
                ))}
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                <div className="glass-card p-5 rounded-3xl border border-white/5 text-center">
                    <div className="text-2xl font-black text-emerald-400">{stats.total.toFixed(2)} ₪</div>
                    <div className="text-gray-500 text-xs font-bold mt-1">إجمالي المبيعات</div>
                </div>
                <div className="glass-card p-5 rounded-3xl border border-white/5 text-center">
                    <div className="text-2xl font-black text-blue-400">{stats.count}</div>
                    <div className="text-gray-500 text-xs font-bold mt-1">عدد الفواتير</div>
                </div>
                <div className="glass-card p-5 rounded-3xl border border-white/5 text-center">
                    <div className="text-2xl font-black text-white">{stats.qty}</div>
                    <div className="text-gray-500 text-xs font-bold mt-1">عدد القطع</div>
                </div>
                <div className="glass-card p-5 rounded-3xl border border-white/5 text-center">
                    <div className="text-2xl font-black text-indigo-400">{stats.inMall}</div>
                    <div className="text-gray-500 text-xs font-bold mt-1">داخل المول</div>
                </div>
                <div className="glass-card p-5 rounded-3xl border border-white/5 text-center">
                    <div className="text-2xl font-black text-amber-400">{stats.delivery}</div>
                    <div className="text-gray-500 text-xs font-bold mt-1">توصيل</div>
                </div>
            </div>

            {/* Filters bar */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap gap-2">
                    {[
                        { id: 'all', label: 'الكل' },
                        { id: 'in-mall', label: 'داخل المول', icon: Store },
                        { id: 'delivery', label: 'توصيل منزلي', icon: Truck },
                    ].map(t => (
                        <button key={t.id} onClick={() => setDeliveryFilter(t.id)}
                            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${deliveryFilter === t.id ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'bg-white/5 text-gray-400 hover:text-white border border-white/10'}`}>
                            {t.icon && <t.icon className="w-4 h-4" />} {t.label}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="relative">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="بحث..." className="input-field !py-2.5 !pr-10 !w-44" />
                    </div>
                    <button onClick={() => setShowBarcodePrint(true)}
                        className="btn-secondary !py-2.5 !px-4 !text-xs flex items-center gap-2">
                        <Barcode className="w-4 h-4" /> باركود
                    </button>
                    <button onClick={printReport} disabled={printLoading}
                        className="btn-secondary !py-2.5 !px-4 !text-xs flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                        {printLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                        {printLoading ? 'جارٍ التحميل...' : 'طباعة'}
                    </button>
                    <button onClick={exportCSV}
                        className="btn-secondary !py-2.5 !px-4 !text-xs flex items-center gap-2">
                        <Download className="w-4 h-4" /> تصدير CSV
                    </button>
                </div>
            </div>

            {/* Orders Table */}
            <div className="glass-card rounded-[2.5rem] border border-white/5 overflow-hidden">
                {isLoading ? (
                    <div className="py-20 flex flex-col items-center gap-4 opacity-30">
                        <Loader2 className="w-12 h-12 animate-spin" />
                        <p>جاري تحميل البيانات...</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-right text-sm">
                            <thead className="bg-white/2">
                                <tr>
                                    <th className="px-4 py-4 font-bold text-gray-400">#</th>
                                    <th className="px-4 py-4 font-bold text-gray-400">التاريخ</th>
                                    <th className="px-4 py-4 font-bold text-gray-400">النوع</th>
                                    <th className="px-4 py-4 font-bold text-gray-400">الزبون</th>
                                    <th className="px-4 py-4 font-bold text-gray-400 text-center">القطع</th>
                                    <th className="px-4 py-4 font-bold text-gray-400">الإجمالي</th>
                                    <th className="px-4 py-4 font-bold text-gray-400 text-center">تفاصيل</th>
                                    <th className="px-4 py-4 font-bold text-gray-400 text-center">طباعة</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filtered.map((order) => {
                                    const isDelivery = order.delivery_method === 'delivery';
                                    const itemsCount = order.items?.reduce((s, i) => s + i.quantity, 0) || 0;
                                    const isExpanded = expandedOrder === order.id;
                                    return (
                                        <React.Fragment key={order.id}>
                                            <tr className="hover:bg-white/2 transition-colors">
                                                <td className="px-4 py-4 font-mono text-emerald-400">{order.pending_order_id ? `ORD-${order.pending_order_id}` : `#${order.id}`}</td>
                                                <td className="px-4 py-4">
                                                    <span className="text-xs">{new Date(order.created_at).toLocaleDateString('ar-EG')}</span>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${isDelivery ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'}`}>
                                                        {isDelivery ? 'توصيل' : 'داخل المول'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 text-xs text-gray-400">{order.user?.name || 'زائر'}</td>
                                                <td className="px-4 py-4 text-center">
                                                    <span className="px-2.5 py-1 bg-white/5 rounded-full text-[10px]">{itemsCount}</span>
                                                </td>
                                                <td className="px-4 py-4 font-bold">{order.total_amount} ₪</td>
                                                <td className="px-4 py-4 text-center">
                                                    <button onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                                                        className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl hover:bg-indigo-500/20 transition-all">
                                                        {isExpanded ? <X className="w-4 h-4" /> : <Search className="w-4 h-4" />}
                                                    </button>
                                                </td>
                                                <td className="px-4 py-4 text-center">
                                                    <button onClick={() => printInvoice(order)}
                                                        className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl hover:bg-emerald-500/20 transition-all"
                                                        title="طباعة الفاتورة">
                                                        <FileText className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                            {isExpanded && (
                                                <tr key={`${order.id}-details`}>
                                                    <td colSpan={8} className="px-6 py-4 bg-white/2">
                                                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-3">
                                                            {order.delivery_address && (
                                                                <div className="text-xs text-gray-400 bg-white/5 p-3 rounded-2xl">
                                                                    <span className="font-bold text-gray-300">عنوان التوصيل:</span> {order.delivery_address}
                                                                </div>
                                                            )}
                                                            <table className="w-full text-xs">
                                                                <thead>
                                                                    <tr className="border-b border-white/10">
                                                                        <th className="py-2 px-3 text-right text-gray-400 font-bold">المنتج</th>
                                                                        <th className="py-2 px-3 text-center text-gray-400 font-bold">الكمية</th>
                                                                        <th className="py-2 px-3 text-center text-gray-400 font-bold">السعر</th>
                                                                        <th className="py-2 px-3 text-right text-gray-400 font-bold">الإجمالي</th>
                                                                        <th className="py-2 px-3 text-center text-gray-400 font-bold">الباركود</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {(order.items || []).map((item, idx) => (
                                                                        <tr key={idx} className="border-b border-white/5">
                                                                            <td className="py-2 px-3 font-medium">
                                                                                {item.product?.name_ar || 'منتج'}
                                                                                {item.notes && <p className="text-[10px] text-amber-400/70">{item.notes}</p>}
                                                                            </td>
                                                                            <td className="py-2 px-3 text-center font-mono">{item.quantity}</td>
                                                                            <td className="py-2 px-3 text-center font-mono">{parseFloat(item.price_at_sale).toFixed(2)}</td>
                                                                            <td className="py-2 px-3 text-right font-mono font-bold text-indigo-400">{(item.price_at_sale * item.quantity).toFixed(2)} ₪</td>
                                                                            <td className="py-2 px-3 text-center">
                                                                                <BarcodeCell barcode={item.product?.barcode} size={20} />
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                            <div className="flex items-center justify-between pt-2 border-t border-white/5">
                                                                <span className="text-lg font-black text-indigo-400">{order.total_amount} ₪</span>
                                                                <span className="text-sm text-gray-400 font-bold">المجموع الكلي</span>
                                                            </div>
                                                        </motion.div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                                {filtered.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="py-20 text-center opacity-30">
                                            <ShoppingBag className="w-12 h-12 mx-auto mb-4" />
                                            لا توجد فواتير في هذه الفترة
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default OwnerSalesReports;
