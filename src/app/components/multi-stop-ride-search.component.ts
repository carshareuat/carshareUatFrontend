import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MultiStopRideService } from '../services/multi-stop-ride.service';
import { MockDataService, LocationItem } from '../mock-data.service';
import { ToastService } from '../toast.service';
import { RideSearchRequest, RideSearchResult } from '../models/multi-stop-ride.model';

/**
 * Component for searching multi-stop rides.
 * 
 * Features:
 * - Search by from/to locations and date
 * - Filter by seat count
 * - Display matching rides with detailed information
 * - Show route preview and segment details
 * - Book ride segments
 */
@Component({
  selector: 'app-multi-stop-ride-search',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="page-shell">
      <div class="page-header">
        <div>
          <h1 class="page-title">Find your ride</h1>
          <p class="page-sub">Search a journey between any two stops and book only that segment.</p>
        </div>
      </div>

      <!-- Search Form -->
      <section class="card search-card">
        <h3>🔍 Find Multi-Stop Rides</h3>
        
        <form [formGroup]="searchForm" (ngSubmit)="onSearch()" class="search-form">
          <div class="field">
            <label>From Location</label>
            <div class="location-autocomplete">
              <input type="text" formControlName="fromLocation" placeholder="Type starting stop" required
                (input)="filterLocations('from', $any($event.target).value)" (focus)="filterLocations('from', searchForm.get('fromLocation')?.value || '')" autocomplete="off" />
              <div class="location-suggestions" *ngIf="activeLocationField === 'from' && fromLocationSuggestions.length">
                <button type="button" *ngFor="let location of fromLocationSuggestions" (mousedown)="selectLocation('from', location)">
                  {{ location.district }} <span>{{ location.state }}</span>
                </button>
              </div>
            </div>
          </div>
          <div class="field">
            <label>To Location</label>
            <div class="location-autocomplete">
              <input type="text" formControlName="toLocation" placeholder="Type destination stop" required
                (input)="filterLocations('to', $any($event.target).value)" (focus)="filterLocations('to', searchForm.get('toLocation')?.value || '')" autocomplete="off" />
              <div class="location-suggestions" *ngIf="activeLocationField === 'to' && toLocationSuggestions.length">
                <button type="button" *ngFor="let location of toLocationSuggestions" (mousedown)="selectLocation('to', location)">
                  {{ location.district }} <span>{{ location.state }}</span>
                </button>
              </div>
            </div>
          </div>
          <div class="field">
            <label>Date</label>
            <input type="date" formControlName="date" [min]="today" required />
          </div>
          <div class="field">
            <label>Passengers</label>
            <select formControlName="seats" required>
              <option value="">Select seats</option>
              <option *ngFor="let i of [1,2,3,4,5,6]" [value]="i">{{ i }} {{ i === 1 ? 'Seat' : 'Seats' }}</option>
            </select>
          </div>
          <button type="submit" class="btn btn-primary search-button" [disabled]="!searchForm.valid || isLoading">
            {{ isLoading ? 'Searching...' : 'Search' }}
          </button>
        </form>

        <!-- Error Display -->
        <div *ngIf="errorMessage" class="alert alert-danger">
          {{ errorMessage }}
        </div>
      </section>

      <!-- Search Results -->
      <div *ngIf="searchResults && !isLoading" class="results-section">
        <div class="results-heading">
          <h3>Available rides ({{ searchResults.items.length }})</h3>
          <button type="button" class="btn btn-secondary btn-sm" (click)="searchResults = null">New search</button>
        </div>

        <!-- Results List -->
        <div class="rides-list">
          <div *ngFor="let ride of searchResults.items" class="ride-card">
            <!-- Ride Header -->
            <div class="ride-header">
              <div class="ride-main">
                <div class="route-info">
                  <div class="location from">{{ ride.fromLocation }}</div>
                  <div class="arrow">→</div>
                  <div class="location to">{{ ride.toLocation }}</div>
                </div>
                <div class="time-info">
                  <span class="time">{{ formatTime(ride.departureTime) }}</span>
                  <span class="duration">{{ ride.travelDuration }}</span>
                  <span class="time">{{ formatTime(ride.arrivalTime) }}</span>
                </div>
              </div>
              <div class="ride-price">
                <div class="price-pill">₹{{ ride.price }}</div>
              </div>
            </div>

            <!-- Ride Details -->
            <div class="ride-details">
              <div class="detail-row">
                <div class="detail">
                  <span class="label">Driver</span>
                  <span class="value">
                    {{ ride.driverName }}
                  </span>
                  <span class="rating" *ngIf="ride.driverAverageRating > 0">
                    ⭐ {{ ride.driverAverageRating }} ({{ ride.driverRatingsCount }})
                  </span>
                </div>
                <div class="detail">
                  <span class="label">Vehicle</span>
                  <span class="value">{{ ride.vehicleModel || 'Not specified' }}</span>
                </div>
                <div class="detail">
                  <span class="label">Seats</span>
                  <span class="value">
                    {{ ride.availableSeats }}/{{ ride.totalSeats }}
                    <span *ngIf="ride.femaleOnly" class="badge badge-female">F Only</span>
                  </span>
                </div>
              </div>

              <!-- Full Route Preview -->
              <div class="route-preview">
                <div class="route-title">📍 Route:</div>
                <div class="route-path">{{ ride.routePreview }}</div>
                <div class="route-stops">
                  <div *ngFor="let stop of ride.routeStops" class="stop-item" 
                       [class.active]="stop.isFromStop || stop.isToStop">
                    <div class="stop-marker" [class.from]="stop.isFromStop" [class.to]="stop.isToStop">
                      {{ stop.stopOrder }}
                    </div>
                    <div class="stop-info">
                      <div class="stop-name">{{ stop.locationName }}</div>
                      <div class="stop-times" *ngIf="stop.arrivalTime || stop.departureTime">
                        <span *ngIf="stop.arrivalTime">{{ formatTime(stop.arrivalTime) }}</span>
                        <span *ngIf="stop.departureTime">{{ formatTime(stop.departureTime) }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Action Button -->
            <div class="ride-footer">
              <button class="btn btn-primary" (click)="bookRide(ride)">View / Book</button>
            </div>
          </div>
        </div>

        <!-- No Results -->
        <div *ngIf="searchResults.items.length === 0" class="no-results">
          <p>No rides found for your search. Try different dates or locations.</p>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="isLoading" class="loading">
        <div class="spinner"></div>
        <p>Searching for available rides...</p>
      </div>

      <!-- Initial State -->
      <div *ngIf="!searchResults && !isLoading && !errorMessage" class="initial-state">
        <p>Fill in the search form above and click "Search" to find available rides.</p>
      </div>
    </div>
  `,
  styles: [`
    /* Mobile-First Responsive Design */
    * {
      box-sizing: border-box;
    }

    .page-shell {
      width: 100%;
      max-width: 1200px;
      margin: 0 auto;
      padding: 16px;
    }

    .card {
      background: white;
      border-radius: 8px;
      padding: 16px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      margin-bottom: 16px;
    }

    h2 {
      color: #333;
      margin: 0 0 16px 0;
      font-size: 20px;
      font-weight: 700;
    }

    h3 {
      color: #1f2937;
      margin: 0 0 14px 0;
      font-size: 16px;
    }

    .search-form {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
      align-items: end;
    }

    .form-row {
      display: contents;
    }

    .field {
      display: flex;
      flex-direction: column;
    }

    .field label {
      font-weight: 600;
      margin-bottom: 6px;
      color: #333;
      font-size: 13px;
    }

    .field input,
    .field select {
      width: 100%;
      padding: 12px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
      font-family: inherit;
      line-height: 1.5;
    }

    .field input:focus,
    .field select:focus {
      outline: none;
      border-color: #464feb;
      box-shadow: 0 0 0 3px rgba(70, 79, 235, 0.1);
    }

    .location-autocomplete { position: relative; }
    .location-suggestions {
      position: absolute;
      top: calc(100% + 4px);
      left: 0;
      right: 0;
      z-index: 20;
      max-height: 220px;
      overflow-y: auto;
      background: #fff;
      border: 1px solid #dbe3ef;
      border-radius: 6px;
      box-shadow: 0 8px 22px rgba(15, 23, 42, 0.14);
    }
    .location-suggestions button {
      display: flex;
      width: 100%;
      justify-content: space-between;
      gap: 12px;
      padding: 10px 12px;
      border: 0;
      border-bottom: 1px solid #eef2f7;
      background: #fff;
      color: #1f2937;
      text-align: left;
      cursor: pointer;
    }
    .location-suggestions button:hover { background: #f4f7ff; }
    .location-suggestions span { color: #64748b; font-size: 12px; }

    .btn {
      padding: 12px 16px;
      border: none;
      border-radius: 4px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .btn-primary {
      background: #464feb;
      color: white;
    }

    .btn-secondary {
      background: #eef2f7;
      color: #334155;
    }

    .btn-sm {
      padding: 8px 12px;
      font-size: 12px;
    }

    .search-button {
      width: 100%;
    }

    .btn-primary:active:not(:disabled) {
      background: #3d42c7;
    }

    .btn-primary:disabled {
      background: #ccc;
      cursor: not-allowed;
      opacity: 0.6;
    }

    .btn-full {
      width: 100%;
    }

    .alert {
      padding: 12px;
      border-radius: 4px;
      margin-top: 12px;
      font-size: 13px;
    }

    .alert-danger {
      background: #ffe6e6;
      border: 1px solid #ffcccc;
      color: #dc3545;
    }

    .results-section {
      margin-top: 20px;
    }

    .results-heading {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 12px;
    }

    .results-heading h3 {
      margin: 0;
      color: #374151;
    }

    .rides-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .ride-card {
      display: block;
      width: 100%;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      overflow: hidden;
      background: white;
      transition: box-shadow 0.3s ease;
    }

    .ride-card:active {
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .ride-header {
      width: 100%;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 12px;
      background: #fff;
      border-bottom: 1px solid #e6e6e6;
      gap: 12px;
    }

    .ride-main {
      flex: 1;
      min-width: 0;
    }

    .route-info {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
      flex-wrap: wrap;
    }

    .location {
      font-weight: 600;
      font-size: 14px;
      color: #333;
    }

    .location.from {
      color: #4caf50;
    }

    .location.to {
      color: #f44336;
    }

    .arrow {
      color: #464feb;
      font-size: 16px;
    }

    .time-info {
      display: flex;
      gap: 8px;
      align-items: center;
      font-size: 12px;
      color: #666;
      flex-wrap: wrap;
    }

    .time {
      font-weight: 600;
      color: #333;
    }

    .duration {
      background: #f0f0f0;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 11px;
    }

    .ride-price {
      text-align: right;
      flex-shrink: 0;
    }

    .price {
      font-size: 18px;
      font-weight: 700;
      color: #464feb;
    }

    .price-pill {
      display: inline-block;
      padding: 7px 11px;
      border-radius: 999px;
      background: #6366d9;
      color: #fff;
      font-size: 15px;
      font-weight: 700;
      white-space: nowrap;
    }

    .ride-details {
      width: 100%;
      padding: 12px;
    }

    .detail-row {
      display: grid;
      grid-template-columns: 1fr;
      gap: 12px;
      margin-bottom: 12px;
    }

    .detail {
      display: flex;
      flex-direction: column;
    }

    .detail .label {
      font-weight: 600;
      color: #666;
      font-size: 11px;
      text-transform: uppercase;
      margin-bottom: 4px;
    }

    .detail .value {
      color: #333;
      font-size: 13px;
      font-weight: 500;
    }

    .rating {
      display: block;
      margin-top: 2px;
      color: #666;
      font-size: 12px;
      font-weight: 400;
    }

    .badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 10px;
      font-weight: 600;
      margin-left: 6px;
    }

    .badge-female {
      background: #ffe6f0;
      color: #c2185b;
    }

    .route-preview {
      width: 100%;
      overflow: hidden;
      background: #f9f9f9;
      padding: 12px;
      border-radius: 4px;
      margin-top: 12px;
      font-size: 13px;
    }

    .route-title {
      font-weight: 600;
      margin-bottom: 8px;
      color: #333;
    }

    .route-path {
      color: #666;
      margin-bottom: 12px;
      padding-bottom: 12px;
      border-bottom: 1px solid #ddd;
      font-size: 12px;
      word-break: break-word;
    }

    .route-stops {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .stop-item {
      display: flex;
      gap: 10px;
      align-items: flex-start;
    }

    .stop-item.active {
      background: #f0f7ff;
      padding: 8px;
      border-radius: 4px;
      border-left: 3px solid #464feb;
    }

    .stop-marker {
      min-width: 24px;
      height: 24px;
      border-radius: 50%;
      background: #e6e6e6;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 11px;
      color: #666;
      flex-shrink: 0;
    }

    .stop-marker.from {
      background: #4caf50;
      color: white;
    }

    .stop-marker.to {
      background: #f44336;
      color: white;
    }

    .stop-info {
      flex: 1;
      min-width: 0;
    }

    .stop-name {
      font-weight: 600;
      color: #333;
      font-size: 13px;
    }

    .stop-times {
      display: flex;
      gap: 8px;
      font-size: 11px;
      color: #666;
      margin-top: 3px;
      flex-wrap: wrap;
    }

    .ride-footer {
      width: 100%;
      display: flex;
      justify-content: flex-end;
      padding: 12px;
      background: #fff;
      border-top: 1px solid #e6e6e6;
    }

    .no-results {
      text-align: center;
      padding: 30px 16px;
      color: #666;
    }

    .loading {
      text-align: center;
      padding: 30px 16px;
    }

    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid #f0f0f0;
      border-top: 3px solid #464feb;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 16px;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .loading p {
      color: #666;
      font-size: 14px;
    }

    .initial-state {
      text-align: center;
      padding: 30px 16px;
      color: #666;
      font-size: 14px;
    }

    /* Tablet (600px and up) */
    @media (min-width: 600px) {
      .page-shell {
        padding: 12px;
      }

      .card {
        padding: 20px;
      }

      h2 {
        font-size: 24px;
      }

      h3 {
        font-size: 18px;
      }

      .search-form {
        gap: 16px;
      }

      .ride-header {
        padding: 16px;
        gap: 16px;
      }

      .ride-details {
        padding: 16px;
      }

      .detail-row {
        grid-template-columns: repeat(2, 1fr);
      }

      .route-preview {
        padding: 16px;
      }

      .ride-footer {
        padding: 16px;
      }

      .price {
        font-size: 20px;
      }

      .location {
        font-size: 16px;
      }

      .time-info {
        font-size: 14px;
      }
    }

    /* Desktop (1024px and up) */
    @media (min-width: 1024px) {
      .page-shell {
        padding: 16px;
      }

      .card {
        padding: 24px;
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
      }

      .detail-row {
        grid-template-columns: repeat(3, 1fr);
      }

      .ride-card:hover {
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
      }

      .btn:hover:not(:disabled) {
        box-shadow: 0 4px 12px rgba(70, 79, 235, 0.2);
        transform: translateY(-2px);
      }

      .ride-card:hover {
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
      }

      .price {
        font-size: 24px;
      }
    }

    @media (max-width: 760px) {
      .page-shell {
        padding: 10px;
      }

      .search-form {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .search-button {
        grid-column: span 2;
      }
    }

    @media (max-width: 480px) {
      .search-form {
        grid-template-columns: 1fr;
      }

      .search-button {
        grid-column: auto;
      }

      .results-heading {
        align-items: flex-start;
        flex-direction: column;
      }

      .ride-header {
        flex-direction: column;
      }

      .ride-price {
        width: 100%;
        text-align: left;
      }

      .ride-footer .btn {
        width: 100%;
      }
    }
  `]
})
export class MultiStopRideSearchComponent implements OnInit {

  searchForm!: FormGroup;
  searchResults: any = null;
  today = new Date().toISOString().slice(0, 10);
  isLoading = false;
  errorMessage = '';
  allLocations: LocationItem[] = [];
  fromLocationSuggestions: LocationItem[] = [];
  toLocationSuggestions: LocationItem[] = [];
  activeLocationField: 'from' | 'to' | null = null;

  constructor(
    private fb: FormBuilder,
    private rideService: MultiStopRideService,
    private rideLocations: MockDataService,
    private router: Router,
    private toast: ToastService
  ) {}

  ngOnInit() {
    this.initForm();
    this.loadLocations();
  }

  private loadLocations() {
    this.rideLocations.getLocations().subscribe({
      next: locations => this.allLocations = this.uniqueLocations(locations),
      error: () => this.toast.show('Unable to load locations', 'error')
    });
  }

  private uniqueLocations(locations: LocationItem[]): LocationItem[] {
    const seen = new Set<string>();
    return (locations || []).filter(location => {
      const key = location.district.trim().toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    }).sort((a, b) => a.district.localeCompare(b.district));
  }

  filterLocations(field: 'from' | 'to', value: string) {
    this.activeLocationField = field;
    const query = String(value || '').trim().toLowerCase();
    const oppositeField = field === 'from' ? 'toLocation' : 'fromLocation';
    const oppositeValue = String(this.searchForm.get(oppositeField)?.value || '').trim().toLowerCase();
    const suggestions = (query.length < 1 ? this.allLocations : this.allLocations.filter(location =>
      location.district.toLowerCase().includes(query)
    )).filter(location => location.district.trim().toLowerCase() !== oppositeValue);
    if (field === 'from') this.fromLocationSuggestions = suggestions.slice(0, 10);
    else this.toLocationSuggestions = suggestions.slice(0, 10);
  }

  selectLocation(field: 'from' | 'to', location: LocationItem) {
    this.searchForm.get(field === 'from' ? 'fromLocation' : 'toLocation')?.setValue(location.district);
    this.activeLocationField = null;
  }

  /**
   * Initialize search form.
   */
  private initForm() {
    this.searchForm = this.fb.group({
      fromLocation: ['', Validators.required],
      toLocation: ['', Validators.required],
      date: ['', Validators.required],
      seats: ['', Validators.required]
    });
  }

  /**
   * Perform search.
   */
  onSearch() {
    if (!this.searchForm.valid) {
      this.errorMessage = 'Please fill all fields';
      return;
    }

    const fromLocation = String(this.searchForm.get('fromLocation')?.value || '').trim();
    const toLocation = String(this.searchForm.get('toLocation')?.value || '').trim();
    if (fromLocation.toLowerCase() === toLocation.toLowerCase()) {
      this.errorMessage = 'From and To locations must be different';
      return;
    }

    this.isLoading = true;
    this.activeLocationField = null;
    this.errorMessage = '';
    this.searchResults = null;

    const request: RideSearchRequest = {
      fromLocation,
      toLocation,
      date: this.searchForm.get('date')?.value,
      seats: parseInt(this.searchForm.get('seats')?.value)
    };

    this.rideService.searchRidesPost(request).subscribe({
      next: (results) => {
        this.isLoading = false;
        this.searchResults = results;
        if (results.items.length === 0) {
          this.toast.show('No rides found for your search', 'info');
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.message || 'Search failed';
        this.toast.show(this.errorMessage, 'error');
      }
    });
  }

  /**
   * Format time for display.
   */
  formatTime(timeStr: string): string {
    return this.rideService.formatTime(timeStr);
  }

  /**
   * Book ride.
   */
  bookRide(ride: RideSearchResult) {
    if (!ride.rideId) {
      this.toast.show('Invalid ride selection', 'error');
      return;
    }

    // Navigate to booking page with ride details
    this.router.navigate(['/rides/book/multi-stop'], {
      queryParams: {
        rideId: ride.rideId,
        fromLocation: ride.fromLocation,
        toLocation: ride.toLocation,
        driverName: ride.driverName,
        price: ride.price,
        availableSeats: ride.availableSeats,
        seats: this.searchForm.get('seats')?.value
      }
    });
  }
}
