// ============================================================================
// Multi-Stop Ride Models for Angular 17
// ============================================================================

/**
 * Represents a single stop in a multi-stop ride route.
 */
export interface RideStop {
  stopOrder: number;
  locationName: string;
  arrivalTime?: string; // HH:mm format
  departureTime?: string; // HH:mm format
}

/**
 * Represents a journey segment between two stops.
 */
export interface RideSegment {
  id?: string; // UUID
  fromStopId?: string; // UUID
  toStopId?: string; // UUID
  price: number; // in rupees
  availableSeats: number;
  totalSeats: number;
  durationMinutes?: number;
}

/**
 * Pricing rule for a segment.
 */
export interface SegmentPriceRule {
  fromStopOrder: number;
  toStopOrder: number;
  price?: number;
}

/**
 * Pricing type enum.
 */
export enum PricingType {
  FIXED = 'FIXED',
  SEGMENTED = 'SEGMENTED'
}

/**
 * Request to create a multi-stop ride.
 */
export interface CreateMultiStopRideRequest {
  stops: RideStop[];
  date: string; // YYYY-MM-DD format
  pricingType: PricingType;
  price?: number;
  segmentPrices?: SegmentPriceRule[];
  carModel?: string;
  totalSeats: number;
  femaleOnly?: boolean;
}

/**
 * Full ride details including stops and segments.
 */
export interface RideDetails {
  id: string; // UUID
  ownerId: string;
  ownerName: string;
  ownerAverageRating: number;
  ownerRatingsCount: number;
  date: string; // YYYY-MM-DD
  carModel?: string;
  totalSeats: number;
  availableSeats: number;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  pricingType: PricingType;
  isMultiStop: boolean;
  totalStops: number;
  femaleOnly?: boolean;
  stops: RideStop[];
  segments: RideSegment[];
  price?: number; // for FIXED pricing
  routePreview: string; // e.g., "Pondicherry → Villupuram → Salem"
  cancellationReason?: string;
  cancellationNote?: string;
  cancelledAt?: string; // ISO timestamp
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

/**
 * Ride search request parameters.
 */
export interface RideSearchRequest {
  fromLocation: string;
  toLocation: string;
  date: string; // YYYY-MM-DD format
  seats: number;
  page?: number;
  size?: number;
  sortBy?: string;
}

/**
 * Single ride search result.
 */
export interface RideSearchResult {
  rideId: string; // UUID
  driverId: string;
  driverName: string;
  driverAverageRating: number;
  driverRatingsCount: number;
  vehicleModel?: string;
  travelDate: string; // YYYY-MM-DD
  fromLocation: string;
  toLocation: string;
  departureTime: string; // HH:mm format
  arrivalTime: string; // HH:mm format
  travelDuration: string; // e.g., "2h 45m"
  price: number;
  availableSeats: number;
  totalSeats: number;
  routePreview: string;
  routeStops: RouteStopDetail[];
  femaleOnly: boolean;
  distanceKm?: number;
}

/**
 * Detail about a stop in the route preview.
 */
export interface RouteStopDetail {
  stopOrder: number;
  locationName: string;
  arrivalTime?: string; // HH:mm format
  departureTime?: string; // HH:mm format
  isFromStop: boolean;
  isToStop: boolean;
}

/**
 * Ride search response with pagination.
 */
export interface RideSearchResponse {
  items: RideSearchResult[];
  meta: {
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
  };
}

/**
 * Booking request for a ride segment.
 */
export interface BookSegmentRequest {
  rideId: string;
  passengerId: string;
  passengerMobile: string;
  fromLocation: string;
  toLocation: string;
  seats: number;
}

/**
 * Booking response.
 */
export interface BookingResponse {
  bookingId: string; // UUID
  rideId: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
  seats: number;
  price: number;
  createdAt: string; // ISO timestamp
}

/**
 * Booking details.
 */
export interface BookingDetails {
  bookingId: string;
  rideId: string;
  passengerId: string;
  fromLocation: string;
  toLocation: string;
  seats: number;
  price: number;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
  createdAt: string;
}

/**
 * Segment occupancy information.
 */
export interface SegmentOccupancy {
  segmentId: string;
  rideId: string;
  fromStop: string;
  toStop: string;
  totalSeats: number;
  occupiedSeats: number;
  availableSeats: number;
  occupancyPercentage: number;
}

/**
 * Form model for creating a multi-stop ride.
 */
export interface MultiStopRideForm {
  stops: RideStop[];
  date: string;
  pricingType: PricingType;
  segmentPrices: SegmentPriceRule[];
  carModel: string;
  totalSeats: number;
  femaleOnly: boolean;
}
