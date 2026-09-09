import { Role } from '../../core/models/user.model';

export interface NavItem {
  label: string;
  path: string;
  icon: string;
  roles: Role[];
}

/**
 * Sidebar catalogue. Phase 1 wires the dashboards + profile; later phases add
 * their entries here (cart, wishlist, product management, vendor approvals, …).
 */
export const NAV_ITEMS: NavItem[] = [
  { label: 'Shop', path: '/app/shop', icon: 'bi-shop', roles: ['Customer'] },
  { label: 'Vendor dashboard', path: '/app/vendor', icon: 'bi-speedometer2', roles: ['Vendor'] },
  { label: 'Admin console', path: '/app/admin', icon: 'bi-shield-lock', roles: ['Admin'] },
  { label: 'My profile', path: '/app/profile', icon: 'bi-person-circle', roles: ['Customer', 'Vendor', 'Admin'] },
];

export function navFor(role: Role | null): NavItem[] {
  if (!role) return [];
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}
