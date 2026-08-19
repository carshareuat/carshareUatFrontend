import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { firebaseAuth } from '../firebase.config';
import {
  Auth,
  RecaptchaVerifier,
  ConfirmationResult,
  signInWithPhoneNumber
} from 'firebase/auth';

/**
 * OTP Verification Service
 * Handles Firebase Phone Authentication OTP verification flow
 * 
 * Responsibilities:
 * 1. Initialize Firebase Phone Authentication
 * 2. Generate and send OTP via Firebase
 * 3. Verify OTP with Firebase
 * 4. Manage verification state
 * 5. Expose observables for UI updates
 * 6. Handle errors gracefully
 */
@Injectable({
  providedIn: 'root'
})
export class OtpVerificationService {
  private firebaseAuth: Auth = firebaseAuth;
  private recaptchaVerifier: RecaptchaVerifier | null = null;
  private confirmationResult: ConfirmationResult | null = null;

  // State Management - BehaviorSubjects for reactive updates
  private otpSentSubject = new BehaviorSubject<boolean>(false);
  private verifiedSubject = new BehaviorSubject<boolean>(false);
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private errorSubject = new BehaviorSubject<string | null>(null);
  private currentPhoneSubject = new BehaviorSubject<string>('');
  private firebaseUidSubject = new BehaviorSubject<string | null>(null);

  // Public Observables
  otpSent$: Observable<boolean> = this.otpSentSubject.asObservable();
  verified$: Observable<boolean> = this.verifiedSubject.asObservable();
  loading$: Observable<boolean> = this.loadingSubject.asObservable();
  error$: Observable<string | null> = this.errorSubject.asObservable();
  currentPhone$: Observable<string> = this.currentPhoneSubject.asObservable();
  firebaseUid$: Observable<string | null> = this.firebaseUidSubject.asObservable();

  private apiUrl = `${environment.apiBaseUrl}/mobile`;

  constructor(private http: HttpClient) {
    // Firebase is already initialized in firebase.config.ts
    // No need to reinitialize here
  }

  /**
   * Initialize reCAPTCHA Verifier
   * Must be called before sending OTP
   * 
   * @param containerId - HTML element ID for reCAPTCHA
   * @throws Error if container not found or reCAPTCHA initialization fails
   */
  initializeRecaptcha(containerId: string = 'recaptcha-container'): void {
    try {
      // Clear existing verifier if any
      if (this.recaptchaVerifier) {
        (this.recaptchaVerifier as any).clear?.();
      }

      // Create new RecaptchaVerifier
      this.recaptchaVerifier = new RecaptchaVerifier(
        this.firebaseAuth,
        containerId,
        {
          size: 'invisible',
          callback: (response: any) => {
            console.log('reCAPTCHA verified:', response);
          },
          'expired-callback': () => {
            this.setError('reCAPTCHA expired. Please try again.');
          },
          'error-callback': () => {
            this.setError('reCAPTCHA error. Please try again.');
          }
        }
      );

      this.clearError();
    } catch (error) {
      console.error('Failed to initialize reCAPTCHA:', error);
      this.setError('Failed to initialize security. Please refresh and try again.');
    }
  }

  /**
   * Validate phone number format
   * 
   * @param phoneNumber - Phone number to validate (10 digits)
   * @returns True if valid, false otherwise
   */
  validatePhoneNumber(phoneNumber: string): boolean {
    // Remove all non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // Check if it's exactly 10 digits
    if (cleaned.length !== 10) {
      this.setError('Phone number must be 10 digits');
      return false;
    }

    // Check if it starts with valid Indian mobile number (7-9)
    if (!/^[6-9]/.test(cleaned)) {
      this.setError('Phone number must start with 6-9');
      return false;
    }

    this.clearError();
    return true;
  }

  /**
   * Send OTP to the phone number
   * 
   * @param phoneNumber - 10-digit phone number
   * @returns Promise that resolves when OTP is sent
   */
  async sendOtp(phoneNumber: string): Promise<void> {
    try {
      this.setLoading(true);
      this.clearError();

      // Validate phone number
      if (!this.validatePhoneNumber(phoneNumber)) {
        this.setLoading(false);
        throw new Error('Invalid phone number format');
      }

      // Ensure reCAPTCHA is initialized
      if (!this.recaptchaVerifier) {
        this.initializeRecaptcha();
      }

      if (!this.recaptchaVerifier) {
        throw new Error('reCAPTCHA failed to initialize');
      }

      // Format phone number with country code
      const formattedPhone = this.formatPhoneNumber(phoneNumber);
      
      // Store current phone number
      this.currentPhoneSubject.next(phoneNumber);

      // Send OTP via Firebase
      this.confirmationResult = await signInWithPhoneNumber(
        this.firebaseAuth,
        formattedPhone,
        this.recaptchaVerifier
      );

      // Mark OTP as sent
      this.otpSentSubject.next(true);
      this.setLoading(false);

      console.log('OTP sent successfully to:', formattedPhone);
    } catch (error: any) {
      this.setLoading(false);
      this.handleFirebaseError(error);
      throw error;
    }
  }

