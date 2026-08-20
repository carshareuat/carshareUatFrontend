import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MockDataService, Owner, Ride, Booking } from './mock-data.service';
import { AuthService } from './auth.service';
import { MobileVerificationService } from './services/mobile-verification.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-owner-profile',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="page-header">
      <div>
        <h1 class="page-title">My Profile</h1>
        <p class="page-sub">Manage your owner profile and see recent activity.</p>
      </div>
    </div>

    <section class="card profile-card">
      <div class="profile-top">
        <div class="profile-avatar large">{{ displayInitial }}</div>
        <div class="profile-main">
          <h2>{{ displayName }}</h2>
          <div class="muted-small">📱 {{ displayMobile }}</div>
          <div class="muted-small" *ngIf="age">🎂 {{ age }} years</div>
          <div class="muted-small">⭐ {{ displayRating.toFixed(1) }} ({{ displayCount }} ratings)</div>
        </div>
      </div>

      <div class="profile-stats">
        <div class="stat">
          <div class="stat-value">{{ totalRides }}</div>
          <div class="stat-label">Total rides</div>
        </div>
        <div class="stat">
          <div class="stat-value">{{ completedRides }}</div>
          <div class="stat-label">Completed rides</div>
        </div>
        <div class="stat">
          <div class="stat-value">{{ cancelledRides }}</div>
          <div class="stat-label">Cancelled rides</div>
        </div>
      </div>

      <div style="display:flex;align-items:center;gap:10px;margin-top:12px;">
        <span *ngIf="mobileVerified" class="badge badge-success">✅ Mobile Verified</span>
        <span *ngIf="!mobileVerified && mobileVerificationStatus !== null" class="badge badge-error">❌ Mobile Not Verified</span>
        <span *ngIf="mobileVerificationStatus?.verifiedDate" class="muted-small">since {{ mobileVerificationStatus.verifiedDate | date:'mediumDate' }}</span>
        <!--<span *ngIf="!mobileVerified" class="muted-small badge badge-warning">⚠️ Please verify mobile to enable payments</span>-->
      </div>

      <hr />

      <h3>Recent bookings</h3>
      <div *ngIf="recentBookings.length === 0" class="muted">No recent bookings</div>
      <div *ngFor="let b of recentBookings" class="booking-row">
        <div>
          <div style="font-weight:700">{{ b.ride.from }} → {{ b.ride.to }}</div>
          <div class="muted-small">📅 {{ b.ride.date }} • 🕐 {{ b.ride.startTime }}</div>
          <div class="muted-small">Passenger: {{ b.booking.userMobile || b.booking.passengerMobile || '—' }}</div>
        </div>
        <div style="text-align:right">
          <div class="muted-small">Status: <strong>{{ b.booking.status }}</strong></div>
          <div *ngIf="b.ride && b.ride.status==='active' && b.booking.status==='accepted'" style="margin-top:6px"><a [routerLink]="['/ride', b.ride.id]" class="btn btn-ghost btn-sm">View ride</a></div>
        </div>
      </div>
    </section>
  `,
  styles: [
    `
    .profile-card { padding:20px; border-radius:12px; background:#fff; box-shadow: 0 6px 20px rgba(15,23,42,0.06); }
    .profile-top { display:flex; align-items:center; gap:20px; }
    .profile-avatar.large { width:88px; height:88px; border-radius:12px; font-size:28px; display:flex; align-items:center; justify-content:center; background:#f3f4ff; }
    .profile-main h2 { margin:0; font-size:1.2rem; }
    .profile-main .muted-small { margin-top:6px }
    .profile-actions button { background: linear-gradient(90deg,#7c3aed,#c084fc); border:none; color:#fff; padding:10px 18px; border-radius:12px; }
    .profile-stats { display:flex; gap:14px; margin-top:18px; flex-wrap:wrap; }
    .stat { background:#fff; padding:18px; border-radius:12px; flex:1 1 160px; text-align:center; box-shadow: 0 2px 8px rgba(15,23,42,0.04); }
    .stat-value { font-weight:700; font-size:1.4rem }
    .stat-label { margin-top:8px; color:#6b7280 }
    .booking-row { display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid #eef2ff }
    @media (max-width:600px) {
      .profile-top { flex-direction:column; align-items:flex-start }
      .profile-actions { width:100% }
      .profile-stats { gap:8px }
    }
    `
  ]
})
export class OwnerProfileComponent {
  displayName = 'Owner';
  displayMobile = '';
  displayInitial = 'O';
  age: number | null = null;

  totalRides = 0;
  totalBookings = 0;
  completedRides = 0;
  cancelledRides = 0;
  confirmedBookings = 0;
  cancelledBookings = 0;

  recentBookings: Array<{ booking: Booking; ride: Ride }> = [];

  displayRating = 0;
  displayCount = 0;
  
  // Mobile Verification Status
  mobileVerificationStatus: any = null;
  mobileVerified = false;

  constructor(
    private auth: AuthService,
    private data: MockDataService,
    private router: Router,
    private mobileVerificationService: MobileVerificationService
  ) {
    const s = this.auth.current as any;
    if (!s || s.role !== 'owner' || !s.ownerId) { this.router.navigateByUrl('/'); return; }
    this.loadOwner(s.ownerId);
    
    // Load mobile verification status
    const userId = s?.id;
    if (userId) {
      this.mobileVerificationService.getVerificationStatus(userId).subscribe({
        next: (status) => {
          this.mobileVerificationStatus = status;
          this.mobileVerified = status?.verified || false;
        },
        error: (error) => {
          console.error('Failed to load mobile verification status:', error);
          this.mobileVerified = false;
        }
      });
    }
  }

  async loadOwner(ownerId: string) {
    this.data.getOwnerById(ownerId).subscribe((o) => {
      if (!o) return;
      this.displayName = o.name || 'Owner';
      this.displayMobile = o.mobile || '';
      this.displayInitial = (this.displayName || 'O').charAt(0).toUpperCase();
      this.age = o.age ?? null;
      this.displayRating = o.averageRating ?? o.rating ?? 0;
      this.displayCount = o.ratingsCount || 0;
    });

    this.data.getOwnerRides(ownerId).subscribe(async (rides) => {
      this.totalRides = rides.length;
      this.completedRides = rides.filter(r => String(r.status).toLowerCase() === 'completed').length;
      this.cancelledRides = rides.filter(r => String(r.status).toLowerCase() === 'cancelled').length;
      let totalBookings = 0;
    
      let confirmed = 0;
      let cancelled = 0;
      const enriched: Array<{ booking: Booking; ride: Ride }> = [];
      for (const r of rides.slice().reverse().slice(0, 10)) {
        try {
          const bookings = await firstValueFrom(this.data.getRideBookings(r.id));
          totalBookings += bookings.length;
          confirmed += bookings.filter(b => String(b.status).toLowerCase() === 'accepted').length;
          cancelled += bookings.filter(b => String(b.status).toLowerCase() === 'cancelled').length;
          for (const b of bookings.slice().reverse().slice(0, 3)) {
            enriched.push({ booking: b, ride: r });
          }
        } catch {
          // ignore
        }
      }
      this.totalBookings = totalBookings;
      this.confirmedBookings = confirmed;
      this.cancelledBookings = cancelled;
      this.recentBookings = enriched.slice(0, 10);
    });
  }

  edit() { this.router.navigateByUrl('/owner/dashboard'); }
}
