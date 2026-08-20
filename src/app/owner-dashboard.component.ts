import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MockDataService, Owner, Ride } from './mock-data.service';
import { AuthService } from './auth.service';
import { ToastService } from './toast.service';

interface Booking {
  id: string;
  rideId: string;
  userMobile: string;
  seats: number;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  cancellationReason?: string;
  cancellationNote?: string;
  cancelledBy?: string;
  cancelledAt?: string;
}

@Component({
  selector: 'app-owner-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="page-header">
      <div>
        <h1 class="page-title">Owner Dashboard</h1>
        <p class="page-sub">Manage your rides and respond to booking requests.</p>
      </div>
    </div>

    <section class="card mb-2">
      <h3>Welcome to your dashboard</h3>
      <p class="muted">Use the menu to access My Rides and Booking Requests.</p>
      
      <!-- Quick Actions -->
      <div class="quick-actions" style="margin-top: 16px; display: flex; gap: 12px; flex-wrap: wrap;">
        <button class="btn btn-secondary" routerLink="/owner/create-ride" style="background: #3498db; color: white;">
          ✨ Create Ride
        </button>
      </div>
    </section>

    <!-- Include create ride form here for quick access -->
     <!-- <app-owner-create-ride></app-owner-create-ride> -->
  `
})
export class OwnerDashboardComponent {
  owners: Owner[] = [];
  allRides: Ride[] = [];
  selectedOwnerId = '';
  from = '';
  to = '';
  date = '';
  startTime = '';
  endTime = '';
  seats = 1;
  price = 0;
  carModel = '';
  bookings: Booking[] = [];

  constructor(private data: MockDataService, private auth: AuthService, private toast: ToastService) {
    this.load();
  }

  focusCreate() {
    // scroll to top where the create card is located
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  load() {
    this.data.getOwners().subscribe((o) => {
      const s = this.auth.current;
      if (s && s.role === 'owner' && (s as any).ownerId) {
        const match = o.find((x) => x.id === (s as any).ownerId);
        this.owners = match ? [match] : [];
        this.selectedOwnerId = (s as any).ownerId;
      } else {
        this.owners = o;
      }
    });
    this.loadLocal();
  }

  loadLocal() {
    this.data.loadAll().subscribe((d) => {
      const localRaw = localStorage.getItem('demo_rides');
      const local = localRaw ? JSON.parse(localRaw) : [];
      this.allRides = [...(d.rides || []), ...local];
      // if current user is owner, show only their rides
      const s = this.auth.current;
      if (s && s.role === 'owner' && (s as any).ownerId) {
        this.allRides = this.allRides.filter((r) => r.ownerId === (s as any).ownerId);
      }
      if (!this.selectedOwnerId && this.owners.length) this.selectedOwnerId = this.owners[0].id;
      const bookingsRaw = localStorage.getItem('demo_bookings');
      const allBookings: Booking[] = bookingsRaw ? JSON.parse(bookingsRaw) : [];
      // show only bookings related to this owner's rides
      const rideIds = new Set(this.allRides.map((r) => r.id));
      this.bookings = allBookings.filter((b) => rideIds.has(b.rideId));
    });
  }

  createRide() {
    if (!this.selectedOwnerId) { this.toast.show('Select owner', 'warning'); return; }
    const ride: Ride = {
      id: 'ride-' + Date.now(),
      ownerId: this.selectedOwnerId,
      from: this.from,
      to: this.to,
      date: this.date,
      startTime: this.startTime,
      endTime: this.endTime,
      price: this.price,
      carModel: this.carModel,
      seatsAvailable: this.seats
    };
    const raw = localStorage.getItem('demo_rides');
    const arr = raw ? JSON.parse(raw) : [];
    arr.push(ride);
    localStorage.setItem('demo_rides', JSON.stringify(arr));
    this.from = this.to = this.date = this.startTime = this.endTime = this.carModel = '';
    this.seats = 1; this.price = 0;
    this.loadLocal();
    this.toast.show('Ride created', 'success');
  }

  getOwnerName(id: string) { return this.owners.find((o) => o.id === id)?.name || id; }
  getRideFrom(id: string) { return this.allRides.find((x) => x.id === id)?.from || ''; }
  getRideTo(id: string) { return this.allRides.find((x) => x.id === id)?.to || ''; }

  respond(bookingId: string, action: 'accepted' | 'rejected') {
    const raw = localStorage.getItem('demo_bookings');
    const arr: Booking[] = raw ? JSON.parse(raw) : [];
    const b = arr.find((x) => x.id === bookingId);
    if (!b) return;
    b.status = action;
    localStorage.setItem('demo_bookings', JSON.stringify(arr));
    this.loadLocal();
    this.toast.show('Booking ' + action, 'success');
  }

}
