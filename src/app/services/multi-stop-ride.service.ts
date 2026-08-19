import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  CreateMultiStopRideRequest,
  RideDetails,
  RideSearchRequest,
  RideSearchResponse,
  BookSegmentRequest,
  BookingResponse,
  BookingDetails,
  SegmentOccupancy
} from '../models/multi-stop-ride.model';

/**
 * Service for multi-stop ride operations.
 * 
 * Handles:
 * - Creating multi-stop rides
 * - Searching for rides with multi-stop support
 * - Getting ride details
 * - Managing seat availability
 * - Booking ride segments
 * - Cancelling bookings
 */
@Injectable({
  providedIn: 'root'
})
export class MultiStopRideService {

  private readonly backendBaseUrl = environment.apiBaseUrl.replace(/\/api$/, '');
  private readonly apiUrl = `${this.backendBaseUrl}/api/v1/rides`;
  private readonly bookingUrl = `${this.backendBaseUrl}/api/v1/bookings`;

  // Signals for reactive state management
  currentRide = signal<RideDetails | null>(null);
  searchResults = signal<RideSearchResponse | null>(null);
  isLoading = signal(false);
  error = signal<string | null>(null);

  constructor(private http: HttpClient) {}

  // ========== CREATE MULTI-STOP RIDE ==========

  /**
   * Create a new multi-stop ride.
   */
  createMultiStopRide(request: CreateMultiStopRideRequest): Observable<any> {
    this.isLoading.set(true);
    this.error.set(null);

    return new Observable(observer => {
      this.http.post<any>(`${this.apiUrl}/multi-stop`, request)
        .subscribe({
          next: (response) => {
            this.isLoading.set(false);
            observer.next(response);
            observer.complete();
          },
          error: (err) => {
            const errorMsg = err.error?.message || 'Failed to create ride';
            this.error.set(errorMsg);
            this.isLoading.set(false);
            observer.error(err);
          }
        });
    });
  }

  // ========== GET RIDE DETAILS ==========

  /**
   * Get complete ride details.
   */
  getRideDetails(rideId: string): Observable<any> {
    this.isLoading.set(true);
    this.error.set(null);

    return new Observable(observer => {
      this.http.get<any>(`${this.apiUrl}/${rideId}/details`)
        .subscribe({
          next: (response) => {
            this.currentRide.set(response.data);
            this.isLoading.set(false);
            observer.next(response.data);
            observer.complete();
          },
          error: (err) => {
            const errorMsg = err.error?.message || 'Failed to fetch ride details';
            this.error.set(errorMsg);
            this.isLoading.set(false);
            observer.error(err);
          }
        });
    });
  }

