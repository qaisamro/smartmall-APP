import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, LayoutGrid, ShoppingCart, Receipt, User, BarChart3, Package, Settings, QrCode, Truck, MapPin, Store, LogIn, UserPlus, ShoppingBag, Search } from 'lucide-react';
import useCartStore from '../store/useCartStore';
import useAuthStore from '../store/useAuthStore';

const guestTabs = [
    { to: '/malls?type=mall', label: 'المولات', icon: Store },
    { to: '/malls?type=supermarket', label: 'سوبر ماركت', icon: ShoppingBag },
    { to: '/cart', label: 'السلة', icon: ShoppingCart },
    { to: '/login', label: 'دخول', icon: LogIn },
];

const customerTabs = [
    { to: '/', label: 'الرئيسية', icon: Home },
    { to: '/malls', label: 'التصنيفات', icon: LayoutGrid },
    { to: '/cart', label: 'السلة', icon: ShoppingCart },
    { to: '/my-purchases', label: 'طلباتي', icon: Receipt },
    { to: '/customer/settings', label: 'الحساب', icon: User },
];

const ownerTabs = [
    { to: '/owner', label: 'الرئيسية', icon: Home },
    { to: '/owner/products', label: 'المنتجات', icon: Package },
    { to: '/owner/sales', label: 'المبيعات', icon: BarChart3 },
    { to: '/owner/pos', label: 'الكاشير', icon: QrCode },
    { to: '/owner/settings', label: 'الإعدادات', icon: Settings },
];

const deliveryTabs = [
    { to: '/delivery', label: 'طلبات التوصيل', icon: Truck },
];

const trackerTabs = [
    { to: '/tracker', label: 'تتبع الطلبات', icon: MapPin },
    { to: '/tracker?mode=search', label: 'بحث وتقارير', icon: Search },
];

const adminTabs = [
    { to: '/admin', label: 'الرئيسية', icon: Home },
    { to: '/admin/malls', label: 'المولات', icon: LayoutGrid },
    { to: '/admin/sales-reports', label: 'التقارير', icon: BarChart3 },
    { to: '/admin/users', label: 'المستخدمين', icon: User },
];

const MobileBottomNav = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const cartCount = useCartStore(s => s.items.length);
    const user = useAuthStore(s => s.user);
    const isAuthenticated = useAuthStore(s => s.isAuthenticated);
    const role = user?.roles?.[0]?.name || user?.role || null;

    let tabs;
    if (!isAuthenticated) {
        tabs = guestTabs;
    } else if (role === 'mall-owner' || role === 'supermarket-owner') {
        tabs = ownerTabs;
    } else if (role === 'delivery-person') {
        tabs = deliveryTabs;
    } else if (role === 'order-tracker') {
        tabs = trackerTabs;
    } else if (role === 'super-admin' || role === 'admin') {
        tabs = adminTabs;
    } else {
        tabs = customerTabs;
    }

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 block lg:hidden">
            <div className="relative mx-3 mb-3 rounded-[1.75rem] bg-[#0a0a0f]/90 backdrop-blur-2xl border border-white/[0.08] shadow-2xl shadow-black/60">
                <div className="flex items-center justify-around py-2 px-1">
                    {tabs.map(({ to, label, icon: Icon }) => {
                        const hasQuery = to.indexOf('?') !== -1;
                        const isActive = hasQuery
                            ? (location.pathname + location.search === to)
                            : (location.pathname === to && !location.search) || (to !== '/' && location.pathname.startsWith(to) && !location.search);
                        return (
                            <button
                                key={to}
                                onClick={() => navigate(to)}
                                className={`relative flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-2xl transition-all duration-300 ${isActive ? 'text-indigo-400 scale-100' : 'text-gray-500 hover:text-gray-300 scale-95'}`}
                            >
                                <div className="relative">
                                    <Icon className={`w-[22px] h-[22px] transition-all duration-300 ${isActive ? 'drop-shadow-[0_0_8px_rgba(129,140,248,0.4)]' : ''}`} strokeWidth={isActive ? 2.5 : 1.8} />
                                    {to === '/cart' && cartCount > 0 && (
                                        <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-rose-500 text-white text-[10px] font-black leading-none shadow-lg shadow-rose-500/30 px-1">
                                            {cartCount > 9 ? '9+' : cartCount}
                                        </span>
                                    )}
                                </div>
                                <span className={`text-[10px] font-bold transition-all duration-300 ${isActive ? 'opacity-100 translate-y-0' : 'opacity-60 translate-y-0'}`}>{label}</span>
                                {isActive && (
                                    <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-8 h-[3px] rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
        </nav>
    );
};

export default MobileBottomNav;
