import api from '../api/axios';
import { getNotificationUrl } from './notifications';

let swRegistration = null;
let pollingInterval = null;

/* ── Notification sound ── */
let _audioEl = null;
let _audioCtx = null;
let _audioBuffer = null;
let _audioFailed = false;
let _audioPrimed = false;
let _firstCheckDone = false;

const SOUND_KEY = 'notif_sound_settings';
let _soundSettings = null;

export function getSoundSettings() {
  if (!_soundSettings) {
    try {
      const raw = localStorage.getItem(SOUND_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      _soundSettings = {
        enabled: parsed?.enabled !== false,
        volume: typeof parsed?.volume === 'number' ? parsed.volume : 50,
      };
    } catch {
      _soundSettings = { enabled: true, volume: 50 };
    }
  }
  return _soundSettings;
}

export function setSoundSettings(patch) {
  const s = {
    enabled: patch.enabled !== undefined ? !!patch.enabled : getSoundSettings().enabled,
    volume: patch.volume !== undefined ? Math.max(0, Math.min(100, Math.round(Number(patch.volume) || 0))) : getSoundSettings().volume,
  };
  _soundSettings = s;
  try {
    localStorage.setItem(SOUND_KEY, JSON.stringify(s));
  } catch {}
  // Persist for the service worker (works when app is closed)
  try {
    if ('caches' in window) {
      caches.open('sound-settings').then((cache) => {
        cache.put('/__sound_settings__', new Response(JSON.stringify(s)));
      }).catch(() => {});
    }
  } catch {}
  return s;
}

// Attempt to play custom sound via HTMLAudioElement
function _tryAudio(el, volume) {
  if (!el) return false;
  try {
    el.currentTime = 0;
    el.muted = false;
    el.volume = volume;
    const p = el.play();
    if (p && typeof p.catch === 'function') {
      p.then(() => { _audioFailed = false; }).catch(() => { _audioFailed = true; });
      return true;
    }
    return true;
  } catch {
    _audioFailed = true;
    return false;
  }
}

// Play via Web Audio API (more reliable on mobile)
function _tryWebAudio(volume) {
  if (!_audioCtx || !_audioBuffer) return false;
  try {
    if (_audioCtx.state === 'suspended') {
      _audioCtx.resume().catch(() => {});
    }
    const src = _audioCtx.createBufferSource();
    src.buffer = _audioBuffer;
    const gain = _audioCtx.createGain();
    gain.gain.value = volume;
    src.connect(gain);
    gain.connect(_audioCtx.destination);
    src.start(0);
    _audioFailed = false;
    return true;
  } catch {
    return false;
  }
}

async function _loadAudioBuffer() {
  try {
    const res = await fetch('/sound.mp3');
    const arr = await res.arrayBuffer();
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    _audioBuffer = await ctx.decodeAudioData(arr);
    _audioCtx = ctx;
  } catch {}
}

function playNotifSound() {
  const s = getSoundSettings();
  if (!s.enabled || s.volume <= 0) return;
  const vol = s.volume / 100;
  _audioFailed = false;
  // 1. Try primed HTMLAudioElement
  if (_audioEl && _tryAudio(_audioEl, vol)) return;
  // 2. Try Web Audio API
  if (_tryWebAudio(vol)) return;
  // 3. Try fresh HTMLAudioElement
  const a = new Audio('/sound.mp3');
  a.volume = vol;
  if (_tryAudio(a, vol)) { _audioEl = a; return; }
  // 4. All failed
  _audioFailed = true;
}

export function testNotificationSound() {
  const s = getSoundSettings();
  if (!s.enabled || s.volume <= 0) return;
  playNotifSound();
  setTimeout(() => {
    if (_audioFailed) {
      // Fallback: play a fresh element one more time
      const a = new Audio('/sound.mp3');
      a.volume = s.volume / 100;
      try { a.play().catch(() => {}); } catch {}
    }
  }, 150);
}

// Prime audio on first user tap (required by iOS Safari) — silent priming, no audible playback
if (typeof document !== 'undefined') {
  const _prime = () => {
    if (_audioPrimed) return;
    _audioPrimed = true;
    // HTMLAudioElement priming (muted => unlocks audio without making noise)
    try {
      const a = new Audio('/sound.mp3');
      a.preload = 'auto';
      a.muted = true;
      a.volume = 0;
      a.play().then(() => { a.pause(); a.currentTime = 0; _audioEl = a; }).catch(() => {});
    } catch {}
    // Web Audio API priming
    _loadAudioBuffer();
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      _audioCtx = ctx;
    } catch {}
  };
  const _events = ['touchstart', 'click', 'keydown'];
  const _once = () => { _prime(); _events.forEach(e => document.removeEventListener(e, _once)); };
  _events.forEach(e => document.addEventListener(e, _once, { once: true }));
}

