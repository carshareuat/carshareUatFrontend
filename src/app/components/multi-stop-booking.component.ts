import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MultiStopRideService } from '../services/multi-stop-ride.service';
import { ToastService } from '../toast.service';
import { AuthService } from '../auth.service';
import { MockDataService } from '../mock-data.service';
import { RideDetails, BookSegmentRequest } from '../models/multi-stop-ride.model';

/**
 * Component for booking a multi-stop ride segment.
 * 
 * Features:
 * - Display selected ride details
 * - Show journey segments with prices
 * - Booking form with passenger info
 * - Seat selection
 * - Booking request with the same owner approval lifecycle as standard rides
 */
@Component({
  selector: 'app-multi-stop-booking',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="container mt-4">
      <!-- Back Button -->
      <button class="btn-back" (click)="goBack()">← Back to Search</button>

      <!-- Booking Header -->
      <div class="card booking-header" *ngIf="rideDetails">
        <h2>🎟️ Book Your Journey</h2>
        <div class="route-summary">
          <div class="location from-loc">{{ fromLocation }}</div>
          <div class="arrow-long">→</div>
          <div class="location to-loc">{{ toLocation }}</div>
        </div>
        <div class="ride-meta">
          <span>📅 {{ rideDetails.date }}</span>
          <span>🚗 {{ rideDetails.carModel }}</span>
          <span>👤 Driver: {{ driverName }}</span>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="isLoading" class="loading">
        <div class="spinner"></div>
        <p>Loading ride details...</p>
      </div>

      <!-- Ride Not Found -->
      <div *ngIf="!isLoading && !rideDetails" class="alert alert-danger">
        Ride details could not be loaded. Please go back and try again.
      </div>

      <!-- Booking Form -->
      <div *ngIf="!isLoading && rideDetails" class="booking-form-section">
        <!-- Journey Details -->
        <div class="card section-card">
          <h3>📍 Journey Details</h3>
          <div class="journey-info">
            <div class="info-row">
              <span class="label">From</span>
              <span class="value">{{ fromLocation }}</span>
            </div>
            <div class="info-row">
              <span class="label">To</span>
              <span class="value">{{ toLocation }}</span>
            </div>
            <div class="info-row">
              <span class="label">Date</span>
              <span class="value">{{ formatDate(rideDetails.date) }}</span>
            </div>
            <div class="info-row">
              <span class="label">Available Seats</span>
              <span class="value">{{ availableSeats }} seats</span>
            </div>
          </div>
        </div>

        <!-- Route Preview -->
        <div class="card section-card" *ngIf="rideDetails.stops && rideDetails.stops.length > 0">
          <h3>🗺️ Complete Route</h3>
          <div class="route-list">
            <div *ngFor="let stop of rideDetails.stops" class="route-stop"
                 [class.active]="isFromStop(stop) || isToStop(stop)">
              <div class="stop-number">{{ stop.stopOrder + 1 }}</div>
              <div class="stop-details">
                <div class="stop-name">{{ stop.locationName }}</div>
                <div class="stop-time" *ngIf="stop.arrivalTime || stop.departureTime">
                  <span *ngIf="stop.arrivalTime">Arrives: {{ formatTime(stop.arrivalTime) }}</span>
                  <span *ngIf="stop.departureTime">Departs: {{ formatTime(stop.departureTime) }}</span>
                </div>
              </div>
              <div class="marker" [ngClass]="{from: isFromStop(stop), to: isToStop(stop)}">
                {{ isFromStop(stop) ? 'START' : isToStop(stop) ? 'END' : '' }}
              </div>
            </div>
          </div>
        </div>

        <!-- Pricing Details -->
        <div class="card section-card" *ngIf="segmentPrice > 0">
          <h3>💰 Pricing</h3>
          <div class="pricing-info">
            <div class="price-row">
              <span class="label">Price per Seat</span>
              <span class="value">₹{{ segmentPrice }}</span>
            </div>
            <div class="price-row" *ngIf="bookingForm">
              <span class="label">Number of Seats</span>
              <span class="value">{{ bookingForm.get('seats')?.value || 1 }} seat(s)</span>
            </div>
            <div class="price-row total" *ngIf="bookingForm">
              <span class="label">Total Price</span>
              <span class="value">₹{{ getTotalPrice() }}</span>
            </div>
          </div>
        </div>

        <!-- Booking Form -->
        <div class="card section-card booking-form">
          <h3>📝 Passenger Information</h3>
          <form [formGroup]="bookingForm" (ngSubmit)="onSubmit()">
            
            <div class="form-group">
              <label>Full Name *</label>
              <input type="text" formControlName="passengerName" readonly aria-readonly="true" />
              <small *ngIf="getFieldError('passengerName')" class="error">Name is required</small>
            </div>

            <div class="form-group">
              <label>Mobile Number *</label>
              <input type="tel" formControlName="passengerMobile" readonly aria-readonly="true" />
              <small *ngIf="getFieldError('passengerMobile')" class="error">Valid 10-digit mobile required</small>
            </div>

            <div class="form-group">
              <label>Number of Seats *</label>
              <input type="number" formControlName="seats" readonly aria-readonly="true" />
              <small *ngIf="getFieldError('seats')" class="error">Please select number of seats</small>
            </div>

            <div class="form-group">
              <label class="checkbox">
                <input type="checkbox" formControlName="termsAccepted" />
                I agree to the cancellation and refund policy *
              </label>
              <small *ngIf="getFieldError('termsAccepted')" class="error">You must accept the terms</small>
            </div>

            <!-- Error Alert -->
            <div *ngIf="errorMessage" class="alert alert-danger">
              {{ errorMessage }}
            </div>

            <!-- Action Buttons -->
            <div class="button-group">
              <button type="button" class="btn btn-secondary" (click)="goBack()">Cancel</button>
              <button type="submit" class="btn btn-primary" [disabled]="!bookingForm.valid || isSubmitting">
                {{ isSubmitting ? '⏳ Processing...' : '✅ Confirm Booking' }}
              </button>
            </div>
          </form>
        </div>

        <!-- Booking Request (After Success) -->
        <div *ngIf="bookingConfirmation" class="card section-card success-card">
          <h3>🕒 Booking Request Sent</h3>
          <div class="confirmation-message">
            <p class="big-text">Your request is waiting for the owner to approve.</p>
            <p class="booking-ref">Booking Reference: <strong>{{ bookingConfirmation.bookingReference }}</strong></p>
          </div>
          <div class="confirmation-details">
            <div class="detail-row">
              <span class="label">Booking ID</span>
              <span class="value">{{ bookingConfirmation.bookingId }}</span>
            </div>
            <div class="detail-row">
              <span class="label">Seats Booked</span>
              <span class="value">{{ bookingConfirmation.seatsBooked }}</span>
            </div>
            <div class="detail-row">
              <span class="label">Total Amount</span>
              <span class="value">₹{{ bookingConfirmation.totalAmount }}</span>
            </div>
            <div class="detail-row"><span class="label">Status</span><span class="value">Pending owner approval</span></div>
          </div>
          <button class="btn btn-primary" (click)="viewBooking()">View My Bookings</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* Mobile-First Responsive Design */
    * {
      box-sizing: border-box;
    }

    .container {
      width: 100%;
      max-width: 900px;
      margin: 0 auto;
      padding: 8px;
    }

    .btn-back {
      background: none;
      border: none;
      color: #464feb;
      font-weight: 600;
      cursor: pointer;
      margin-bottom: 12px;
      font-size: 13px;
      padding: 8px 0;
      width: 100%;
      text-align: left;
    }

    .btn-back:active {
      text-decoration: underline;
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
      margin: 0 0 12px 0;
      font-size: 20px;
      font-weight: 700;
    }

    h3 {
      color: #464feb;
      margin: 0 0 12px 0;
      font-size: 16px;
      border-bottom: 2px solid #464feb;
      padding-bottom: 8px;
    }

    .booking-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .booking-header h2 {
      color: white;
    }

    .route-summary {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 12px 0;
      font-size: 14px;
      font-weight: 600;
      flex-wrap: wrap;
    }

    .location {
      background: rgba(255, 255, 255, 0.2);
      padding: 8px 12px;
      border-radius: 4px;
      flex: 1;
      text-align: center;
      min-width: 80px;
    }

    .location.from-loc {
      background: rgba(76, 175, 80, 0.2);
    }

    .location.to-loc {
      background: rgba(244, 67, 54, 0.2);
    }

    .arrow-long {
      color: #ffeb3b;
      font-size: 18px;
    }

    .ride-meta {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      color: rgba(255, 255, 255, 0.9);
      font-size: 12px;
      margin-top: 12px;
    }

    .section-card {
      margin-bottom: 16px;
    }

    .journey-info {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 10px;
      background: #f9f9f9;
      border-radius: 4px;
      font-size: 13px;
    }

    .label {
      font-weight: 600;
      color: #666;
    }

    .value {
      color: #333;
      font-weight: 500;
    }

    .route-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .route-stop {
      display: flex;
      gap: 12px;
      align-items: flex-start;
      padding: 12px;
      background: #f9f9f9;
      border-radius: 4px;
      border-left: 3px solid #ddd;
    }

    .route-stop.active {
      background: #f0f7ff;
      border-left-color: #464feb;
    }

    .stop-number {
      min-width: 28px;
      height: 28px;
      border-radius: 50%;
      background: #e6e6e6;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      color: #666;
      font-size: 12px;
      flex-shrink: 0;
    }

    .route-stop.active .stop-number {
      background: #464feb;
      color: white;
    }

    .stop-details {
      flex: 1;
    }

    .stop-name {
      font-weight: 600;
      color: #333;
      font-size: 13px;
    }

    .stop-time {
      font-size: 11px;
      color: #666;
      margin-top: 3px;
    }

    .marker {
      padding: 4px 6px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 600;
      color: white;
      text-align: center;
      min-width: 50px;
      flex-shrink: 0;
    }

    .marker.from {
      background: #4caf50;
    }

    .marker.to {
      background: #f44336;
    }

    .pricing-info {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .price-row {
      display: flex;
      justify-content: space-between;
      padding: 10px;
      background: #f9f9f9;
      border-radius: 4px;
      font-size: 13px;
    }

    .price-row.total {
      background: #464feb;
      color: white;
      font-weight: 600;
      font-size: 14px;
    }

    .price-row.total .label,
    .price-row.total .value {
      color: white;
    }

    .booking-form {
      background: #f9f9f9;
      padding: 16px;
    }

    .form-group {
      margin-bottom: 14px;
      display: flex;
      flex-direction: column;
    }

    .form-group label {
      font-weight: 600;
      color: #333;
      margin-bottom: 6px;
      font-size: 13px;
    }

    .form-group input,
    .form-group select {
      padding: 12px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
      font-family: inherit;
      line-height: 1.5;
      width: 100%;
    }

    .form-group input:focus,
    .form-group select:focus {
      outline: none;
      border-color: #464feb;
      box-shadow: 0 0 0 3px rgba(70, 79, 235, 0.1);
    }

    .form-group > label.checkbox {
      display: flex;
      flex-direction: row;
      align-items: flex-start;
      gap: 10px;
      margin: 0;
      font-weight: 400;
      margin-bottom: 0;
      line-height: 1.45;
      text-align: left;
    }

    .form-group > label.checkbox input[type="checkbox"] {
      flex: 0 0 18px;
      width: 18px;
      height: 18px;
      margin: 2px 0 0;
      padding: 0;
      accent-color: #464feb;
    }

    .form-group > label.checkbox + .error {
      margin-left: 28px;
    }

    .error {
      color: #dc3545;
      font-size: 11px;
      margin-top: 4px;
    }

    .alert {
      padding: 12px;
      border-radius: 4px;
      margin-bottom: 16px;
      font-size: 13px;
    }

    .alert-danger {
      background: #ffe6e6;
      border: 1px solid #ffcccc;
      color: #dc3545;
    }

    .button-group {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-top: 20px;
    }

    .btn {
      padding: 12px 16px;
      border: none;
      border-radius: 4px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      width: 100%;
    }

    .btn-primary {
      background: #464feb;
      color: white;
    }

    .btn-primary:active:not(:disabled) {
      background: #3d42c7;
    }

    .btn-primary:disabled {
      background: #ccc;
      cursor: not-allowed;
      opacity: 0.6;
    }

    .btn-secondary {
      background: #e6e6e6;
      color: #333;
    }

    .btn-secondary:active {
      background: #d0d0d0;
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

    .success-card {
      background: #f0fff4;
      border-left: 4px solid #4caf50;
    }

    .confirmation-message {
      text-align: center;
      margin-bottom: 20px;
    }

    .big-text {
      font-size: 16px;
      font-weight: 600;
      color: #4caf50;
      margin-bottom: 8px;
    }

    .booking-ref {
      color: #666;
      font-size: 12px;
    }

    .confirmation-details {
      display: flex;
      flex-direction: column;
      gap: 10px;
      background: white;
      padding: 16px;
      border-radius: 4px;
      margin-bottom: 16px;
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 8px;
      font-size: 13px;
    }

    /* Tablet (600px and up) */
    @media (min-width: 600px) {
      .container {
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

      .route-summary {
        font-size: 16px;
        gap: 12px;
      }

      .location {
        padding: 10px 16px;
      }

      .ride-meta {
        font-size: 14px;
        gap: 16px;
      }

      .info-row {
        font-size: 14px;
      }

      .price-row {
        font-size: 14px;
      }

      .form-group label {
        font-size: 14px;
      }

      .button-group {
        flex-direction: row;
        gap: 12px;
      }

      .btn {
        flex: 1;
        width: auto;
      }
    }

    /* Desktop (1024px and up) */
    @media (min-width: 1024px) {
      .container {
        padding: 16px;
      }

      .card {
        padding: 24px;
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
      }

      .btn:hover:not(:disabled) {
        box-shadow: 0 4px 12px rgba(70, 79, 235, 0.2);
        transform: translateY(-2px);
      }

      .btn-back:hover {
        text-decoration: underline;
      }
    }
  `]
})
export class MultiStopBookingComponent implements OnInit {

  rideId: string | null = null;
  fromLocation: string = '';
  toLocation: string = '';
  driverName: string = '';
  segmentPrice: number = 0;
  availableSeats: number = 0;
  selectedSeats = 1;

  rideDetails: RideDetails | null = null;
  bookingForm!: FormGroup;
  isLoading = false;
  isSubmitting = false;
  errorMessage = '';

  bookingConfirmation: any = null;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private rideService: MultiStopRideService,
    private data: MockDataService,
    private toast: ToastService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.initForm();
    this.route.queryParams.subscribe(params => {
      this.rideId = params['rideId'];
      this.fromLocation = params['fromLocation'] || '';
      this.toLocation = params['toLocation'] || '';
      this.driverName = params['driverName'] || '';
      this.segmentPrice = params['price'] ? parseInt(params['price']) : 0;
      this.availableSeats = params['availableSeats'] ? parseInt(params['availableSeats']) : 0;
      this.selectedSeats = params['seats'] ? parseInt(params['seats'], 10) : 1;
      const currentUser = this.authService.current;
      this.bookingForm.patchValue({
        passengerName: currentUser?.name || '',
        passengerMobile: currentUser?.mobile || '',
        seats: this.selectedSeats
      });

      if (this.rideId) {
        this.loadRideDetails();
      }
    });
  }

  /**
   * Initialize booking form.
   */
  private initForm() {
    const currentUser = this.authService.current;
    this.bookingForm = this.fb.group({
      passengerName: [currentUser?.name || '', Validators.required],
      passengerMobile: [currentUser?.mobile || '', [Validators.required, Validators.pattern(/^\+?\d{10,15}$/)]],
      seats: [this.selectedSeats, [Validators.required, Validators.min(1)]],
      termsAccepted: [false, Validators.requiredTrue]
    });
  }

  /**
   * Load ride details.
   */
  private loadRideDetails() {
    if (!this.rideId) return;

    this.isLoading = true;
    this.rideService.getRideDetails(this.rideId).subscribe({
      next: (details) => {
        this.isLoading = false;
        this.rideDetails = details;
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = 'Failed to load ride details';
        this.toast.show(this.errorMessage, 'error');
      }
    });
  }

  /**
   * Check if stop is from location.
   */
  isFromStop(stop: any): boolean {
    return stop.locationName === this.fromLocation;
  }

  /**
   * Check if stop is to location.
   */
  isToStop(stop: any): boolean {
    return stop.locationName === this.toLocation;
  }

  /**
   * Get available seats array.
   */
  /**
   * Calculate total price.
   */
  getTotalPrice(): number {
    const seats = this.bookingForm.get('seats')?.value || 1;
    return this.segmentPrice * seats;
  }

  /**
   * Get field error.
   */
  getFieldError(fieldName: string): boolean {
    const field = this.bookingForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  /**
   * Format date.
   */
  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-IN', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  /**
   * Format time.
   */
  formatTime(time: string): string {
    return this.rideService.formatTime(time);
  }

  /**
   * Submit booking.
   */
  onSubmit() {
    if (!this.bookingForm.valid || !this.rideId) {
      this.errorMessage = 'Please fill all required fields correctly';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    const currentUser = this.authService.current;
    if (!currentUser?.id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(currentUser.id)) {
      this.isSubmitting = false;
      this.errorMessage = 'Your login session is invalid. Please sign in again.';
      this.toast.show(this.errorMessage, 'error');
      return;
    }

    const seats = this.bookingForm.get('seats')?.value;
    this.data.createBooking(this.rideId, seats).subscribe({
      next: (booking) => {
        this.isSubmitting = false;
        this.bookingConfirmation = {
          bookingReference: 'BK' + Date.now(),
          bookingId: booking.id,
          seatsBooked: seats,
          totalAmount: this.getTotalPrice(),
          status: 'Pending'
        };
        this.toast.show('Booking request sent. Owner approval is required.', 'success');
        this.router.navigate(['/ride', this.rideId]);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMessage = err.error?.message || 'Booking failed. Please try again.';
        this.toast.show(this.errorMessage, 'error');
      }
    });
  }

  /**
   * Go back to search.
   */
  goBack() {
    this.router.navigate(['/rides/search/multi-stop']);
  }

  /**
   * View booking details.
   */
  viewBooking() {
    this.router.navigate(['/bookings']);
  }
}
