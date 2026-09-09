import React, { useState, useEffect } from 'react';
import { Smartphone, Bell, BellOff, Loader2 } from 'lucide-react';
import { subscribeToPush, isPushSubscribed, unsubscribeFromPush, refreshBadge, setAppBadgeCount } from '../utils/pwa';

function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function isInStandaloneMode() {
    return window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true;
}

const PushNotificationToggle = () => {
    const [subscribed, setSubscribed] = useState(false);
    const [checking, setChecking] = useState(true);
    const [working, setWorking] = useState(false);
    const [msg, setMsg] = useState(null);

    const isIOSDevice = isIOS();
    const isPWA = isInStandaloneMode();
    const hasPush = 'PushManager' in window && 'Notification' in window && 'serviceWorker' in navigator;
    const canWork = isIOSDevice ? isPWA && hasPush : hasPush;

    useEffect(() => {
        if (!canWork) { setChecking(false); return; }
        isPushSubscribed().then(setSubscribed).finally(() => setChecking(false));
    }, []);

    const handleToggle = async () => {
        setWorking(true);
        setMsg(null);

        try {
            if (subscribed) {
                await unsubscribeFromPush();
                setSubscribed(false);
                setMsg({ type: 'info', text: 'تم إيقاف الإشعارات' });
                refreshBadge();
            } else {
                if (Notification.permission === 'denied') {
                    setMsg({ type: 'error', text: 'الإشعارات محظورة — فعّلها من إعدادات المتصفح' });
                    setWorking(false);
                    return;
                }
                if (Notification.permission === 'default') {
                    const result = await Notification.requestPermission();
                    if (result !== 'granted') {
                        setMsg({ type: 'error', text: 'لم يتم منح الإذن — حاول مرة أخرى' });
                        setWorking(false);
                        return;
                    }
                }
                const ok = await subscribeToPush();
                if (ok) {
                    setSubscribed(true);
                    setMsg({ type: 'success', text: 'تم تفعيل الإشعارات ✅' });
                    setAppBadgeCount(1);
                    refreshBadge();
                } else {
                    const still = await isPushSubscribed();
                    if (still) {
                        setSubscribed(true);
                        setMsg({ type: 'success', text: 'تم تفعيل الإشعارات ✅' });
                        setAppBadgeCount(1);
                        refreshBadge();
                    } else {
                        setMsg({ type: 'error', text: 'تعذر الاشتراك — أعد المحاولة' });
                    }
                }
            }
        } catch (e) {
            setMsg({ type: 'error', text: 'حدث خطأ — حاول مرة أخرى' });
        }
        setWorking(false);
        if (msg) setTimeout(() => setMsg(null), 4000);
    };

    if (checking) {
        return (
            <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-gray-50 text-gray-400 text-xs">
                <Loader2 className="w-4 h-4 animate-spin" />
                جارِ التحقق من الإشعارات...
            </div>
        );
    }

    // iOS not in PWA: show install guide
    if (isIOSDevice && !isPWA) {
        return (
            <div className="space-y-2">
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-amber-50 border border-amber-200">
                    <Smartphone className="w-4 h-4 text-amber-500 shrink-0" />
                    <p className="text-[10px] text-amber-700 leading-relaxed">
                        الإشعارات تحتاج تفعيلاً من الشاشة الرئيسية:
                    </p>
                </div>
                <ol className="text-[10px] text-gray-500 space-y-1 pr-6 list-decimal">
                    <li>اضغط <b>مشاركة</b> <span className="text-base">⬆️</span> في Safari</li>
                    <li>اختر <b>إضافة للشاشة الرئيسية</b></li>
                    <li>افتح التطبيق من الشاشة الرئيسية</li>
                    <li>عد إلى هذه القائمة وفعّل الإشعارات</li>
                </ol>
            </div>
        );
    }

    // Push not supported at all
    if (!canWork) {
        return (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-gray-50">
                <BellOff className="w-4 h-4 text-gray-400 shrink-0" />
                <span className="text-[10px] text-gray-500">المتصفح لا يدعم الإشعارات</span>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            <button
                onClick={handleToggle}
                disabled={working}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all text-sm font-medium ${subscribed
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-indigo-200 hover:bg-indigo-50/50'
                } ${working ? 'opacity-60' : ''}`}
            >
                <div className="flex items-center gap-2.5">
                    {working ? (
                        <Loader2 className="w-4.5 h-4.5 animate-spin text-gray-400" />
                    ) : subscribed ? (
                        <Bell className="w-4.5 h-4.5 text-indigo-500" />
                    ) : (
                        <BellOff className="w-4.5 h-4.5 text-gray-400" />
                    )}
                    <span>{subscribed ? 'مفعلة' : 'غير مفعلة'}</span>
                </div>
                <div className={`relative w-11 h-6 rounded-full transition-all ${subscribed ? 'bg-indigo-500' : 'bg-gray-300'}`}>
                    <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-all ${subscribed ? 'right-0.5' : 'right-[22px]'}`} />
                </div>
            </button>

            {msg && (
                <div className={`px-3 py-2 rounded-xl text-[10px] font-medium ${msg.type === 'success' ? 'bg-emerald-50 text-emerald-700' : msg.type === 'error' ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-700'}`}>
                    {msg.text}
                </div>
            )}

            {subscribed && (
                <p className="text-[9px] text-gray-400 text-center">الإشعارات ستصلك حتى والتطبيق مغلق</p>
            )}

            {Notification.permission === 'denied' && (
                <div className="px-3 py-2 rounded-xl bg-rose-50 text-[10px] text-rose-600 font-medium">
                    الإشعارات محظورة — افتح إعدادات المتصفح وفعّلها
                </div>
            )}
        </div>
    );
};

export default PushNotificationToggle;
