import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { roleHomeGuard } from './core/guards/role-home.guard';

const customer = { canActivate: [roleGuard], data: { allowedRoles: ['Customer'] } };
const vendor = { canActivate: [roleGuard], data: { allowedRoles: ['Vendor'] } };
const admin = { canActivate: [roleGuard], data: { allowedRoles: ['Admin'] } };

export const routes: Routes = [
  // ---- public storefront ----
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
    path: 'product/:slug',
    title: 'Product · onlineStore',
    loadComponent: () =>
      import('./features/customer/product-detail/product-detail').then((m) => m.ProductDetailComponent),
  },

  // ---- signed-in app ----
  {
    path: 'app',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/shell/shell').then((m) => m.ShellComponent),
    children: [
      { path: '', pathMatch: 'full', canActivate: [roleHomeGuard], children: [] },

      // customer
      {
        path: 'shop',
        title: 'Shop · onlineStore',
        ...customer,
        loadComponent: () =>
          import('./features/customer/shop/shop').then((m) => m.ShopComponent),
      },
      {
        path: 'products',
        title: 'Products · onlineStore',
        ...customer,
        loadComponent: () =>
          import('./features/customer/product-list/product-list').then((m) => m.ProductListComponent),
      },
      {
        path: 'cart',
        title: 'My cart · onlineStore',
        ...customer,
        loadComponent: () => import('./features/customer/cart/cart').then((m) => m.CartComponent),
      },
      {
        path: 'checkout',
        title: 'Checkout · onlineStore',
        ...customer,
        loadComponent: () =>
          import('./features/customer/checkout/checkout').then((m) => m.CheckoutComponent),
      },
      {
        path: 'wishlist',
        title: 'Wishlist · onlineStore',
        ...customer,
        loadComponent: () =>
          import('./features/customer/wishlist/wishlist').then((m) => m.WishlistComponent),
      },
      {
        path: 'orders',
        title: 'My orders · onlineStore',
        ...customer,
        loadComponent: () =>
          import('./features/customer/order-history/order-history').then((m) => m.OrderHistoryComponent),
      },
      {
        path: 'orders/:id',
        title: 'Order · onlineStore',
        ...customer,
        loadComponent: () =>
          import('./features/customer/order-detail/order-detail').then((m) => m.OrderDetailComponent),
      },
      {
        path: 'addresses',
        title: 'Addresses · onlineStore',
        ...customer,
        loadComponent: () =>
          import('./features/customer/addresses/addresses').then((m) => m.AddressesComponent),
      },
      {
        path: 'disputes',
        title: 'Complaints · onlineStore',
        ...customer,
        loadComponent: () =>
          import('./features/customer/disputes/disputes').then((m) => m.DisputesComponent),
      },

      // vendor
      {
        path: 'vendor',
        title: 'Vendor dashboard · onlineStore',
        ...vendor,
        loadComponent: () =>
          import('./features/vendor/vendor-dashboard/vendor-dashboard').then((m) => m.VendorDashboardComponent),
      },
      {
        path: 'vendor/products',
        title: 'My products · onlineStore',
        ...vendor,
        loadComponent: () =>
          import('./features/vendor/product-management/product-management').then((m) => m.ProductManagementComponent),
      },
      {
        path: 'vendor/orders',
        title: 'Store orders · onlineStore',
        ...vendor,
        loadComponent: () =>
          import('./features/vendor/order-management/order-management').then((m) => m.OrderManagementComponent),
      },
      {
        path: 'vendor/analytics',
        title: 'Sales analytics · onlineStore',
        ...vendor,
        loadComponent: () =>
          import('./features/vendor/vendor-analytics/vendor-analytics').then((m) => m.VendorAnalyticsComponent),
      },
      {
        path: 'vendor/settings',
        title: 'Store settings · onlineStore',
        ...vendor,
        loadComponent: () =>
          import('./features/vendor/store-settings/store-settings').then((m) => m.StoreSettingsComponent),
      },

      // admin
      {
        path: 'admin',
        title: 'Admin overview · onlineStore',
        ...admin,
        loadComponent: () =>
          import('./features/admin/admin-dashboard/admin-dashboard').then((m) => m.AdminDashboardComponent),
      },
      {
        path: 'admin/vendors',
        title: 'Vendor approvals · onlineStore',
        ...admin,
        loadComponent: () =>
          import('./features/admin/vendor-approval/vendor-approval').then((m) => m.VendorApprovalComponent),
      },
      {
        path: 'admin/categories',
        title: 'Categories · onlineStore',
        ...admin,
        loadComponent: () =>
          import('./features/admin/category-management/category-management').then((m) => m.CategoryManagementComponent),
      },
      {
        path: 'admin/users',
        title: 'Users · onlineStore',
        ...admin,
        loadComponent: () =>
          import('./features/admin/user-management/user-management').then((m) => m.UserManagementComponent),
      },
      {
        path: 'admin/orders',
        title: 'All orders · onlineStore',
        ...admin,
        loadComponent: () =>
          import('./features/admin/order-oversight/order-oversight').then((m) => m.OrderOversightComponent),
      },
      {
        path: 'admin/commission',
        title: 'Commission & fees · onlineStore',
        ...admin,
        loadComponent: () =>
          import('./features/admin/commission-settings/commission-settings').then((m) => m.CommissionSettingsComponent),
      },
      {
        path: 'admin/disputes',
        title: 'Disputes · onlineStore',
        ...admin,
        loadComponent: () =>
          import('./features/admin/dispute-management/dispute-management').then((m) => m.DisputeManagementComponent),
      },
      {
        path: 'admin/analytics',
        title: 'Platform analytics · onlineStore',
        ...admin,
        loadComponent: () =>
          import('./features/admin/admin-analytics/admin-analytics').then((m) => m.AdminAnalyticsComponent),
      },

      // shared
      {
        path: 'profile',
        title: 'My profile · onlineStore',
        loadComponent: () => import('./features/account/profile/profile').then((m) => m.ProfileComponent),
      },
      {
        path: 'forbidden',
        title: 'Not allowed · onlineStore',
        loadComponent: () => import('./features/forbidden/forbidden').then((m) => m.ForbiddenComponent),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