  /**
   * Get route preview for a ride.
   */
  getRoutePreview(rideId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${rideId}/route`);
  }

  // ========== SEARCH RIDES ==========

  /**
   * Search for multi-stop rides.
   */
  searchRides(request: RideSearchRequest): Observable<RideSearchResponse> {
    this.isLoading.set(true);
    this.error.set(null);

    let params = new HttpParams()
      .set('from', request.fromLocation)
      .set('to', request.toLocation)
      .set('date', request.date)
      .set('seats', request.seats.toString());

    if (request.page !== undefined) params = params.set('page', request.page.toString());
    if (request.size !== undefined) params = params.set('size', request.size.toString());
    if (request.sortBy) params = params.set('sortBy', request.sortBy);

    return new Observable(observer => {
      this.http.get<any>(`${this.apiUrl}/search/multi-stop`, { params })
        .subscribe({
          next: (response) => {
            this.searchResults.set(response.data);
            this.isLoading.set(false);
            observer.next(response.data);
            observer.complete();
          },
          error: (err) => {
            const errorMsg = err.error?.message || 'Search failed';
            this.error.set(errorMsg);
            this.isLoading.set(false);
            observer.error(err);
          }
        });
    });
  }

  /**
   * Search rides using POST (for complex queries).
   */
  searchRidesPost(request: RideSearchRequest): Observable<RideSearchResponse> {
    this.isLoading.set(true);
    this.error.set(null);

    return new Observable(observer => {
      this.http.post<any>(`${this.apiUrl}/search/multi-stop`, request)
        .subscribe({
          next: (response) => {
            this.searchResults.set(response.data);
            this.isLoading.set(false);
            observer.next(response.data);
            observer.complete();
          },
          error: (err) => {
            const errorMsg = err.error?.message || 'Search failed';
            this.error.set(errorMsg);
            this.isLoading.set(false);
            observer.error(err);
          }
        });
    });
  }

  // ========== AVAILABILITY ==========

  /**
   * Get ride availability information.
   */
  getRideAvailability(rideId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${rideId}/availability`);
  }

  /**
   * Get segment availability.
   */
  getSegmentAvailability(rideId: string, fromStopId: string, toStopId: string): Observable<any> {
    return this.http.get<any>(
      `${this.bookingUrl}/rides/${rideId}/segments/${fromStopId}/to/${toStopId}/availability`
    );
  }

  /**
   * Get segment occupancy details.
   */
  getSegmentOccupancy(rideId: string, fromStopId: string, toStopId: string): Observable<SegmentOccupancy> {
    return this.http.get<any>(
      `${this.bookingUrl}/rides/${rideId}/segments/${fromStopId}/to/${toStopId}/occupancy`
    );
  }

  /**
   * Get journey availability (considering all segments).
   */
  getJourneyAvailability(rideId: string, fromStopOrder: number, toStopOrder: number): Observable<any> {
    const params = new HttpParams()
      .set('fromStopOrder', fromStopOrder.toString())
      .set('toStopOrder', toStopOrder.toString());

    return this.http.get<any>(
      `${this.bookingUrl}/rides/${rideId}/journey-availability`,
      { params }
    );
  }

  // ========== BOOKING ==========

  /**
   * Book a ride segment.
   */
  bookSegment(request: BookSegmentRequest): Observable<BookingResponse> {
    this.isLoading.set(true);
    this.error.set(null);

    const params = new HttpParams()
      .set('rideId', request.rideId)
      .set('passengerId', request.passengerId)
      .set('passengerMobile', request.passengerMobile)
      .set('fromLocation', request.fromLocation)
      .set('toLocation', request.toLocation)
      .set('seats', request.seats.toString());

    return new Observable(observer => {
      this.http.post<any>(`${this.bookingUrl}/segment`, {}, { params })
        .subscribe({
          next: (response) => {
            this.isLoading.set(false);
            observer.next(response.data);
            observer.complete();
          },
          error: (err) => {
            const errorMsg = err.error?.message || 'Booking failed';
            this.error.set(errorMsg);
            this.isLoading.set(false);
            observer.error(err);
          }
        });
    });
  }

  /**
   * Get booking details.
   */
  getBookingDetails(bookingId: string): Observable<BookingDetails> {
    return this.http.get<any>(`${this.bookingUrl}/${bookingId}/details`);
  }

  /**
   * Cancel a booking.
   */
  cancelBooking(bookingId: string, reason?: string): Observable<any> {
    this.isLoading.set(true);
    this.error.set(null);

    let params = new HttpParams();
    if (reason) params = params.set('reason', reason);

    return new Observable(observer => {
      this.http.delete<any>(`${this.bookingUrl}/${bookingId}`, { params })
        .subscribe({
          next: (response) => {
            this.isLoading.set(false);
            observer.next(response);
            observer.complete();
          },
          error: (err) => {
            const errorMsg = err.error?.message || 'Cancellation failed';
            this.error.set(errorMsg);
            this.isLoading.set(false);
            observer.error(err);
          }
        });
    });
  }

  // ========== HELPER METHODS ==========

  /**
   * Clear error message.
   */
  clearError(): void {
    this.error.set(null);
  }

  /**
   * Calculate travel duration between two times.
   */
  calculateDuration(startTime: string, endTime: string): string {
    try {
      const start = new Date(`2024-01-01 ${startTime}`);
      const end = new Date(`2024-01-01 ${endTime}`);
      const diffMs = end.getTime() - start.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      return `${hours}h ${mins}m`;
    } catch (e) {
      return 'N/A';
    }
  }

  /**
   * Format ride date for display.
   */
  formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-IN', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch (e) {
      return dateString;
    }
  }

  /**
   * Format time for display.
   */
  formatTime(timeString: string): string {
    try {
      const [hours, minutes] = timeString.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    } catch (e) {
      return timeString;
    }
  }
}
