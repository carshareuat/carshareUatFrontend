import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../environments/environment';

export interface Owner {
  id: string;
  name: string;
  mobile: string;
  verified: boolean;
  rating: number;
  ratingsCount: number;
  averageRating?: number;
  profilePhoto?: string;
  allowPets?: boolean;
  stopsForBreak?: boolean;
  jovial?: boolean;
  preferences?: string[];
  dateOfBirth?: string;
  age?: number;
  gender?: 'male' | 'female';
}

export interface Ride {
  id: string;
  ownerId: string;
  from: string;
  to: string;
  date: string;
  startTime: string;
  endTime: string;
  price: number;
  carModel: string;
  seatsAvailable: number;
  femaleOnly?: boolean;
  status?: 'active' | 'completed' | 'cancelled';
}

export interface LocationItem {
  id: string;
  state: string;
  district: string;
}

export interface ApiResponse<T> {
  data: T;
  meta?: { page?: number; size?: number; totalElements?: number; totalPages?: number };
}

export interface AppData {
  owners: Owner[];
  rides: Ride[];
}

export interface Booking {
  id: string;
  rideId: string;
  passengerId?: string;
  passengerMobile?: string;
  userMobile?: string;
  seats: number;
  status: string;
  cancellationReason?: string;
  cancellationNote?: string;
  cancelledBy?: string;
  cancelledAt?: string;
  needsRating?: boolean;
  rated?: boolean;
  rating?: number;
  ratingNote?: string;
}

@Injectable({ providedIn: 'root' })
export class MockDataService {
  private url = 'assets/sample-data.json';
  private apiUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  loadAll(): Observable<AppData> {
    return this.http.get<AppData>(this.url);
  }

