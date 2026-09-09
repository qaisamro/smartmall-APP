import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Share, Plus, Smartphone } from 'lucide-react';

/**
 * Detects if the device is iOS (iPhone / iPad).
 */
function isIOS() {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

/**
 * Detects if the app is already installed as a PWA (standalone mode).
 */
function isInStandaloneMode() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

/**
 * InstallPWA
 * - Android/Chrome: captures beforeinstallprompt and shows a beautiful install button
 * - iOS: shows step-by-step "Add to Home Screen" instructions
 * - Hidden if already installed as PWA
 */
const InstallPWA = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showAndroid, setShowAndroid] = useState(false);
  const [showIOS, setShowIOS] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Already installed — hide everything
    if (isInStandaloneMode()) {
      setInstalled(true);
      return;
    }

    const dismissed = localStorage.getItem('pwa_install_dismissed');
    if (dismissed) {
      const ts = parseInt(dismissed, 10);
      // Re-show after 3 days
      if (Date.now() - ts < 3 * 24 * 60 * 60 * 1000) return;
    }

    // Android / Chrome — listen for browser install prompt
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowAndroid(true);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // iOS Safari — show manual instructions
    if (isIOS() && !isInStandaloneMode()) {
      const timer = setTimeout(() => setShowIOS(true), 3000);
      return () => {
        window.removeEventListener('beforeinstallprompt', handler);
        clearTimeout(timer);
      };
    }

    // Detect successful install
    window.addEventListener('appinstalled', () => {
      setShowAndroid(false);
      setInstalled(true);
    });

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstalled(true);
    }
    setDeferredPrompt(null);
    setShowAndroid(false);
  };

  const dismiss = () => {
    localStorage.setItem('pwa_install_dismissed', String(Date.now()));
    setShowAndroid(false);
    setShowIOS(false);
  };

  if (installed) return null;

  // ── Android Install Banner ─────────────────────────────────
  return (
    <>
      <AnimatePresence>
        {showAndroid && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 22, stiffness: 260 }}
            className="fixed bottom-20 sm:bottom-6 left-3 right-3 z-[80] max-w-sm mx-auto"
          >
            <div className="relative bg-gray-950 border border-indigo-500/30 rounded-2xl p-4 shadow-2xl shadow-indigo-900/40 overflow-hidden">
              {/* Glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/10 to-purple-600/5 pointer-events-none" />
              <button
                onClick={dismiss}
                className="absolute top-3 left-3 w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
              >
                <X className="w-3.5 h-3.5 text-gray-400" />
              </button>
              <div className="flex items-center gap-4 relative">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/30">
                  <img src="/logo.webp" alt="SmartMall" className="w-10 h-10 object-contain rounded-xl" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold text-sm">ثبّت SmartMall</p>
                  <p className="text-gray-400 text-xs mt-0.5">أضف التطبيق لشاشتك الرئيسية</p>
                  <div className="flex items-center gap-2 mt-2.5">
                    <button
                      onClick={handleInstall}
                      className="flex items-center gap-1.5 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold rounded-xl transition-colors shadow-lg shadow-indigo-500/30"
                    >
                      <Download className="w-3.5 h-3.5" />
                      تثبيت الآن
                    </button>
                    <button onClick={dismiss} className="text-gray-500 hover:text-gray-300 text-xs font-medium transition-colors">
                      لاحقاً
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── iOS Instructions Modal ─────────────────────────────── */}
      <AnimatePresence>
        {showIOS && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 backdrop-blur-sm"
            onClick={dismiss}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="w-full max-w-md bg-gray-950 rounded-t-3xl border-t border-x border-white/10 p-6 pb-10 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-6" />
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-white font-bold text-lg">تثبيت SmartMall على iPhone</h3>
                <button onClick={dismiss} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>

              <div className="space-y-4">
                {[
                  {
                    num: '1',
                    icon: <Share className="w-5 h-5 text-blue-400" />,
                    title: 'اضغط على زر المشاركة',
                    desc: 'في شريط أدوات Safari في الأسفل، اضغط على أيقونة المشاركة',
                    color: 'bg-blue-500/10 border-blue-500/20',
                  },
                  {
                    num: '2',
                    icon: <Plus className="w-5 h-5 text-emerald-400" />,
                    title: 'اختر "إضافة إلى الشاشة الرئيسية"',
                    desc: 'مرّر للأسفل في قائمة الخيارات واختر "Add to Home Screen"',
                    color: 'bg-emerald-500/10 border-emerald-500/20',
                  },
                  {
                    num: '3',
                    icon: <Smartphone className="w-5 h-5 text-indigo-400" />,
                    title: 'اضغط "إضافة"',
                    desc: 'ستظهر أيقونة SmartMall على شاشتك الرئيسية تماماً كأي تطبيق',
                    color: 'bg-indigo-500/10 border-indigo-500/20',
                  },
                ].map((step) => (
                  <div key={step.num} className={`flex items-start gap-4 p-4 rounded-2xl border ${step.color}`}>
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                      {step.icon}
                    </div>
                    <div>
                      <p className="text-white font-bold text-sm">{step.title}</p>
                      <p className="text-gray-400 text-xs mt-1 leading-relaxed">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                <p className="text-amber-300 text-xs text-center font-medium leading-relaxed">
                  💡 بعد التثبيت، افتح التطبيق من الأيقونة وفعّل الإشعارات لتصلك التنبيهات حتى لو التطبيق مغلق
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default InstallPWA;
