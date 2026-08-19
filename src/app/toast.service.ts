import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface ToastMessage {
  id: string;
  text: string;
  type?: 'info' | 'success' | 'error' | 'warning';
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private _messages = new BehaviorSubject<ToastMessage[]>([]);
  readonly messages$ = this._messages.asObservable();

  show(text: string, type: ToastMessage['type'] = 'info', timeout = 4000) {
    const msg: ToastMessage = { id: 't' + Date.now() + Math.random().toString(36).slice(2), text, type };
    const cur = this._messages.value.slice();
    cur.push(msg);
    this._messages.next(cur);
    if (timeout > 0) setTimeout(() => this.dismiss(msg.id), timeout);
  }

  dismiss(id: string) {
    const cur = this._messages.value.filter((m) => m.id !== id);
    this._messages.next(cur);
  }
}
