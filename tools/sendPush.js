// sendPush.js
// Usage:
// 1) npm install web-push
// 2) Populate 'subscription' with a saved subscription JSON from backend or browser
// 3) Fill in vapidPublic and vapidPrivate
// 4) node tools/sendPush.js
const webpush = require('web-push');

const subscription = null; // paste subscription object here
const vapidPublic = process.env.VAPID_PUBLIC || '';
const vapidPrivate = process.env.VAPID_PRIVATE || '';

if (!subscription || !vapidPublic || !vapidPrivate) {
  console.error('Please set subscription and VAPID_PUBLIC / VAPID_PRIVATE (or set env vars).');
  process.exit(1);
}

webpush.setVapidDetails('mailto:admin@yourdomain.com', vapidPublic, vapidPrivate);

webpush.sendNotification(subscription, JSON.stringify({ title: 'Manual Test', body: 'Hello from web-push test', url: '/' }))
  .then(res => console.log('Sent', res.statusCode || res))
  .catch(err => console.error('Send error', err));
