import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MockDataService, Booking, Ride } from './mock-data.service';
import { AuthService } from './auth.service';
import { MobileVerificationService } from './services/mobile-verification.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-passenger-profile',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="page-header">
      <div>
        <h1 class="page-title">My Profile</h1>
        <p class="page-sub">Manage your passenger profile and see recent activity.</p>
      </div>
    </div>

    <section class="card profile-card">
      <div class="profile-top">
        <div *ngIf="displayPhoto; else initials" class="profile-avatar large" style="overflow:hidden;padding:0">
          <img [src]="displayPhoto" style="width:84px;height:84px;object-fit:cover;border-radius:12px;display:block" />
        </div>
        <ng-template #initials><div class="profile-avatar large">{{ displayInitial }}</div></ng-template>
        <div class="profile-main">
          <h2>{{ displayName }}</h2>
          <div class="muted-small">📱 {{ displayMobile }}</div>
          <div class="muted-small" *ngIf="age">🎂 {{ age }} years</div>
        </div>
      </div>

      <div class="profile-stats">
        <div class="stat">
          <div class="stat-value">{{ totalRides }}</div>
          <div class="stat-label">Total bookings</div>
        </div>
        <div class="stat">
          <div class="stat-value">{{ completedRides }}</div>
          <div class="stat-label">Completed</div>
        </div>
        <div class="stat">
          <div class="stat-value">{{ cancelledRides }}</div>
          <div class="stat-label">Cancelled</div>
        </div>
        <div class="stat">
          <div class="stat-value">{{ confirmedRides }}</div>
          <div class="stat-label">Confirmed</div>
        </div>
      </div>

      <div style="display:flex;align-items:center;gap:10px;margin-top:12px;">
        <span *ngIf="mobileVerified" class="badge badge-success">✅ Mobile Verified</span>
        <span *ngIf="!mobileVerified && mobileVerificationStatus !== null" class="badge badge-error">❌ Mobile Not Verified</span>
        <span *ngIf="mobileVerificationStatus?.verifiedDate" class="muted-small">since {{ mobileVerificationStatus.verifiedDate | date:'mediumDate' }}</span>
      </div>

      <hr />

      <h3>Recent bookings</h3>
      <div *ngIf="recentBookings.length === 0" class="muted">No recent bookings</div>
      <div *ngFor="let b of recentBookings" class="booking-row">
        <div>
          <div style="font-weight:700">{{ b.ride?.from }} → {{ b.ride?.to }}</div>
          <div class="muted-small">📅 {{ b.ride?.date }} • 🕐 {{ b.ride?.startTime }}</div>
        </div>
        <div style="text-align:right">
          <div class="muted-small">Status: <strong>{{ b.status }}</strong></div>
          <div *ngIf="b.ride && b.ride.status==='active' && b.status==='accepted'" style="margin-top:6px"><a [routerLink]="['/ride', b.ride.id]" class="btn btn-ghost btn-sm">View ride</a></div>
        </div>
      </div>
    </section>
  `,
  styles: [
    `
    .profile-card { padding:16px; }
    .profile-top { display:flex; align-items:center; gap:16px; }
    .profile-avatar.large { width:84px; height:84px; border-radius:12px; font-size:28px; display:flex; align-items:center; justify-content:center; background:#eef2ff; }
    .profile-main h2 { margin:0; }
    .profile-stats { display:flex; gap:12px; margin-top:12px; flex-wrap:wrap; }
    .stat { background:#f8fafc; padding:12px; border-radius:8px; flex:1 1 120px; text-align:center }
    .stat-value { font-weight:700; font-size:1.2rem }
    .booking-row { display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid #eef2ff }
    @media (max-width:600px) {
      .profile-top { flex-direction:column; align-items:flex-start }
      .profile-actions { width:100% }
      .profile-stats { gap:8px }
    }
    `
  ]
})
export class PassengerProfileComponent {
  displayName = 'Passenger';
  displayMobile = '';
  displayInitial = 'P';
  age: number | null = null;
  displayPhoto: string | null = null;

  totalRides = 0;
  completedRides = 0;
  cancelledRides = 0;
  confirmedRides = 0;

  recentBookings: Array<{ id: string; rideId: string; seats: number; status: string; ride?: Ride | undefined }> = [];
  
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
    if (!s) { this.router.navigateByUrl('/'); return; }
    this.displayMobile = s.mobile || '';
    this.displayName = s.name || s.mobile || 'Passenger';
    this.displayInitial = this.displayName.charAt(0).toUpperCase();
    this.displayPhoto = s.profilePhoto || null;

    // If session lacks a name, try fetching /me from backend and save it in session for subsequent views
    if (!s.name) {
      this.data.getMe().subscribe({ next: (me) => {
        if (me && me.name) {
          const cur = this.auth.current as any;
          const updated = { ...(cur || {}), name: me.name };
          try { this.auth.save(updated); } catch {}
          this.displayName = me.name;
          this.displayInitial = this.displayName.charAt(0).toUpperCase();
        }
        if (me && !this.displayMobile) this.displayMobile = me.mobile || this.displayMobile;
        if (me && me.profilePhotoUrl && !this.displayPhoto) {
          const base = this.data['apiUrl'].replace(/\/api\/?$/, '');
          this.displayPhoto = `${base}/files/${me.profilePhotoUrl}`;
          const cur = this.auth.current as any;
          const updated = { ...(cur || {}), profilePhoto: this.displayPhoto };
          try { this.auth.save(updated); } catch {}
        }
      }, error: () => {} });
    }
    this.loadStats();
    
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

  loadStats() {
    this.data.getMyBookings().subscribe(async (bookings) => {
      this.totalRides = bookings.length;
      this.cancelledRides = bookings.filter((b: any) => String(b.status).toLowerCase() === 'cancelled').length;
      this.confirmedRides = bookings.filter((b: any) => String(b.status).toLowerCase() === 'accepted').length;

      // determine completed by checking ride.status
      let completed = 0;
      const enriched: any[] = [];
      for (const b of bookings.slice().reverse().slice(0, 10)) {
        try {
          const ride = await firstValueFrom(this.data.getRideById(b.rideId));
          if (ride && String(ride.status).toLowerCase() === 'completed') completed++;
          enriched.push({ ...b, ride });
        } catch {
          enriched.push({ ...b, ride: undefined });
        }
      }
      this.completedRides = completed;
      this.recentBookings = enriched;
    }, () => {
      this.totalRides = 0; this.completedRides = 0; this.cancelledRides = 0; this.confirmedRides = 0; this.recentBookings = [];
    });
  }

  // edit() removed — profile editing handled elsewhere
}
