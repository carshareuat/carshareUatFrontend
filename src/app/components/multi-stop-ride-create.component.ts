import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MultiStopRideService } from '../services/multi-stop-ride.service';
import { AuthService } from '../auth.service';
import { ToastService } from '../toast.service';
import { MockDataService, LocationItem } from '../mock-data.service';
import { CreateMultiStopRideRequest, PricingType, RideStop, SegmentPriceRule } from '../models/multi-stop-ride.model';

/**
 * Component for creating multi-stop rides with segmented pricing.
 * 
 * Features:
 * - Add/remove stops dynamically
 * - Reorder stops
 * - Set arrival/departure times
 * - Define segment prices (manual or auto-calculate)
 * - Validate route and times
 */
@Component({
  selector: 'app-multi-stop-ride-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="container">
      <div class="card">
        <div class="form-intro">
          <div>
            <span class="eyebrow">OWNER WORKSPACE</span>
            <h2>Create a ride</h2>
            <p>Start with a simple route. Add stops only when your journey needs them.</p>
          </div>
          <div class="route-mark" aria-hidden="true"><span></span><i></i><span></span></div>
        </div>

        <!-- Verification Status -->
        <div *ngIf="!isOwner" class="alert alert-warning">
          <p>Only ride owners can create rides. Please verify your owner account first.</p>
          <button class="btn btn-primary" (click)="goVerify()">Verify Account</button>
        </div>

        <!-- Main Form -->
        <form [formGroup]="rideForm" (ngSubmit)="onSubmit()" *ngIf="isOwner" class="ride-form">

          <!-- Travel Date -->
          <div class="form-section">
            <h3><span class="section-index">01</span> Travel date</h3>
            <div class="form-row">
              <div class="field">
                <label>Travel Date</label>
                <input type="date" formControlName="date" [min]="today" required />
                <small *ngIf="rideForm.get('date')?.invalid && rideForm.get('date')?.touched" class="error">
                  Valid date required
                </small>
              </div>
            </div>
          </div>

          <!-- Pricing Type Selection -->
          <div class="form-section">
            <h3><span class="section-index">02</span> Pricing</h3>
            <div class="form-row">
              <div class="field">
                <label>Pricing Type</label>
                <select formControlName="pricingType" (change)="onPricingTypeChange()" required>
                  <option value="">Select pricing type</option>
                  <option value="FIXED">Fixed Price (entire route)</option>
                  <option value="SEGMENTED">Segmented Pricing (per segment)</option>
                </select>
                <div class="field fixed-price" *ngIf="rideForm.get('pricingType')?.value === 'FIXED'">
                  <label>Price for the journey (₹) *</label>
                  <input type="number" formControlName="price" min="1" step="1" placeholder="e.g. 450" />
                </div>
                <small class="info">
                  <strong>FIXED:</strong> Single price for entire journey<br>
                  <strong>SEGMENTED:</strong> Different prices for different route segments
                </small>
              </div>
            </div>
          </div>

          <!-- Stops Management -->
          <div class="form-section">
            <h3><span class="section-index">03</span> Journey</h3>
            <p class="section-help">Your first two locations are the required From and To. Add more stops for a multi-stop route.</p>
            
            <div formArrayName="stops" class="stops-list">
              <div *ngFor="let stop of stops.controls; let i = index" class="stop-card" [formGroupName]="i">
                <div class="stop-header">
                  <div class="stop-number">{{ i === 0 ? '📍 Start' : i === stops.length - 1 ? '🎯 End' : '🚩 Stop ' + i }}</div>
                  <div class="stop-actions">
                    <button *ngIf="i > 0" type="button" class="btn-icon" (click)="moveStopUp(i)" title="Move up">↑</button>
                    <button *ngIf="i < stops.length - 1" type="button" class="btn-icon" (click)="moveStopDown(i)" title="Move down">↓</button>
                    <button *ngIf="stops.length > 2 && i !== 0 && i !== stops.length - 1" type="button" class="btn-danger-icon" (click)="removeStop(i)" title="Remove">✕</button>
                  </div>
                </div>

                <div class="form-row">
                  <div class="field">
                    <label>{{ i === 0 ? 'Start Place *' : 'Drop Place *' }}</label>
                    <div class="location-autocomplete">
                      <input type="text" formControlName="locationName" placeholder="e.g., Pondicherry" required autocomplete="off"
                        (input)="filterStopLocations(i, $any($event.target).value)" (focus)="filterStopLocations(i, stop.get('locationName')?.value || '')" />
                      <div class="location-suggestions" *ngIf="activeStopIndex === i && stopLocationSuggestions.length">
                        <button type="button" *ngFor="let location of stopLocationSuggestions" (mousedown)="selectStopLocation(i, location)">
                          {{ location.district }} <span>{{ location.state }}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="form-row">
                  <div class="field" *ngIf="i > 0">
                    <label>Arrival Time (HH:MM) *</label>
                    <input type="time" formControlName="arrivalTime" required />
                  </div>
                  <div class="field" *ngIf="i < stops.length - 1">
                    <label>Departure Time (HH:MM) *</label>
                    <input type="time" formControlName="departureTime" required />
                  </div>
                </div>
              </div>
            </div>

            <button type="button" class="btn btn-add-stop" (click)="addStop()">＋ Add another stop</button>
          </div>

          <!-- Segment Pricing -->
          <div class="form-section" *ngIf="rideForm.get('pricingType')?.value">
            <h3><span class="section-index">04</span> Segment pricing</h3>
            <div class="pricing-matrix">
              <div *ngIf="rideForm.get('pricingType')?.value === 'SEGMENTED'" class="segment-prices">
                <div formArrayName="segmentPrices">
                  <div *ngFor="let price of segmentPrices.controls; let i = index" 
                       [formGroupName]="i" class="price-row">
                    <span class="segment-label">
                      {{ getStopName(price.get('fromStopOrder')?.value) }} 
                      → 
                      {{ getStopName(price.get('toStopOrder')?.value) }}
                    </span>
                    <div class="price-inputs">
                      <div class="field">
                        <input type="number" formControlName="price" step="0.01" min="1" placeholder="Price (₹)" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Vehicle Details -->
          <div class="form-section">
            <h3><span class="section-index">05</span> Vehicle details</h3>
            <div class="form-row">
              <div class="field">
                <label>Car Model</label>
                <input type="text" formControlName="carModel" placeholder="e.g., Hyundai i20" />
              </div>
              <div class="field">
                <label>Total Seats *</label>
                <input type="number" formControlName="totalSeats" min="1" max="8" required />
              </div>
              <div class="field checkbox-field">
                <label>
                  <input type="checkbox" formControlName="femaleOnly" />
                  Show only to female passengers
                </label>
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="form-actions">
            <button type="submit" class="btn btn-primary" [disabled]="!rideForm.valid || isSubmitting">
              {{ isSubmitting ? '⏳ Creating...' : '✓ Create Ride' }}
            </button>
            <button type="button" class="btn btn-secondary" (click)="onCancel()">Cancel</button>
          </div>

          <!-- Error Display -->
          <div *ngIf="errorMessage" class="alert alert-danger">
            {{ errorMessage }}
          </div>
        </form>

      </div>
    </div>
  `,
  styles: [`
    /* Mobile-First Responsive Design */
    * {
      box-sizing: border-box;
    }

    .container { width: 100%; max-width: 980px; margin: 0 auto; padding: 24px 16px 48px; }

    .card { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 28px; box-shadow: 0 14px 35px rgba(15, 23, 42, .08); margin-bottom: 16px; }

    .form-intro { display: flex; justify-content: space-between; align-items: center; gap: 24px; padding-bottom: 24px; border-bottom: 1px solid #e2e8f0; }
    .eyebrow { color: #0f766e; font-size: 10px; font-weight: 800; letter-spacing: 1.5px; }

    h2 { color: #0f172a; margin: 6px 0 4px; font-size: 30px; font-weight: 700; }
    .form-intro p { margin: 0; color: #64748b; font-size: 13px; }
    .route-mark { display: flex; align-items: center; gap: 7px; padding: 14px; background: #f0fdfa; border: 1px solid #99f6e4; border-radius: 8px; }
    .route-mark span { width: 10px; height: 10px; border: 3px solid #0f766e; border-radius: 50%; }
    .route-mark i { width: 36px; border-top: 2px dashed #5eead4; }

    h3 { color: #0f172a; margin: 0 0 16px; font-size: 15px; font-weight: 750; }
    .section-index { display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; margin-right: 8px; border-radius: 6px; background: #ccfbf1; color: #0f766e; font-size: 11px; }
    .section-help { margin: -8px 0 16px; color: #64748b; font-size: 12px; }

    .form-section {
      margin-bottom: 24px;
      padding-bottom: 22px;
      border-bottom: 1px solid #e2e8f0;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr;
      gap: 12px;
      margin-bottom: 12px;
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
      padding: 12px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
      font-family: inherit;
      width: 100%;
      line-height: 1.5;
    }

    .field input:focus,
    .field select:focus {
      outline: none;
      border-color: #464feb;
      box-shadow: 0 0 0 3px rgba(70, 79, 235, 0.1);
    }

    .field input:invalid {
      border-color: #dc3545;
    }

    .location-autocomplete { position: relative; }
    .location-suggestions {
      position: absolute;
      top: calc(100% + 4px);
      left: 0;
      right: 0;
      z-index: 30;
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

    .field small {
      margin-top: 4px;
      font-size: 11px;
    }

    .field small.error {
      color: #dc3545;
    }

    .field small.info {
      color: #666;
      line-height: 1.4;
    }

    .checkbox-field label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 500;
    }

    .checkbox-field input[type="checkbox"] {
      width: auto;
      margin: 0;
    }

    .stops-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 16px;
    }

    .stop-card { border: 1px solid #dbe4ee; border-radius: 8px; padding: 16px; background: #f8fafc; }

    .stop-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      flex-wrap: wrap;
      gap: 8px;
    }

    .stop-number {
      font-weight: 600;
      color: #0f766e;
      font-size: 14px;
    }

    .stop-actions {
      display: flex;
      gap: 4px;
    }

    .btn-icon {
      background: #f0f0f0;
      border: 1px solid #ddd;
      padding: 6px 8px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 11px;
      min-width: 28px;
      text-align: center;
    }

    .btn-icon:active {
      background: #e6e6e6;
    }

    .btn-danger-icon {
      background: #ffe6e6;
      border: 1px solid #ffcccc;
      color: #dc3545;
    }

    .btn-danger-icon:active {
      background: #ffcccc;
    }

    .pricing-matrix {
      background: #f9f9f9;
      padding: 12px;
      border-radius: 6px;
    }

    .segment-prices {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .price-row {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 12px;
      background: white;
      border-radius: 4px;
      border: 1px solid #e6e6e6;
    }

    .segment-label {
      font-weight: 500;
      font-size: 13px;
      color: #333;
    }

    .price-inputs {
      display: grid;
      grid-template-columns: 1fr;
      gap: 8px;
      width: 100%;
    }

    .price-inputs .field {
      flex: 1;
      margin: 0;
    }

    .price-inputs input {
      width: 100%;
    }

    .form-actions {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 20px;
    }

    .btn-add-stop { width: auto; background: #ecfeff; color: #0f766e; border: 1px dashed #5eead4; }
    .fixed-price { margin-top: 12px; }

    .btn {
      padding: 12px 16px;
      border: none;
      border-radius: 4px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      width: 100%;
      text-align: center;
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
      background: #f0f0f0;
      color: #333;
      border: 1px solid #ddd;
    }

    .btn-secondary:active {
      background: #e6e6e6;
    }

    .alert {
      padding: 12px;
      border-radius: 4px;
      margin-bottom: 16px;
      font-size: 13px;
    }

    .alert p {
      margin: 0 0 8px 0;
    }

    .alert-warning {
      background: #fff7ed;
      border: 1px solid #fed7aa;
      color: #7c2d12;
    }

    .alert-danger {
      background: #ffe6e6;
      border: 1px solid #ffcccc;
      color: #dc3545;
    }

    /* Tablet (600px and up) */
    @media (min-width: 600px) {
      .container {
        padding: 12px;
      }

      .card { padding: 24px; }

      h2 {
        font-size: 24px;
      }

      h3 {
        font-size: 16px;
        margin: 20px 0 16px;
      }

      .form-row {
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 16px;
      }

      .field label {
        font-size: 14px;
      }

      .stop-card {
        padding: 16px;
      }

      .price-row {
        flex-direction: row;
        align-items: center;
        gap: 12px;
      }

      .segment-label {
        min-width: 200px;
        flex-shrink: 0;
      }

      .price-inputs {
        grid-template-columns: 1fr;
        flex: 1;
      }

      .form-actions {
        flex-direction: row;
        gap: 12px;
      }

      .btn {
        width: auto;
        flex: 1;
      }
    }

    /* Desktop (1024px and up) */
    @media (min-width: 1024px) {
      .container {
        padding: 32px 24px 56px;
        max-width: 980px;
      }

      .card {
        padding: 24px;
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
      }

      .form-row {
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      }

      .btn {
        padding: 12px 24px;
      }

      .btn:hover:not(:disabled) {
        box-shadow: 0 4px 12px rgba(15, 118, 110, 0.18);
        transform: translateY(-2px);
      }

      .btn-icon:hover {
        background: #e6e6e6;
      }

      .btn-danger-icon:hover {
        background: #ffcccc;
      }
    }

    @media (max-width: 560px) {
      .card { padding: 18px; }
      .form-intro { align-items: flex-start; }
      .route-mark { display: none; }
      h2 { font-size: 25px; }
    }
  `]
})
export class MultiStopRideCreateComponent implements OnInit {

  rideForm!: FormGroup;
  today = new Date().toISOString().slice(0, 10);
  isOwner = false;
  paymentInReview = false;
  isSubmitting = false;
  errorMessage = '';
  allLocations: LocationItem[] = [];
  stopLocationSuggestions: LocationItem[] = [];
  activeStopIndex: number | null = null;

  constructor(
    private fb: FormBuilder,
    private rideService: MultiStopRideService,
    private locations: MockDataService,
    private auth: AuthService,
    private router: Router,
    private toast: ToastService
  ) {}

  ngOnInit() {
    this.initForm();
    this.checkOwnerStatus();
    this.loadLocations();
  }

  private loadLocations() {
    this.locations.getLocations().subscribe({
      next: locations => {
        const seen = new Set<string>();
        this.allLocations = (locations || []).filter(location => {
          const key = location.district.trim().toLowerCase();
          if (!key || seen.has(key)) return false;
          seen.add(key);
          return true;
        }).sort((a, b) => a.district.localeCompare(b.district));
      },
      error: () => this.toast.show('Unable to load locations', 'error')
    });
  }

  filterStopLocations(index: number, value: string) {
    this.activeStopIndex = index;
    const query = String(value || '').trim().toLowerCase();
    const selectedLocations = this.stops.controls
      .map((stop, stopIndex) => stopIndex === index ? '' : String(stop.get('locationName')?.value || '').trim().toLowerCase())
      .filter(Boolean);
    this.stopLocationSuggestions = (query.length < 1 ? this.allLocations : this.allLocations.filter(location =>
      location.district.toLowerCase().includes(query)
    )).filter(location => !selectedLocations.includes(location.district.trim().toLowerCase())).slice(0, 10);
  }

  selectStopLocation(index: number, location: LocationItem) {
    this.stops.at(index).get('locationName')?.setValue(location.district);
    this.activeStopIndex = null;
  }

  /**
   * Initialize the form.
   */
  private initForm() {
    this.rideForm = this.fb.group({
      date: ['', Validators.required],
      pricingType: ['FIXED', Validators.required],
      stops: this.fb.array([
        this.createStopControl(),
        this.createStopControl()
      ], [Validators.minLength(2)]),
      segmentPrices: this.fb.array([]),
      price: [null, [Validators.min(1)]],
      carModel: [''],
      totalSeats: [4, [Validators.required, Validators.min(1), Validators.max(8)]],
      femaleOnly: [false]
    });

    // Watch for stop count changes to generate segment prices
    this.stops.statusChanges.subscribe(() => {
      this.generateSegmentPrices();
    });

    // Watch for pricing type changes
    this.rideForm.get('pricingType')?.valueChanges.subscribe(() => {
      this.generateSegmentPrices();
      this.onPricingTypeChange();
    });
    this.onPricingTypeChange();
  }

  /**
   * Create a single stop form control.
   */
  private createStopControl(): FormGroup {
    return this.fb.group({
      locationName: ['', Validators.required],
      arrivalTime: [null],
      departureTime: [null]
    });
  }

  /**
   * Get stops FormArray.
   */
  get stops(): FormArray {
    return this.rideForm.get('stops') as FormArray;
  }

  /**
   * Get segment prices FormArray.
   */
  get segmentPrices(): FormArray {
    return this.rideForm.get('segmentPrices') as FormArray;
  }

  /**
   * Add a new stop.
   */
  addStop() {
    this.stops.push(this.createStopControl());
    this.toast.show('Stop added', 'info');
  }

  /**
   * Remove a stop.
   */
  removeStop(index: number) {
    if (this.stops.length > 2) {
      this.stops.removeAt(index);
      this.generateSegmentPrices();
      this.toast.show('Stop removed', 'info');
    }
  }

  /**
   * Move stop up.
   */
  moveStopUp(index: number) {
    if (index > 0) {
      const stops = this.stops;
      const stop = stops.at(index);
      stops.removeAt(index);
      stops.insert(index - 1, stop);
      this.generateSegmentPrices();
    }
  }

  /**
   * Move stop down.
   */
  moveStopDown(index: number) {
    if (index < this.stops.length - 1) {
      const stops = this.stops;
      const stop = stops.at(index);
      stops.removeAt(index);
      stops.insert(index + 1, stop);
      this.generateSegmentPrices();
    }
  }

  /**
   * Get stop name by index.
   */
  getStopName(index: number): string {
    if (index === undefined || index === null) return '';
    const stop = this.stops.at(index);
    return stop?.get('locationName')?.value || `Stop ${index}`;
  }

  /**
   * Generate segment prices array.
   */
  private generateSegmentPrices() {
    const prices = this.segmentPrices;
    prices.clear();

    const stopCount = this.stops.length;
    if (stopCount < 2) return;

    // Generate all valid segment combinations
    for (let i = 0; i < stopCount; i++) {
      for (let j = i + 1; j < stopCount; j++) {
        const priceControl = this.fb.group({
          fromStopOrder: [i],
          toStopOrder: [j],
          price: [null]
        });
        prices.push(priceControl);
      }
    }
  }

  /**
   * Handle pricing type change.
   */
  onPricingTypeChange() {
    const priceControl = this.rideForm.get('price');
    if (this.rideForm.get('pricingType')?.value === 'FIXED') {
      priceControl?.setValidators([Validators.required, Validators.min(1)]);
    } else {
      priceControl?.clearValidators();
    }
    priceControl?.updateValueAndValidity({ emitEvent: false });
    this.generateSegmentPrices();
  }

  /**
   * Check owner status.
   */
  private checkOwnerStatus() {
    const session = this.auth.current;
    if (!session || session.role !== 'owner' || !session.ownerId) {
      this.isOwner = false;
      return;
    }
    this.locations.getOwnerById(session.ownerId).subscribe({
      next: owner => this.locations.getMySubscriptions().subscribe({
        next: subscriptions => {
          const status = subscriptions[0]?.status;
          this.paymentInReview = status === 'VERIFICATION_IN_PROGRESS';
          this.isOwner = !!owner?.verified && status === 'PAID';
        },
        error: () => this.isOwner = false
      }),
      error: () => this.isOwner = false
    });
  }

  /**
   * Navigate to verification page.
   */
  goVerify() {
    this.router.navigate(['/subscription']);
  }

  /**
   * Submit form.
   */
  onSubmit() {
    this.activeStopIndex = null;
    const stopNames = this.stops.controls.map(stop => String(stop.get('locationName')?.value || '').trim().toLowerCase());
    if (new Set(stopNames).size !== stopNames.length) {
      this.errorMessage = 'Each stop must be a different location';
      return;
    }
    if (!this.rideForm.valid) {
      this.errorMessage = 'Please fill all required fields';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    const request: CreateMultiStopRideRequest = {
      stops: this.stops.value.map((stop: RideStop, index: number) => ({ ...stop, stopOrder: index })),
      date: this.rideForm.get('date')?.value,
      pricingType: this.rideForm.get('pricingType')?.value as PricingType,
      price: this.rideForm.get('price')?.value,
      segmentPrices: this.segmentPrices.value as SegmentPriceRule[],
      carModel: this.rideForm.get('carModel')?.value,
      totalSeats: this.rideForm.get('totalSeats')?.value,
      femaleOnly: this.rideForm.get('femaleOnly')?.value
    };

    this.rideService.createMultiStopRide(request).subscribe({
      next: (response) => {
        this.isSubmitting = false;
        this.toast.show('Ride created successfully!', 'success');
        this.router.navigate(['/owner/my-rides']);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMessage = err.error?.message || 'Failed to create ride';
        this.toast.show(this.errorMessage, 'error');
      }
    });
  }

  /**
   * Cancel and go back.
   */
  onCancel() {
    this.router.navigate(['/owner/dashboard']);
  }
}
