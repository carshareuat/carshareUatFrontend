import { Routes } from '@angular/router';
import { AuthComponent } from './auth.component';
export const routes: Routes = [
	{ path: '', component: AuthComponent, pathMatch: 'full' },
	{ path: 'Kumaresh', loadComponent: () => import('./admin-login.component').then(m => m.AdminLoginComponent) },
	{ path: 'Kumaresh/dashboard', loadComponent: () => import('./admin-dashboard.component').then(m => m.AdminDashboardComponent) },
	{ path: 'home', loadComponent: () => import('./components/multi-stop-ride-search.component').then(m => m.MultiStopRideSearchComponent) },
	{ path: 'support', loadComponent: () => import('./support.component').then(m => m.SupportComponent) },
	{ path: 'debug/push', loadComponent: () => import('./debug-push.component').then(m => m.DebugPushComponent) },
	{ path: 'owner/register', loadComponent: () => import('./owner.component').then(m => m.OwnerComponent) },
    { path: 'owner/plans', loadComponent: () => import('./subscription-plans.component').then(m => m.SubscriptionPlansComponent) },
	{ path: 'owner/payment', loadComponent: () => import('./owner-payment.component').then(m => m.OwnerPaymentComponent) },
	{ path: 'owner/dashboard', loadComponent: () => import('./owner-dashboard.component').then(m => m.OwnerDashboardComponent) },
	{ path: 'owner/my-rides', loadComponent: () => import('./owner-rides.component').then(m => m.OwnerRidesComponent) },
	{ path: 'owner/create-ride', loadComponent: () => import('./components/multi-stop-ride-create.component').then(m => m.MultiStopRideCreateComponent) },
	{ path: 'owner/requests', loadComponent: () => import('./owner-requests.component').then(m => m.OwnerRequestsComponent) },
	{ path: 'rides/create/multi-stop', redirectTo: 'owner/create-ride', pathMatch: 'full' },
	{ path: 'rides/search/multi-stop', redirectTo: 'home', pathMatch: 'full' },
	{ path: 'rides/book/multi-stop', loadComponent: () => import('./components/multi-stop-booking.component').then(m => m.MultiStopBookingComponent) },
	{ path: 'bookings', loadComponent: () => import('./bookings.component').then(m => m.BookingsComponent) },
	{ path: 'ride/:id', loadComponent: () => import('./ride-detail.component').then(m => m.RideDetailComponent) },
    { path: 'profile', loadComponent: () => import('./passenger-profile.component').then(m => m.PassengerProfileComponent) },
	{ path: 'owner/profile', loadComponent: () => import('./owner-profile.component').then(m => m.OwnerProfileComponent) },
	{ path: 'owner/:id', loadComponent: () => import('./profile.component').then(m => m.ProfileComponent) },
	{ path: '**', redirectTo: '' }
];
