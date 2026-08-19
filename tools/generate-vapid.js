// generate-vapid.js
// Usage:
// 1) npm install web-push
// 2) node tools/generate-vapid.js
const webpush = require('web-push');
const keys = webpush.generateVAPIDKeys();
console.log('VAPID_PUBLIC=' + keys.publicKey);
console.log('VAPID_PRIVATE=' + keys.privateKey);
console.log('\nAdd these to your backend environment as VAPID_PUBLIC and VAPID_PRIVATE.');
