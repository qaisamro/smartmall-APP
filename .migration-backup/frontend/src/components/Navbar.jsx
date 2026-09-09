import React, { useState, useEffect, useRef, useCallback } from 'react';
import logo from '../assets/images/logo.webp';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LogOut, Menu, ShoppingCart, User, X, Home,
    Building2, LayoutDashboard, Package, Map, Users, Store,
    ChevronDown, Receipt, Settings, FilePlus, CreditCard, History as HistoryIcon,
    BarChart3, TrendingUp, ScanLine, FileCheck, Truck, Search, MapPin as MapPinIcon,
    Bell, Sparkles, MessageSquare, Truck as TruckIcon, UserCog, Loader2,
    ChevronLeft, CheckCheck, Megaphone, Sun, ArrowLeftFromLine, ArrowRightFromLine,
    FileSpreadsheet
} from 'lucide-react';
import useAuthStore from '../store/useAuthStore';
import useCartStore from '../store/useCartStore';
import { shallow } from 'zustand/shallow';
import { useSearch } from '../hooks/useSearch';
import NotificationsDropdown from './NotificationsDropdown';
import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';
import PushNotificationToggle from './PushNotificationToggle';
import NotificationSoundControl from './NotificationSoundControl';

const Navbar = ({ onAdminToggle }) => {
    const isAuthenticated = useAuthStore(state => state.isAuthenticated);
    const user = useAuthStore(state => state.user);
    const logout = useAuthStore(state => state.logout);
    const fetchUser = useAuthStore(state => state.fetchUser);
    const items = useCartStore(state => state.items);
    const [menuOpen, setMenuOpen] = useState(false);
    const [userSidebarOpen, setUserSidebarOpen] = useState(() => window.innerWidth >= 1024);
    const [scrolled, setScrolled] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    const role = user?.roles?.[0]?.name || user?.role || (Array.isArray(user?.roles) && typeof user.roles[0] === 'string' ? user.roles[0] : null);
    const isOwner = role === 'mall-owner' || role === 'supermarket-owner';
    const isAdmin = role === 'super-admin';
    const isDelivery = role === 'delivery-person';
    const isTracker = role === 'order-tracker';
    const showSearch = !isAuthenticated || role === 'customer';
    const cartCount = items?.length ?? 0;

    useEffect(() => {
        fetchUser();
    }, []);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', onScroll);
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    useEffect(() => {
        const isAdminRoute = location.pathname.startsWith('/admin');
        document.documentElement.style.setProperty('--user-sidebar-width', isAuthenticated && !isAdminRoute && userSidebarOpen ? '288px' : '0px');
    }, [isAuthenticated, userSidebarOpen, location.pathname]);

    useEffect(() => {
        setMenuOpen(false);
        setProfileOpen(false);
    }, [location.pathname]);

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    const goTo = (path) => {
        setMenuOpen(false);
        setProfileOpen(false);
        navigate(path);
    };

    // Role-based nav links (desktop top bar — sidebar handles admin nav)
    const navLinks = isOwner
            ? [
                { to: '/owner', label: 'الرئيسية', icon: LayoutDashboard },
                { to: '/owner/products', label: 'المنتجات والمخزون', icon: Package },
                { to: '/owner/sales', label: 'المبيعات والتقارير المالية', icon: TrendingUp },
                // Shared owner features
                // { to: '/owner/branches', label: 'الخريطة', icon: Map },
                { to: '/owner/excel-upload', label: 'رفع منتجات (Excel)', icon: FileSpreadsheet },
                { to: '/owner/invoice-scanner', label: 'قارئ الفواتير', icon: FileCheck },
                // Supermarket-only features
                ...(user?.mall?.type === 'supermarket' ? [
                    { to: '/owner/pos', label: 'نقطة البيع (POS)', icon: Receipt },
                    { to: '/owner/scanner', label: 'ماسح المنتجات', icon: ScanLine },
                ] : []),
                ...(user?.mall?.delivery_enabled ? [
                    { to: '/owner/delivery', label: 'إدارة التوصيل', icon: Truck },
                ] : []),
                { to: '/owner/offers', label: 'العروض الخاصة', icon: Sparkles },
                { to: '/owner/settings', label: 'هوية المول (QR)', icon: Settings },
            ]
            : role === 'delivery-person'
                ? [
                    { to: '/delivery', label: 'لوحة التوصيل', icon: Truck },
                ]
                    : role === 'order-tracker'
                    ? [
                        { to: '/tracker', label: 'تتبع الطلبات', icon: Search },
                        { to: '/tracker?mode=search', label: 'بحث وتقارير', icon: BarChart3 },
                    ]
                    : role === 'super-admin'
                        ? []
                        : [
                                { to: '/', label: 'الرئيسية', icon: Home },
                                { to: '/malls', label: 'المولات', icon: Store },
                                // Customer links (only for authenticated customers)
                                ...(isAuthenticated ? [
                                    { to: '/offers', label: 'العروض', icon: Sparkles },
                                    { to: '/my-purchases', label: 'مشترياتي', icon: HistoryIcon },
                                    { to: '/order-tracking', label: 'تتبع الطلبات', icon: TruckIcon },
                                    { to: '/complaints', label: 'الشكاوى', icon: MessageSquare },
                                    { to: '/customer/settings', label: 'الإعدادات', icon: UserCog },
                                ] : []),
                            ];

    const dashboardPath = role === 'super-admin' || role === 'admin' ? '/admin' : isOwner ? '/owner' : role === 'delivery-person' ? '/delivery' : role === 'order-tracker' ? '/tracker' : '/';

    const roleLabel = role === 'super-admin' ? 'مشرف عام' :
        isOwner ? (user?.mall?.name_ar || (user?.mall?.type === 'supermarket' ? 'صاحب سوبرماركت' : 'صاحب مول')) :
            role === 'delivery-person' ? 'مندوب توصيل' :
                role === 'order-tracker' ? 'متابع طلبات' : 'زبون';
    const roleBadgeClass = role === 'super-admin' ? 'badge-rose' :
        isOwner ? (user?.mall?.type === 'supermarket' ? 'badge-emerald' : 'badge-purple') :
            role === 'delivery-person' ? 'badge-amber' :
                role === 'order-tracker' ? 'badge-blue' : 'badge-blue';

    const isActive = (path) => {
        if (path.includes('?')) return location.pathname + location.search === path;
        if (path === location.pathname && location.search) return false;
        return location.pathname === path;
    };

    const sidebarContent = (
        <div className="px-1 py-4 space-y-4">
            {/* User info */}
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
                    <User className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                    <p className="font-bold text-sm truncate text-gray-900">{user?.name}</p>
                    <span className={`badge ${roleBadgeClass} text-[10px]`}>{roleLabel}</span>
                </div>
            </div>

            {/* Nav links */}
            {navLinks.length > 0 && (
                <div className="border-t border-gray-100 pt-4 space-y-1">
                    <p className="text-xs font-bold text-gray-500 mb-2">القائمة</p>
                    {navLinks.map((link) => {
                        const active = isActive(link.to);
                        return (
                            <button
                                key={link.to}
                                onClick={() => { goTo(link.to); if (window.innerWidth < 1024) setUserSidebarOpen(false); }}
                                className={`w-full flex flex-row-reverse items-center gap-3 px-2 py-2.5 rounded-xl text-sm font-medium text-right transition-all ${active
                                    ? 'bg-indigo-50 text-indigo-700'
                                    : 'text-gray-700 hover:bg-gray-100'
                                }`}
                            >
                                <link.icon className={`w-4 h-4 shrink-0 ${active ? 'text-indigo-500' : 'text-gray-400'}`} />
                                <span className="flex-1 truncate">{link.label}</span>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Settings: Notifications + Sound (collapsible) */}
            <div className="border-t border-gray-100 pt-4">
                <button
                    onClick={() => setSettingsOpen(!settingsOpen)}
                    className="w-full flex flex-row-reverse items-center gap-3 px-2 py-2.5 rounded-xl text-sm font-medium text-right text-gray-700 hover:bg-gray-100 transition-all"
                >
                    <Settings className="w-4 h-4 shrink-0 text-gray-400" />
                    <span className="flex-1 truncate">الإعدادات</span>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${settingsOpen ? 'rotate-180' : ''}`} />
                </button>
                {settingsOpen && (
                    <div className="mt-2 space-y-2">
                        <PushNotificationToggle />
                        <NotificationSoundControl />
                    </div>
                )}
            </div>

            {/* Logout */}
            <div className="border-t border-gray-100 pt-4">
                <button onClick={() => { handleLogout(); if (window.innerWidth < 1024) setUserSidebarOpen(false); }}
                    className="w-full flex flex-row-reverse items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-right text-red-600 hover:bg-red-50 transition-all">
                    <LogOut className="w-4 h-4 shrink-0" />
                    <span className="flex-1">تسجيل الخروج</span>
                </button>
            </div>
        </div>
    );

    return (
        <>
            <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 shadow-2xl' : 'bg-white/90 border-b border-gray-200'}`}>
                <div className={`mx-auto px-4 sm:px-6 transition-all duration-300 ${isAuthenticated && userSidebarOpen ? 'lg:pl-[288px]' : ''}`}>
                    <div className="flex items-center justify-between h-16 sm:h-18 gap-3">

                        {/* Logo */}
                        <button onClick={() => goTo(dashboardPath)} className="flex items-center gap-2.5 group shrink-0" aria-label="Home">
                            <div className="w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center transition-all overflow-hidden rounded-xl bg-white/80 shadow-sm">
                                <img src={logo} alt="SmartMall" className="w-full h-full object-contain p-1.5" width="48" height="48" loading="eager" />
                            </div>
                            <span className="text-base sm:text-lg font-extrabold gradient-text-blue hidden sm:block">SmartMall</span>
                        </button>

                        {/* Search Bar — prominent */}
                        {showSearch && (
                            <div className="flex-1 max-w-2xl mx-auto">
                                <GlobalSearch />
                            </div>
                        )}

                        {/* Right Actions */}
                        <div className="flex items-center gap-1.5 sm:gap-2">
                            {isAuthenticated ? (
                                <>
                                    {/* Cart */}
                                    {role === 'customer' && (
                                        <button onClick={() => goTo('/cart')}
                                            className="relative p-2.5 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all border border-gray-200"
                                            title="السلة">
                                            <ShoppingCart className="w-5 h-5" />
                                            {cartCount > 0 && (
                                                <span className="absolute -top-1 -right-1 bg-indigo-500 text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full text-white shadow-lg shadow-indigo-500/30">
                                                    {cartCount}
                                                </span>
                                            )}
                                        </button>
                                    )}

                                    {/* Notifications Bell */}
                                    <NotificationsDropdown />

                                    {/* Desktop: sidebar toggle (collapse/expand) — hide on admin routes */}
                                    {!location.pathname.startsWith('/admin') && (
                                        <button onClick={() => setUserSidebarOpen(!userSidebarOpen)}
                                            className="hidden lg:flex p-2.5 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all border border-gray-200"
                                            title="القائمة الجانبية">
                                            {userSidebarOpen ? <ArrowRightFromLine className="w-5 h-5" /> : <ArrowLeftFromLine className="w-5 h-5" />}
                                        </button>
                                    )}

                                    {/* Mobile: sidebar toggle */}
                                    <button onClick={() => location.pathname.startsWith('/admin') ? onAdminToggle?.() : setUserSidebarOpen(true)}
                                        className="lg:hidden p-2.5 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all border border-gray-200"
                                        title="القائمة">
                                        <Menu className="w-5 h-5" />
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button onClick={() => goTo('/cart')}
                                        className="relative p-2.5 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all border border-gray-200"
                                        title="السلة">
                                        <ShoppingCart className="w-5 h-5" />
                                        {cartCount > 0 && (
                                            <span className="absolute -top-1 -right-1 bg-indigo-500 text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full text-white shadow-lg shadow-indigo-500/30">
                                                {cartCount}
                                            </span>
                                        )}
                                    </button>
                                    <div className="hidden sm:flex items-center gap-2">
                                        <Link to="/register" className="btn-secondary !bg-gray-100 !text-gray-700 !py-2 !px-4 !text-sm !rounded-xl hover:!bg-gray-200 !border-gray-200">إنشاء حساب</Link>
                                        <button onClick={() => goTo('/login')} className="btn-primary !bg-indigo-500 !text-white !py-2 !px-4 !text-sm !rounded-xl hover:!bg-indigo-600">دخول</button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </nav>

            {/* Desktop: Persistent Sidebar */}
            {isAuthenticated && !location.pathname.startsWith('/admin') && (
                <aside className={`hidden lg:block fixed top-0 right-0 h-full z-40 bg-white border-l border-gray-200 shadow-2xl transition-all duration-300 ${userSidebarOpen ? 'w-72' : 'w-0 overflow-hidden'}`}>
                    <div className="h-16" />
                    <div className="h-[calc(100%-4rem)] overflow-y-auto">
                        {sidebarContent}
                    </div>
                </aside>
            )}

            {/* Mobile: Sidebar Drawer */}
            <AnimatePresence>
                {isAuthenticated && !location.pathname.startsWith('/admin') && userSidebarOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 lg:hidden"
                            onClick={() => setUserSidebarOpen(false)}
                        />
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 250 }}
                            className="fixed inset-0 z-50 lg:hidden flex flex-col bg-white"
                        >
                            <div className="flex items-center justify-between p-4 shrink-0 border-b border-gray-100">
                                <span className="text-sm font-bold text-gray-700">{user?.name || 'القائمة'}</span>
                                <button onClick={() => setUserSidebarOpen(false)} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
                                    <X className="w-5 h-5 text-gray-500" />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto pb-20">
                                {sidebarContent}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Mobile Menu (guests) */}
            <AnimatePresence>
                {menuOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="lg:hidden overflow-hidden border-t border-white/5 bg-[#0a0a0f]/95 backdrop-blur-xl"
                    >
                        <div className="p-4 space-y-3">
                            {/* User info */}
                            {isAuthenticated && (
                                <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 mb-2">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/20">
                                        <User className="w-6 h-6 text-white" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-bold text-base truncate text-white">{user?.name}</p>
                                        <span className={`badge ${roleBadgeClass} text-[10px] mt-1`}>{roleLabel}</span>
                                    </div>
                                </div>
                            )}

                            {/* Nav links */}
                            {isAuthenticated && (
                                <div className="grid grid-cols-1 gap-2">
                                    {navLinks.map((link) => {
                                        const active = isActive(link.to);
                                        return (
                                            <button
                                                key={link.to}
                                                onClick={() => goTo(link.to)}
                                                className={`w-full flex flex-row-reverse items-center gap-4 px-4 py-4 rounded-2xl font-bold text-sm text-right transition-all ${active
                                                    ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                                                    : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                                                    }`}
                                            >
                                                <link.icon className={`w-5 h-5 shrink-0 ${active ? 'text-indigo-400' : 'text-gray-500'}`} />
                                                <span className="flex-1">{link.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

                            <div className="border-t border-white/5 pt-4 mt-2 space-y-3">
                                {isAuthenticated ? (
                                    <>
                                        <button onClick={() => goTo(dashboardPath)} className="w-full flex flex-row-reverse items-center gap-4 px-4 py-4 rounded-2xl font-black text-sm bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                                            <LayoutDashboard className="w-5 h-5 shrink-0" />
                                            <span className="flex-1">لوحة التحكم</span>
                                        </button>
                                        <button onClick={handleLogout} className="w-full flex flex-row-reverse items-center gap-4 px-4 py-4 rounded-2xl font-black text-sm bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                            <LogOut className="w-5 h-5 shrink-0" />
                                            <span className="flex-1">تسجيل الخروج</span>
                                        </button>
                                    </>
                                ) : (
                                    <div className="space-y-3">
                                        <button onClick={() => goTo('/login')} className="btn-primary w-full !rounded-2xl !py-5 !bg-indigo-600 shadow-xl shadow-indigo-600/20 text-base">تسجيل الدخول</button>
                                        <button onClick={() => goTo('/register')} className="btn-secondary w-full !rounded-2xl !py-5 !bg-white/5 !border-white/10 !text-white font-black text-base">إنشاء حساب جديد</button>
                                        <div className="pt-2">
                                            <button onClick={() => goTo('/cart')} className="w-full flex flex-row-reverse items-center justify-center gap-3 px-4 py-4 rounded-2xl font-bold text-sm bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10 hover:text-white transition-all">
                                                <ShoppingCart className="w-5 h-5 shrink-0" />
                                                <span className="flex-1">عرض السلة {cartCount > 0 && `(${cartCount})`}</span>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

const GlobalSearch = () => {
    const [open, setOpen] = useState(false);
    const [focused, setFocused] = useState(false);
    const [activeTab, setActiveTab] = useState('all');
    const ref = useRef(null);
    const navigate = useNavigate();

    const searchFn = useCallback(async (q, signal) => {
        const r = await api.get(`/search/global?query=${encodeURIComponent(q)}`, { signal });
        return r.data;
    }, []);

    const { query, setQuery, results, isLoading: loading, clearSearch: clearSearchHook } = useSearch(searchFn, 400, 2);

    const handleChange = (e) => {
        const v = e.target.value;
        setQuery(v);
        if (v.length >= 2) setOpen(true);
        else setOpen(false);
    };

    const clearSearch = () => {
        clearSearchHook();
        setOpen(false);
        setActiveTab('all');
    };

    useEffect(() => {
        if (results) {
            setOpen(true);
            setActiveTab('all');
        } else {
            setOpen(false);
        }
    }, [results]);

    useEffect(() => {
        const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setFocused(false); } };
        document.addEventListener('mousedown', handleClick);
        return () => { document.removeEventListener('mousedown', handleClick); };
    }, []);

    return (
        <div ref={ref} className="relative w-full">
            <div className={`relative transition-all duration-200 ${focused ? 'ring-2 ring-indigo-500/30' : ''}`}>
                <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400 pointer-events-none" />
                <input
                    type="text" value={query} onChange={handleChange}
                    onFocus={() => { setFocused(true); if (results) setOpen(true); }}
                    placeholder="ابحث عن منتج في كل المولات..."
                    className="w-full bg-gray-100 border border-gray-200 rounded-xl py-2.5 pr-10 pl-9 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:border-indigo-400 transition-all"
                />
                {loading && <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />}
                {query && !loading && (
                    <button onClick={clearSearch} className="absolute left-2.5 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600 transition-colors">
                        <X className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>
            {open && results && (
                <div className="absolute top-full mt-2 left-0 right-0 bg-white rounded-2xl shadow-2xl border border-gray-200 max-h-96 overflow-y-auto z-50">
                    {results.total === 0 ? (
                        <div className="p-8 text-center text-gray-500 text-sm">لا توجد نتائج لعبارة "<span className="font-bold text-gray-700">{query}</span>"</div>
                    ) : (
                        <>
                            <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50/50 text-xs text-gray-500 font-medium flex items-center justify-between gap-2">
                                <span>{results.total} منتج مطابق — في {results.grouped?.length || 0} مول/سوبرماركت</span>
                            </div>

                            {/* Mall tabs */}
                            {results.grouped?.length > 1 && (
                                <div className="px-2 pt-2 flex gap-1.5 overflow-x-auto scrollbar-thin border-b border-gray-100 pb-2">
                                    <button
                                        onClick={() => setActiveTab('all')}
                                        className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors border ${activeTab === 'all' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'}`}
                                    >
                                        الكل ({results.total})
                                    </button>
                                    {results.grouped?.map(g => (
                                        <button
                                            key={g.mall_slug}
                                            onClick={() => setActiveTab(g.mall_slug)}
                                            className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors border flex items-center gap-1.5 ${activeTab === g.mall_slug ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'}`}
                                        >
                                            <Store className="w-3.5 h-3.5" />
                                            {g.mall_name}
                                            <span className={`${activeTab === g.mall_slug ? 'bg-white/20' : 'bg-gray-300/70'} rounded-full px-1.5 text-[10px]`}>{g.products?.length || 0}</span>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {results.grouped?.length === 1 ? (
                                /* Single mall: show products with mall header */
                                <div key={results.grouped[0].mall_slug} className="border-b border-gray-100 last:border-0">
                                    <button
                                        onClick={() => { clearSearch(); navigate(`/mall/${results.grouped[0].mall_slug}`); }}
                                        className="w-full text-right px-4 py-2.5 bg-gray-50 hover:bg-gray-100 text-sm font-bold text-indigo-600 flex items-center gap-2 transition-colors"
                                    >
                                        <Store className="w-4 h-4" />{results.grouped[0].mall_name}
                                        <span className="mr-auto text-[10px] text-gray-400 font-normal">{results.grouped[0].products?.length || 0} منتج</span>
                                    </button>
                                    {results.grouped[0].products?.slice(0, 6).map(p => (
                                        <button
                                            key={p.id}
                                            onClick={() => { clearSearch(); navigate(`/mall/${results.grouped[0].mall_slug}?product=${p.id}`); }}
                                            className="w-full text-right px-4 py-2.5 hover:bg-gray-50 flex items-center gap-3 transition-colors"
                                        >
                                            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
                                                {(p.image || p.link_photo) ? <img src={p.image ? `/storage/${p.image}` : p.link_photo} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                                                    : <Package className="w-5 h-5 text-gray-300" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-medium text-gray-800 truncate">{p.name_ar || p.name_en}</div>
                                                <div className="text-xs">
                                                    {p.discount_price ? (
                                                        <><span className="text-gray-500 line-through ml-1">{p.price} ₪</span><span className="text-green-600 font-bold">{p.discount_price} ₪</span></>
                                                    ) : (
                                                        <span className="text-gray-600">{p.price} ₪</span>
                                                    )}
                                                </div>
                                            </div>
                                            <ChevronLeft className="w-4 h-4 text-gray-300 shrink-0" />
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                /* Multi-mall: tabs filter which mall's products show */
                                (() => {
                                    const groups = activeTab === 'all' ? results.grouped : results.grouped.filter(g => g.mall_slug === activeTab);
                                    return groups.map(group => (
                                        <div key={group.mall_slug} className="border-b border-gray-100 last:border-0">
                                            <button
                                                onClick={() => { clearSearch(); navigate(`/mall/${group.mall_slug}`); }}
                                                className="w-full text-right px-4 py-2 bg-gray-50 hover:bg-gray-100 text-sm font-bold text-indigo-600 flex items-center gap-2 transition-colors"
                                            >
                                                <Store className="w-4 h-4" />{group.mall_name}
                                                <span className="mr-auto text-[10px] text-gray-400 font-normal">{group.products?.length || 0} منتج</span>
                                            </button>
                                            {group.products?.slice(0, 5).map(p => (
                                                <button
                                                    key={p.id}
                                                    onClick={() => { clearSearch(); navigate(`/mall/${group.mall_slug}?product=${p.id}`); }}
                                                    className="w-full text-right px-4 py-2.5 hover:bg-gray-50 flex items-center gap-3 transition-colors"
                                                >
                                                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
                                                        {(p.image || p.link_photo) ? <img src={p.image ? `/storage/${p.image}` : p.link_photo} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                                                            : <Package className="w-5 h-5 text-gray-300" />}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-sm font-medium text-gray-800 truncate">{p.name_ar || p.name_en}</div>
                                                        <div className="text-xs">
                                                            {p.discount_price ? (
                                                                <><span className="text-gray-500 line-through ml-1">{p.price} ₪</span><span className="text-green-600 font-bold">{p.discount_price} ₪</span></>
                                                            ) : (
                                                                <span className="text-gray-600">{p.price} ₪</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <ChevronLeft className="w-4 h-4 text-gray-300 shrink-0" />
                                                </button>
                                            ))}
                                        </div>
                                    ));
                                })()
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default Navbar;
