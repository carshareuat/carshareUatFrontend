import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MockDataService, Ride } from './mock-data.service';
import { AuthService } from './auth.service';
import { ToastService } from './toast.service';


@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="page-header">
      <div>
        <h1 class="page-title">Find your ride</h1>
        <p class="page-sub">Share journeys, save money, meet new people.</p>
      </div>
    </div>

    <!-- Multi-Stop Rides Section -->
    <section class="card mb-2" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
      <h3 style="color: white;">✨ Try Multi-Stop Rides</h3>
      <p style="color: rgba(255,255,255,0.9);">Search for rides with multiple stops and get better prices on shared journeys.</p>
      <button class="btn btn-primary" routerLink="/rides/search/multi-stop" style="background: white; color: #667eea; font-weight: 600; margin-top: 8px;">
        🚀 Search Multi-Stop Rides
      </button>
    </section>

    <section class="card mb-2">
      <h3>🔍 Search rides</h3>
      <div class="search-card">
          <div class="field">
            <label>From - State</label>
            <select [(ngModel)]="fromState" (change)="onFromStateChange()">
              <option value="">Select state</option>
              <option *ngFor="let s of states" [value]="s">{{ s }}</option>
            </select>
          </div>
          <div class="field">
            <label>From - District</label>
            <div style="position:relative">
              <input placeholder="Type district" [(ngModel)]="from" (input)="suggestFrom($any($event.target).value)" (focus)="suggestFrom(from || '')" />
              <ul *ngIf="fromSuggestions.length" class="suggestions">
                <li *ngFor="let s of fromSuggestions" (mousedown)="selectFrom(s)">{{ s }}</li>
              </ul>
            </div>
          </div>
          <div class="field">
            <label>To - State</label>
            <select [(ngModel)]="toState" (change)="onToStateChange()">
              <option value="">Select state</option>
              <option *ngFor="let s of states" [value]="s">{{ s }}</option>
            </select>
          </div>
          <div class="field">
            <label>To - District</label>
            <div style="position:relative">
              <input placeholder="Type district" [(ngModel)]="to" (input)="suggestTo($any($event.target).value)" (focus)="suggestTo(to || '')" />
              <ul *ngIf="toSuggestions.length" class="suggestions">
                <li *ngFor="let s of toSuggestions" (mousedown)="selectTo(s)">{{ s }}</li>
              </ul>
            </div>
          </div>
        <div class="field">
          <label>Date</label>
          <input type="date" [(ngModel)]="date" />
        </div>
        <div class="field">
          <label>Passengers</label>
          <input type="number" min="1" [(ngModel)]="passengers" />
        </div>
        <button class="btn btn-primary" (click)="search()">Search</button>
      </div>
    </section>

    <section class="results">
      <h3 *ngIf="searched">Available rides ({{ results.length }})</h3>
      <div *ngIf="searched && results.length === 0" class="card text-center muted">No rides found. Try changing your search.</div>
      <div *ngFor="let r of results" class="ride-card">
        <div class="ride-avatar">{{ (r.carModel || '?').charAt(0) }}</div>
        <div class="ride-content">
          <h4>{{ r.from }} <span class="muted">→</span> {{ r.to }}</h4>
          <div class="ride-meta">
            <span>📅 {{ r.date }}</span>
            <span>🕐 {{ r.startTime }} - {{ r.endTime }}</span>
            <span>💺 {{ r.seatsAvailable }} seats</span>
          </div>
          <div class="muted-small">🚗 {{ r.carModel }}</div>
        </div>
        <div class="ride-right">
          <div class="price-pill">₹{{ r.price }}</div>
          <span *ngIf="r.seatsAvailable <= 0" class="badge badge-danger">Full</span>
          <a *ngIf="r.seatsAvailable > 0" [routerLink]="['/ride', r.id]" class="btn btn-primary btn-sm">View / Book</a>
        </div>
      </div>
    </section>
  `
})
export class HomeComponent {
  from = '';
  to = '';
  date = '';
  passengers = 1;
  results: Ride[] = [];
  searched = false;
  myBookings: Array<{ id: string; rideId: string; seats: number; status: string; ride?: Ride | undefined }> = [];
  

  constructor(private data: MockDataService, private router: Router, private auth: AuthService, private toast: ToastService) {
    // ensure passenger-only access
    const s = this.auth.current;
    if (!s) {
      this.router.navigateByUrl('/');
    } else if (s.role !== 'passenger') {
      this.router.navigateByUrl('/owner/dashboard');
    }
    // do not show results until user searches; preload nothing
    this.searched = false;
    this.loadLocationData();
  }

  states: string[] = [];
  fromState = '';
  toState = '';
  fromDistricts: string[] = [];
  toDistricts: string[] = [];

  fromSuggestions: string[] = [];
  toSuggestions: string[] = [];
  private _fromTimer: any;
  private _toTimer: any;

  loadLocationData() {
    this.data.getLocations().subscribe((items) => {
      const states = new Set<string>();
      const byState = new Map<string, string[]>();
      items.forEach((l) => {
        states.add(l.state);
        const arr = byState.get(l.state) || [];
        if (!arr.includes(l.district)) arr.push(l.district);
        byState.set(l.state, arr);
      });
      this.states = Array.from(states).sort();
      // store mapping in closures
      this._byState = byState;
    });
  }

  private _byState = new Map<string, string[]>();

  onFromStateChange() {
    this.fromDistricts = this._byState.get(this.fromState) || [];
  }

  onToStateChange() {
    this.toDistricts = this._byState.get(this.toState) || [];
  }

  suggestFrom(q: string) {
    clearTimeout(this._fromTimer);
    this._fromTimer = setTimeout(() => {
      const term = (q || '').trim();
      if (!term) { this.fromSuggestions = this._byState.get(this.fromState) || []; return; }
      this.data.getLocations(term, this.fromState || undefined).subscribe((items) => {
        this.fromSuggestions = Array.from(new Set(items.map(i => i.district))).slice(0, 10);
      });
    }, 220);
  }

  selectFrom(s: string) { this.from = s; this.fromSuggestions = []; }

  suggestTo(q: string) {
    clearTimeout(this._toTimer);
    this._toTimer = setTimeout(() => {
      const term = (q || '').trim();
      if (!term) { this.toSuggestions = this._byState.get(this.toState) || []; return; }
      this.data.getLocations(term, this.toState || undefined).subscribe((items) => {
        this.toSuggestions = Array.from(new Set(items.map(i => i.district))).slice(0, 10);
      });
    }, 220);
  }

  selectTo(s: string) { this.to = s; this.toSuggestions = []; }

  search() {
    // remember passenger count so booking page can reuse it and avoid asking twice
    localStorage.setItem('search_passengers', String(this.passengers || 1));
    this.data.getRides({ from: this.from, to: this.to, date: this.date, passengers: this.passengers || 1 }).subscribe((r) => {
      // if a ride is marked femaleOnly, hide it from male passengers
      const current = this.auth.current as any;
      if (current?.role === 'passenger' && current?.gender === 'male') {
        this.results = r.filter((ride) => !ride.femaleOnly);
      } else {
        this.results = r;
      }
      this.searched = true;
    });
  }

  loadMyBookings() {
    const s = this.auth.current;
    if (!s || s.role !== 'passenger') { this.myBookings = []; return; }
    const raw = localStorage.getItem('demo_bookings');
    const arr = raw ? JSON.parse(raw) : [];
    const mine = arr.filter((b: any) => b.userMobile === s.mobile);
    // resolve rides for each booking
    this.myBookings = [];
    mine.forEach((b: any) => {
      this.data.getRideById(b.rideId).subscribe((ride) => {
        this.myBookings.push({ id: b.id, rideId: b.rideId, seats: b.seats, status: b.status, ride });
      });
    });
  }

  cancelBooking(bookingId: string) {
    const reason = window.prompt('Enter a mandatory cancellation reason:')?.trim();
    if (!reason) {
      this.toast.show('Cancellation reason is required', 'warning');
      return;
    }
    const raw = localStorage.getItem('demo_bookings');
    const arr = raw ? JSON.parse(raw) : [];
    const filtered = arr.filter((b: any) => b.id !== bookingId);
    localStorage.setItem('demo_bookings', JSON.stringify(filtered));
    this.myBookings = this.myBookings.filter((m) => m.id !== bookingId);
    this.toast.show('Booking cancelled', 'success');
  }
}
