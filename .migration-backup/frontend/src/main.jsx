import React, { useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import './i18n'
import { registerSW, subscribeToPush } from './utils/pwa'
import NotificationPrompt from './components/NotificationPrompt'
import InstallPWA from './components/InstallPWA'
import ErrorBoundary from './components/ErrorBoundary'
import { installGlobalHandlers } from './utils/errorReporter'
import favicon from './assets/images/logo.webp'

installGlobalHandlers();

const splash = document.getElementById('splash');
const splashStart = performance.now();
const SPLASH_MIN_MS = 500;

// Fade out & remove splash after React mounts (minimum 3.5s)
function removeSplash() {
    if (!splash) return;
    try {
        const elapsed = performance.now() - splashStart;
        const delay = Math.max(0, SPLASH_MIN_MS - elapsed);
        setTimeout(() => {
            splash.classList.add('hide');
            setTimeout(() => {
                try { splash.remove(); } catch {}
            }, 600);
        }, delay);
    } catch {}
}

function PWARegister() {
    useEffect(() => {
        registerSW();
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        if (token) {
            setTimeout(() => subscribeToPush(), 3000);
        }
        removeSplash();
    }, []);
    return null;
}

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <ErrorBoundary>
            <PWARegister />
            <App />
            <NotificationPrompt />
            <InstallPWA />
        </ErrorBoundary>
    </React.StrictMode>,
)

// Set favicon to bundled logo (works with Vite bundling)
const _faviconLink = document.getElementById('favicon');
if (_faviconLink) {
    _faviconLink.href = favicon;
} else {
    const _link = document.createElement('link');
    _link.id = 'favicon';
    _link.rel = 'icon';
    _link.href = favicon;
    document.head.appendChild(_link);
}
