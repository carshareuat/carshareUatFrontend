import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MockDataService, Owner, Ride } from './mock-data.service';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button class="btn btn-secondary mb-2" (click)="back()">← Back</button>

    <div *ngIf="!owner" class="card">
      <h3>Profile not found</h3>
      <p class="muted-small" *ngIf="isSelf">Your owner profile hasn't been created yet. Complete verification to activate your profile.</p>
      <button *ngIf="isSelf" class="btn btn-primary" (click)="goVerify()">Pay & Verify</button>
    </div>

    <div *ngIf="owner" class="card">
      <div class="profile-header">
        <div>
          <div *ngIf="owner.profilePhoto; else avatar" class="profile-avatar" style="background-size:cover;background-position:center;">
            <img [src]="owner.profilePhoto" style="width:64px;height:64px;border-radius:8px;object-fit:cover" />
          </div>
          <ng-template #avatar>
            <div class="profile-avatar">{{ owner.name.charAt(0) }}</div>
          </ng-template>
        </div>
        <div>
          <h1 class="page-title" style="font-size:1.6rem;margin:0;">
            {{ owner.name }}
            <span *ngIf="owner.age" class="muted-small"> · {{ owner.age }} years</span>
            <span *ngIf="owner.verified" class="badge badge-verified" style="font-size:0.8rem;vertical-align:middle;">✓ Verified</span>
          </h1>
          <div class="muted-small" *ngIf="showOwnerMobile">📱 {{ owner.mobile }}</div>
          <div class="muted-small" *ngIf="!showOwnerMobile">📱 Contact available after booking is confirmed</div>
          <div class="rating">⭐ {{ displayRating.toFixed(1) }} <span class="muted-small">({{ displayCount }} ratings)</span></div>
        </div>
      </div>

      <hr />

      <div *ngIf="isSelf && !owner.verified && paymentInReview" class="card" style="background:#eff6ff;border:1px solid #93c5fd;">
        <h3>Payment verification in progress</h3>
        <p class="muted-small">Your payment is being reviewed and will be approved in few minutes.</p>
      </div>

      <div *ngIf="isSelf && !owner.verified && !paymentInReview" class="card" style="background:#fff7ed;border:1px solid #fed7aa;">
        <h3>Subscription pending</h3>
        <p class="muted-small">Your subscription payment is not done. Complete verification to publish rides and receive bookings.</p>
        <button class="btn btn-primary" (click)="goVerify()">Pay & Verify</button>
      </div>

      <h3>🔎 About the owner</h3>
      <div *ngIf="ownerPreferences.length > 0" class="pref-grid" style="margin-bottom:8px;">
        <span *ngFor="let p of ownerPreferences" class="pref-chip" style="cursor:default;">
          <span>{{ p }}</span>
        </span>
      </div>
      <div *ngIf="ownerPreferences.length === 0" class="muted-small">No preferences set.</div>


      <h3>🚗 Rides by this owner</h3>
      <div *ngIf="rides.length === 0" class="muted">No rides yet.</div>
      <div *ngFor="let r of rides" class="ride-card">
        <div class="ride-avatar">{{ (r.carModel || '?').charAt(0) }}</div>
        <div class="ride-content">
          <h4>{{ r.from }} → {{ r.to }}</h4>
          <div class="ride-meta">
            <span>📅 {{ r.date }}</span>
            <span>🕐 {{ r.startTime }} - {{ r.endTime }}</span>
          </div>
        </div>
        <div class="ride-right">
          <div class="price-pill">₹{{ r.price }}</div>
        </div>
      </div>
    </div>
  `
})
export class ProfileComponent {
  owner: Owner | undefined;
  showOwnerMobile = false;
  rides: Ride[] = [];
  displayRating = 0;
  displayCount = 0;
  isSelf = false;
  ownerPreferences: string[] = [];
  paymentInReview = false;

  constructor(private route: ActivatedRoute, private data: MockDataService, private auth: AuthService, private router: Router) {
    const id = this.route.snapshot.paramMap.get('id') || '';
    const s = this.auth.current as any;
    this.isSelf = !!(s && s.role === 'owner' && s.ownerId && s.ownerId === id);
    this.data.getOwnerById(id).subscribe((o) => {
      this.owner = o;
      this.checkIfCanViewContact();
      this.computeRating();
      this.computePreferences();
    });
    this.data.getOwnerRides(id).subscribe((rides) => (this.rides = rides));
    if (this.isSelf) {
      this.data.getMySubscriptions().subscribe((subscriptions) => {
        this.paymentInReview = subscriptions[0]?.status === 'VERIFICATION_IN_PROGRESS';
      });
    }
  }

  private checkIfCanViewContact() {
    // By default owner contact is shown to the owner themselves
    if (!this.owner) { this.showOwnerMobile = false; return; }
    if (this.isSelf) { this.showOwnerMobile = true; return; }

    // Show owner mobile only if current passenger has a confirmed (accepted) booking
    this.data.getMyBookings().subscribe({ next: async (bookings) => {
      if (!bookings || bookings.length === 0) { this.showOwnerMobile = false; return; }
      try {
        for (const b of bookings) {
          if (String(b.status).toLowerCase() !== 'accepted') continue;
          const ride = await firstValueFrom(this.data.getRideById(b.rideId));
          if (!ride) continue;
          if (ride.ownerId === this.owner!.id && ride.status !== 'cancelled') { this.showOwnerMobile = true; return; }
        }
        this.showOwnerMobile = false;
      } catch (e) {
        this.showOwnerMobile = false;
      }
    }, error: () => { this.showOwnerMobile = false; } });
  }

  goVerify() { this.router.navigateByUrl('/owner/register'); }

  computePreferences() {
    if (!this.owner) { this.ownerPreferences = []; return; }
    if (Array.isArray(this.owner.preferences) && this.owner.preferences.length) {
      this.ownerPreferences = [...this.owner.preferences];
      return;
    }
    const legacy: string[] = [];
    if (this.owner.allowPets) legacy.push('Pets allowed');
    if (this.owner.stopsForBreak) legacy.push('Stops for breaks');
    if (this.owner.jovial) legacy.push('Friendly / Jovial');
    this.ownerPreferences = legacy;
  }

  computeRating() {
    if (!this.owner) return;
    this.displayRating = this.owner.averageRating ?? this.owner.rating ?? 0;
    this.displayCount = this.owner.ratingsCount || 0;
  }

  back() { history.back(); }
}
