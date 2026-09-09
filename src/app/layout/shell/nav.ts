import { Role } from '../../core/models/user.model';

export interface NavItem {
  label: string;
  path: string;
  icon: string;
  roles: Role[];
}

export interface NavSection {
  heading: string;
  items: NavItem[];
}

const ALL: NavSection[] = [
  {
    heading: 'Shop',
    items: [
      { label: 'Browse', path: '/app/shop', icon: 'bi-shop', roles: ['Customer'] },
      { label: 'My cart', path: '/app/cart', icon: 'bi-cart3', roles: ['Customer'] },
      { label: 'Wishlist', path: '/app/wishlist', icon: 'bi-heart', roles: ['Customer'] },
      { label: 'My orders', path: '/app/orders', icon: 'bi-box-seam', roles: ['Customer'] },
      { label: 'Addresses', path: '/app/addresses', icon: 'bi-geo-alt', roles: ['Customer'] },
      { label: 'Complaints', path: '/app/disputes', icon: 'bi-chat-left-dots', roles: ['Customer'] },
    ],
  },
  {
    heading: 'My store',
    items: [
      { label: 'Dashboard', path: '/app/vendor', icon: 'bi-speedometer2', roles: ['Vendor'] },
      { label: 'Products', path: '/app/vendor/products', icon: 'bi-box', roles: ['Vendor'] },
      { label: 'Orders', path: '/app/vendor/orders', icon: 'bi-receipt', roles: ['Vendor'] },
      { label: 'Sales analytics', path: '/app/vendor/analytics', icon: 'bi-graph-up', roles: ['Vendor'] },
      { label: 'Store settings', path: '/app/vendor/settings', icon: 'bi-gear', roles: ['Vendor'] },
    ],
  },
  {
    heading: 'Administration',
    items: [
      { label: 'Overview', path: '/app/admin', icon: 'bi-speedometer2', roles: ['Admin'] },
      { label: 'Vendor approvals', path: '/app/admin/vendors', icon: 'bi-patch-check', roles: ['Admin'] },
      { label: 'Categories', path: '/app/admin/categories', icon: 'bi-tags', roles: ['Admin'] },
      { label: 'Users', path: '/app/admin/users', icon: 'bi-people', roles: ['Admin'] },
      { label: 'Orders', path: '/app/admin/orders', icon: 'bi-receipt-cutoff', roles: ['Admin'] },
      { label: 'Commission & fees', path: '/app/admin/commission', icon: 'bi-percent', roles: ['Admin'] },
      { label: 'Disputes', path: '/app/admin/disputes', icon: 'bi-chat-square-dots', roles: ['Admin'] },
      { label: 'Analytics', path: '/app/admin/analytics', icon: 'bi-bar-chart', roles: ['Admin'] },
    ],
  },
  {
    heading: 'Account',
    items: [
      { label: 'My profile', path: '/app/profile', icon: 'bi-person-circle', roles: ['Customer', 'Vendor', 'Admin'] },
    ],
  },
];

export function navFor(role: Role | null): NavSection[] {
  if (!role) return [];
  return ALL
    .map((section) => ({
      heading: section.heading,
      items: section.items.filter((item) => item.roles.includes(role)),
    }))
    .filter((section) => section.items.length > 0);
}
