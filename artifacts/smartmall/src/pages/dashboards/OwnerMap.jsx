import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, Plus, Trash2, MapPin, RotateCcw, Layout, Smartphone, ShoppingBag, Coffee, Shirt, Utensils, Zap, HelpCircle, Loader2, ChevronRight, Store, Snowflake, Sparkles, Package, Apple } from 'lucide-react';
import api from '../../api/axios';
import { motion, AnimatePresence } from 'framer-motion';

const SECTION_TYPES = [
    { id: 'food', label: 'مواد غذائية', icon: ShoppingBag, color: '#10b981' },
    { id: 'frozen', label: 'مثلجات ومجمدات', icon: Snowflake, color: '#3b82f6' },
    { id: 'cleaning', label: 'مواد تنظيف', icon: Sparkles, color: '#8b5cf6' },
    { id: 'nuts', label: 'مكسرات وتسالي', icon: Coffee, color: '#f59e0b' },
    { id: 'produce', label: 'خضار وفواكه', icon: Apple, color: '#ec4899' },
    { id: 'bakery', label: 'مخبز وحلويات', icon: Utensils, color: '#f97316' },
    { id: 'other', label: 'أخرى', icon: Package, color: '#6366f1' },
];

const SECTION_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#f97316', '#06b6d4', '#ec4899'];

