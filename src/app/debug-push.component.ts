import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from './toast.service';
import { NotificationService } from './notification.service';
import { environment } from '../environments/environment';

@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'debug-push',
  template: `
    <div style="padding:16px;max-width:800px;margin:auto">
      <h3>Push Debug</h3>
      <p><strong>Permission:</strong> {{ permission }}</p>
      <p>
        <button (click)="request()">Request permission & subscribe</button>
        <button (click)="refreshSubscription()">Refresh subscription</button>
        <button (click)="sendServerDebug()">Trigger server debug push (sendToAll)</button>
      </p>
      <h4>Subscription JSON</h4>
      <pre style="white-space:pre-wrap;background:#111;color:#eee;padding:8px;border-radius:4px">{{ subText }}</pre>
    </div>
  `
})
export class DebugPushComponent {
  permission = 'unknown';
  subText = 'Not available';
  logs: string[] = [];
  constructor(private toast: ToastService, private notif: NotificationService) {
    this.refreshPermission();
    this.refreshSubscription();
  }

  addLog(line: string) { this.logs.unshift(new Date().toISOString() + ' - ' + line); }

  refreshPermission() { this.permission = (typeof Notification === 'undefined') ? 'unsupported' : Notification.permission; }

  async request() {
    this.addLog('Requesting permission and subscribe...');
    try {
      const r: any = await this.notif.requestPermissionAndSubscribe();
      this.addLog('subscribe result: ' + JSON.stringify(r));
      if (r && r.ok && r.subscription) {
        this.subText = JSON.stringify(r.subscription, null, 2);
      } else {
        await this.refreshSubscription();
      }
      this.refreshPermission();
      this.toast.show('Subscribe finished', 'info');
    } catch (e) {
      this.addLog('subscribe error: ' + String(e));
      this.toast.show('Error: ' + String(e), 'error');
    }
  }

  async refreshSubscription() {
    this.addLog('Refreshing registration/subscription');
    try {
      // Try the registration matching this page first
      let reg = await navigator.serviceWorker.getRegistration();
      this.addLog('page registration: ' + (reg ? 'found ' + reg.scope : 'none'));
      let sub = reg ? await reg.pushManager.getSubscription() : null;
      // If not found, search all registrations (useful when SW is registered under /assets/ scope)
      if (!sub) {
        const regs = await navigator.serviceWorker.getRegistrations();
        this.addLog('found ' + regs.length + ' registrations');
        for (const r of regs) {
          try {
            const s = await r.pushManager.getSubscription();
            if (s) { reg = r; sub = s; this.addLog('found subscription under scope ' + r.scope); break; }
          } catch (e) { /* ignore */ }
        }
      }
      this.subText = sub ? JSON.stringify(sub, null, 2) : 'No subscription';
      this.addLog('Current subscription: ' + (sub ? 'present' : 'none'));
    } catch (e) { this.subText = 'Error: ' + String(e); this.addLog('refresh error: ' + String(e)); }
  }

  async sendServerDebug() {
    this.addLog('Calling server debug push endpoint');
    try {
      const base = (environment.apiBaseUrl || '').replace(/\/+$/, '');
      const url = base.replace(/\/api\/?$/, '') + '/api/debug/push/test';
      this.addLog('POST ' + url);
      const headers: any = { 'Content-Type': 'application/json' };
      const token = localStorage.getItem('accessToken');
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify({ title: 'Server Debug', body: 'Triggered from client debug page' }) });
      let text = '';
      try { text = await res.text(); } catch (e) { text = String(e); }
      this.addLog('Server responded status=' + res.status + ' body=' + text);
      if (res.ok) this.toast.show('Server response: ' + text, 'info'); else this.toast.show('Server error: ' + res.status, 'error');
    } catch (e) { this.addLog('Error sending debug call: ' + String(e)); this.toast.show('Error sending debug call: ' + String(e), 'error'); }
  }
}
