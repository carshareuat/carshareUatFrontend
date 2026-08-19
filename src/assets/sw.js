self.addEventListener('push', function(event) {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch(e) { data = { title: 'carShare', body: event.data?.text() || 'You have a new message' }; }
  const title = data.title || 'carShare';
  const options = {
    body: data.body || 'Open the app to view details',
    data: data, // pass payload
    icon: '/assets/icons/icon-192.png',
    badge: '/assets/icons/icon-72.png'
  };
  // Show system notification and also notify any open clients (pages) for in-app handling
  event.waitUntil((async function() {
    try { await self.registration.showNotification(title, options); } catch (e) { /* ignore */ }
    try {
      const all = await clients.matchAll({ includeUncontrolled: true, type: 'window' });
      for (const client of all) {
        try { client.postMessage({ type: 'PUSH_RECEIVED', payload: data }); } catch (e) { /* ignore */ }
      }
    } catch (e) { /* ignore */ }
  })());
});

// Claim clients immediately on activation so pages are controlled without a full reload
self.addEventListener('activate', function(event) {
  event.waitUntil((async function() {
    try { await self.clients.claim(); } catch (e) { /* ignore */ }
  })());
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const url = event.notification?.data?.url || '/';
  event.waitUntil(clients.matchAll({ type: 'window' }).then(windowClients => {
    for (let i = 0; i < windowClients.length; i++) {
      const client = windowClients[i];
      if (client.url === url && 'focus' in client) return client.focus();
    }
    if (clients.openWindow) return clients.openWindow(url);
  }));
});
