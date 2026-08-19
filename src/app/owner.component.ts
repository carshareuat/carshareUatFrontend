import { Component, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { MockDataService, Owner } from './mock-data.service';
import { AuthService } from './auth.service';
import { ToastService } from './toast.service';
import { OtpVerificationService } from './services/otp-verification.service';
import { MobileVerificationService } from './services/mobile-verification.service';

@Component({
  selector: 'app-owner',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div id="recaptcha-container-owner" style="display:none;"></div>
    
    <div class="page-header">
      <div>
        <h1 class="page-title">Become a verified car owner</h1>
        <p class="page-sub">Get a verified badge and start earning by sharing your rides.</p>
      </div>
    </div>

    <div class="subscription-banner">
      ✨ <span>Monthly subscription — includes verified badge & priority listing.</span>
    </div>

    <div class="owner-page">
      <section class="card" *ngIf="!profileExists">
        <h3>📸 Live profile photo</h3>
        <p class="muted-small">Photo must be captured live from your camera. Uploading images is not allowed.</p>
        <div class="video-wrap">
          <video #videoEl autoplay playsinline muted></video>
        </div>
        <canvas #canvasEl width="320" height="240" style="display:none"></canvas>
        <div class="row mt-2">
          <button class="btn btn-secondary" (click)="capture()">📷 Capture Photo</button>
          <span *ngIf="photoData" class="badge badge-success">✓ Photo captured</span>
        </div>
        <div *ngIf="photoData" class="text-center">
          <img [src]="photoData" class="thumb" alt="Profile" />
        </div>
      </section>

      <section class="card">
        <h3>👤 Your details</h3>
        <div class="stack">
          <div *ngIf="profileExists" class="card" style="background:#ecfdf5;border:1px solid #86efac;">
            <strong>Owner profile already created</strong>
            <p class="muted-small" style="margin:4px 0 0;">Your profile is saved. Continue with the subscription payment below.</p>
          </div>
          <div *ngIf="latestSubscription" class="card" style="background:#f8fafc;border:1px solid #cbd5e1;">
            <strong>Subscription: {{ subscriptionLabel(latestSubscription.status) }}</strong>
            <p *ngIf="latestSubscription.status === 'VERIFICATION_IN_PROGRESS'" class="muted-small" style="margin:4px 0 0;">Your payment is being reviewed and will be approved in few minutes.</p>
            <p *ngIf="latestSubscription.status === 'REJECTED'" class="muted-small" style="margin:4px 0 0;color:#b91c1c;">Admin comment: {{ latestSubscription.rejectionComment }}</p>
            <p *ngIf="latestSubscription.status === 'PAID'" class="muted-small" style="margin:4px 0 0;">Active until {{ latestSubscription.expiresAt | date:'mediumDate' }}.</p>
          </div>
          <div class="field">
            <label>Name</label>
            <input [(ngModel)]="name" placeholder="Your name" [readonly]="profileExists" />
          </div>
          <div class="field">
            <label>Mobile number</label>
            <input [(ngModel)]="mobile" placeholder="+91 98xxxxxxxx" [readonly]="mobileVerified" />
          </div>
          
          <!-- Mobile OTP Verification Section -->
          <div class="field">
            <div style="display:flex;gap:8px;align-items:flex-end;">
              <button *ngIf="!mobileVerified" type="button" class="btn btn-secondary" (click)="sendOtp()" [disabled]="otpLoading">
                {{ otpLoading ? '⏳ Sending...' : (otpSent ? 'Resend OTP' : 'Send OTP') }}
              </button>
              <span *ngIf="mobileVerified" class="badge badge-success" style="margin-bottom:2px;">✅ Verified</span>
            </div>
            <div *ngIf="otpError" class="badge badge-error" style="margin-top:6px;">{{ otpError }}</div>
          </div>

          <!-- OTP Input Field (appears after OTP sent) -->
          <div class="field" *ngIf="otpSent && !mobileVerified">
            <label>6-digit OTP</label>
            <input [(ngModel)]="otpCode" placeholder="123456" inputmode="numeric" maxlength="6" />
            <button type="button" class="btn btn-primary" (click)="verifyOtp()" [disabled]="otpLoading || otpCode.length !== 6" style="margin-top:8px;">
              {{ otpLoading ? '⏳ Verifying...' : 'Verify OTP' }}
            </button>
          </div>
          <div class="field" *ngIf="!profileExists">
            <label>Government ID (take photo)</label>
            <input type="file" accept="image/*" (change)="onGovProof($event)" />
            <div *ngIf="govProofData" class="muted-small">Gov proof captured ✓</div>
          </div>

          <div class="field" *ngIf="!profileExists">
            <label>Preferences</label>
            <p class="muted-small" style="margin:0 0 8px;">Select all that apply. Passengers will see these on your profile.</p>
            <div class="pref-grid">
              <label *ngFor="let p of preferenceOptions" class="pref-chip">
                <input type="checkbox" [checked]="selectedPreferences.includes(p)" (change)="togglePreference(p, $event)" />
                <span>{{ p }}</span>
              </label>
            </div>
          </div>

          <button *ngIf="canStartPayment" class="btn btn-primary" (click)="paySubscription()" [disabled]="!mobileVerified">
            💳 Continue to payment
          </button>

          <div *ngIf="verified" class="badge badge-success" style="padding:10px 14px;font-size:0.95rem;">
            ✓ Verified! You can now create rides.
          </div>

          <a routerLink="/owner/dashboard" class="btn btn-secondary">Go to Owner Dashboard →</a>
        </div>
      </section>
    </div>
  `
})
export class OwnerComponent {
  mobile = '';
  name = '';
  verified = false;
  profileExists = false;
  existingOwnerId = '';
  photoData: string | null = null;
  govProofData: string | null = null;
  allowPets = false;
  stopsForBreak = false;
  jovial = false;
  preferenceOptions: string[] = [
    'No smoking',
    'No pets in car',
    'Friendly / Jovial',
    'Stops for breaks',
    'Music-friendly',
    'Quiet ride',
    'AC always on',
    'Pets allowed'
  ];
  selectedPreferences: string[] = [];
  latestSubscription: any;
  
  // OTP Verification state
  mobileVerified = false;
  otpSent = false;
  otpCode = '';
  otpLoading = false;
  otpError: string | null = null;
  firebaseUid: string | null = null;

  get canStartPayment(): boolean {
    if (!this.latestSubscription) return true;
    return ['REJECTED'].includes(this.latestSubscription.status);
  }

  @ViewChild('videoEl') videoEl!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasEl') canvasEl!: ElementRef<HTMLCanvasElement>;

  private stream: MediaStream | null = null;

  constructor(
    private data: MockDataService,
    private auth: AuthService,
    private router: Router,
    private toast: ToastService,
    private otpService: OtpVerificationService,
    private mobileVerificationService: MobileVerificationService
  ) {
    this.startCamera();
    this.prefillFromExisting();
    this.data.getMySubscriptions().subscribe({ next: subscriptions => this.latestSubscription = subscriptions[0] });
    // Initialize reCAPTCHA
    setTimeout(() => {
      this.otpService.initializeRecaptcha('recaptcha-container-owner');
      // Subscribe to OTP state changes
      this.otpService.verified$.subscribe(verified => {
        this.mobileVerified = verified;
      });
      this.otpService.otpSent$.subscribe(sent => {
        this.otpSent = sent;
      });
      this.otpService.loading$.subscribe(loading => {
        this.otpLoading = loading;
      });
      this.otpService.error$.subscribe(error => {
        this.otpError = error;
      });
      this.otpService.firebaseUid$.subscribe(uid => {
        this.firebaseUid = uid;
      });
    }, 100);
  }

  subscriptionLabel(status: string): string {
    return status === 'VERIFICATION_IN_PROGRESS' ? 'Verification in progress' : status === 'REJECTED' ? 'Rejected' : status === 'PAID' ? 'Active' : status === 'INACTIVE' ? 'Inactive' : status;
  }

  private prefillFromExisting() {
    const s = this.auth.current as any;
    const id = s?.ownerId;
    this.mobile = s?.mobile || '';
    const applyOwner = (o?: Owner) => {
      if (!o) return;
      this.profileExists = true;
      this.existingOwnerId = o.id;
      this.verified = o.verified;
      this.name = o.name || this.mobile;
      this.mobile = o.mobile || this.mobile;
      this.selectedPreferences = Array.isArray(o.preferences) ? [...o.preferences] : [];
    };
    if (id) {
      this.data.getOwnerById(id).subscribe({ next: applyOwner });
      return;
    }
    if (this.mobile) {
      this.data.getOwners().subscribe((owners) => applyOwner(owners.find((owner) => owner.mobile === this.mobile)));
    }
  }

  togglePreference(opt: string, ev: Event) {
    const checked = (ev.target as HTMLInputElement).checked;
    if (checked) {
      if (!this.selectedPreferences.includes(opt)) this.selectedPreferences.push(opt);
    } else {
      this.selectedPreferences = this.selectedPreferences.filter((x) => x !== opt);
    }
  }

  async startCamera() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setTimeout(() => {
        if (this.videoEl && this.videoEl.nativeElement) {
          this.videoEl.nativeElement.srcObject = this.stream;
        }
      }, 100);
    } catch (e) {
      console.warn('Camera not available', e);
    }
  }

  capture() {
    if (!this.videoEl?.nativeElement || !this.canvasEl?.nativeElement) {
      this.toast.show('Camera is unavailable. Refresh and allow camera access to complete owner verification.', 'warning');
      return;
    }
    const video = this.videoEl.nativeElement;
    const canvas = this.canvasEl.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    this.photoData = canvas.toDataURL('image/png');
  }

  paySubscription() {
    if (!this.mobile) { this.toast.show('Enter mobile number', 'warning'); return; }
    if (!this.profileExists && !this.govProofData) { this.toast.show('Provide government proof', 'warning'); return; }
    if (!this.profileExists && !this.photoData) { this.toast.show('Capture profile photo', 'warning'); return; }

    const ok = confirm('Continue to payment to complete verification?');
    if (!ok) { this.toast.show('Subscription required to become verified', 'warning'); return; }
    const startCheckout = (owner: Owner) => {
      const session = this.auth.current;
      if (session && session.ownerId !== owner.id) this.auth.save({ ...session, ownerId: owner.id });
      this.router.navigate(['/owner/plans']);
    };

    if (this.profileExists) {
      const ownerId = this.existingOwnerId || this.auth.current?.ownerId;
      if (!ownerId) { this.toast.show('Owner profile could not be identified.', 'error'); return; }
      this.data.getOwnerById(ownerId).subscribe({ next: (owner) => owner && startCheckout(owner), error: () => this.toast.show('Unable to load owner profile.', 'error') });
      return;
    }

    const form = new FormData();
    form.append('name', this.name || this.mobile);
    form.append('mobile', this.mobile);
    form.append('preferences', JSON.stringify(this.selectedPreferences));
    form.append('profilePhoto', this.dataUrlToFile(this.photoData, 'profile-photo.png'));
    form.append('governmentIdProof', this.dataUrlToFile(this.govProofData, 'government-id.png'));
    this.data.createOwner(form).subscribe({ next: (owner) => startCheckout(owner), error: () => this.toast.show('Unable to submit owner verification.', 'error') });
  }

  private dataUrlToFile(dataUrl: string | null, name: string): File {
    const [header, encoded] = (dataUrl || '').split(',');
    const mime = header?.match(/:(.*?);/)?.[1] || 'image/png';
    const bytes = atob(encoded || '');
    const data = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) data[i] = bytes.charCodeAt(i);
    return new File([data], name, { type: mime });
  }

  onGovProof(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const f = input.files && input.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => (this.govProofData = reader.result as string);
    reader.readAsDataURL(f);
  }
  
  async sendOtp() {
    if (!this.mobile) {
      this.toast.show('Enter mobile number', 'warning');
      return;
    }
    
    // Validate phone format
    if (!this.otpService.validatePhoneNumber(this.mobile)) {
      this.toast.show('Phone number must be 10 digits, starting with 6-9', 'warning');
      return;
    }
    
    try {
      await this.otpService.sendOtp(this.mobile);
      this.toast.show('OTP sent to your mobile number', 'success');
    } catch (error: any) {
      this.toast.show('Failed to send OTP. Please try again.', 'error');
      console.error('OTP send error:', error);
    }
  }
  
  async verifyOtp() {
    if (!this.otpCode || this.otpCode.length !== 6) {
      this.toast.show('Enter 6-digit OTP', 'warning');
      return;
    }
    
    try {
      const result = await this.otpService.verifyOtp(this.otpCode);
      this.firebaseUid = result.firebaseUid;
      this.mobileVerified = true;
      this.toast.show('Mobile verified successfully', 'success');
    } catch (error: any) {
      this.toast.show('Invalid OTP. Please try again.', 'error');
      console.error('OTP verification error:', error);
    }
  }
  
  resetOtpState() {
    this.mobileVerified = false;
    this.otpSent = false;
    this.otpCode = '';
    this.otpLoading = false;
    this.otpError = null;
    this.firebaseUid = null;
    this.otpService.reset();
  }
}
