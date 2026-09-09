import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Role } from '../models/user.model';

export interface RoleRouteData {
  /** Roles permitted to open this route. */
  allowedRoles: Role[];
}

/**
 * Restricts a route to the roles listed in `data.allowedRoles`. Assumes
 * `authGuard` runs first, so an unauthenticated hit still lands on /login.
 */
export const roleGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }

  const { allowedRoles = [] } = (route.data ?? {}) as Partial<RoleRouteData>;
  return auth.hasAnyRole(allowedRoles) ? true : router.createUrlTree(['/app/forbidden']);
};
