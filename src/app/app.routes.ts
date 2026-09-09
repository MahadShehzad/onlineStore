import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { roleHomeGuard } from './core/guards/role-home.guard';

export const routes: Routes = [
  {
    path: '',
    title: 'onlineStore — shop every store in one place',
    loadComponent: () => import('./features/home/home').then((m) => m.HomeComponent),
  },
  {
    path: 'login',
    title: 'Sign in · onlineStore',
    loadComponent: () => import('./features/auth/login/login').then((m) => m.LoginComponent),
  },
  {
    path: 'signup',
    title: 'Create account · onlineStore',
    loadComponent: () => import('./features/auth/signup/signup').then((m) => m.SignupComponent),
  },
  {
    path: 'app',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/shell/shell').then((m) => m.ShellComponent),
    children: [
      {
        path: 'shop',
        title: 'Shop · onlineStore',
        canActivate: [roleGuard],
        data: { allowedRoles: ['Customer'] },
        loadComponent: () =>
          import('./features/customer/customer-dashboard/customer-dashboard').then(
            (m) => m.CustomerDashboardComponent,
          ),
      },
      {
        path: 'vendor',
        title: 'Vendor dashboard · onlineStore',
        canActivate: [roleGuard],
        data: { allowedRoles: ['Vendor'] },
        loadComponent: () =>
          import('./features/vendor/vendor-dashboard/vendor-dashboard').then(
            (m) => m.VendorDashboardComponent,
          ),
      },
      {
        path: 'admin',
        title: 'Admin console · onlineStore',
        canActivate: [roleGuard],
        data: { allowedRoles: ['Admin'] },
        loadComponent: () =>
          import('./features/admin/admin-dashboard/admin-dashboard').then(
            (m) => m.AdminDashboardComponent,
          ),
      },
      {
        path: 'profile',
        title: 'My profile · onlineStore',
        loadComponent: () =>
          import('./features/account/profile/profile').then((m) => m.ProfileComponent),
      },
      {
        path: 'forbidden',
        title: 'Not allowed · onlineStore',
        loadComponent: () =>
          import('./features/forbidden/forbidden').then((m) => m.ForbiddenComponent),
      },
      { path: '', pathMatch: 'full', canActivate: [roleHomeGuard], children: [] },
    ],
  },
  { path: '**', redirectTo: '' },
];
