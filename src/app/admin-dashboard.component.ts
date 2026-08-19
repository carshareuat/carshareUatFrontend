import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MockDataService, Owner, Ride } from './mock-data.service';
import { AuthService } from './auth.service';
import { ToastService } from './toast.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
      <main class="admin-page">
        <header class="admin-head">
          <div>
            <p class="eyebrow">CARPOOL / CONTROL ROOM</p>
            <h1>Admin Dashboard</h1>
            <p class="muted-small">Manage users, rides and subscriptions.</p>
          </div>
          <div class="head-actions">
            <button class="btn btn-secondary" (click)="download()">↓ Download audit CSV</button>
            <button class="btn btn-ghost" (click)="logout()">Sign out</button>
          </div>
        </header>

        <section class="stat-grid">
          <div class="stat"><span>Owners</span><strong>{{ owners.length }}</strong><small>Total owners</small></div>
          <div class="stat"><span>Rides</span><strong>{{ rides.length }}</strong><small>Total rides</small></div>
          <div class="stat"><span>Awaiting review</span><strong>{{ pendingCount }}</strong><small>UTR submissions</small></div>
        </section>

        <!-- Ticket dialog (in-page) -->
        <div *ngIf="selectedTicket" class="modal-backdrop" style="position:fixed;left:0;right:0;top:0;bottom:0;display:flex;align-items:center;justify-content:center;z-index:60;background:rgba(0,0,0,0.45)">
          <div class="card modal-card" style="width:520px;max-width:96%;background:#fff;color:#0f172a;padding:18px">
            <h3 style="margin-top:0">Ticket #{{selectedTicket.id}} <small class="muted-small">{{selectedTicket.status}}</small></h3>
            <p><strong>From:</strong> {{selectedTicket.userName || selectedTicket.userMobile}}</p>
            <p style="white-space:pre-wrap">{{selectedTicket.description}}</p>
            <div style="margin-top:12px">
              <label class="muted-small">Resolution</label>
              <textarea [(ngModel)]="resolutionText" rows="4" style="width:100%;padding:12px;border-radius:8px;border:1px solid #e5e7eb"></textarea>
            </div>
            <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px">
              <button class="btn btn-ghost" (click)="selectedTicket=undefined">Cancel</button>
              <button class="btn btn-primary" (click)="resolveTicketFromDialog()">Resolve</button>
            </div>
          </div>
        </div>

        <div style="margin-bottom:12px">
          <button class="btn" [class.active]="tab==='subscriptions'" (click)="tab='subscriptions'">Subscriptions</button>
          <button class="btn" [class.active]="tab==='users'" (click)="tab='users'">Users</button>
          <button class="btn" [class.active]="tab==='rides'" (click)="tab='rides'">Rides</button>
          <button class="btn" [class.active]="tab==='tickets'" (click)="tab='tickets'; loadTickets()">Tickets</button>
        </div>

        <!-- Subscriptions -->
        <section *ngIf="tab==='subscriptions'" class="review-panel">
          <div class="toolbar">
            <div><h2>Payment ledger</h2><span class="muted-small">{{ filtered.length }} records</span></div>
            <select [(ngModel)]="filter" (change)="load()"><option value="">All statuses</option><option value="VERIFICATION_IN_PROGRESS">Awaiting review</option><option value="PAID">Approved</option><option value="REJECTED">Rejected</option><option value="INACTIVE">Inactive</option></select>
          </div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Owner</th><th>Payment</th><th>Plan</th><th>Subscription period</th><th>UTR</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>
                <tr *ngFor="let s of filtered">
                  <td><strong>{{ s.ownerName }}</strong><small>{{ s.ownerMobile }} · {{ s.ownerDateOfBirth }}<span *ngIf="s.ownerAge"> · {{ s.ownerAge }} yrs</span></small></td>
                  <td><strong>₹{{ s.amount / 100 }}</strong><small>{{ s.paymentDate ? (s.paymentDate | date:'medium') : 'Not submitted' }}</small></td>
                  <td><small>{{ s.planName || '—' }}</small></td>
                  <td><small>{{ s.startsAt ? (s.startsAt | date:'mediumDate') : 'Pending' }} → {{ s.expiresAt ? (s.expiresAt | date:'mediumDate') : 'Pending' }}</small></td>
                  <td><code>{{ s.utrNumber || '—' }}</code></td>
                  <td><span class="status" [class.pending]="s.status==='VERIFICATION_IN_PROGRESS'" [class.approved]="s.status==='PAID'" [class.rejected]="s.status==='REJECTED'">{{ label(s.status) }}</span></td>
                  <td class="actions"><button class="btn" *ngIf="s.status==='VERIFICATION_IN_PROGRESS'" (click)="approve(s.id)">Approve</button><button class="btn btn-danger" *ngIf="s.status==='VERIFICATION_IN_PROGRESS'" (click)="reject(s.id)">Reject</button></td>
                </tr>
                <tr *ngIf="!filtered.length"><td colspan="6" class="empty">No subscriptions</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- Users -->
        <section *ngIf="tab==='users'" class="review-panel">
          <div class="toolbar">
            <div><h2>Users</h2><span class="muted-small">{{ filteredOwners.length }} records</span></div>
            <div>
              <select [(ngModel)]="userFilter" (change)="filterOwners()">
                <option value="">All users</option>
                <option value="owner">Owners</option>
                <option value="passenger">Passengers</option>
              </select>
            </div>
          </div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Name</th><th>Mobile</th><th>Verified</th><th>Rating</th><th>Preferences</th><th>Action</th></tr></thead>
              <tbody>
                <tr *ngFor="let o of filteredOwners">
                  <td><strong>{{ o.name }}</strong><small>{{ o.dateOfBirth || '' }}</small></td>
                  <td><small>{{ o.mobile }}</small></td>
                  <td><small>{{ o.verified ? 'Yes' : 'No'}}</small></td>
                  <td><small>{{ o.rating }} ({{ o.ratingsCount }})</small></td>
                  <td><small>{{ o.preferences?.join(', ') }}</small></td>
                  <td class="actions"><button class="btn btn-ghost" (click)="viewOwner(o.id)">View</button></td>
                </tr>
                <tr *ngIf="!filteredOwners.length"><td colspan="6" class="empty">No users</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- Rides -->
        <section *ngIf="tab==='rides'" class="review-panel">
          <div class="toolbar">
            <div><h2>Rides</h2><span class="muted-small">{{ filteredRides.length }} records</span></div>
            <div>
              <select [(ngModel)]="rideStatusFilter" (change)="loadRides()">
                <option value="">All statuses</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Owner</th><th>Route</th><th>Date</th><th>Seats</th><th>Female Only</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>
                <tr *ngFor="let r of filteredRides">
                  <td><strong>{{ r.ownerId }}</strong></td>
                  <td><strong>{{ r.from }} → {{ r.to }}</strong><small>{{ r.carModel }}</small></td>
                  <td><small>{{ r.date }} {{ r.startTime }} → {{ r.endTime }}</small></td>
                  <td><small>{{ r.seatsAvailable }}</small></td>
                  <td><small>{{ r.femaleOnly ? 'Yes' : 'No' }}</small></td>
                  <td><span class="status" [class.approved]="r.status==='active'" [class.rejected]="r.status==='cancelled'">{{ r.status }}</span></td>
                  <td class="actions"><button class="btn btn-ghost" (click)="viewOwner(r.ownerId)">Owner</button></td>
                </tr>
                <tr *ngIf="!filteredRides.length"><td colspan="7" class="empty">No rides</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- Tickets -->
        <section *ngIf="tab==='tickets'" class="review-panel">
          <div class="toolbar">
            <div><h2>Support tickets</h2><span class="muted-small">{{ tickets.length }} records</span></div>
            <div>
              <select [(ngModel)]="ticketFilter" (change)="loadTickets()"><option value="">All statuses</option><option value="PENDING">Pending</option><option value="RESOLVED">Resolved</option></select>
            </div>
          </div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Ticket</th><th>User</th><th>Category</th><th>Raised</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>
                <tr *ngFor="let t of tickets">
                  <td><strong>#{{t.id}}</strong><small>{{t.title || (t.description | slice:0:40)}}</small></td>
                  <td><small>{{t.userName || t.userMobile}}</small></td>
                  <td><small>{{t.categoryLabel || t.category}}</small></td>
                  <td><small>{{t.createdAt | date:'short'}}</small></td>
                  <td><span class="status" [class.pending]="t.status==='PENDING'" [class.approved]="t.status==='RESOLVED'">{{t.status}}</span></td>
                  <td class="actions"><button class="btn" (click)="viewTicket(t.id)">Open</button></td>
                </tr>
                <tr *ngIf="!tickets.length"><td colspan="6" class="empty">No tickets</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- Owner detail panel -->
        <section *ngIf="selectedOwner" class="card" style="position:fixed;right:20px;top:80px;width:320px;z-index:30;padding:16px">
          <h3>{{ selectedOwner.name }}</h3>
          <img *ngIf="selectedOwner.profilePhoto" [src]="selectedOwner.profilePhoto" style="width:64px;height:64px;border-radius:50%" />
          <p><strong>Mobile:</strong> {{ selectedOwner.mobile }}</p>
          <p><strong>Rating:</strong> {{ selectedOwner.rating }} ({{ selectedOwner.ratingsCount }})</p>
          <p><strong>Preferences:</strong> {{ selectedOwner.preferences?.join(', ') }}</p>
          <p><strong>Gender:</strong> {{ selectedOwner.gender }}</p>
          <div style="text-align:right"><button class="btn btn-ghost" (click)="selectedOwner=undefined">Close</button></div>
        </section>

      </main>
    `,
  styles: [`
    :host{display:block}.admin-page{min-height:calc(100vh - 56px);background:#f1f5f9;padding:34px clamp(16px,4vw,58px);color:#0f172a}.admin-head{display:flex;justify-content:space-between;gap:20px;align-items:end;margin-bottom:28px}.admin-head h1{font-size:clamp(2rem,4vw,3.8rem);letter-spacing:-.04em;margin:0}.eyebrow{color:#0f766e;font-size:.7rem;letter-spacing:.16em;font-weight:900;margin:0 0 10px}.head-actions{display:flex;gap:10px;flex-wrap:wrap}.stat-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:22px}.stat{background:#fff;border:1px solid #dbe4ea;border-radius:14px;padding:20px}.stat span,.stat small{display:block;color:#64748b}.stat strong{display:block;font-size:2rem;margin:8px 0;color:#0f766e}.review-panel{background:#fff;border:1px solid #dbe4ea;border-radius:14px;overflow:hidden}.toolbar{display:flex;justify-content:space-between;align-items:center;padding:20px;border-bottom:1px solid #e2e8f0}.toolbar h2{margin:0 0 4px}.toolbar select{padding:10px;border:1px solid #cbd5e1;border-radius:8px}.table-wrap{overflow:auto}table{width:100%;border-collapse:collapse;min-width:980px}th,td{text-align:left;padding:15px 18px;border-bottom:1px solid #e2e8f0;vertical-align:top}th{font-size:.72rem;text-transform:uppercase;letter-spacing:.08em;color:#64748b;background:#f8fafc}td strong,td small{display:block}td small{color:#64748b;margin-top:5px}.status{display:inline-block;padding:6px 9px;border-radius:999px;background:#e2e8f0;font-size:.76rem;font-weight:800}.status.pending{background:#fef3c7;color:#92400e}.status.approved{background:#dcfce7;color:#166534}.status.rejected{background:#fee2e2;color:#991b1b}.reject-note{max-width:170px;color:#991b1b!important}.actions{display:flex;gap:6px}.btn-danger{background:#b91c1c;color:#fff;border:0}.empty{text-align:center;padding:42px;color:#64748b}@media(max-width:700px){.admin-head{align-items:start;flex-direction:column}.stat-grid{grid-template-columns:1fr}.toolbar{align-items:start;gap:12px;flex-direction:column}}
  `]
})
export class AdminDashboardComponent {
  subscriptions: any[] = [];
  allSubscriptions: any[] = [];
  filter = 'VERIFICATION_IN_PROGRESS';

  owners: Owner[] = [];
  filteredOwners: Owner[] = [];

  rides: Ride[] = [];
  filteredRides: Ride[] = [];

  tab: 'subscriptions' | 'users' | 'rides' | 'tickets' = 'subscriptions';
  userFilter = '';
  rideStatusFilter = '';
  selectedOwner?: Owner;

  constructor(private data: MockDataService, private auth: AuthService, private toast: ToastService, private router: Router) {
    if (this.auth.current?.role !== 'admin') { this.router.navigateByUrl('/Kumaresh'); return; }
    this.load();
    this.loadOwners();
    this.loadRides();
  }
  get filtered() { return this.subscriptions; }
  get pendingCount() { return this.allSubscriptions.filter(s => s.status === 'VERIFICATION_IN_PROGRESS').length; }
  get approvedCount() { return this.allSubscriptions.filter(s => s.status === 'PAID').length; }
  get totalAmount() { return this.allSubscriptions.reduce((sum, s) => sum + Number(s.amount || 0) / 100, 0); }
  load() {
    this.data.getAdminSubscriptions('').subscribe({
      next: rows => {
        this.allSubscriptions = rows;
        this.subscriptions = this.filter ? rows.filter(row => row.status === this.filter) : rows;
      },
      error: () => this.toast.show('Unable to load subscriptions', 'error')
    });
  }

  loadOwners() {
    this.data.getOwners().subscribe({ next: rows => { this.owners = rows || []; this.filterOwners(); }, error: () => this.toast.show('Unable to load owners', 'error') });
  }

  filterOwners() {
    if (!this.userFilter) { this.filteredOwners = this.owners.slice(); return; }
    // currently only owners available from API; passengers would come from bookings/users endpoint
    if (this.userFilter === 'owner') { this.filteredOwners = this.owners.slice(); return; }
    this.filteredOwners = []; // passenger list not available in mock API
  }

  loadRides() {
    const opts: any = { status: this.rideStatusFilter };
    this.data.getRides(opts).subscribe({ next: rows => { this.rides = rows || []; this.filteredRides = this.rideStatusFilter ? this.rides.filter(r => r.status === this.rideStatusFilter) : this.rides.slice(); }, error: () => this.toast.show('Unable to load rides', 'error') });
  }

  // Tickets
  tickets: any[] = [];
  ticketFilter = '';
  selectedTicket?: any;
  resolutionText = '';

  loadTickets() {
    this.data.getAdminTickets(this.ticketFilter).subscribe({ next: rows => { this.tickets = rows || []; }, error: () => this.toast.show('Unable to load tickets', 'error') });
  }

  viewTicket(id: string) {
    this.data.getTicketById(id).subscribe({ next: t => { this.selectedTicket = t; this.resolutionText = ''; }, error: () => this.toast.show('Unable to load ticket', 'error') });
  }

  resolveTicket(id: string) {
    const resolution = prompt('Enter resolution details');
    if (!resolution?.trim()) return;
    this.data.resolveTicket(id, resolution).subscribe({ next: () => { this.toast.show('Ticket resolved', 'success'); this.loadTickets(); }, error: () => this.toast.show('Unable to resolve ticket', 'error') });
  }

  resolveTicketFromDialog() {
    if (!this.selectedTicket) return;
    const id = this.selectedTicket.id;
    const resolution = (this.resolutionText || '').trim();
    if (!resolution) { this.toast.show('Please enter resolution details', 'error'); return; }
    this.data.resolveTicket(id, resolution).subscribe({ next: () => { this.toast.show('Ticket resolved', 'success'); this.selectedTicket = undefined; this.resolutionText = ''; this.loadTickets(); }, error: () => this.toast.show('Unable to resolve ticket', 'error') });
  }

  viewOwner(id: string) {
    this.data.getOwnerById(id).subscribe({ next: o => { this.selectedOwner = o; }, error: () => this.toast.show('Unable to load owner', 'error') });
  }
  label(status: string) { return status === 'VERIFICATION_IN_PROGRESS' ? 'Awaiting review' : status === 'PAID' ? 'Approved' : status === 'INACTIVE' ? 'Inactive' : status === 'REJECTED' ? 'Rejected' : status; }
  approve(id: string) { this.data.approveSubscription(id).subscribe({ next: () => { this.toast.show('Subscription approved', 'success'); this.load(); }, error: () => this.toast.show('Approval failed', 'error') }); }
  reject(id: string) { const comment = prompt('Enter rejection comments'); if (!comment?.trim()) return; this.data.rejectSubscription(id, comment).subscribe({ next: () => { this.toast.show('Subscription rejected', 'success'); this.load(); }, error: () => this.toast.show('Rejection failed', 'error') }); }
  download() { this.data.exportSubscriptions().subscribe(blob => { const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'subscription-audit.csv'; a.click(); URL.revokeObjectURL(url); }); }
  logout() { this.auth.logout(); }
}
