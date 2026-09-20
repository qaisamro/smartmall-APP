import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X } from 'lucide-react';
import { subscribeToPush } from '../utils/pwa';

function isIOS() {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

function isInStandaloneMode() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

const NotificationPrompt = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const isPWA = isInStandaloneMode();
    if (!token && !(isIOS() && isPWA)) return;

    const hasNotificationAPI = 'Notification' in navigator;
    const permission = hasNotificationAPI ? Notification.permission : 'unsupported';

    if (permission === 'granted') {
      localStorage.setItem('_notif_configured', '1');
      return;
    }
    const shouldShow = ((isIOS() && !isInStandaloneMode()) || permission === 'default')
      && !localStorage.getItem('_notif_configured');

    if (shouldShow) {
      const dismissed = localStorage.getItem('notif_prompt_dismissed');
      if (dismissed) {
        const ts = parseInt(dismissed, 10);
        if (Date.now() - ts < 24 * 60 * 60 * 1000) return; // 24h cooldown
      }
      const timer = setTimeout(() => setVisible(true), isIOS() && isPWA ? 0 : 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const iosNeedsInstall = isIOS() && !isInStandaloneMode();

  const handleEnable = async () => {
    try {
      const result = await Notification.requestPermission();
      if (result === 'granted') {
        await subscribeToPush();
        localStorage.setItem('_notif_configured', '1');
      } else if (result === 'denied') {
        localStorage.setItem('_notif_configured', '1');
      }
    } catch {
      // ignore
    }
    setVisible(false);
  };

  const handleDismiss = () => {
    if (!iosNeedsInstall) {
      localStorage.setItem('notif_prompt_dismissed', String(Date.now()));
    }
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="relative w-[90%] max-w-sm bg-gray-900 border border-white/10 rounded-3xl p-8 shadow-2xl text-center"
          >
            <button onClick={handleDismiss} className="absolute top-4 left-4 p-1.5 rounded-full hover:bg-white/10 transition-colors">
              <X className="w-4 h-4 text-gray-500" />
            </button>

            <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-indigo-500/20 flex items-center justify-center">
              <Bell className="w-8 h-8 text-indigo-400" />
            </div>

            <h3 className="text-xl font-bold text-white mb-2">تفعيل الإشعارات</h3>
            <p className="text-gray-400 text-sm leading-relaxed mb-6">
              {iosNeedsInstall
                ? 'لتفعيل الإشعارات، أضف الموقع إلى الشاشة الرئيسية أولاً'
                : 'فعّل الإشعارات ليصلك كل جديد فوراً — حتى عندما يكون التطبيق مغلقاً'
              }
            </p>

            {iosNeedsInstall && (
              <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-right">
                <p className="text-amber-300 text-xs font-bold mb-2">خطوات التفعيل:</p>
                <ol className="text-amber-200/70 text-xs leading-relaxed space-y-1.5 list-decimal list-inside">
                  <li>اضغط زر المشاركة <span className="font-mono">⬆️</span></li>
                  <li>اختر "إضافة إلى الشاشة الرئيسية"</li>
                  <li>افتح التطبيق من الشاشة الرئيسية</li>
                  <li>عد لتفعيل الإشعارات بالضغط على "تفعيل"</li>
                </ol>
              </div>
            )}

            <div className="flex items-center gap-3">
              <button onClick={handleDismiss} className="flex-1 py-3 rounded-2xl border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 text-sm font-bold transition-all">
                {iosNeedsInstall ? 'تمت الإضافة ✓' : 'لاحقاً'}
              </button>
              {!iosNeedsInstall && (
                <button onClick={handleEnable} className="flex-1 py-3 rounded-2xl bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-bold transition-all shadow-lg shadow-indigo-500/25">
                  تفعيل
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default NotificationPrompt;