  /**
   * Verify OTP code entered by user
   * 
   * @param otpCode - 6-digit OTP code
   * @returns Promise that resolves with user credential containing Firebase UID
   */
  async verifyOtp(otpCode: string): Promise<{ firebaseUid: string; phoneNumber: string }> {
    try {
      this.setLoading(true);
      this.clearError();

      if (!this.confirmationResult) {
        throw new Error('OTP was not sent. Please request OTP first.');
      }

      if (!otpCode || otpCode.length !== 6 || !/^\d{6}$/.test(otpCode)) {
        throw new Error('OTP must be 6 digits');
      }

      // Verify OTP with Firebase
      const result = await this.confirmationResult.confirm(otpCode);

      // Extract Firebase UID
      const firebaseUid = result.user.uid;
      const currentPhone = this.currentPhoneSubject.getValue();

      // Store Firebase UID
      this.firebaseUidSubject.next(firebaseUid);
      this.verifiedSubject.next(true);

      this.setLoading(false);

      console.log('OTP verified successfully. Firebase UID:', firebaseUid);

      return {
        firebaseUid,
        phoneNumber: currentPhone
      };
    } catch (error: any) {
      this.setLoading(false);
      this.handleFirebaseError(error);
      throw error;
    }
  }

  /**
   * Verify mobile on backend
   * Optional: Backend verification of Firebase UID and mobile number
   * 
   * @param userId - User ID
   * @param firebaseUid - Firebase UID from verification
   * @param phoneNumber - Phone number that was verified
   * @returns Observable with backend verification response
   */
  verifyMobileOnBackend(userId: string, firebaseUid: string, phoneNumber: string): Observable<any> {
    const request = {
      firebaseUid,
      mobileNumber: phoneNumber.replace(/\D/g, '')
    };

    return this.http.post<any>(`${this.apiUrl}/verify`, request);
  }

  /**
   * Get mobile verification status
   * 
   * @param userId - User ID
   * @returns Observable with verification status
   */
  getVerificationStatus(userId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/status/${userId}`);
  }

  /**
   * Reset OTP verification state
   * Call this when user navigates away or completes registration
   */
  reset(): void {
    this.otpSentSubject.next(false);
    this.verifiedSubject.next(false);
    this.loadingSubject.next(false);
    this.errorSubject.next(null);
    this.currentPhoneSubject.next('');
    this.firebaseUidSubject.next(null);
    this.confirmationResult = null;
    
    if (this.recaptchaVerifier) {
      (this.recaptchaVerifier as any).clear?.();
      this.recaptchaVerifier = null;
    }
  }

  /**
   * Get current verification state
   */
  getCurrentState(): {
    otpSent: boolean;
    verified: boolean;
    loading: boolean;
    error: string | null;
    phoneNumber: string;
    firebaseUid: string | null;
  } {
    return {
      otpSent: this.otpSentSubject.getValue(),
      verified: this.verifiedSubject.getValue(),
      loading: this.loadingSubject.getValue(),
      error: this.errorSubject.getValue(),
      phoneNumber: this.currentPhoneSubject.getValue(),
      firebaseUid: this.firebaseUidSubject.getValue()
    };
  }

  // ============= PRIVATE HELPER METHODS =============

  /**
   * Format phone number with country code
   */
  private formatPhoneNumber(phoneNumber: string): string {
    const cleaned = phoneNumber.replace(/\D/g, '');
    return '+91' + cleaned; // Assuming India country code
  }

  /**
   * Handle Firebase Auth Errors
   */
  private handleFirebaseError(error: any): void {
    const code = error?.code || 'unknown-error';
    const message = error?.message || 'An unknown error occurred';

    console.error('Firebase Error:', code, message);

    let userMessage = 'An error occurred. Please try again.';

    switch (code) {
      case 'auth/invalid-phone-number':
        userMessage = 'Invalid phone number format. Please check and try again.';
        break;
      case 'auth/missing-phone-number':
        userMessage = 'Phone number is required.';
        break;
      case 'auth/too-many-requests':
        userMessage = 'Too many attempts. Please try again later.';
        break;
      case 'auth/invalid-verification-code':
        userMessage = 'Invalid OTP. Please check and try again.';
        break;
      case 'auth/code-expired':
        userMessage = 'OTP has expired. Please request a new one.';
        break;
      case 'auth/network-request-failed':
        userMessage = 'Network error. Please check your connection and try again.';
        break;
      case 'auth/user-cancelled':
        userMessage = 'Verification cancelled. Please try again.';
        break;
      case 'auth/operation-not-allowed':
        userMessage = 'Phone authentication is not enabled. Please contact support.';
        break;
      case 'auth/session-expired':
        userMessage = 'Session expired. Please request OTP again.';
        break;
      default:
        userMessage = message || userMessage;
    }

    this.setError(userMessage);
  }

  /**
   * Update loading state
   */
  private setLoading(loading: boolean): void {
    this.loadingSubject.next(loading);
  }

  /**
   * Set error message
   */
  private setError(error: string): void {
    this.errorSubject.next(error);
  }

  /**
   * Clear error message
   */
  private clearError(): void {
    this.errorSubject.next(null);
  }
}
