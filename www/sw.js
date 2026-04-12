// Service Worker for PokeChill Explorer - Background Notifications
// VERSION: 3.4.3 - Change this to force update
const CACHE_NAME = 'pokechill-v3-5-0';

// Install event
self.addEventListener('install', (event) => {
    self.skipWaiting();
});

// Activate event - Clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames
                    .filter(name => name !== CACHE_NAME)
                    .map(name => caches.delete(name))
            );
        }).then(() => self.clients.claim())
    );
});

// Push notification event (for server push)
self.addEventListener('push', (event) => {
    if (!event.data) return;
    
    const data = event.data.json();
    event.waitUntil(
        self.registration.showNotification(data.title || 'PokeChill Explorer', {
            body: data.body || 'Une rotation va changer !',
            icon: 'https://play-pokechill.github.io/img/ui/favicon.png',
            badge: 'https://play-pokechill.github.io/img/ui/favicon.png',
            tag: data.tag || 'rotation',
            requireInteraction: true,
            renotify: true,
            actions: [
                {
                    action: 'open',
                    title: 'Ouvrir le site'
                }
            ]
        })
    );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    if (event.action === 'open' || !event.action) {
        event.waitUntil(
            clients.matchAll({ type: 'window' }).then((clientList) => {
                // If a window is already open, focus it
                for (const client of clientList) {
                    if (client.url.includes('pokechill') && 'focus' in client) {
                        return client.focus();
                    }
                }
                // Otherwise open a new window
                if (clients.openWindow) {
                    return clients.openWindow('https://play-pokechill.github.io/');
                }
            })
        );
    }
});

// Background sync for periodic checks (not fully supported yet)
self.addEventListener('sync', (event) => {
    if (event.tag === 'check-rotations') {
        event.waitUntil(checkRotationsInBackground());
    }
});

async function checkRotationsInBackground() {
    // This would check rotations from the server
    // For now, we rely on the page keeping the timer alive
}