export async function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  try {
    swRegistration = await navigator.serviceWorker.register('/sw.js?v=7', { scope: '/' });
    const sw = swRegistration.installing;
    if (sw) {
      sw.addEventListener('statechange', () => {
        if (sw.state === 'activated') {
          if (Notification.permission === 'granted') subscribeToPush();
        }
      });
    }
    // Listen for push notifications forwarded from SW → play sound immediately
    navigator.serviceWorker.addEventListener('message', (event) => {
      const msg = event.data || {};
      if (msg.type === 'PUSH_NOTIFICATION') {
        const s = getSoundSettings();
        if (s.enabled && s.volume > 0) playNotifSound();
        // Wait 100ms for play promise to settle, then fallback if still failed
        setTimeout(() => {
          const s2 = getSoundSettings();
          if (s2.enabled && s2.volume > 0 && _audioFailed && swRegistration && swRegistration.active) {
            try {
              swRegistration.active.postMessage({
                type: 'FALLBACK_SOUND',
                title: msg.title || 'SmartMall',
                body: msg.body || 'لديك إشعار جديد',
                icon: '/logo.png?v=2',
                url: msg.url || '/notifications',
              });
            } catch {}
          }
        }, 100);
        // Still fetch API to update badge and mark as shown
        setTimeout(() => checkNotifications(), 200);
      }
    });
  } catch {
    // SW not supported
  } finally {
    startPolling();
    if (window.Notification && Notification.permission === 'granted') {
      subscribeToPush();
    }
  }
}

export async function subscribeToPush() {
  if (!('PushManager' in window) || !('Notification' in window) || Notification.permission !== 'granted') return false;
  if (!localStorage.getItem('token') && !sessionStorage.getItem('token')) return false;
  try {
    const reg = swRegistration || await navigator.serviceWorker.ready;
    swRegistration = reg;
    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array('BLDS6EJz_4JQd6JRoHHa1k7gWcrwEKleeIem7rH3gPooTNF24hE1v-FsGToGZR6-diVEBOWhRDjMQRoZipDoNso'),
    });
    await api.post('/push/subscribe', subscription.toJSON());
    return true;
  } catch (e) {
    console.warn('Push subscribe failed:', e);
    return false;
  }
}

