import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';

/**
 * Mobile Verification Service
 * 
 * Handles HTTP calls to backend for mobile verification status
 * Used primarily by profile pages to display verification status
 * 
 * This is separate from OtpVerificationService which handles Firebase auth
 * This service handles backend API calls only
 */
@Injectable({
  providedIn: 'root'
})
export class MobileVerificationService {
  private apiUrl = `${environment.apiBaseUrl}/mobile`;

  constructor(private http: HttpClient) {}

  /**
   * Get verification status for a user
   * @param userId - User ID to check status for
   * @returns Observable of verification response
   */
  getVerificationStatus(userId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/status/${userId}`);
  }

  /**
   * Quick check if user is verified
   * @param userId - User ID to check
   * @returns Observable of boolean
   */
  isVerified(userId: string): Observable<boolean> {
    return this.http.get<boolean>(`${this.apiUrl}/is-verified/${userId}`);
  }

  verifyMobileOnBackend(userId: string, firebaseUid: string, phoneNumber: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/verify`, {
      userId,
      firebaseUid,
      mobileNumber: phoneNumber.replace(/\D/g, '')
    });
  }

  /**
   * Get current verification status synchronously (cached)
   * @param userId - User ID to check
   * @param callback - Callback function with status
   */
  checkVerificationStatus(userId: string): Promise<any> {
    return this.http.get<any>(`${this.apiUrl}/status/${userId}`).toPromise() as Promise<any>;
  }
}
