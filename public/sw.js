const CACHE_NAME = 'sim-devie-v4';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => caches.delete(cache))
      );
    }).then(() => self.clients.claim())
  );
});

// Handle Notifications click to focus app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});

// Handle Background Sync
self.addEventListener('sync', (event) => {
  if (event.tag.startsWith('diegetic-ping-')) {
    event.waitUntil(
      self.registration.showNotification('Nouveau Message', {
        body: 'Un contact cherche à vous joindre sur votre terminal.',
        icon: '/pwa_app_icon.png',
        badge: '/pwa_app_icon.png',
        vibrate: [200, 100, 200],
        tag: 'diegetic-ping'
      })
    );
  }
});

// Expose a way to schedule a delayed background sync ping if supported
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data;
    if (self.registration && self.registration.showNotification) {
      self.registration.showNotification(title, {
        icon: '/pwa_app_icon.png',
        badge: '/pwa_app_icon.png',
        vibrate: [200, 100, 200],
        ...options
      });
    }
  } else if (event.data && event.data.type === 'SCHEDULE_PING') {
    // Attempt to register a background sync if the SW is allowed to
    if ('sync' in self.registration) {
      // In a real PWA context, background sync is usually registered from the client,
      // but we add this handler as a bridge if the client sends a message.
    } else {
      // Fallback: simple timeout if the SW stays alive (often ~5 mins)
      setTimeout(() => {
        if (self.registration && self.registration.showNotification) {
          self.registration.showNotification(event.data.title || 'Notification', {
            body: event.data.body || 'Une opportunité ou un message vient d\'arriver.',
            icon: '/pwa_app_icon.png',
            vibrate: [100, 50, 100]
          });
        }
      }, event.data.delayMs || 30000);
    }
  }
});