function getShownNotifIds() {
  try {
    const raw = localStorage.getItem('_shown_notif_ids');
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function markNotifShown(id) {
  try {
    const set = getShownNotifIds();
    set.add(String(id));
    const arr = [...set];
    if (arr.length > 100) arr.splice(0, arr.length - 100);
    localStorage.setItem('_shown_notif_ids', JSON.stringify(arr));
  } catch {
    // ignore storage errors
  }
}

function extractNotifs(res) {
  if (Array.isArray(res.data)) return res.data;
  if (res.data && Array.isArray(res.data.data)) return res.data.data;
  return [];
}

function setBadge(n) {
  try {
    if ('setAppBadge' in navigator) {
      navigator.setAppBadge(n).catch(() => {});
    } else if ('setExperimentalAppBadge' in navigator) {
      navigator.setExperimentalAppBadge(n).catch(() => {});
    }
  } catch {}
}

function clearBadge() {
  if ('clearAppBadge' in navigator) {
    navigator.clearAppBadge().catch(() => {});
  } else if ('setAppBadge' in navigator) {
    navigator.setAppBadge(0).catch(() => {});
  }
}

async function checkNotifications() {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  if (!token) return;

  try {
    const notifsRes = await api.get('/notifications');
    const notifs = extractNotifs(notifsRes);
    const unreadCount = notifs.reduce((acc, n) => acc + (n.read_at ? 0 : 1), 0);
    if (unreadCount > 0) {
      setBadge(unreadCount);
    } else {
      clearBadge();
    }

    // Play notification sound for new unread notifications (skip the very first load)
    const isFirstCheck = !_firstCheckDone;
    const shownIds = getShownNotifIds();
    const newNotifs = notifs.filter((n) => !n.read_at && !shownIds.has(String(n.id)));
    if (newNotifs.length > 0) {
      if (!isFirstCheck) playNotifSound();
      for (const n of newNotifs) markNotifShown(n.id);
    }
    _firstCheckDone = true;

    // Show notification popups only if permission granted
    if (!('Notification' in navigator) || Notification.permission !== 'granted') return;
    if (newNotifs.length === 0) return;

    // Show silent notification immediately, then upgrade to OS sound if custom sound failed
    for (const notif of newNotifs) {
      const rawData = typeof notif.data === 'string' ? JSON.parse(notif.data) : notif.data;
      const data = rawData || {};
      const title = data.title || _getDefaultTitle(data.type);
      const body = data.body || data.message || 'إشعار جديد من SmartMall';
      const url = getNotificationUrl(data);
      const notifId = String(notif.id);

      const onClickNotif = () => {
        window.focus();
        window.location.hash = '';
        window.dispatchEvent(new CustomEvent('notif-navigate', { detail: { url } }));
      };
      const showNotifFn = (type) => {
        const silent = type === 'FALLBACK_SOUND' ? false : true;
        if (swRegistration && swRegistration.active) {
          try {
            swRegistration.active.postMessage({ type, title, body, icon: '/logo.png?v=2', url, notifId });
          } catch {
            if ('Notification' in window && Notification.permission === 'granted') {
              try {
                const n = new Notification(title, { body, icon: '/logo.png?v=2', silent });
                n.onclick = onClickNotif;
              } catch {}
            }
          }
        } else if ('Notification' in window && Notification.permission === 'granted') {
          try {
            const n = new Notification(title, { body, icon: '/logo.png?v=2', silent });
            n.onclick = onClickNotif;
          } catch {}
        }
      };

      showNotifFn('SHOW_NOTIFICATION'); // silent first

      // Schedule fallback to OS sound if custom sound failed
      setTimeout(() => {
        const s = getSoundSettings();
        if (!isFirstCheck && s.enabled && s.volume > 0 && _audioFailed) showNotifFn('FALLBACK_SOUND');
      }, 100);
    }
    window.dispatchEvent(new CustomEvent('notification-received'));
  } catch {
    clearBadge();
  }
}

function _getDefaultTitle(type) {
  switch (type) {
    case 'order_confirmed':      return 'طلب جديد';
    case 'delivery_requested':   return 'طلب توصيل جديد';
    case 'delivery_accepted':    return 'قبول طلب توصيل';
    case 'complaint_responded':  return 'رد على شكواك';
    case 'complaint_new_message':return 'رسالة جديدة في الشكوى';
    case 'admin_broadcast':      return 'SmartMall';
    default:                     return 'SmartMall';
  }
}

function startPolling() {
  stopPolling();

  checkNotifications();

  pollingInterval = setInterval(() => {
    if (document.visibilityState === 'visible') checkNotifications();
  }, 30000);

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      checkNotifications();
    }
  });

  document.addEventListener('notifications-read', () => clearBadge());
}

function stopPolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
}

export function setAppBadgeCount(n) {
  setBadge(n);
}

export function clearAppBadge() {
  clearBadge();
}

export async function refreshBadge() {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  if (!token) return;
  try {
    const notifsRes = await api.get('/notifications');
    const notifs = extractNotifs(notifsRes);
    const unreadCount = notifs.reduce((acc, n) => acc + (n.read_at ? 0 : 1), 0);
    if (unreadCount > 0) setBadge(unreadCount);
    else clearBadge();
  } catch {
    clearBadge();
  }
}

export async function testPushNotification() {
  try {
    await api.post('/push/test');
    return { success: true };
  } catch (e) {
    const status = e.response?.status;
    const msg = status === 401 ? 'يجب تسجيل الدخول أولاً'
      : status === 422 ? 'لا يوجد اشتراك push — أعد تفعيل الإشعارات'
      : 'تعذر الإرسال — تحقق من اتصالك';
    return { success: false, message: msg };
  }
}

export async function isPushSubscribed() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
  try {
    const reg = swRegistration || await navigator.serviceWorker.ready;
    const subscription = await reg.pushManager.getSubscription();
    return !!subscription;
  } catch {
    return false;
  }
}

export async function unsubscribeFromPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  try {
    const reg = swRegistration || await navigator.serviceWorker.ready;
    const subscription = await reg.pushManager.getSubscription();
    if (subscription) {
      await api.post('/push/unsubscribe', { endpoint: subscription.endpoint });
      await subscription.unsubscribe();
    }
  } catch {
    // ignore
  }
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}
