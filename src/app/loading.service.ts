import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private pendingRequests = 0;
  private readonly loadingSubject = new BehaviorSubject<boolean>(false);

  readonly isLoading$: Observable<boolean> = this.loadingSubject.asObservable();

  show(): void {
    this.pendingRequests += 1;
    if (this.pendingRequests === 1) {
      this.loadingSubject.next(true);
    }
  }

  hide(): void {
    this.pendingRequests = Math.max(0, this.pendingRequests - 1);
    if (this.pendingRequests === 0) {
      this.loadingSubject.next(false);
    }
  }
}
