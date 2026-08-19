import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { ToastService } from './toast.service';
import { LogoComponent } from './logo.component';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [CommonModule, FormsModule, LogoComponent],
  template: `
    <main class="admin-login">
      <section class="admin-login-art"><app-logo [size]="76" class="admin-brand-logo"></app-logo><span class="eyebrow">CARSHARE CONTROL ROOM</span><h1>Trust, reviewed<br><em>with care.</em></h1><p>Manage owner verification, payment records, and the health of the shared-ride network.</p></section>
      <section class="admin-login-card"><div class="admin-icon">✦</div><p class="eyebrow">ADMIN ACCESS</p><h2>Welcome back</h2><p class="muted-small">Sign in to review subscription payments.</p><div class="field"><label>Admin mobile</label><input [(ngModel)]="mobile" autocomplete="username" placeholder="Mobile number" /></div><div class="field"><label>Password</label><input type="password" [(ngModel)]="password" autocomplete="current-password" placeholder="Password" (keyup.enter)="login()" /></div><button class="btn btn-primary btn-lg" (click)="login()">Enter dashboard</button><a class="back" href="/">Back to carShare</a></section>
    </main>
  `,
  styles: [`
    :host{display:block}.admin-login{min-height:calc(100vh - 56px);display:grid;grid-template-columns:1.1fr .9fr;background:#081b2b;color:#fff}.admin-login-art{padding:clamp(32px,8vw,110px);background:linear-gradient(145deg,#0f766e,#164e63 60%,#082f49);position:relative;overflow:hidden}.admin-login-art:after{content:'';position:absolute;width:420px;height:420px;border:1px solid rgba(255,255,255,.25);border-radius:50%;right:-160px;bottom:-180px}.admin-brand-logo{width:76px;height:76px;object-fit:contain}.mark{display:inline-flex;width:48px;height:48px;border-radius:14px;align-items:center;justify-content:center;background:rgba(255,255,255,.15);font-weight:900}.eyebrow{font-size:.72rem;letter-spacing:.16em;font-weight:800;color:#99f6e4;margin:28px 0 14px}.admin-login-art h1{font-size:clamp(2.8rem,6vw,5.8rem);line-height:.95;margin:0;letter-spacing:-.04em}.admin-login-art em{color:#fde68a;font-style:normal}.admin-login-art p{max-width:38ch;color:#ccfbf1;line-height:1.6;font-size:1.05rem;margin-top:24px}.admin-login-card{align-self:center;justify-self:center;width:min(100% - 48px,420px);padding:38px;background:#fff;color:#0f172a;border-radius:18px;box-shadow:0 24px 70px rgba(0,0,0,.25)}.admin-login-card h2{font-size:2rem;margin:0 0 6px}.admin-icon{width:42px;height:42px;border-radius:12px;display:grid;place-items:center;background:#ccfbf1;color:#0f766e;font-size:1.3rem}.admin-login-card .btn{width:100%;margin-top:8px}.back{display:block;text-align:center;color:#0f766e;margin-top:18px;text-decoration:none;font-size:.9rem}@media(max-width:760px){.admin-login{grid-template-columns:1fr}.admin-login-art{padding:32px 24px}.admin-login-art h1{font-size:3.2rem}.admin-login-art p{display:none}.admin-login-card{margin:24px auto}}
  `]
})
export class AdminLoginComponent {
  mobile = '';
  password = '';
  constructor(private auth: AuthService, private router: Router, private toast: ToastService) {}
  login() {
    if (!this.mobile || !this.password) { this.toast.show('Enter admin mobile and password', 'warning'); return; }
    this.auth.authenticate('login', 'admin', this.mobile, this.password).subscribe({ next: () => this.router.navigateByUrl('/Kumaresh/dashboard'), error: () => this.toast.show('Invalid admin credentials', 'error') });
  }
}
