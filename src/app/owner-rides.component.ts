import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MockDataService, Ride, Owner } from './mock-data.service';
import { AuthService } from './auth.service';
import { ToastService } from './toast.service';
import { HttpClient } from '@angular/common/http';

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
                <div class="ride-actions mt-1">
              <button class="btn btn-success btn-sm" *ngIf="r.status!=='completed' && r.status!=='cancelled' && isDateValid(r.date)" (click)="markCompleted(r)">✓ Complete</button>
              <button class="btn btn-danger btn-sm" *ngIf="r.status!=='completed' && r.status!=='cancelled' && isDateValid(r.date)" (click)="openCancel(r)">✕ Cancel Ride</button>
              <button class="btn btn-secondary btn-sm" (click)="deleteRide(r)">🗑 Delete</button>
            </div>
          </div>
        </div>
        </div>
      </div>
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
  `,
  styles: [`
    .ride-actions { display:grid; grid-template-columns:repeat(2, minmax(0, 1fr)); gap:8px; align-items:stretch; }
    .ride-actions .btn { width:100%; min-height:40px; white-space:normal; line-height:1.2; }
    .tracking-map { width:100%; height:360px; margin-top:12px; border:1px solid #dbe4ea; border-radius:12px; overflow:hidden; box-shadow:0 6px 18px rgba(15,23,42,.08); }
    @media (max-width:560px) {
      .ride-actions { grid-template-columns:1fr 1fr; }
      .tracking-map { height:340px; }
    }
  `]
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
  private routeRequestKey = '';

  constructor(private data: MockDataService, private auth: AuthService, private router: Router, private toast: ToastService, private http: HttpClient) {
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
      setTimeout(() => this.trackingMap?.invalidateSize(), 150);
    } else {
      this.ownerMarker.setLatLng([this.ownerLat, this.ownerLon]);
      this.passengerMarker.setLatLng([this.passengerLat, this.passengerLon]);
    }
    this.loadRoadRoute();
  }

  private loadRoadRoute() {
    if (this.ownerLat === null || this.ownerLon === null || this.passengerLat === null || this.passengerLon === null || !this.trackingMap) return;
    const key = `${this.ownerLat.toFixed(5)},${this.ownerLon.toFixed(5)}:${this.passengerLat.toFixed(5)},${this.passengerLon.toFixed(5)}`;
    if (key === this.routeRequestKey) return;
    this.routeRequestKey = key;
    const url = `https://router.project-osrm.org/route/v1/driving/${this.ownerLon},${this.ownerLat};${this.passengerLon},${this.passengerLat}?overview=full&geometries=geojson`;
    this.http.get<any>(url).subscribe({
      next: response => {
        const coordinates = response?.routes?.[0]?.geometry?.coordinates;
        if (!Array.isArray(coordinates) || coordinates.length < 2) {
          this.trackingError = 'Road route is unavailable for these locations';
          return;
        }
        const roadPath = coordinates.map((point: number[]) => [point[1], point[0]]);
        if (this.trackingLine) this.trackingMap.removeLayer(this.trackingLine);
        this.trackingLine = L.polyline(roadPath, { color: '#2563eb', weight: 5, opacity: .9, lineJoin: 'round' }).addTo(this.trackingMap);
        this.trackingMap.fitBounds(this.trackingLine.getBounds(), { padding: [28, 28] });
        this.trackingError = null;
      },
      error: () => this.trackingError = 'Unable to load the road route'
    });
  }

  stopPassengerTracking() {
    if (this.trackingTimer) { clearInterval(this.trackingTimer); this.trackingTimer = null; }
    if (this.trackingMap) { this.trackingMap.remove(); this.trackingMap = null; }
    this.trackingLine = null;
    this.routeRequestKey = '';
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