const OwnerMap = () => {
    const queryClient = useQueryClient();
    const [selectedMall, setSelectedMall] = useState(null);
    const [selectedBranch, setSelectedBranch] = useState(null);
    const [sections, setSections] = useState([]);
    const [dragging, setDragging] = useState(null);
    const [selected, setSelected] = useState(null);
    const [saved, setSaved] = useState(false);
    const [newLabel, setNewLabel] = useState('');
    const [newType, setNewType] = useState('other');
    const svgRef = useRef(null);
    const offset = useRef({ x: 0, y: 0 });

    const { data: mallsData } = useQuery({
        queryKey: ['owner-malls'],
        queryFn: async () => (await api.get('/owner/my-malls')).data
    });

    // Instead of querying branches separately, just take them from the mall data
    const branches = selectedMall ? (mallsData.find(m => m.id === selectedMall.id)?.branches || []) : [];

    useEffect(() => {
        if (mallsData?.length > 0 && !selectedMall) {
            setSelectedMall(mallsData[0]);
        }
    }, [mallsData, selectedMall]);

    const { data: shelves, isLoading: shelvesLoading } = useQuery({
        queryKey: ['owner-shelves', selectedMall?.id, selectedBranch?.id],
        enabled: !!selectedMall,
        queryFn: async () => {
            const params = selectedBranch ? { branch_id: selectedBranch.id } : { mall_id: selectedMall.id };
            return (await api.get(`/owner/shelves`, { params })).data;
        }
    });

    useEffect(() => {
        if (shelves) {
            setSections(shelves.map(s => ({
                id: s.id,
                label: s.name,
                section: s.section,
                color: SECTION_TYPES.find(t => t.id === s.section)?.color || '#3b82f6',
                x: s.map_coordinates?.x || 100,
                y: s.map_coordinates?.y || 100,
                w: s.map_coordinates?.w || 140,
                h: s.map_coordinates?.h || 80
            })));
        }
    }, [shelves]);

    const createMutation = useMutation({
        mutationFn: (newShelf) => api.post('/owner/shelves', newShelf),
        onSuccess: () => queryClient.invalidateQueries(['owner-shelves'])
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => api.put(`/owner/shelves/${id}`, data)
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => api.delete(`/owner/shelves/${id}`),
        onSuccess: () => queryClient.invalidateQueries(['owner-shelves'])
    });

    const getSvgPoint = (event) => {
        const svg = svgRef.current;
        if (!svg) return { x: 0, y: 0 };
        const point = svg.createSVGPoint();
        point.x = event.clientX; point.y = event.clientY;
        return point.matrixTransform(svg.getScreenCTM().inverse());
    };

    const handlePointerDown = (e, id) => {
        e.preventDefault();
        const sec = sections.find(s => s.id === id);
        const point = getSvgPoint(e);
        offset.current = { x: point.x - sec.x, y: point.y - sec.y };
        setDragging(id); setSelected(id);
        e.currentTarget.setPointerCapture?.(e.pointerId);
    };

    const handlePointerMove = (e) => {
        if (!dragging) return;
        const sec = sections.find(s => s.id === dragging);
        if (!sec) return;
        const point = getSvgPoint(e);
        const x = Math.round(Math.max(20, Math.min(540 - sec.w, point.x - offset.current.x)));
        const y = Math.round(Math.max(20, Math.min(380 - sec.h, point.y - offset.current.y)));
        setSections(prev => prev.map(s => s.id === dragging ? { ...s, x, y } : s));
    };

    const handlePointerUp = () => {
        if (dragging) {
            const sec = sections.find(s => s.id === dragging);
            if (typeof dragging === 'number') {
                updateMutation.mutate({
                    id: dragging,
                    data: { map_coordinates: { x: sec.x, y: sec.y, w: sec.w, h: sec.h } }
                });
            }
        }
        setDragging(null);
    };

    const addSection = () => {
        if (!newLabel.trim()) {
            alert('يرجى كتابة اسم القسم أولاً');
            return;
        }
        if (!selectedMall) {
            alert('يرجى اختيار مول للمتابعة');
            return;
        }

        createMutation.mutate({
            mall_id: selectedBranch ? null : selectedMall.id,
            branch_id: selectedBranch ? selectedBranch.id : null,
            name: newLabel.trim(),
            section: newType,
            map_coordinates: { x: 100, y: 100, w: 140, h: 80 }
        });
        setNewLabel('');
    };

    const removeSection = (id) => {
        if (typeof id === 'number') {
            if (window.confirm('هل أنت متأكد من حذف هذا الجزء من المخطط؟')) {
                deleteMutation.mutate(id);
            }
        } else {
            setSections(prev => prev.filter(s => s.id !== id));
        }
        if (selected === id) setSelected(null);
    };

    const handleSave = () => {
        // Since we update position on pointer up, we just show a success message
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    const reset = () => {
        if (window.confirm('هل تريد فعلاً مسح كافة التعديلات؟')) {
            // Logic to clear all shelves or reset
        }
    };

    return (
        <div className="space-y-6 pb-10">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 text-right">
                <div className="flex flex-wrap gap-3 order-2 md:order-1">
                    <button onClick={handleSave} className="btn-primary !py-4 !px-8 shrink-0 transition-all shadow-xl shadow-blue-500/20">
                        {saved ? '✓ تم الحفظ بنجاح!' : <><Save className="w-5 h-5" /> حفظ المخطط النهائي</>}
                    </button>

                    <div className="flex flex-col gap-2">
                        {/* Mall Selector */}
                        <div className="flex items-center gap-2 bg-white/5 p-1.5 rounded-2xl border border-white/5">
                            {(mallsData || []).map(mall => (
                                <button
                                    key={mall.id}
                                    onClick={() => { setSelectedMall(mall); setSelectedBranch(null); }}
                                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${selectedMall?.id === mall.id ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:bg-white/5'}`}
                                >
                                    {mall.name_ar}
                                </button>
                            ))}
                        </div>

                        {/* Branch Selector (Only if branches exist) */}
                        {(branches || []).length > 0 && (
                            <div className="flex items-center gap-2 bg-white/5 p-1.5 rounded-2xl border border-white/10 ml-auto">
                                <span className="text-[10px] text-gray-500 px-2 font-black uppercase tracking-tighter">فروع {selectedMall?.name_ar}:</span>
                                {(branches || []).map(branch => (
                                    <button
                                        key={branch.id}
                                        onClick={() => setSelectedBranch(branch)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${selectedBranch?.id === branch.id ? 'bg-purple-500 text-white shadow-md' : 'text-gray-500 hover:text-gray-300'}`}
                                    >
                                        {branch.name_ar}
                                    </button>
                                ))}
                                <button
                                    onClick={() => setSelectedBranch(null)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${!selectedBranch ? 'bg-slate-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                                >
                                    إدارة المول ككتلة واحدة
                                </button>
                            </div>
                        )}
                    </div>
                </div>
                <div className="order-1 md:order-2">
                    <h2 className="text-3xl sm:text-4xl font-black text-white flex items-center gap-4 justify-start">
                        خارطة المول التفاعلية
                        <Store className="w-9 h-9 text-purple-400" />
                    </h2>
                    <p className="text-gray-400 mt-2 font-medium">خطط ونظم أقسام المول بصرياً لتسهيل وصول الزبائن</p>
                </div>
            </header>

            <div className="grid lg:grid-cols-4 gap-8 items-start">
                <div className="space-y-6">
                    <div className="glass-card rounded-[2.5rem] p-6 space-y-5 border border-white/10">
                        <h3 className="font-black text-lg text-right flex items-center justify-start gap-2">
                            إضافة قسم/رف
                            <Plus className="w-5 h-5 text-purple-400" />
                        </h3>

                        {!selectedMall ? (
                            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs text-right">
                                يرجى تسجيل الدخول كصاحب مول للبدء.
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="text-[10px] text-gray-500 text-right mb-1">
                                    تعديل مخطط: <span className="text-purple-400 font-bold">{selectedBranch ? selectedBranch.name_ar : selectedMall.name_ar}</span>
                                </div>
                                <input
                                    type="text"
                                    placeholder="مثال: قسم المجمدات"
                                    value={newLabel}
                                    onChange={e => setNewLabel(e.target.value)}
                                    className="input-field !py-4"
                                />

                                <div className="grid grid-cols-4 gap-2">
                                    {SECTION_TYPES.map(type => (
                                        <button
                                            key={type.id}
                                            onClick={() => setNewType(type.id)}
                                            title={type.label}
                                            className={`p-3 rounded-2xl flex items-center justify-center transition-all border ${newType === type.id ? 'bg-purple-500/20 border-purple-500/40 text-purple-400' : 'bg-white/5 border-transparent text-gray-500 hover:bg-white/10'}`}
                                        >
                                            <type.icon className="w-5 h-5" />
                                        </button>
                                    ))}
                                </div>

                                <button
                                    onClick={addSection}
                                    disabled={createMutation.isPending}
                                    className="w-full py-4 rounded-2xl bg-purple-500 text-white font-black shadow-lg shadow-purple-500/20 hover:scale-[1.02] active:scale-95 transition-all"
                                >
                                    {createMutation.isPending ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : 'أضف للمخطط'}
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="glass-card rounded-[2.5rem] p-6 border border-white/10 max-h-[400px] overflow-hidden flex flex-col">
                        <h3 className="font-black text-right mb-4">الأقسام المضافة</h3>
                        <div className="overflow-y-auto space-y-3 pr-1 custom-scrollbar flex-1">
                            {sections.length === 0 ? (
                                <p className="text-center py-6 text-gray-500 text-sm">لا توجد أقسام بعد</p>
                            ) : sections.map(s => {
                                const type = SECTION_TYPES.find(t => t.id === s.section) || SECTION_TYPES[6];
                                return (
                                    <div
                                        key={s.id}
                                        className={`flex items-center justify-between p-4 rounded-3xl cursor-pointer transition-all border ${selected === s.id ? 'bg-purple-500/10 border-purple-500/20' : 'bg-white/3 border-transparent hover:bg-white/5'}`}
                                        onClick={() => setSelected(s.id)}
                                    >
                                        <button onClick={(e) => { e.stopPropagation(); removeSection(s.id); }} className="p-2 rounded-xl text-red-400 hover:bg-red-500/20 transition-all"><Trash2 className="w-4 h-4" /></button>
                                        <div className="flex items-center gap-3">
                                            <div className="text-right">
                                                <div className="text-sm font-black text-white">{s.label}</div>
                                                <div className="text-[10px] text-gray-500">{type.label}</div>
                                            </div>
                                            <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-white/5" style={{ color: s.color }}>
                                                <type.icon className="w-5 h-5" />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* SVG Canvas Workspace */}
                <div className="lg:col-span-3">
                    <div className="glass-card rounded-3xl p-4 sm:p-6 overflow-hidden">
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-xs font-mono text-gray-500 bg-white/5 px-3 py-1 rounded-full">Canvas: 560x400</span>
                            <div className="flex items-center gap-2 text-sm text-gray-400">
                                مساحة التصميم — استخدم الماوس أو اللمس
                                <MapPin className="w-4 h-4 text-purple-400" />
                            </div>
                        </div>
                        <svg
                            ref={svgRef}
                            width="100%" viewBox="0 0 560 400"
                            className="rounded-[1.5rem] bg-[#0c0c14] border border-white/5 shadow-inner cursor-crosshair select-none touch-none"
                            style={{ minHeight: 300, display: 'block' }}
                            onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}
                            onPointerCancel={handlePointerUp} onPointerLeave={handlePointerUp}
                        >
                            <defs>
                                <pattern id="dotGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                                    <circle cx="2" cy="2" r="1" fill="rgba(255,255,255,0.06)" />
                                </pattern>
                            </defs>
                            <rect width="100%" height="100%" fill="url(#dotGrid)" />

                            {/* Realistic Walls/Outline */}
                            <rect x="20" y="20" width="520" height="360" rx="24" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
                            <rect x="20" y="20" width="520" height="360" rx="24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1" strokeDasharray="12,8" />

                            <text x="280" y="55" textAnchor="middle" fill="rgba(255,255,255,0.2)" fontSize="10" fontWeight="900" className="uppercase tracking-[0.3em]">Mall Interior Layout</text>

                            {sections.map(sec => {
                                const type = SECTION_TYPES.find(t => t.id === sec.section) || SECTION_TYPES[6];
                                return (
                                    <g key={sec.id} onPointerDown={e => handlePointerDown(e, sec.id)} className="group cursor-grab active:cursor-grabbing">
                                        <rect
                                            x={sec.x} y={sec.y} width={sec.w} height={sec.h} rx="18"
                                            fill={sec.color + '15'}
                                            stroke={selected === sec.id ? '#fff' : sec.color + '44'}
                                            strokeWidth={selected === sec.id ? 2.5 : 1.5}
                                            style={{ filter: selected === sec.id ? `drop-shadow(0 8px 16px ${sec.color}40)` : 'none' }}
                                            className="transition-all duration-200"
                                        />

                                        {/* Icon for section */}
                                        <foreignObject x={sec.x + sec.w / 2 - 10} y={sec.y + 15} width="20" height="20" style={{ pointerEvents: 'none' }}>
                                            <type.icon className="w-5 h-5 text-white/40" style={{ color: selected === sec.id ? '#fff' : sec.color }} />
                                        </foreignObject>

                                        <text
                                            x={sec.x + sec.w / 2} y={sec.y + sec.h / 2 + 15}
                                            textAnchor="middle" fill={selected === sec.id ? '#fff' : 'rgba(255,255,255,0.7)'}
                                            fontSize="11" fontWeight="800"
                                            style={{ pointerEvents: 'none', userSelect: 'none' }}
                                        >
                                            {sec.label}
                                        </text>

                                        {/* Resize handles or markers could be added here */}
                                    </g>
                                );
                            })}

                            {/* Entrance Marker */}
                            <circle cx="280" cy="380" r="8" fill="#10b981" className="animate-pulse" />
                            <text x="280" y="365" textAnchor="middle" fill="#10b981" fontSize="10" fontWeight="bold">المدخل</text>
                        </svg>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OwnerMap;
