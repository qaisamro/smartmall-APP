import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import { Shield, Store, ShoppingBag, User, Truck, Search, Eye, Users, Mail, UserPlus, Trash2, X, Loader2, Edit2, CheckCircle2, CircleOff, Phone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SECTIONS = [
    { key: 'admins', label: 'المشرفون', icon: Shield, color: 'text-rose-400', bg: 'bg-rose-500/10', roles: ['super-admin'] },
    { key: 'owners', label: 'مدراء المنشآت', icon: Store, color: 'text-purple-400', bg: 'bg-purple-500/10', roles: ['mall-owner', 'supermarket-owner'] },
    { key: 'staff', label: 'فريق العمل', icon: Truck, color: 'text-amber-400', bg: 'bg-amber-500/10', roles: ['delivery-person', 'order-tracker'] },
    { key: 'customers', label: 'الزبائن', icon: User, color: 'text-sky-400', bg: 'bg-sky-500/10', roles: ['customer'] },
];

const ROLE_BADGE = {
    'super-admin': { label: 'مدير عام', class: 'badge-rose' },
    'mall-owner': { label: 'صاحب مول', class: 'badge-purple' },
    'supermarket-owner': { label: 'صاحب سوبرماركت', class: 'badge-emerald' },
    'delivery-person': { label: 'مندوب توصيل', class: 'badge-amber' },
    'order-tracker': { label: 'متابع طلبات', class: 'badge-blue' },
    'customer': { label: 'زبون', class: 'badge-gray' },
};

const UserRow = ({ u, onEdit, onDelete, onToggleStatus }) => {
    const roleName = u.roles?.[0]?.name || 'customer';
    const badge = ROLE_BADGE[roleName] || ROLE_BADGE.customer;
    const isOwner = roleName === 'mall-owner' || roleName === 'supermarket-owner';
    const protectedUser = u.is_protected || roleName === 'super-admin';

    return (
        <tr className="hover:bg-white/[0.02] transition-colors">
            <td className="text-right pr-6">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center shrink-0 border border-white/5">
                        <User className="w-4 h-4 text-gray-400" />
                    </div>
                    <div className="text-right min-w-0">
                        <p className="text-sm font-bold text-white truncate max-w-[160px]">{u.name}</p>
                        <p className="text-[11px] text-gray-500 truncate max-w-[160px]">{u.email}</p>
                        {u.phone && <a href={`tel:${u.phone}`} className="text-[11px] text-amber-400/70 truncate max-w-[160px] dir-ltr text-right hover:underline hover:text-amber-400 block">{u.phone}</a>}
                    </div>
                </div>
            </td>
            <td className="text-xs text-gray-400">
                {isOwner && u.mall ? u.mall.name_ar : <span className="text-gray-600">—</span>}
            </td>
            <td><span className={`badge text-[11px] ${badge.class}`}>{badge.label}</span></td>
            <td className="text-xs text-gray-500 dir-ltr text-right">{new Date(u.created_at).toLocaleDateString('en-GB')}</td>
            <td>
                <button onClick={() => onToggleStatus(u)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all border ${u.is_active ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20'}`}>
                    {u.is_active ? <CheckCircle2 className="w-3 h-3" /> : <CircleOff className="w-3 h-3" />}
                    {u.is_active ? 'نشط' : 'معطل'}
                </button>
            </td>
            <td className="pl-6">
                <div className="flex items-center gap-1.5">
                    <button onClick={() => onEdit(u)}
                        className="p-2 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white transition-all">
                        <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {!protectedUser && (
                        <button onClick={() => onDelete(u.id)}
                            className="p-2 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white transition-all">
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            </td>
        </tr>
    );
};

const UserCard = ({ u, onEdit, onDelete, onToggleStatus }) => {
    const roleName = u.roles?.[0]?.name || 'customer';
    const badge = ROLE_BADGE[roleName] || ROLE_BADGE.customer;
    const isOwner = roleName === 'mall-owner' || roleName === 'supermarket-owner';
    const protectedUser = u.is_protected || roleName === 'super-admin';

    return (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl border border-white/5 p-4">
            <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-white/5 flex items-center justify-center shrink-0 border border-white/5">
                    <User className="w-5 h-5 text-gray-400" />
                </div>
                <div className="flex-1 min-w-0 text-right">
                    <p className="font-bold text-sm text-white truncate">{u.name}</p>
                    <p className="text-xs text-gray-500 truncate">{u.email}</p>
                    {u.phone && <a href={`tel:${u.phone}`} className="text-[10px] text-amber-400/70 truncate dir-ltr text-right hover:underline hover:text-amber-400 block">{u.phone}</a>}
                    {isOwner && u.mall && <p className="text-[10px] text-gray-600 truncate">{u.mall.name_ar}</p>}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => onEdit(u)}
                        className="p-2 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white transition-all">
                        <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {!protectedUser && (
                        <button onClick={() => onDelete(u.id)}
                            className="p-2 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white transition-all">
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            </div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                <span className={`badge text-[10px] ${badge.class}`}>{badge.label}</span>
                <button onClick={() => onToggleStatus(u)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all border ${u.is_active ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                    {u.is_active ? 'نشط' : 'معطل'}
                </button>
            </div>
        </motion.div>
    );
};

const UserModal = ({ show, onClose, title, subtitle, children }) => (
    <AnimatePresence>
        {show && (
            <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, y: 60 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 60 }}
                    className="w-full sm:max-w-md glass-dark p-6 sm:p-8 rounded-t-[2rem] sm:rounded-[2rem] border border-white/10 relative max-h-[90vh] overflow-y-auto"
                >
                    <button onClick={onClose} className="absolute top-5 left-5 p-2 rounded-full hover:bg-white/10 transition-colors">
                        <X className="w-5 h-5 text-gray-400 hover:text-white" />
                    </button>
                    <h3 className="text-xl sm:text-2xl font-bold mb-1 text-right">{title}</h3>
                    {subtitle && <p className="text-gray-500 text-sm mb-6 text-right">{subtitle}</p>}
                    {children}
                </motion.div>
            </div>
        )}
    </AnimatePresence>
);

const SectionCard = ({ section, users, onEdit, onDelete, onToggleStatus, togglePending }) => {
    const Icon = section.icon;
    if (users.length === 0) return null;

    return (
        <div className="glass-card rounded-3xl border border-white/5 overflow-hidden">
            <div className={`px-6 py-4 border-b border-white/5 flex items-center justify-between ${section.bg}`}>
                <span className="text-xs text-gray-500 font-bold">{users.length}</span>
                <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${section.color}`} />
                    <span className={`text-sm font-bold ${section.color}`}>{section.label}</span>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="data-table min-w-[900px]">
                    <thead>
                        <tr className="bg-white/[0.02]">
                            <th className="text-right pr-6">المستخدم</th>
                            <th>المنشأة</th>
                            <th>الدور</th>
                            <th>تاريخ التسجيل</th>
                            <th>الحالة</th>
                            <th className="pl-6">الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.02]">
                        {users.map(u => (
                            <UserRow key={u.id} u={u}
                                onEdit={onEdit}
                                onDelete={onDelete}
                                onToggleStatus={onToggleStatus}
                            />
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const SectionCards = ({ section, users, onEdit, onDelete, onToggleStatus }) => {
    const Icon = section.icon;
    if (users.length === 0) return null;

    return (
        <div>
            <div className={`flex items-center gap-2 pr-1 mb-3 ${section.color}`}>
                <Icon className="w-4 h-4" />
                <span className="text-xs font-bold">{section.label}</span>
                <span className="text-xs text-gray-600">({users.length})</span>
            </div>
            <div className="space-y-3">
                {users.map(u => (
                    <UserCard key={u.id} u={u}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        onToggleStatus={onToggleStatus}
                    />
                ))}
            </div>
        </div>
    );
};

const AdminUsers = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [showModal, setShowModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editUserData, setEditUserData] = useState(null);
    const [search, setSearch] = useState('');
    const [activeSection, setActiveSection] = useState('all');
    const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'delivery-person' });
    const [editFormData, setEditFormData] = useState({ name: '', email: '', phone: '', role: '', password: '', is_active: true });

    const { data: users, isLoading } = useQuery({
        queryKey: ['admin-users'],
        queryFn: async () => {
            const r = await api.get('/admin/users');
            return r.data;
        }
    });

    const createUserMutation = useMutation({
        mutationFn: async (data) => {
            const r = await api.post('/admin/users', data);
            return r.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-users', 'admin-stats'] });
            setShowModal(false);
            setFormData({ name: '', email: '', password: '', role: 'delivery-person' });
        }
    });

    const deleteUserMutation = useMutation({
        mutationFn: async (id) => await api.delete(`/admin/users/${id}`),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users', 'admin-stats'] })
    });

    const updateUserMutation = useMutation({
        mutationFn: async ({ id, data }) => {
            const r = await api.put(`/admin/users/${id}`, data);
            return r.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-users', 'admin-stats'] });
            setShowEditModal(false);
            setEditUserData(null);
        }
    });

    const toggleActiveMutation = useMutation({
        mutationFn: async (u) => await api.put(`/admin/users/${u.id}`, { is_active: !u.is_active }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users', 'admin-stats'] })
    });

    const openEditModal = (u) => {
        setEditUserData(u);
        setEditFormData({
            name: u.name,
            email: u.email,
            phone: u.phone || '',
            role: u.roles?.[0]?.name || '',
            password: '',
            is_active: u.is_active
        });
        setShowEditModal(true);
    };

    const userList = Array.isArray(users) ? users : [];

    const filtered = useMemo(() => {
        if (!search) return userList;
        const q = search.toLowerCase();
        return userList.filter(u =>
            u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.phone?.toLowerCase().includes(q)
        );
    }, [userList, search]);

    const grouped = useMemo(() => {
        const groups = {};
        for (const s of SECTIONS) {
            groups[s.key] = filtered.filter(u => {
                const role = u.roles?.[0]?.name;
                return s.roles.includes(role);
            });
        }
        return groups;
    }, [filtered]);

    const stats = useMemo(() => {
        const s = {};
        for (const section of SECTIONS) {
            s[section.key] = grouped[section.key]?.length || 0;
        }
        return s;
    }, [grouped]);

    const visibleSections = activeSection === 'all'
        ? SECTIONS
        : SECTIONS.filter(s => s.key === activeSection);

    return (
        <div className="space-y-6 pb-10">
            {/* Header */}
            <header className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 text-right">
                <div className="space-y-3">
                    <h2 className="text-2xl sm:text-3xl font-extrabold flex items-center gap-3">
                        إدارة المستخدمين
                        <Users className="w-8 h-8 text-blue-400" />
                    </h2>
                    <p className="text-gray-400 text-sm">إدارة حسابات المنصة — مشرفين، مدراء منشآت، فريق عمل، زبائن</p>
                </div>
                <button onClick={() => setShowModal(true)} className="btn-primary !py-3 !px-6 shrink-0">
                    <UserPlus className="w-4 h-4" />
                    إضافة مستخدم
                </button>
            </header>

            {/* Stats Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {SECTIONS.map(s => {
                    const Icon = s.icon;
                    return (
                        <button key={s.key} onClick={() => setActiveSection(activeSection === s.key ? 'all' : s.key)}
                            className={`glass-card p-4 rounded-2xl border text-right transition-all ${activeSection === s.key || activeSection === 'all' ? s.bg + ' ' + s.color : 'border-white/5 text-gray-500 hover:bg-white/5'}`}>
                            <div className="flex items-center justify-between">
                                <Icon className="w-5 h-5" />
                                <span className="text-2xl font-black">{stats[s.key]}</span>
                            </div>
                            <p className="text-xs mt-1 font-bold">{s.label}</p>
                        </button>
                    );
                })}
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input type="text" placeholder="بحث بالاسم أو البريد الإلكتروني..."
                    value={search} onChange={e => setSearch(e.target.value)}
                    className="input-field w-full pr-11 text-sm" />
            </div>

            {/* Desktop */}
            <div className="hidden md:space-y-6 md:block">
                {isLoading ? (
                    <div className="glass-card rounded-3xl p-12 text-center border border-white/5">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-400" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="glass-card rounded-3xl p-12 text-center border border-white/5">
                        <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p className="text-gray-500 font-bold">لا يوجد مستخدمون</p>
                    </div>
                ) : (
                    visibleSections.map(section => (
                        <SectionCard key={section.key} section={section}
                            users={grouped[section.key]}
                            onEdit={openEditModal}
                            onDelete={(id) => { if (window.confirm('هل أنت متأكد من حذف هذا المستخدم وجميع بياناته؟')) deleteUserMutation.mutate(id); }}
                            onToggleStatus={(user) => toggleActiveMutation.mutate(user)}
                            togglePending={toggleActiveMutation.isPending}
                        />
                    ))
                )}
            </div>

            {/* Mobile */}
            <div className="md:hidden space-y-6">
                {isLoading ? (
                    <div className="text-center py-12"><Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-400" /></div>
                ) : filtered.length === 0 ? (
                    <div className="py-12 text-center text-gray-500">لا يوجد مستخدمون</div>
                ) : (
                    visibleSections.map(section => (
                        <SectionCards key={section.key} section={section}
                            users={grouped[section.key]}
                            onEdit={openEditModal}
                            onDelete={(id) => { if (window.confirm('هل أنت متأكد من حذف هذا المستخدم وجميع بياناته؟')) deleteUserMutation.mutate(id); }}
                            onToggleStatus={(user) => toggleActiveMutation.mutate(user)}
                        />
                    ))
                )}
            </div>

            {/* Create Modal */}
            <UserModal show={showModal} onClose={() => setShowModal(false)} title="إضافة مستخدم جديد" subtitle="أدخل بيانات الحساب الجديد وصلاحياته">
                <form onSubmit={(e) => { e.preventDefault(); createUserMutation.mutate(formData); }} className="space-y-4 text-right">
                    <div>
                        <label className="block text-sm font-semibold text-gray-400 mb-2">الاسم الكامل</label>
                        <div className="relative group">
                            <User className="absolute right-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-500 group-focus-within:text-blue-400" />
                            <input type="text" required placeholder="أحمد محمود"
                                value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="input-field pr-11" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-400 mb-2">البريد الإلكتروني</label>
                        <div className="relative group">
                            <Mail className="absolute right-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-500 group-focus-within:text-blue-400" />
                            <input type="email" required  placeholder="email@example.com"
                                value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })}
                                className="input-field pr-11 text-right" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-400 mb-2">
                            رقم الهاتف
                            {formData.role === 'delivery-person' && <span className="text-rose-400 mr-1">*</span>}
                        </label>
                        <div className="relative group">
                            <Phone className="absolute right-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-500 group-focus-within:text-blue-400" />
                            <input type="tel" required={formData.role === 'delivery-person'}  placeholder="05xxxxxxxx"
                                value={formData.phone || ''} onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                className="input-field pr-11 text-right" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-400 mb-2">الصلاحية</label>
                        <div className="relative group">
                            <Shield className="absolute right-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-500 group-focus-within:text-blue-400" />
                            <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })}
                                className="input-field pr-11 appearance-none bg-gray-900 cursor-pointer">
                                <option value="delivery-person">مندوب توصيل</option>
                                <option value="order-tracker">متابع طلبات</option>
                                <option value="super-admin">مشرف عام (إدارة المنصة)</option>
                            </select>
                        </div>
                    </div>
                    <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-center">
                        <p className="text-xs text-indigo-400 font-bold">
                            يتم إنشاء حسابات مدراء المنشآت تلقائياً عند إضافة منشأة جديدة من قسم <button type="button" onClick={() => navigate('/admin/malls')} className="underline hover:text-white">المنشآت</button>
                        </p>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-400 mb-2">كلمة المرور المؤقتة</label>
                        <input type="text" required  minLength={6} placeholder="••••••••"
                            value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })}
                            className="input-field text-right" />
                        <p className="text-xs text-amber-500/80 mt-2 pr-1">سيتمكن المستخدم من الدخول باستخدامها</p>
                    </div>
                    <button type="submit" disabled={createUserMutation.isPending}
                        className="btn-primary w-full !py-4 mt-2">
                        {createUserMutation.isPending ? <Loader2 className="animate-spin w-5 h-5 mx-auto" /> : 'اعتماد وإنشاء الحساب'}
                    </button>
                </form>
            </UserModal>

            {/* Edit Modal */}
            <UserModal show={showEditModal} onClose={() => setShowEditModal(false)} title="تعديل المستخدم" subtitle="تحديث بيانات الحساب وصلاحياته">
                <form onSubmit={(e) => {
                    e.preventDefault();
                    if (!editUserData) return;
                    const data = { ...editFormData };
                    if (!data.password) delete data.password;
                    updateUserMutation.mutate({ id: editUserData.id, data });
                }} className="space-y-4 text-right">
                    <div>
                        <label className="block text-sm font-semibold text-gray-400 mb-2">الاسم الكامل</label>
                        <div className="relative group">
                            <User className="absolute right-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-500 group-focus-within:text-blue-400" />
                            <input type="text" required placeholder="أحمد محمود"
                                value={editFormData.name} onChange={e => setEditFormData({ ...editFormData, name: e.target.value })}
                                className="input-field pr-11" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-400 mb-2">البريد الإلكتروني</label>
                        <div className="relative group">
                            <Mail className="absolute right-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-500 group-focus-within:text-blue-400" />
                            <input type="email" required  placeholder="email@example.com"
                                value={editFormData.email} onChange={e => setEditFormData({ ...editFormData, email: e.target.value })}
                                className="input-field pr-11 text-right" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-400 mb-2">رقم الهاتف</label>
                        <div className="relative group">
                            <Phone className="absolute right-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-500 group-focus-within:text-blue-400" />
                            <input type="tel"  placeholder="05xxxxxxxx"
                                value={editFormData.phone} onChange={e => setEditFormData({ ...editFormData, phone: e.target.value })}
                                className="input-field pr-11 text-right" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-400 mb-2">الصلاحية</label>
                        <div className="relative group">
                            <Shield className="absolute right-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-500 group-focus-within:text-blue-400" />
                            <select value={editFormData.role} onChange={e => setEditFormData({ ...editFormData, role: e.target.value })}
                                className="input-field pr-11 appearance-none bg-gray-900 cursor-pointer">
                                <option value="delivery-person">مندوب توصيل</option>
                                <option value="order-tracker">متابع طلبات</option>
                                <option value="super-admin">مشرف عام (إدارة المنصة)</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-400 mb-2">حالة الحساب</label>
                        <button type="button" onClick={() => setEditFormData({ ...editFormData, is_active: !editFormData.is_active })}
                            className={`w-full px-4 py-3 rounded-full font-bold text-sm flex items-center justify-center gap-2 transition-all border ${editFormData.is_active ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border-rose-500/30'}`}>
                            <div className={`w-2 h-2 rounded-full ${editFormData.is_active ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                            {editFormData.is_active ? 'نشط' : 'معطل'}
                        </button>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-400 mb-2">كلمة مرور جديدة <span className="text-gray-600">(اختياري)</span></label>
                        <input type="text"  minLength={6} placeholder="اتركه فارغاً إن لم ترد التغيير"
                            value={editFormData.password} onChange={e => setEditFormData({ ...editFormData, password: e.target.value })}
                            className="input-field text-right" />
                    </div>
                    <button type="submit" disabled={updateUserMutation.isPending}
                        className="btn-primary w-full !py-4 mt-2">
                        {updateUserMutation.isPending ? <Loader2 className="animate-spin w-5 h-5 mx-auto" /> : 'حفظ التعديلات'}
                    </button>
                </form>
            </UserModal>
        </div>
    );
};

export default AdminUsers;
