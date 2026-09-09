console.log("🚀🚀🚀 SMARTMALL SERVICE WORKER V5 IS RUNNING! 🚀🚀🚀");
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Track shown notification IDs to prevent duplicates
function getShownSet() {
  return caches.open('notif-dedup').then((cache) => cache.keys().then((keys) => keys.map((r) => r.url)));
}

// Read persisted sound settings (written by pwa.js) to respect mute/volume when app is closed
function readSoundSettings() {
  return caches.open('sound-settings')
    .then(function (cache) { return cache.match('/__sound_settings__'); })
    .then(function (r) { return r ? r.json() : null; })
    .catch(function () { return null; });
}

function markShown(notifId) {
  if (!notifId) return;
  caches.open('notif-dedup').then((cache) => {
    cache.put(new Request(`/__shown__/${notifId}`), new Response('1'));
    // Keep only latest 100
    cache.keys().then((keys) => {
      if (keys.length > 100) {
        const toDelete = keys.slice(0, keys.length - 100);
        Promise.all(toDelete.map((k) => cache.delete(k)));
      }
    });
  });
}

// ===== Message from pwa.js =====
self.addEventListener('message', (event) => {
  const { type, title, body, icon, url, notifId } = event.data || {};
  if (type === 'SHOW_NOTIFICATION') {
    const options = {
      body: body || '',
      icon: icon || '/logo.png?v=2',
      badge: '/logo.png?v=2',
      vibrate: [200, 100, 200],
      silent: true,
      renotify: false,
      data: { url: url || '/notifications' },
    };
    if (notifId) {
      options.tag = `notif-${notifId}`;
    }
    event.waitUntil(self.registration.showNotification(title || 'SmartMall', options));
  }
  // Fallback: page requested OS sound because custom sound failed
  if (type === 'FALLBACK_SOUND') {
    const options = {
      body: body || 'لديك إشعار جديد',
      icon: icon || '/logo.png?v=2',
      badge: '/logo.png?v=2',
      silent: false, // OS default sound
      renotify: true,
      data: { url: url || '/notifications' },
    };
    if (notifId) {
      options.tag = `notif-${notifId}`; // same tag as SHOW_NOTIFICATION → replaces silently shown one
    }
    event.waitUntil(self.registration.showNotification(title || 'SmartMall', options));
  }
});

// ===== WebPush from server =====
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let title = 'SmartMall';
  let body = 'لديك إشعار جديد';
  let url = '/notifications';

  try {
    const data = event.data.json();
    title = data.title || title;
    body = data.body || body;
    url = data.url || url;
  } catch (e) {
    try {
      body = event.data.text() || body;
    } catch (err) {}
  }

  const soundQuery = `?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}&url=${encodeURIComponent(url)}`;

  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(clients => {
      const hasPage = clients.length > 0;

      // Forward to open pages so they can play custom sound immediately
      clients.forEach(c => c.postMessage({ type: 'PUSH_NOTIFICATION', title, body, url }));

      // If no page open, try to launch a hidden page that plays custom sound
      let soundClientOpened = false;
      if (!hasPage) {
        self.clients.openWindow('/notif-sound' + soundQuery)
          .then(() => { soundClientOpened = true; })
          .catch(() => {});
      }

      return readSoundSettings().then(function (s) {
        const muted = !s || !s.enabled || !(s.volume > 0);
        const options = {
          body: body,
          icon: '/logo.png?v=2',
          silent: hasPage || muted, // silent if page open (custom sound) or muted
          data: { url: url }
        };
        return self.registration.showNotification(title, options);
      });
    })
  );
});

// Handle subscription expiration
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    self.registration.pushManager.subscribe(event.oldSubscription.options)
      .then((subscription) => {
        return fetch('/api/v1/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(subscription)
        });
      })
  );
});

// Notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/notifications';
  const fullUrl = new URL(url, self.location.origin).href;
  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ('navigate' in client) {
            return client.navigate(fullUrl).then(() => client.focus());
          }
        }
        return clients.openWindow(fullUrl);
      })
  );
});
