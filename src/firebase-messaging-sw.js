importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: 'AIzaSyCcEi3Yt_oGlU_AZu4qQ7YEfICFZljdRDY',
  authDomain: 'carshare-195f9.firebaseapp.com',
  projectId: 'carshare-195f9',
  storageBucket: 'carshare-195f9.firebasestorage.app',
  messagingSenderId: '256324801326',
  appId: '1:256324801326:web:c1be00e64d954aaeb260bf'
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

messaging.onBackgroundMessage((payload) => {
  const title = payload?.notification?.title || payload?.data?.title || 'carShare';
  const body = payload?.notification?.body || payload?.data?.body || 'You have a new notification';
  const route = payload?.data?.route || '/';
  const notificationOptions = {
    body,
    icon: '/assets/carShare-logo.png',
    badge: '/assets/carShare-logo.png',
    tag: 'carshare-notification',
    data: { url: route },
    actions: [
      { action: 'open', title: 'Open app' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };

  return self.registration.showNotification(title, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const route = event.notification?.data?.url || '/';
  const url = new URL(route, self.location.origin).toString();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
