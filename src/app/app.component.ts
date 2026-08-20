import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { ToastComponent } from './toast.component';
import { LogoComponent } from './logo.component';
import { AuthService } from './auth.service';
import { MessageService } from './message.service';
import { MockDataService } from './mock-data.service';
import { LoadingService } from './loading.service';
import { filter } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, ToastComponent, LogoComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'carShare';
  showLaunchScreen = true;
  menuOpen = false;
  private ownerSubscriptionLoaded = false;
  private ownerSubscriptionActive = false;
  private ownerSubscriptionInReview = false;
  constructor(private auth: AuthService, private router: Router, private data: MockDataService, private messageService: MessageService, public loading: LoadingService) {
    setTimeout(() => this.showLaunchScreen = false, 2200);
    window.addEventListener('carshare-auth-changed', () => {
      if (this.auth.current) {
        this.initializePushNotifications();
      }
    });

    this.router.events.pipe(filter(event => event instanceof NavigationEnd)).subscribe(() => {
      this.refreshOwnerSubscription();
      if (this.auth.current) {
        this.initializePushNotifications();
      }
    });
    this.refreshOwnerSubscription();
    if (this.auth.current) {
      this.initializePushNotifications();
    }
    this.loadNotifications();
    // poll for new notifications every 15 seconds for near-real-time updates
    try { setInterval(() => { if (this.auth.current) this.loadNotifications(); }, 15000); } catch (e) { /* ignore */ }
  }

  notifications: any[] = [];
  unreadCount = 0;
  showNotifications = false;
  private seenNotificationIds = new Set<string>();

  private initializePushNotifications() {
    this.messageService.initializePushNotifications().then(result => {
      if (!result.ok) {
        console.warn('Push notifications are not ready:', result.message);
      }
    });
  }

  loadNotifications() {
    if (!this.auth.current) return;
    this.data.getNotifications().subscribe({
      next: rows => {
        const list = rows || [];
        const currentIds = new Set<string>();

        list.forEach((n: any) => {
          if (n?.id) {
            currentIds.add(String(n.id));
          }
        });

        const isFirstLoad = this.seenNotificationIds.size === 0;
        const newUnreadNotifications = isFirstLoad
          ? []
          : list.filter((n: any) => {
              const id = n?.id ? String(n.id) : null;
              return !!id && !this.seenNotificationIds.has(id) && !n.read;
            });

        if (!isFirstLoad && newUnreadNotifications.length > 0) {
          newUnreadNotifications.slice(0, 3).forEach((notification: any) => {
            const title = notification?.title || 'New notification';
            const message = notification?.message || notification?.body || 'You have a new notification';
            const route = notification?.route || notification?.url || '/';
            this.messageService.showNotification({
              title,
              body: message,
              route,
              icon: notification?.icon || '/assets/carShare-logo.png',
              tag: `carshare-notification-${notification?.id || Date.now()}`
            });
          });
        }

        this.notifications = list;
        this.unreadCount = this.notifications.filter((n: any) => !n.read).length;
        this.seenNotificationIds = currentIds;
      },
      error: (err) => { console.error('Failed to load notifications', err); }
    });
  }

  toggleNotifications() {
    this.showNotifications = !this.showNotifications;
    if (this.showNotifications) this.loadNotifications();
  }

  markRead(n: any) {
    if (!n || !n.id) return;
    this.data.markNotificationRead(n.id).subscribe({
      next: () => {
        n.read = true;
        this.seenNotificationIds.add(String(n.id));
        this.unreadCount = Math.max(0, this.unreadCount - 1);
      },
      error: () => {}
    });
  }

  markAllRead() {
    this.data.markAllNotificationsRead().subscribe({
      next: () => {
        this.notifications.forEach(n => {
          n.read = true;
          if (n?.id) this.seenNotificationIds.add(String(n.id));
        });
        this.unreadCount = 0;
      },
      error: () => {}
    });
  }

  onNotificationClick(n: any) {
    if (!n) return;
    // mark as read then navigate if url present
    if (!n.read) this.markRead(n);
    if (n.url) {
      try { this.router.navigateByUrl(n.url); } catch (e) { /* ignore */ }
    }
  }

  private refreshOwnerSubscription() {
    const session = this.auth.current;
    if (!session || session.role !== 'owner') return;
    this.data.getMySubscriptions().subscribe({
      next: subscriptions => {
        this.ownerSubscriptionLoaded = true;
        const status = subscriptions[0]?.status;
        this.ownerSubscriptionActive = status === 'PAID';
        this.ownerSubscriptionInReview = status === 'VERIFICATION_IN_PROGRESS';
      },
      error: () => { this.ownerSubscriptionLoaded = true; }
    });
  }

  get ownerId(): string {
    const s = this.auth.current as any;
    return (s && s.ownerId) || '';
  }

  get isOwnerUnverified(): boolean {
    const s = this.auth.current as any;
    if (!s || s.role !== 'owner') return false;
    if (!s.ownerId) return true;
    if (!this.ownerSubscriptionLoaded) return false;
    return !this.ownerSubscriptionActive;
  }

  get isOwnerPaymentInReview(): boolean {
    return this.auth.current?.role === 'owner' && this.ownerSubscriptionLoaded && this.ownerSubscriptionInReview;
  }

  payNow() {
    this.router.navigateByUrl('/owner/register');
  }

  get current() {
    return this.auth.current;
  }

  get isAdmin(): boolean {
    return this.auth.current?.role === 'admin';
  }

  logout() {
    this.auth.logout();
    this.menuOpen = false;
    this.router.navigateByUrl('/');
  }

  navigate(path: string) {
    this.menuOpen = false;
    this.router.navigateByUrl(path);
  }

  get bookingsCount(): number {
    const s = this.auth.current;
    if (!s || s.role !== 'passenger' || !s.mobile) return 0;
    const raw = localStorage.getItem('demo_bookings');
    const arr = raw ? JSON.parse(raw) : [];
    return arr.filter((b: any) => b.userMobile === s.mobile).length;
  }
}
