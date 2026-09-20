import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

export function useAndroidBackButton() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const handler = App.addListener('backButton', ({ canGoBack }) => {
      // إذا كان هناك history داخل WebView، ارجع
      if (window.history.length > 1 || canGoBack) {
        navigate(-1);
      } else {
        // إذا لم يوجد history، ضع التطبيق في الخلفية بدلاً من إغلاقه
        App.minimizeApp();
      }
    });

    return () => {
      handler.then(h => h.remove());
    };
  }, [navigate, location]);
}
