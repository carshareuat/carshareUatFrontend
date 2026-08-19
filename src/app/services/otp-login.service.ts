import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface OtpCheckResponse {
  exists: boolean;
  message?: string;
}

export interface OtpVerifyResponse {
  success: boolean;
  token: string;
  refreshToken: string;
  userId: string;
  role: 'passenger' | 'owner' | 'admin';
  mobile: string;
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class OtpLoginService {
  private readonly apiUrl = `${environment.apiBaseUrl}/auth`;

  constructor(private http: HttpClient) {}

  checkMobile(mobileNumber: string): Observable<{ data: OtpCheckResponse }> {
    return this.http.post<{ data: OtpCheckResponse }>(`${this.apiUrl}/check-mobile`, { mobileNumber });
  }

  sendLoginOtp(mobileNumber: string): Observable<{ data: any }> {
    return this.http.post<{ data: any }>(`${this.apiUrl}/send-login-otp`, { mobileNumber });
  }

  verifyLoginOtp(mobileNumber: string, otp: string): Observable<{ data: OtpVerifyResponse }> {
    return this.http.post<{ data: OtpVerifyResponse }>(`${this.apiUrl}/verify-login-otp`, { mobileNumber, otp });
  }
}
