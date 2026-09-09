export type Role = 'Customer' | 'Vendor' | 'Admin';

export const ROLES: readonly Role[] = ['Customer', 'Vendor', 'Admin'];

export type VendorStatus = 'Pending' | 'Approved' | 'Rejected';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  isBlocked: boolean;
  /** Present only for vendor accounts. */
  vendorId: string | null;
  vendorStatus: VendorStatus | null;
}

/** Landing route for a signed-in user, by role. */
export function homeRouteFor(user: User): string {
  switch (user.role) {
    case 'Admin':
      return '/app/admin';
    case 'Vendor':
      return '/app/vendor';
    default:
      return '/app/shop';
  }
}
