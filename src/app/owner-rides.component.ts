import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MockDataService, Ride, Owner } from './mock-data.service';
import { AuthService } from './auth.service';
import { ToastService } from './toast.service';

declare const L: any;

@Component({
  selector: 'app-owner-rides',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-header">
      <div>
        <h1 class="page-title">My Rides</h1>
        <p class="page-sub">Create and manage rides for your profile.</p>
      </div>
    </div>
    <section class="card mb-2">
      <h3>🚗 My Rides ({{ myRides.length }})</h3>
      <div *ngIf="myRides.length === 0" class="muted">No rides yet.</div>
      <div *ngFor="let r of myRides" class="ride-card">
        <div class="ride-avatar">{{ (r.carModel || '?').charAt(0) }}</div>
        <div class="ride-content">
          <h4>{{ r.from }} → {{ r.to }}</h4>
          <div class="ride-meta">
            <span>📅 {{ r.date }}</span>
            <span>💺 {{ r.seatsAvailable }} seats</span>
          </div>
          <div class="muted-small">🚗 {{ r.carModel }}</div>
        </div>
        <div class="ride-right">
          <div class="price-pill">₹{{ r.price }}</div>
          <div style="margin-top:8px;text-align:right">
            <div class="muted-small">Status: <strong>{{ r.status || 'active' }}</strong></div>
            <div *ngIf="!isDateValid(r.date)" class="muted-small" style="color:#b91c1c;">Invalid date. Please delete and recreate.</div>
            <div class="mt-1">
              <button class="btn btn-success btn-sm" *ngIf="r.status!=='completed' && r.status!=='cancelled' && isDateValid(r.date)" (click)="markCompleted(r)">✓ Complete</button>
              <button class="btn btn-primary btn-sm" *ngIf="r.status==='active'" (click)="trackPassenger(r)" [disabled]="trackingRide?.id === r.id">Track passenger</button>
              <button class="btn btn-danger btn-sm" *ngIf="r.status!=='completed' && r.status!=='cancelled' && isDateValid(r.date)" (click)="openCancel(r)">✕ Cancel Ride</button>
              <button class="btn btn-secondary btn-sm" (click)="deleteRide(r)">🗑 Delete</button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="card mb-2" *ngIf="trackingRide">
      <h3>Passenger tracking: {{ trackingRide.from }} → {{ trackingRide.to }}</h3>
      <div class="muted-small">Owner and passenger locations refresh every 60 seconds.</div>
      <div style="margin-top:12px;display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <button class="btn btn-secondary btn-sm" (click)="stopPassengerTracking()">Stop tracking</button>
        <span *ngIf="trackingUpdated" class="muted-small">Last updated: {{ trackingUpdated }}</span>
        <span *ngIf="trackingError" class="muted-small" style="color:#b91c1c">{{ trackingError }}</span>
      </div>
      <div *ngIf="ownerLat !== null && passengerLat !== null" id="owner-passenger-map" style="width:100%;height:360px;margin-top:12px;border:1px solid #e6eef2;border-radius:6px;overflow:hidden"></div>
    </section>

    <div class="modal-backdrop" *ngIf="cancellingRide">
      <div class="modal-card">
        <h3>Cancel ride</h3>
        <p class="muted-small">Please provide a mandatory reason for cancelling the ride.</p>
        <select [(ngModel)]="cancelReason">
          <option value="">-- select reason --</option>
          <option>Driver emergency</option>
          <option>Vehicle issue</option>
          <option>Change of plans</option>
          <option>Other</option>
        </select>
        <label class="mt-2">Additional note (optional)</label>
        <textarea [(ngModel)]="cancelNote" placeholder="Add a short note"></textarea>
        <div class="row mt-3">
          <button class="btn btn-secondary" (click)="closeCancel()">Close</button>
          <button class="btn btn-danger" [disabled]="!cancelReason" (click)="confirmCancel()">Confirm Cancel</button>
        </div>
      </div>
    </div>
  `
})
export class OwnerRidesComponent implements OnDestroy {
  myRides: Ride[] = [];
  ownerId = '';
  cancellingRide: Ride | null = null;
  cancelReason = '';
  cancelNote = '';
  trackingRide: Ride | null = null;
  trackingTimer: any = null;
  trackingUpdated: string | null = null;
  trackingError: string | null = null;
  ownerLat: number | null = null;
  ownerLon: number | null = null;
  passengerLat: number | null = null;
  passengerLon: number | null = null;
  private trackingMap: any = null;
  private ownerMarker: any = null;
  private passengerMarker: any = null;
  private trackingLine: any = null;

  constructor(private data: MockDataService, private auth: AuthService, private router: Router, private toast: ToastService) {
    const s = this.auth.current;
    if (!s || s.role !== 'owner') { this.router.navigateByUrl('/'); return; }
    this.ownerId = (s as any).ownerId || '';
    this.load();
  }

  load() {
    if (!this.ownerId) { this.myRides = []; return; }
    this.data.getOwnerRides(this.ownerId).subscribe((rides) => this.myRides = rides);
  }

  markCompleted(r: Ride) {
    if (this.trackingRide?.id === r.id) this.stopPassengerTracking();
    this.updateRideStatus(r, 'completed');
    this.toast.show('Ride marked as completed', 'success');
  }

  openCancel(r: Ride) {
    this.cancellingRide = r;
    this.cancelReason = '';
    this.cancelNote = '';
  }

  closeCancel() { this.cancellingRide = null; }

  confirmCancel() {
    if (!this.cancellingRide || !this.cancelReason) return;
    this.updateRideStatus(this.cancellingRide, 'cancelled', this.cancelReason, this.cancelNote);
    this.closeCancel();
    this.toast.show('Ride cancelled and passengers notified', 'success');
  }

  updateRideStatus(r: Ride, status: 'completed' | 'cancelled', reason?: string, note?: string) {
    this.data.updateRide(r.id, status, reason, note).subscribe({
      next: () => this.load(),
      error: () => this.toast.show('Unable to update ride', 'error')
    });
  }

  trackPassenger(ride: Ride) {
    if (ride.status === 'completed' || ride.status === 'cancelled') return;
    this.stopPassengerTracking();
    this.trackingRide = ride;
    this.trackingError = null;
    this.pollPassengerTracking();
    this.trackingTimer = setInterval(() => this.pollPassengerTracking(), 60000);
  }

  private pollPassengerTracking() {
    if (!this.trackingRide || this.trackingRide.status === 'completed' || this.trackingRide.status === 'cancelled') {
      this.stopPassengerTracking();
      return;
    }
    if (!navigator.geolocation) {
      this.trackingError = 'Geolocation is unavailable';
      return;
    }
    navigator.geolocation.getCurrentPosition(position => {
      this.ownerLat = position.coords.latitude;
      this.ownerLon = position.coords.longitude;
      this.data.getPassengerLocation(this.trackingRide!.id).subscribe({
        next: location => {
          if (!location) { this.trackingError = 'Passenger location is not available'; return; }
          this.passengerLat = location.lat;
          this.passengerLon = location.lon;
          this.trackingUpdated = new Date().toLocaleTimeString();
          this.trackingError = null;
          setTimeout(() => this.updateTrackingMap(), 0);
        },
        error: () => this.trackingError = 'Unable to fetch passenger location'
      });
    }, () => this.trackingError = 'Unable to read owner location', { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
  }

  private updateTrackingMap() {
    if (this.ownerLat === null || this.ownerLon === null || this.passengerLat === null || this.passengerLon === null) return;
    const element = document.getElementById('owner-passenger-map');
    if (!element) return;
    if (!this.trackingMap) {
      this.trackingMap = L.map(element).setView([this.ownerLat, this.ownerLon], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors' }).addTo(this.trackingMap);
      this.ownerMarker = L.marker([this.ownerLat, this.ownerLon]).addTo(this.trackingMap).bindTooltip('Your car');
      this.passengerMarker = L.marker([this.passengerLat, this.passengerLon]).addTo(this.trackingMap).bindTooltip('Passenger');
      this.trackingLine = L.polyline([[this.ownerLat, this.ownerLon], [this.passengerLat, this.passengerLon]], { color: '#2563eb', weight: 4 }).addTo(this.trackingMap);
    } else {
      this.ownerMarker.setLatLng([this.ownerLat, this.ownerLon]);
      this.passengerMarker.setLatLng([this.passengerLat, this.passengerLon]);
      this.trackingLine.setLatLngs([[this.ownerLat, this.ownerLon], [this.passengerLat, this.passengerLon]]);
      this.trackingMap.fitBounds([[this.ownerLat, this.ownerLon], [this.passengerLat, this.passengerLon]], { padding: [30, 30] });
    }
  }

  stopPassengerTracking() {
    if (this.trackingTimer) { clearInterval(this.trackingTimer); this.trackingTimer = null; }
    if (this.trackingMap) { this.trackingMap.remove(); this.trackingMap = null; }
    this.trackingRide = null;
    this.ownerLat = this.ownerLon = this.passengerLat = this.passengerLon = null;
    this.trackingUpdated = null;
  }

  ngOnDestroy() { this.stopPassengerTracking(); }

  isDateValid(s: string | undefined): boolean {
    if (!s || typeof s !== 'string') return false;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s.trim())) return false;
    const d = new Date(s.trim() + 'T00:00:00');
    return !isNaN(d.getTime());
  }

  deleteRide(r: Ride) {
    this.data.deleteRide(r.id).subscribe({
      next: () => { this.toast.show('Ride deleted', 'success'); this.load(); },
      error: () => this.toast.show('Unable to delete ride', 'error')
    });
  }
}
