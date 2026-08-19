import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const swUrl = '/firebase-messaging-sw.js';
    navigator.serviceWorker.register(swUrl, { scope: '/' }).then((registration) => {
      console.log('Service worker registered for Firebase push', registration.scope, swUrl);
    }).catch((err) => console.warn('Service worker registration failed', err));
  });
}

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
