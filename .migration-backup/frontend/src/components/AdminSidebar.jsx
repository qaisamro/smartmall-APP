import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import useAuthStore from '../store/useAuthStore';
import PushNotificationToggle from './PushNotificationToggle';
import NotificationSoundControl from './NotificationSoundControl';
import {
    LayoutDashboard, Building2, Users, Package, BarChart3, CreditCard,
    TrendingUp, MapPin, MessageSquare, FilePlus, Image, Shield,
    X, Store, ChevronDown, ChevronLeft, Activity, Megaphone, Bell, LogOut, Settings
} from 'lucide-react';

const sections = [
    {
        label: 'الرئيسية',
        items: [
            { to: '/admin', label: 'لوحة التحكم', icon: LayoutDashboard },
            { to: '/admin/malls', label: 'المنشآت', icon: Building2 },
            { to: '/admin/users', label: 'المستخدمون', icon: Users },
        ]
    },
    {
        label: 'الأعمال',
        items: [
            { to: '/admin/subscriptions', label: 'الاشتراكات', icon: CreditCard },
            { to: '/admin/products', label: 'المنتجات', icon: Package },
            { to: '/admin/accounting', label: 'المحاسبة', icon: BarChart3 },
            { to: '/admin/sales-reports', label: 'تقارير المبيعات', icon: TrendingUp },
        ]
    },
    {
        label: 'الإعدادات',
        items: [
            { to: '/admin/system-health', label: 'صحة النظام', icon: Shield },
            { to: '/admin/activity-logs', label: 'سجل النشاطات', icon: Activity },
            { to: '/admin/home-widgets', label: 'الواجهة الرئيسية', icon: LayoutDashboard },
            { to: '/admin/popups', label: 'الإعلانات المنبثقة', icon: Megaphone },
            { to: '/admin/delivery-zones', label: 'مناطق التوصيل', icon: MapPin },
            { to: '/admin/complaints', label: 'الشكاوى', icon: MessageSquare },
            { to: '/admin/excel-upload', label: 'رفع منتجات (Excel)', icon: FilePlus },
            { to: '/admin/bulk-photo-upload', label: 'تحديث الصور والأقسام', icon: Image },
            { to: '/admin/notifications', label: 'إرسال إشعار', icon: Bell },
        ]
    }
];

const AdminSidebar = ({ isOpen, onClose }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { logout } = useAuthStore();
    const [settingsOpen, setSettingsOpen] = useState(false);

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const isActive = (path) => {
        if (path === '/admin') return location.pathname === '/admin';
        return location.pathname.startsWith(path);
    };

    const handleNav = (path) => {
        navigate(path);
        if (onClose) onClose();
    };

    return (
        <aside className="flex flex-col">
            <div className="px-5 py-5 border-b border-white/5 flex items-center justify-between shrink-0 sticky top-0 bg-[#131325] z-10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
                        <Store className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <p className="font-extrabold text-sm text-white">SmartMall</p>
                        <p className="text-[10px] text-gray-500 font-medium">لوحة الإدارة</p>
                    </div>
                </div>
                {onClose && (
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 transition-colors lg:hidden">
                        <X className="w-4 h-4 text-gray-400" />
                    </button>
                )}
            </div>

            <nav className="px-3 py-5 space-y-7">
                {sections.map((section) => (
                    <div key={section.label}>
                        <p className="text-[10px] font-bold text-gray-600 uppercase tracking-[0.15em] mb-3 px-2">
                            {section.label}
                        </p>
                        <div className="space-y-0.5">
                            {section.items.map((item) => {
                                const active = isActive(item.to);
                                return (
                                    <button
                                        key={item.to}
                                        onClick={() => handleNav(item.to)}
                                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold transition-all rounded-2xl group relative ${active
                                            ? 'bg-indigo-500/12 text-indigo-400 shadow-lg shadow-indigo-500/5'
                                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                                        }`}
                                    >
                                        <item.icon className={`w-4.5 h-4.5 shrink-0 transition-colors ${active ? 'text-indigo-400' : 'text-gray-500 group-hover:text-gray-300'}`} />
                                        <span className="flex-1 text-right">{item.label}</span>
                                        {active && (
                                            <div className="w-1 h-1 rounded-full bg-indigo-400 animate-pulse shrink-0" />
                                        )}
                                        <ChevronLeft className={`w-3.5 h-3.5 shrink-0 transition-all ${active ? 'text-indigo-400/50' : 'text-gray-600 group-hover:text-gray-400'}`} />
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </nav>

            <div className="border-t border-white/5">
                <div className="px-5 py-4 space-y-3">
                    <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/5">
                        <Shield className="w-4.5 h-4.5 text-rose-400 shrink-0" />
                        <div className="flex-1">
                            <p className="text-xs font-bold text-white">مشرف عام</p>
                            <p className="text-[10px] text-gray-500 font-medium">التحكم الكامل</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setSettingsOpen(!settingsOpen)}
                        className="w-full flex items-center justify-between gap-2 px-4 py-3 rounded-2xl bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white transition-all text-sm font-bold"
                    >
                        <span className="flex items-center gap-2">
                            <Settings className="w-4 h-4 text-gray-400" />
                            الإعدادات
                        </span>
                        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${settingsOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {settingsOpen && (
                        <div className="space-y-3">
                            <PushNotificationToggle />
                            <div className="rounded-2xl bg-white/[0.03] overflow-hidden"><NotificationSoundControl variant="dark" /></div>
                        </div>
                    )}
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition-all border border-rose-500/20 text-sm font-bold"
                    >
                        <LogOut className="w-4 h-4" />
                        تسجيل خروج
                    </button>
                </div>
            </div>
        </aside>
    );
};

const AdminSidebarWrapper = ({ mobileOpen, onToggle, onClose }) => {

    return (
        <>
            {/* Desktop fixed sidebar */}
            <div className="hidden lg:block fixed top-20 bottom-6 w-64 z-40 overflow-hidden rounded-l-3xl border border-indigo-500/20 bg-gradient-to-b from-[#15152a] to-[#0e0e1f] left-auto" style={{ right: '0' }}>
                <div className="h-full overflow-y-auto">
                    <AdminSidebar />
                </div>
            </div>

            {/* Mobile sidebar overlay */}
            <AnimatePresence>
                {mobileOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm lg:hidden"
                        onClick={onClose}
                    >
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="absolute right-0 top-0 bottom-0 w-[85vw] max-w-sm bg-gradient-to-b from-[#15152a] to-[#0e0e1f] border-l border-white/10 overflow-y-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <AdminSidebar isOpen={mobileOpen} onClose={onClose} />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default AdminSidebarWrapper;
