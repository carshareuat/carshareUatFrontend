import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MockDataService, Ride } from './mock-data.service';
import { AuthService } from './auth.service';
import { ToastService } from './toast.service';

@Component({
  selector: 'app-owner-create-ride',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div *ngIf="!verified && paymentInReview" class="card mb-2" style="background:#eff6ff;border:1px solid #93c5fd;">
      <h3>Payment verification in progress</h3>
      <p class="muted-small">Your payment is being reviewed and will be approved in few minutes.</p>
    </div>

    <div *ngIf="!verified && !paymentInReview" class="card mb-2" style="background:#fff7ed;border:1px solid #fed7aa;">
      <h3>Complete your subscription</h3>
      <p class="muted-small">You cannot post rides until your subscription is approved and your profile is verified.</p>
      <button class="btn btn-primary" (click)="goVerify()">Pay & Verify</button>
    </div>

    <section class="card mb-2" *ngIf="verified">
      <h3>➕ Create a new ride</h3>
      <div class="form-row">
        <div class="field"><label>From - State</label>
          <select [(ngModel)]="fromState" (change)="onFromStateChange()">
            <option value="">Select state</option>
            <option *ngFor="let s of states" [value]="s">{{ s }}</option>
          </select>
        </div>
        <div class="field"><label>From - District</label>
          <div style="position:relative">
            <input placeholder="Type district" [(ngModel)]="from" (input)="suggestFrom($any($event.target).value)" (focus)="suggestFrom(from || '')" />
            <ul *ngIf="fromSuggestions.length" class="suggestions">
              <li *ngFor="let s of fromSuggestions" (mousedown)="selectFrom(s)">{{ s }}</li>
            </ul>
          </div>
        </div>
        <div class="field"><label>To - State</label>
          <select [(ngModel)]="toState" (change)="onToStateChange()">
            <option value="">Select state</option>
            <option *ngFor="let s of states" [value]="s">{{ s }}</option>
          </select>
        </div>
        <div class="field"><label>To - District</label>
          <div style="position:relative">
            <input placeholder="Type district" [(ngModel)]="to" (input)="suggestTo($any($event.target).value)" (focus)="suggestTo(to || '')" />
            <ul *ngIf="toSuggestions.length" class="suggestions">
              <li *ngFor="let s of toSuggestions" (mousedown)="selectTo(s)">{{ s }}</li>
            </ul>
          </div>
        </div>
        <div class="field"><label>Date</label><input type="date" [min]="today" [(ngModel)]="date" /></div>
        <div class="field"><label>Start Time</label><input placeholder="HH:MM" [(ngModel)]="startTime" /></div>
        <div class="field"><label>End Time</label><input placeholder="HH:MM" [(ngModel)]="endTime" /></div>
        <div class="field"><label>Seats</label><input type="number" min="1" [(ngModel)]="seats" /></div>
        <div class="field" *ngIf="ownerGender==='female'">
          <label><input type="checkbox" [(ngModel)]="femaleOnly" aria-label="Show ride only to female passengers" /> Show ride only to female passengers</label>
        </div>
        <div class="field"><label>Price (₹)</label><input type="number" min="0" [(ngModel)]="price" /></div>
        <div class="field"><label>Car Model</label><input placeholder="e.g. Hyundai i20" [(ngModel)]="carModel" /></div>
        <button class="btn btn-primary" (click)="createRide()">Create Ride</button>
      </div>
    </section>
  `
})
export class OwnerCreateRideComponent {
  from = ''; to = ''; date = ''; startTime = ''; endTime = ''; seats = 1; price = 0; carModel = '';
  femaleOnly = false;
  ownerGender: 'male' | 'female' | undefined;
  today = new Date().toISOString().slice(0, 10);
  ownerId = '';
  verified = false;
  paymentInReview = false;

  constructor(private data: MockDataService, private auth: AuthService, private router: Router, private toast: ToastService) {
    const s = this.auth.current;
    if (!s || s.role !== 'owner') { this.router.navigateByUrl('/'); return; }
    this.ownerId = (s as any).ownerId || '';
    this.checkVerified();
    this.loadLocationData();
  }

  states: string[] = [];
  fromState = '';
  toState = '';
  fromDistricts: string[] = [];
  toDistricts: string[] = [];
  private _byState = new Map<string, string[]>();
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
      this._byState = byState;
    });
  }

  onFromStateChange() { this.fromDistricts = this._byState.get(this.fromState) || []; }
  onToStateChange() { this.toDistricts = this._byState.get(this.toState) || []; }

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

  checkVerified() {
    if (!this.ownerId) { this.verified = false; return; }
    this.data.getOwnerById(this.ownerId).subscribe((owner) => { this.verified = !!owner?.verified; this.ownerGender = owner?.gender as any; });
    this.data.getMySubscriptions().subscribe((subscriptions) => {
      this.paymentInReview = subscriptions[0]?.status === 'VERIFICATION_IN_PROGRESS';
    });
  }

  goVerify() { this.router.navigateByUrl('/owner/register'); }

  createRide() {
    if (!this.ownerId) { this.toast.show('Owner not set', 'error'); return; }
    this.checkVerified();
    if (!this.verified) { this.toast.show('Complete subscription payment to post rides', 'warning'); return; }
    if (!this.from || !this.to) { this.toast.show('Enter from and to', 'warning'); return; }
    if (!this.isValidDate(this.date)) { this.toast.show('Enter a valid date (YYYY-MM-DD) that is today or later', 'warning'); return; }
    this.data.createRide({ from: this.from, to: this.to, date: this.date, startTime: this.startTime,
      endTime: this.endTime, price: this.price, carModel: this.carModel, seatsAvailable: this.seats, femaleOnly: this.femaleOnly }).subscribe({
      next: () => {
        this.from = this.to = this.date = this.startTime = this.endTime = this.carModel = '';
        this.seats = 1; this.price = 0;
        this.toast.show('Ride created', 'success');
      },
      error: () => this.toast.show('Unable to create ride. Verify your owner account.', 'error')
    });
  }

  private isValidDate(s: string): boolean {
    if (!s) return false;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    const d = new Date(s + 'T00:00:00');
    if (isNaN(d.getTime())) return false;
    const today = new Date(this.today + 'T00:00:00');
    return d.getTime() >= today.getTime();
  }
}
