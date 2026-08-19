import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MockDataService, Ride } from './mock-data.service';
import { AuthService } from './auth.service';
import { phoneHref } from './phone.util';
import { Router } from '@angular/router';
import { ToastService } from './toast.service';

@Component({
  selector: 'app-bookings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-header">
      <div>
        <h1 class="page-title">My Booked Rides</h1>
        <p class="page-sub">Your booking history and current bookings.</p>
      </div>
    </div>

    <section class="card">
      <div *ngIf="bookings.length===0" class="muted">No bookings found.</div>
      <div *ngFor="let b of bookings" class="ride-card">
        <div class="ride-avatar" (click)="view(b.rideId)" style="cursor:pointer">{{ b.ride?.carModel?.charAt(0) || 'R' }}</div>
        <div class="ride-content" (click)="view(b.rideId)" style="cursor:pointer">
          <h4>{{ b.ride?.from }} <span class="muted">→</span> {{ b.ride?.to }}</h4>
          <div class="ride-meta">
            <span>📅 {{ b.ride?.date }}</span>
            <span>💺 {{ b.seats }} seats</span>
          </div>
          <div class="muted-small">Status: <strong>{{ b.status }}</strong></div>
          <div *ngIf="b.needsRating" class="muted-small">Awaiting your rating</div>
          <div *ngIf="b.status === 'cancelled'" class="muted-small">Cancelled by: <strong>{{ b.cancelledBy }}</strong></div>
          <div *ngIf="b.status === 'cancelled'" class="muted-small">Reason: <strong>{{ b.cancellationReason || b.cancellationNote || '—' }}</strong></div>
        </div>
        <div class="ride-right">
          <div class="price-pill">₹{{ b.ride?.price }}</div>
          <div style="display:flex;flex-direction:column;gap:8px;align-items:flex-end">
            <button *ngIf="b.needsRating" class="btn btn-primary btn-sm" (click)="openRate(b.id)">Rate owner</button>
            <button *ngIf="!b.needsRating && (b.status === 'pending' || b.status === 'accepted') && b.ride?.status !== 'completed' && b.ride?.status !== 'cancelled'" class="btn btn-danger btn-sm" (click)="openCancel(b.id)">Cancel</button>
            <div *ngIf="!b.needsRating && (b.status === 'pending' || b.status === 'accepted') && b.ride?.status !== 'completed' && b.ride?.status !== 'cancelled'">
              <button class="btn btn-primary btn-sm" (click)="b.showShare = !b.showShare">Share live location</button>
              <div *ngIf="b.showShare" style="margin-top:8px">
                <label>WhatsApp number (with country code)</label>
                <div style="display:flex;gap:8px;margin-top:6px">
                  <input [(ngModel)]="b.shareNumber" placeholder="e.g. 918765432100" />
                  <button class="btn btn-primary btn-sm" (click)="shareLiveLocationFor(b)">Send</button>
                  <button class="btn btn-secondary btn-sm" (click)="closeShare(b)">Close</button>
                </div>
                <div *ngIf="b.shareError" class="muted-small" style="color:#b91c1c;margin-top:6px">{{ b.shareError }}</div>
              </div>
            </div>
            <div *ngIf="b.status === 'accepted' && b.ownerMobile" style="margin-top:8px">
              <a [href]="phoneHref(b.ownerMobile)" class="btn btn-ghost btn-sm">📞 Call owner</a>
            </div>
          </div>
        </div>
      </div>
    </section>

    <div class="modal-backdrop" *ngIf="cancelingId">
      <div class="modal-card">
        <h3>Cancel booking</h3>
        <p class="muted-small">Please select a reason for cancellation (required).</p>
        <select [(ngModel)]="selectedReason">
          <option value="">-- select reason --</option>
          <option *ngFor="let r of reasons" [value]="r">{{r}}</option>
        </select>
        <label class="mt-2">Additional note (optional)</label>
        <textarea [(ngModel)]="note" placeholder="Add a short note"></textarea>
        <div class="row mt-3">
          <button class="btn btn-secondary" (click)="closeCancel()">Close</button>
          <button class="btn btn-danger" [disabled]="!selectedReason" (click)="confirmCancel()">Confirm Cancel</button>
        </div>
      </div>
    </div>
    <div class="modal-backdrop" *ngIf="ratingId">
      <div class="modal-card">
        <h3>Rate your ride</h3>
        <p class="muted-small">Please give a star rating for the owner (required).</p>
        <select [(ngModel)]="ratingValue">
          <option value="">-- select rating --</option>
          <option *ngFor="let r of [1,2,3,4,5]" [value]="r">{{r}} ★</option>
        </select>
        <label class="mt-2">Note (optional)</label>
        <textarea [(ngModel)]="ratingNote" placeholder="Add a short note"></textarea>
        <div class="row mt-3">
          <button class="btn btn-secondary" (click)="closeRate()">Close</button>
          <button class="btn btn-primary" [disabled]="!ratingValue" (click)="submitRating()">Submit Rating</button>
        </div>
      </div>
    </div>
  `
})
export class BookingsComponent {
  phoneHref = phoneHref;
  bookings: Array<{ id: string; rideId: string; seats: number; status: string; ride?: Ride | undefined; cancellationReason?: string; cancellationNote?: string; cancelledBy?: string; cancelledAt?: string; needsRating?: boolean; rated?: boolean; rating?: number; showShare?: boolean; shareNumber?: string; shareError?: string; sharing?: boolean; ownerMobile?: string }> = [];
  cancelingId: string | null = null;
  ratingId: string | null = null;
  ratingValue: number | null = null;
  ratingNote = '';
  reasons = [
    'Change of plans',
    'Found alternate transport',
    'Emergency',
    'Driver canceled earlier',
    'Other'
  ];
  selectedReason = '';
  note = '';

  constructor(private data: MockDataService, private auth: AuthService, private router: Router, private toast: ToastService) {
    const s = this.auth.current;
    if (!s || s.role !== 'passenger') { this.router.navigateByUrl('/'); return; }
    this.load();
  }

  load() {
    this.bookings = [];
    this.data.getMyBookings().subscribe((mine) => mine.forEach((b: any) => {
      this.data.getRideById(b.rideId).subscribe((ride) => {
        const item: any = { id: b.id, rideId: b.rideId, seats: b.seats, status: b.status, ride, cancellationReason: b.cancellationReason, cancellationNote: b.cancellationNote, cancelledBy: b.cancelledBy, cancelledAt: b.cancelledAt, needsRating: b.needsRating, rated: b.rated, rating: b.rating, showShare: false, shareNumber: '', shareError: '', sharing: false };
        // fetch owner mobile for call action when booking is accepted
        if (ride && ride.ownerId) {
          this.data.getOwnerById(ride.ownerId).subscribe({ next: (owner) => { if (owner) item.ownerMobile = owner.mobile; }, error: () => {} });
        }
        this.bookings.push(item);
      });
    }));
  }

  closeShare(b: any) {
    b.showShare = false; b.shareNumber = ''; b.shareError = ''; b.sharing = false;
  }

  shareLiveLocationFor(b: any) {
    b.shareError = '';
    const num = (b.shareNumber || '').replace(/\s+/g, '');
    if (!num || !/^[0-9]{8,15}$/.test(num)) { b.shareError = 'Enter a valid phone number with country code'; return; }
    if (!navigator.geolocation) { b.shareError = 'Geolocation not supported in this browser'; return; }
    b.sharing = true;
    navigator.geolocation.getCurrentPosition((pos) => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      const mapUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
      const text = encodeURIComponent(`I'm sharing my live location: ${mapUrl}`);
      const phone = num.replace(/^\+/, '');
      const waUrl = `https://wa.me/${phone}?text=${text}`;
      window.open(waUrl, '_blank');
      b.sharing = false;
      b.showShare = false;
      b.shareNumber = '';
    }, (err) => {
      b.sharing = false;
      b.shareError = 'Unable to get location: ' + (err?.message || 'permission denied');
    }, { enableHighAccuracy: true, timeout: 10000 });
  }

  openCancel(id: string) {
    this.cancelingId = id;
    this.selectedReason = '';
    this.note = '';
  }

  openRate(id: string) {
    this.ratingId = id;
    this.ratingValue = null;
    this.ratingNote = '';
  }

  closeRate() { this.ratingId = null; this.ratingValue = null; this.ratingNote = ''; }

  view(rideId: string) {
    this.router.navigateByUrl('/ride/' + rideId);
  }

  closeCancel() {
    this.cancelingId = null;
  }

  confirmCancel() {
    if (!this.cancelingId || !this.selectedReason) return;
    this.data.cancelBooking(this.cancelingId, this.selectedReason, this.note).subscribe({
      next: () => { this.closeCancel(); this.load(); this.toast.show('Booking cancelled and owner notified', 'success'); },
      error: () => this.toast.show('Unable to cancel booking', 'error')
    });
  }

  submitRating() {
    if (!this.ratingId || !this.ratingValue) return;
    this.data.rateBooking(this.ratingId, Number(this.ratingValue), this.ratingNote).subscribe({
      next: () => { this.closeRate(); this.load(); this.toast.show('Thanks for rating the owner', 'success'); },
      error: () => this.toast.show('Unable to submit rating', 'error')
    });
  }
}
