import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MockDataService } from './mock-data.service';
import { AuthService } from './auth.service';
import { Router } from '@angular/router';
import { ToastService } from './toast.service';
import { phoneHref } from './phone.util';
import { HttpClient } from '@angular/common/http';

declare const L: any;

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
              <button class="btn btn-primary btn-sm" (click)="trackBooking(b)" [disabled]="trackingBookingId === b.id">Track passenger</button>
              <div class="muted-small">{{ b.status }}</div>
            </div>
            <div *ngIf="b.status!=='accepted'" class="muted-small">{{ b.status }}</div>
          </div>
        </div>
      </div>
    </section>
    <section class="card" *ngIf="trackingBookingId">
      <h3>Passenger tracking</h3>
      <p class="muted-small">Tracking the selected booking request. Location refreshes every 60 seconds.</p>
      <div class="tracking-toolbar">
        <span *ngIf="trackingUpdated" class="muted-small">Last updated: {{ trackingUpdated }}</span>
        <span *ngIf="trackingError" class="muted-small tracking-error">{{ trackingError }}</span>
        <button class="btn btn-secondary btn-sm" (click)="stopTracking()">Stop tracking</button>
      </div>
      <div *ngIf="ownerLat !== null && passengerLat !== null" id="booking-passenger-map" class="tracking-map"></div>
    </section>
  `
  , styles: [`
    .ride-right > div { display:flex; flex-wrap:wrap; justify-content:flex-end; gap:8px; }
    .tracking-toolbar { display:flex; align-items:center; flex-wrap:wrap; gap:12px; }
    .tracking-toolbar .tracking-error { color:#b91c1c; flex:1 1 100%; }
    .tracking-map { width:100%; height:360px; margin-top:12px; border:1px solid #dbe4ea; border-radius:12px; overflow:hidden; }
  `]
})
export class OwnerRequestsComponent implements OnDestroy {
  requests: Booking[] = [];
  ownerId = '';
  allRides: any[] = [];
  phoneHref = phoneHref;
  trackingBookingId: string | null = null;
  trackingTimer: any = null;
  trackingUpdated: string | null = null;
  trackingError: string | null = null;
  ownerLat: number | null = null;
  ownerLon: number | null = null;
  passengerLat: number | null = null;
  passengerLon: number | null = null;
  private trackingMap: any;
  private passengerMarker: any;
  private ownerMarker: any;

  constructor(private data: MockDataService, private auth: AuthService, private router: Router, private toast: ToastService, private http: HttpClient) {
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

  trackBooking(booking: Booking) {
    this.stopTracking();
    this.trackingBookingId = booking.id;
    this.pollBookingLocation();
    this.trackingTimer = setInterval(() => this.pollBookingLocation(), 60000);
  }

  private pollBookingLocation() {
    if (!this.trackingBookingId) return;
    const ownerId = this.ownerId;
    if (!navigator.geolocation) { this.trackingError = 'Geolocation is unavailable'; return; }
    navigator.geolocation.getCurrentPosition(position => {
      this.ownerLat = position.coords.latitude;
      this.ownerLon = position.coords.longitude;
      this.data.getBookingPassengerLocation(this.trackingBookingId!).subscribe({
        next: location => {
          if (!location) { this.trackingError = 'Passenger location is not available'; return; }
          this.passengerLat = location.lat; this.passengerLon = location.lon;
          this.trackingUpdated = new Date().toLocaleTimeString(); this.trackingError = null;
          setTimeout(() => this.updateTrackingMap(), 0);
        }, error: () => this.trackingError = 'Unable to fetch this passenger location'
      });
      this.data.postOwnerLocation(ownerId, this.ownerLat, this.ownerLon).subscribe({ error: () => {} });
    }, () => this.trackingError = 'Unable to read owner location', { enableHighAccuracy:true, timeout:10000, maximumAge:0 });
  }

  private updateTrackingMap() {
    if (this.ownerLat === null || this.ownerLon === null || this.passengerLat === null || this.passengerLon === null) return;
    const element = document.getElementById('booking-passenger-map');
    if (!element) return;
    if (!this.trackingMap) {
      this.trackingMap = L.map(element).setView([this.ownerLat, this.ownerLon], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution:'&copy; OpenStreetMap contributors' }).addTo(this.trackingMap);
      this.ownerMarker = L.marker([this.ownerLat, this.ownerLon]).addTo(this.trackingMap).bindTooltip('Your car');
      this.passengerMarker = L.marker([this.passengerLat, this.passengerLon]).addTo(this.trackingMap).bindTooltip('Passenger');
    } else {
      this.ownerMarker.setLatLng([this.ownerLat, this.ownerLon]);
      this.passengerMarker.setLatLng([this.passengerLat, this.passengerLon]);
    }
    this.trackingMap.fitBounds([[this.ownerLat, this.ownerLon], [this.passengerLat, this.passengerLon]], { padding:[28,28] });
  }

  stopTracking() {
    if (this.trackingTimer) { clearInterval(this.trackingTimer); this.trackingTimer = null; }
    if (this.trackingMap) { this.trackingMap.remove(); this.trackingMap = null; }
    this.trackingBookingId = null; this.trackingUpdated = null; this.trackingError = null;
    this.ownerLat = this.ownerLon = this.passengerLat = this.passengerLon = null;
  }

  ngOnDestroy() { this.stopTracking(); }
}