  getRides(filters: { from?: string; to?: string; date?: string; passengers?: number; status?: string } = {}): Observable<Ride[]> {
    const params: Record<string, string | number> = { page: 0, size: 100 };
    if (filters.from) params['from'] = filters.from;
    if (filters.to) params['to'] = filters.to;
    if (filters.date) params['date'] = filters.date;
    if (filters.passengers) params['passengers'] = filters.passengers;
    // By default keep previous behaviour of returning only active rides when no explicit status provided
    if (filters.status !== undefined) {
      if (filters.status) params['status'] = filters.status;
      // if filters.status === '' do not set status to fetch all
    } else {
      params['status'] = 'ACTIVE';
    }

    return this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/rides`, { params }).pipe(
      map((response: any) => this.asItems(response).map((ride: any) => this.fromApiRide(ride)))
    );
  }

  private isValidFutureDate(s: string, todayStart: Date): boolean {
    if (!s || typeof s !== 'string') return false;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s.trim())) return false;
    const d = new Date(s.trim() + 'T00:00:00');
    if (isNaN(d.getTime())) return false;
    return d.getTime() >= todayStart.getTime();
  }

  getOwners(): Observable<Owner[]> {
    return this.http.get<ApiResponse<Owner[]>>(`${this.apiUrl}/owners`).pipe(map((response: any) => this.asItems(response).map((owner) => this.fromApiOwner(owner))));
  }

  getRideById(id: string): Observable<Ride | undefined> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/rides/${id}`).pipe(map((response) => this.fromApiRide(response.data)));
  }

  getOwnerById(id: string): Observable<Owner | undefined> {
    return this.http.get<ApiResponse<Owner>>(`${this.apiUrl}/owners/${id}`).pipe(map((response) => response.data ? this.fromApiOwner(response.data) : undefined));
  }

  getOwnerRides(id: string): Observable<Ride[]> {
    return this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/owners/${id}/rides`).pipe(
      map((response: any) => this.asItems(response).map((ride: any) => this.fromApiRide(ride)))
    );
  }

  getLocations(query?: string, state?: string): Observable<LocationItem[]> {
    const params: Record<string, string> = {};
    if (query) params['query'] = query;
    if (state) params['state'] = state;
    return this.http.get<ApiResponse<LocationItem[]>>(`${this.apiUrl}/locations`, { params }).pipe(map((r: any) => r.data || []));
  }

  createOwner(form: FormData): Observable<Owner> {
    return this.http.post<ApiResponse<Owner>>(`${this.apiUrl}/owners`, form).pipe(map((response) => this.fromApiOwner(response.data)));
  }

  createCheckout(): Observable<any> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/subscriptions/create-checkout`, {
      successUrl: window.location.origin + '/owner/dashboard', cancelUrl: window.location.origin + '/owner/register'
    }).pipe(map((response) => response.data));
  }

  createCheckoutForPlan(planId: string): Observable<any> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/subscriptions/create-checkout`, {
      successUrl: window.location.origin + '/owner/dashboard', cancelUrl: window.location.origin + '/owner/register', planId
    }).pipe(map((response) => response.data));
  }

  getSubscriptionPlans(): Observable<any[]> {
    return this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/subscriptions/plans`).pipe(map((response) => response.data || []));
  }

  submitUtr(subscriptionId: string, utrNumber: string): Observable<any> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/subscriptions/${subscriptionId}/utr`, null, { params: { utrNumber } }).pipe(map((response) => response.data));
  }

  // --- Notifications ---
  getNotifications(): Observable<any[]> {
    return this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/notifications`).pipe(map((response) => response.data || []));
  }

  markNotificationRead(id: string): Observable<any> {
    return this.http.patch<ApiResponse<any>>(`${this.apiUrl}/notifications/${id}/read`, {}).pipe(map((response) => response.data));
  }

  markAllNotificationsRead(): Observable<any> {
    return this.http.patch<ApiResponse<any>>(`${this.apiUrl}/notifications/read-all`, {}).pipe(map((response) => response.data));
  }

  getMySubscriptions(): Observable<any[]> {
    return this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/subscriptions/me`).pipe(map((response) => response.data || []));
  }

  getMe(): Observable<any> {
    // AuthController exposes /api/auth/me
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/auth/me`).pipe(map((response) => response.data || {}));
  }

  getAdminSubscriptions(status = ''): Observable<any[]> {
    return this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/subscriptions/admin`, { params: status ? { status } : {} }).pipe(map((response) => response.data || []));
  }

  approveSubscription(id: string): Observable<any> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/subscriptions/${id}/approve`, {}).pipe(map((response) => response.data));
  }

  rejectSubscription(id: string, comment: string): Observable<any> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/subscriptions/${id}/reject`, {}, { params: { comment } }).pipe(map((response) => response.data));
  }

  exportSubscriptions(): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/subscriptions/admin/export`, { responseType: 'blob' });
  }

  simulateMockPaymentSuccess(providerOrderId: string): Observable<any> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/subscriptions/webhook`, {
      providerOrderId,
      providerPaymentId: `mock_pay_${Date.now()}`,
      status: 'PAID',
      amount: 0,
      currency: 'INR'
    }).pipe(map((response) => response.data));
  }

  createRide(request: { from: string; to: string; date: string; startTime: string; endTime: string; price: number; carModel: string; seatsAvailable: number; femaleOnly?: boolean }): Observable<Ride> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/rides`, {
      fromLocation: request.from, toLocation: request.to, date: request.date,
      startTime: request.startTime, endTime: request.endTime, price: request.price,
      carModel: request.carModel, totalSeats: request.seatsAvailable, femaleOnly: request.femaleOnly
    }).pipe(map((response) => this.fromApiRide(response.data)));
  }

  updateRide(id: string, status: 'completed' | 'cancelled', reason?: string, note?: string): Observable<Ride> {
    return this.http.patch<ApiResponse<any>>(`${this.apiUrl}/rides/${id}`, {
      status: status.toUpperCase(), cancellationReason: reason, cancellationNote: note
    }).pipe(map((response) => this.fromApiRide(response.data)));
  }

  deleteRide(id: string): Observable<void> { return this.http.delete<void>(`${this.apiUrl}/rides/${id}`); }

  createBooking(rideId: string, seats: number): Observable<Booking> {
    return this.http.post<ApiResponse<Booking>>(`${this.apiUrl}/bookings`, { rideId, seats }).pipe(map((response) => this.fromApiBooking(response.data)));
  }

  getMyBookings(): Observable<Booking[]> {
    return this.http.get<ApiResponse<Booking[]>>(`${this.apiUrl}/bookings/me`).pipe(map((response) => (response.data || []).map((booking) => this.fromApiBooking(booking))));
  }

  getRideBookings(rideId: string): Observable<Booking[]> {
    return this.http.get<ApiResponse<Booking[]>>(`${this.apiUrl}/rides/${rideId}/bookings`).pipe(map((response) => (response.data || []).map((booking) => this.fromApiBooking(booking))));
  }

  /**
   * Fetch latest ride/owner location for a ride. Backend should expose an endpoint returning { lat, lon }.
   */
  getRideLocation(rideId: string): Observable<{ lat: number; lon: number }> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/rides/${rideId}/location`).pipe(map((r: any) => r.data || null));
  }

  getPassengerLocation(rideId: string): Observable<{ lat: number; lon: number } | null> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/rides/${rideId}/passenger-location`).pipe(map((r: any) => r.data || null));
  }

  postPassengerLocation(passengerId: string, lat: number, lon: number) {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/passengers/${passengerId}/location`, { lat, lon }).pipe(map((r: any) => r.data || null));
  }

  postOwnerLocation(ownerId: string, lat: number, lon: number) {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/owners/${ownerId}/location`, { lat, lon }).pipe(map((r: any) => r.data || null));
  }

  getConfirmedPassengers(rideId: string): Observable<Booking[]> {
    return this.http.get<ApiResponse<Booking[]>>(`${this.apiUrl}/rides/${rideId}/confirmed-passengers`).pipe(map((response) => (response.data || []).map((booking) => this.fromApiBooking(booking))));
  }

  cancelBooking(id: string, reason: string, note: string): Observable<Booking> {
    return this.http.patch<ApiResponse<Booking>>(`${this.apiUrl}/bookings/${id}/cancel`, { reason, note }).pipe(map((response) => this.fromApiBooking(response.data)));
  }

  decideBooking(id: string, status: 'accepted' | 'rejected'): Observable<Booking> {
    return this.http.patch<ApiResponse<Booking>>(`${this.apiUrl}/bookings/${id}/decision`, { status: status.toUpperCase() }).pipe(map((response) => this.fromApiBooking(response.data)));
  }

  rateBooking(id: string, rating: number, note: string): Observable<Booking> {
    return this.http.post<ApiResponse<Booking>>(`${this.apiUrl}/bookings/${id}/rating`, { rating, note }).pipe(map((response) => this.fromApiBooking(response.data)));
  }

  // --- Support / Tickets API ---
  getTicketCategories(): Observable<any[]> {
    return this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/tickets/categories`).pipe(map((r: any) => r.data || []));
  }

  createTicket(form: FormData): Observable<any> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/tickets`, form).pipe(map((r: any) => r.data));
  }

  getMyTickets(): Observable<any[]> {
    return this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/tickets/me`).pipe(map((r: any) => r.data || []));
  }

  getAdminTickets(status = ''): Observable<any[]> {
    return this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/tickets/admin`, { params: status ? { status } : {} }).pipe(map((r: any) => r.data || []));
  }

  getTicketById(id: string): Observable<any> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/tickets/${id}`).pipe(map((r: any) => r.data));
  }

  resolveTicket(id: string, resolution: string): Observable<any> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/tickets/${id}/resolve`, { resolution }).pipe(map((r: any) => r.data));
  }

  private fromApiRide(ride: any): Ride {
    return { ...ride, from: ride.from ?? ride.fromLocation, to: ride.to ?? ride.toLocation,
      startTime: String(ride.startTime || '').slice(0, 5), endTime: String(ride.endTime || '').slice(0, 5),
      price: Number(ride.price), seatsAvailable: ride.availableSeats ?? ride.seatsAvailable,
      status: String(ride.status || 'ACTIVE').toLowerCase() as Ride['status'] };
  }

  private fromApiOwner(owner: any): Owner {
    let preferences: string[] = [];
    if (Array.isArray(owner?.preferences)) {
      preferences = owner.preferences;
    } else if (typeof owner?.preferences === 'string' && owner.preferences.trim()) {
      try {
        const parsed = JSON.parse(owner.preferences);
        preferences = Array.isArray(parsed) ? parsed : [];
      } catch {
        preferences = [];
      }
    }
    const base = this.apiUrl.replace(/\/api\/?$/, '');
    const profilePhoto = owner?.profilePhotoUrl ? `${base}/files/${owner.profilePhotoUrl}` : undefined;
    return { ...owner, preferences, profilePhoto };
  }

  private fromApiBooking(booking: any): Booking {
    return {
      ...booking,
      userMobile: booking.userMobile ?? booking.passengerMobile,
      status: String(booking.status || '').toLowerCase()
    };
  }

  private asItems(response: any): any[] {
    const data = response?.data;
    return Array.isArray(data) ? data : (data?.items || []);
  }
}
