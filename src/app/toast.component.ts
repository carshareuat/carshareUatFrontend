import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from './toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-wrap">
      <div *ngFor="let m of msgs" class="toast" [class.toast-success]="m.type==='success'" [class.toast-error]="m.type==='error'">
        <div class="toast-text">{{ m.text }}</div>
        <button class="toast-close" (click)="dismiss(m.id)">✕</button>
      </div>
    </div>
  `,
  styles: [
    `.toast-wrap{position:fixed;right:16px;top:80px;z-index:2000;display:flex;flex-direction:column;gap:8px}.toast{background:#111827;color:#fff;padding:10px 12px;border-radius:8px;box-shadow:0 6px 18px rgba(2,6,23,0.2);display:flex;align-items:center;gap:8px;min-width:200px}.toast-success{background:#10b981}.toast-error{background:#ef4444}.toast-text{flex:1}.toast-close{background:transparent;border:0;color:rgba(255,255,255,0.85);cursor:pointer}`
  ]
})
export class ToastComponent {
  msgs = [] as any[];
  constructor(private to: ToastService) { this.to.messages$.subscribe((m) => (this.msgs = m)); }
  dismiss(id: string) { this.to.dismiss(id); }
}
