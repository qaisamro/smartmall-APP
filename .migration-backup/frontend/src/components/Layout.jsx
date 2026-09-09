import React, { useEffect, useState } from 'react';
import Navbar from './Navbar';
import AdminSidebar from './AdminSidebar';
import SitePopup from './SitePopup';
// import WhatsAppModal from './WhatsAppModal'; // تم تعطيل مودل واتساب — سيتم تفعيله لاحقاً
import MobileBottomNav from './MobileBottomNav';
import useAuthStore from '../store/useAuthStore';
import { useLocation } from 'react-router-dom';
import { predefinedThemes, themeToCssVars } from '../utils/theme';

const Layout = ({ children }) => {
    const { fetchUser, user, isAuthenticated } = useAuthStore();
    const [themeKey, setThemeKey] = useState('smart-blue');
    // const [showWhatsApp, setShowWhatsApp] = useState(false); // تم تعطيل مودل واتساب
    const [adminMobileOpen, setAdminMobileOpen] = useState(false);
    const location = useLocation();
    const isAdminRoute = location.pathname.startsWith('/admin');
    const role = user?.roles?.[0]?.name || user?.role || null;
    const isDashboardRole = role && ['super-admin', 'admin', 'mall-owner', 'supermarket-owner', 'delivery-person', 'order-tracker'].includes(role);

    // تم تعطيل مودل واتساب — سيتم تفعيله لاحقاً
    /*useEffect(() => {
        if (isAuthenticated && user) {
            const role = user.roles?.[0]?.name;
            const allowedRoles = ['super-admin', 'admin', 'mall-owner', 'supermarket-owner', 'delivery-person'];
            if (allowedRoles.includes(role) && !user.whatsapp) {
                setShowWhatsApp(true);
                return;
            }
        }
        setShowWhatsApp(false);
    }, [isAuthenticated, user]);*/

    // Apply theme from localStorage or default
    useEffect(() => {
        const stored = localStorage.getItem('app_theme_key');
        if (stored && predefinedThemes[stored]) setThemeKey(stored);
    }, []);

    useEffect(() => {
        const theme = predefinedThemes[themeKey] || predefinedThemes['smart-blue'];
        const vars = themeToCssVars(theme);
        Object.entries(vars).forEach(([k, v]) => {
            if (k.startsWith('--')) document.documentElement.style.setProperty(k, v);
        });
        localStorage.setItem('app_theme_key', themeKey);
    }, [themeKey]);

    const cycleTheme = () => {
        const keys = Object.keys(predefinedThemes);
        const idx = keys.indexOf(themeKey);
        const next = keys[(idx + 1) % keys.length];
        setThemeKey(next);
    };

    return (
        <div className="min-h-screen text-white selection:bg-blue-500/30 overflow-x-hidden mall-theme-scope" style={themeToCssVars(predefinedThemes[themeKey])}>
            {/* Global subtle grid background - hidden on mobile to avoid rendering artifacts */}
            <div className="fixed inset-0 pointer-events-none hidden lg:block" style={{
                backgroundImage: 'linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)',
                backgroundSize: '60px 60px'
            }} />
            {/* Global ambient glows */}
            <div className="fixed top-0 left-1/4 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />
            <div className="fixed top-1/4 right-1/4 w-64 h-64 bg-purple-600/5 rounded-full blur-3xl pointer-events-none" />
            <div className="fixed bottom-1/4 left-1/3 w-80 h-80 bg-emerald-600/4 rounded-full blur-3xl pointer-events-none" />

            <Navbar onAdminToggle={() => setAdminMobileOpen(prev => !prev)} />
            <main className="relative pt-20 sm:pt-20 min-h-screen pb-24 lg:pb-0" style={{ paddingRight: 'var(--user-sidebar-width, 0px)' }}>
                <div className={`${isAdminRoute ? 'max-w-none lg:!pr-[280px] lg:!pl-8' : 'max-w-7xl'} mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10`}>
                    {isAdminRoute ? (
                        <>
                            <AdminSidebar mobileOpen={adminMobileOpen} onToggle={() => setAdminMobileOpen(prev => !prev)} onClose={() => setAdminMobileOpen(false)} />
                            {children}
                        </>
                    ) : children}
                </div>
            </main>

            {!isAdminRoute && <MobileBottomNav />}

            <SitePopup />
            {/* تم تعطيل مودل واتساب — سيتم تفعيله لاحقاً
            <WhatsAppModal
                open={showWhatsApp}
                onClose={() => setShowWhatsApp(false)}
                onSaved={() => { fetchUser(); }}
                user={user}
            />*/}

            {/* Global Footer */}
            <footer className="relative z-10 mt-auto border-t border-white/5 bg-[#0a0a0f]/80 backdrop-blur-xl py-10 px-4 overflow-hidden text-center">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-px bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent" />
                <div className="max-w-7xl mx-auto space-y-6">

                    {/* Social Media */}
                    <div className="flex items-center justify-center gap-3 flex-wrap">
                        {[
                            { href: 'https://www.snapchat.com/add/smartmall.ps', label: 'Snapchat', color: 'hover:text-[#FFFC00]', svg: <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm4.5 14.5c-.3.3-.7.5-1.2.5-.2 0-.5-.1-.8-.1-.4 0-.8.1-1.2.2-.8.2-1.6.3-2.5.3s-1.7-.1-2.5-.3c-.4-.1-.8-.2-1.2-.2-.3 0-.6.1-.8.1-.5 0-.9-.2-1.2-.5-.5-.5-.6-.9-.6-1.2 0-.2.1-.4.3-.5.2-.1.5-.1.7.1.2.2.4.3.7.4.1 0 .2.1.3.1-.1-.3-.1-.6-.1-.9-.1-.7-.1-1.4-.2-2.1 0-.3-.1-.6-.1-.9-.1-.3-.2-.6-.3-.8l-.1-.2c-.1-.1-.1-.2-.1-.3 0-.2.2-.4.4-.5.1 0 .3-.1.5-.1h.1c.1 0 .3 0 .4.1l.1.1c.1.1.2.3.3.4.2.3.3.6.4.9.1 0 .1-.4.1-.8 0-.7.1-1.4.4-1.9.2-.5.6-.9 1-1.2.5-.3 1.1-.5 1.7-.6.5-.1 1-.1 1.4-.1s.9 0 1.4.1c.6.1 1.2.3 1.7.6.5.3.8.7 1 1.2.2.5.4 1.2.4 1.9 0 .4 0 .8.1.8.1-.3.3-.6.4-.9.1-.2.2-.3.3-.4l.1-.1c.1-.1.3-.1.4-.1h.1c.3 0 .5.1.5.4 0 .1 0 .2-.1.3l-.1.2c-.1.2-.2.5-.3.8 0 .3-.1.6-.1.9-.1.7-.1 1.4-.2 2.1 0 .3 0 .6-.1.9 0 .1 0 .2.1.3.1-.1.2-.1.3-.1.3-.1.5-.2.7-.4.2-.2.5-.2.7-.1.2.1.3.3.3.5 0 .3-.1.7-.6 1.2z"/> },
                            { href: 'https://www.tiktok.com/@smartmall.ps?_r=1&_t=ZS-98rN4GANziG', label: 'TikTok', color: 'hover:text-white', svg: <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/> },
                            { href: 'https://www.instagram.com/smartmall.ps?igsh=MXY5bDZscXFudTZhcg==', label: 'Instagram', color: 'hover:text-[#E4405F]', svg: <><rect x="2" y="2" width="20" height="20" rx="5" ry="5" fill="none" stroke="currentColor" strokeWidth="1.8"/><circle cx="12" cy="12" r="5" fill="none" stroke="currentColor" strokeWidth="1.8"/><circle cx="17.5" cy="6.5" r="1.2" fill="currentColor"/></> },
                            { href: 'https://www.facebook.com/share/1D87b6juua/?mibextid=wwXIfr', label: 'Facebook', color: 'hover:text-[#1877F2]', svg: <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/> },
                            { href: 'https://wa.me/970566288377', label: 'WhatsApp', color: 'hover:text-[#25D366]', svg: <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" fill="currentColor"/> },
                        ].map((s, i) => (
                            <a key={i} href={s.href} target="_blank" rel="noopener noreferrer"
                                className={`group relative w-11 h-11 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center transition-all duration-300 ${s.color} hover:bg-white/[0.08] hover:border-white/20 hover:scale-110 hover:-translate-y-0.5`}
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                    {s.svg}
                                </svg>
                                {/* Tooltip */}
                                <span className="absolute -bottom-7 left-1/2 -translate-x-1/2 text-[10px] text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                    {s.label}
                                </span>
                            </a>
                        ))}
                    </div>

                    {/* Contact info */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1.5">
                            <span className="text-gray-600">للاستفسار:</span>
                            <a href="mailto:info@samrtmall.cloud" className="text-indigo-400 hover:text-indigo-300 transition-colors">info@samrtmall.cloud</a>
                        </span>
                        <span className="hidden sm:inline text-gray-600">|</span>
                        <span className="flex items-center gap-1.5">
                            <span className="text-gray-600">للدعم:</span>
                            <a href="mailto:support@samrtmall.cloud" className="text-indigo-400 hover:text-indigo-300 transition-colors">support@samrtmall.cloud</a>
                        </span>
                        <span className="hidden sm:inline text-gray-600">|</span>
                        <a href="https://wa.me/970566288377" target="_blank" rel="noopener noreferrer"  className="text-gray-500 hover:text-[#25D366] transition-colors">
                            +970 566 288 377
                        </a>
                    </div>

                    {/* Copyright */}
                    <p className="text-gray-500 text-[11px] font-medium tracking-wide">
                        &copy; 2026 <span className="text-white font-bold">Smart Mall</span> — جميع الحقوق محفوظة
                    </p>

                    <div className="flex flex-col items-center pt-1">
                        <a
                            href="https://www.linkedin.com/in/qais-amro-2b0576277/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group flex items-center gap-1.5 transition-all opacity-60 hover:opacity-100"
                            
                        >
                            <span className="text-gray-600 text-[9px] font-black uppercase tracking-widest">Developed by</span>
                            <span className="text-gray-400 text-[9px] font-black tracking-widest underline decoration-indigo-500/40 underline-offset-2 group-hover:text-white transition-colors">
                                Qais Amro
                            </span>
                        </a>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default Layout;
