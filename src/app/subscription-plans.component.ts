import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MockDataService } from './mock-data.service';
import { ToastService } from './toast.service';

@Component({
  selector: 'app-subscription-plans',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="plans-page">
        <div class="page-header">
        <div>
          <h1 class="page-title">Choose a subscription plan</h1>
          <p class="page-sub">Select a plan that suits you. Plans are configurable from the admin panel.</p>
        </div>
      </div>

      <div *ngIf="loading" class="muted-small">Loading plans…</div>
      <div *ngIf="!loading && !plans.length" class="empty">No subscription plans available. Contact support.</div>

      <div class="plans-grid">
        <div *ngFor="let p of plans" class="plan-card" [class.recommended]="isRecommended(p)">
          <div class="ribbon" *ngIf="isRecommended(p)">Recommended</div>
          <div class="card-hero">
            <div class="avatar">🚗</div>
            <div class="hero-text">
              <div class="eyebrow muted-small">Welcome</div>
              <div class="hero-title">Start with {{ p.name }}</div>
            </div>
          </div>
          <div class="plan-header">
            <div>
              <h3>{{ p.name }}</h3>
              <div class="muted-small">{{ p.code }}</div>
            </div>
            <div class="plan-price">
              <div class="price-main">₹{{ (p.amountPaise/100) | number:'1.0-2' }}</div>
              <div class="price-sub">{{ p.currency }}</div>
            </div>
          </div>

          <div class="plan-duration">Validity: <strong>{{ p.durationMonths }}</strong> months</div>

          <p class="plan-desc">{{ p.description || 'No details provided.' }}</p>

          <ul class="plan-features">
            <li *ngFor="let f of featureList(p)">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 6L9 17l-5-5" stroke="#10B981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
              <span>{{ f }}</span>
            </li>
          </ul>

          <div class="plan-actions">
            <button class="btn btn-ghost" (click)="viewDetails(p)">Details</button>
            <button class="btn btn-primary" (click)="select(p)">Choose</button>
          </div>
          
        </div>
      </div>
    </div>
  `,
  styles: [
    `
    :host { display:block }
    .plans-page { padding:28px }
    .page-title { color:#4c1d95; font-size:2rem; margin:0 0 6px }
    .page-sub { color:#6b7280; margin:0 0 6px }
    .page-header { display:flex; justify-content:space-between; align-items:center }
    .controls .toggle { display:flex; align-items:center; gap:8px }
    .plans-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(300px,1fr)); gap:20px; margin-top:18px }
    .plan-card { background:linear-gradient(180deg,#ffffff,#fbfdff); border:1px solid #e6eef6; border-radius:12px; padding:18px; box-shadow:0 10px 30px rgba(2,6,23,0.06); display:flex; flex-direction:column; gap:12px; position:relative; transition:transform .18s ease, box-shadow .18s ease }
    .plan-card:hover { transform:translateY(-6px); box-shadow:0 22px 48px rgba(2,6,23,0.12) }
    .plan-card.recommended { border-color:#7c3aed }
    .ribbon { position:absolute; right:-12px; top:12px; transform:rotate(18deg); background:#7c3aed; color:#fff; padding:6px 28px; font-weight:700; font-size:.85rem; box-shadow:0 6px 18px rgba(124,58,237,0.18); z-index:1 }
    .card-hero { display:flex; align-items:center; gap:12px }
    .avatar { width:48px; height:48px; border-radius:50%; display:flex; align-items:center; justify-content:center; background:linear-gradient(90deg,#fff,#f7eefc); box-shadow:0 6px 14px rgba(15,23,42,0.06); font-size:20px }
    .hero-text .hero-title { font-weight:700; color:#111827 }
    .hero-text .eyebrow { font-size:.8rem; color:#6b7280 }
    .plan-price { text-align:right; position:relative; z-index:5 }
    .price-main { color:#0f766e; font-weight:800; font-size:1.1rem; background:rgba(255,255,255,0.9); display:inline-block; padding:2px 6px; border-radius:6px }
    .plan-header { display:flex; justify-content:space-between; align-items:flex-start }
    .plan-header h3 { margin:0; color:#0f172a; font-size:1.1rem }
    .muted-small { color:#475569; font-size:.85rem }
    .plan-price { text-align:right }
    .price-main { color:#0f766e; font-weight:800; font-size:1.1rem }
    .price-sub { color:#64748b; font-size:.8rem }
    .plan-duration { color:#475569; font-size:.9rem }
    .plan-desc { color:#334155; margin:6px 0; min-height:38px }
    .plan-features { list-style:none; margin:0; padding-left:0; display:flex; flex-direction:column; gap:6px }
    .plan-features li { display:flex; gap:8px; align-items:center; color:#334155 }
    .plan-actions { margin-top:auto; display:flex; gap:10px; justify-content:flex-end }
    .btn-ghost { background:transparent; border:1px solid #e2e8f0; color:#0f172a; padding:8px 12px; border-radius:8px }
    .btn-primary { background:linear-gradient(90deg,#6d28d9,#8b5cf6); color:white; border:0; padding:10px 14px; border-radius:10px }
    .monthly-note { margin-top:8px; color:#0f766e; font-weight:700 }
    .empty { color:#64748b; padding:18px }

    /* Mobile adjustments */
    @media (max-width: 719px) {
      .plan-actions { flex-direction: column; gap: 10px; }
      .plan-actions .btn { width: 100%; }
      .ribbon { right: -18px; padding:6px 36px }
    }
    `
  ]
})
export class SubscriptionPlansComponent {
  plans: any[] = [];
  loading = false;
  

  constructor(private data: MockDataService, private router: Router, private toast: ToastService) {
    this.loadPlans();
  }

  loadPlans() {
    this.loading = true;
    this.data.getSubscriptionPlans().subscribe({ next: (rows) => { this.plans = rows || []; this.loading = false; }, error: () => { this.toast.show('Unable to load plans', 'error'); this.loading = false; } });
  }

  select(plan: any) {
    if (!plan || !plan.id) { this.toast.show('Invalid plan selected', 'error'); return; }
    this.data.createCheckoutForPlan(plan.id).subscribe({ next: (checkout) => {
      if (checkout && checkout.checkoutUrl) {
        window.location.href = checkout.checkoutUrl;
        return;
      }
      this.router.navigate(['/owner/payment'], { queryParams: { subscriptionId: checkout.subscriptionId, amount: checkout.amount, currency: checkout.currency } });
    }, error: () => this.toast.show('Unable to create checkout', 'error') });
  }

  featureList(p: any): string[] {
    if (!p) return [];
    const d = p.description || '';
    return d.split(/;|\n|,/).map((s: string) => s.trim()).filter((s: string) => s.length > 0);
  }

  isRecommended(p: any): boolean {
    if (!p) return false;
    if ((p.code || '').toUpperCase().includes('PRO')) return true;
    const max = Math.max(...(this.plans || []).map(x => x.amountPaise || 0));
    return p.amountPaise === max;
  }

  viewDetails(p: any) {
    this.toast.show(p.name + ': ' + (p.description || 'No details available'), 'info');
  }

  monthlyPrice(p: any) {
    if (!p || !p.durationMonths || p.durationMonths <= 0) return (p.amountPaise/100);
    return (p.amountPaise/100) / p.durationMonths;
  }
}
