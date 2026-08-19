import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MockDataService } from './mock-data.service';
import { AuthService } from './auth.service';
import { Router } from '@angular/router';
import { ToastService } from './toast.service';
import { phoneHref } from './phone.util';

interface Booking {
  id: string;
  rideId: string;
  userMobile: string;
  seats: number;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  cancellationReason?: string;
}

@Component({
  selector: 'app-owner-requests',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-header">
      <div>
        <h1 class="page-title">Booking Requests</h1>
        <p class="page-sub">Requests for your rides. Accept or reject bookings.</p>
      </div>
    </div>

    <section class="card">
      <div *ngIf="requests.length===0" class="muted">No booking requests.</div>
      <div *ngFor="let b of requests" class="ride-card">
        <div class="ride-avatar">{{ b.userMobile.charAt(b.userMobile.length-1) }}</div>
        <div class="ride-content">
          <h4>{{ getRideFrom(b.rideId) }} → {{ getRideTo(b.rideId) }}</h4>
          <div class="ride-meta">
            <span>📱 {{ b.userMobile }}</span>
            <span>💺 {{ b.seats }} seats</span>
          </div>
          <div *ngIf="b.status==='cancelled'" class="muted-small">Cancelled: {{ b.cancellationReason || '—' }}</div>
        </div>
        <div class="ride-right">
          <div *ngIf="b.status==='pending'">
            <button class="btn btn-success btn-sm" (click)="respond(b.id,'accepted')">✓ Accept</button>
            <button class="btn btn-danger btn-sm" (click)="respond(b.id,'rejected')">✕ Reject</button>
            <a class="btn btn-ghost btn-sm" [href]="phoneHref(b.userMobile)">📞 Call</a>
          </div>
          <div *ngIf="b.status!=='pending'">
            <div *ngIf="b.status==='accepted'">
              <a class="btn btn-ghost btn-sm" [href]="phoneHref(b.userMobile)">📞 Call</a>
              <div class="muted-small">{{ b.status }}</div>
            </div>
            <div *ngIf="b.status!=='accepted'" class="muted-small">{{ b.status }}</div>
          </div>
        </div>
      </div>
    </section>
  `
})
export class OwnerRequestsComponent {
  requests: Booking[] = [];
  ownerId = '';
  allRides: any[] = [];
  phoneHref = phoneHref;

  constructor(private data: MockDataService, private auth: AuthService, private router: Router, private toast: ToastService) {
    const s = this.auth.current;
    if (!s || s.role !== 'owner') { this.router.navigateByUrl('/'); return; }
    this.ownerId = (s as any).ownerId || '';
    this.load();
  }

  load() {
    this.data.getRides().subscribe((rides) => {
      this.allRides = rides.filter((ride) => ride.ownerId === this.ownerId);
      this.requests = [];
      this.allRides.forEach((ride) => this.data.getRideBookings(ride.id).subscribe((bookings) => this.requests.push(...bookings as Booking[])));
    });
  }

  getRideFrom(id: string) { return this.allRides.find((x)=>x.id===id)?.from || ''; }
  getRideTo(id: string) { return this.allRides.find((x)=>x.id===id)?.to || ''; }

  respond(bookingId: string, action: 'accepted'|'rejected') {
    this.data.decideBooking(bookingId, action).subscribe({
      next: () => { this.load(); this.toast.show('Booking ' + action, 'success'); },
      error: () => this.toast.show('Unable to update booking request', 'error')
    });
  }
}
