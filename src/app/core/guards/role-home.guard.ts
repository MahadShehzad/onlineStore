import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { homeRouteFor } from '../models/user.model';

/** Sends /app to the right landing page for the signed-in user's role. */
export const roleHomeGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const user = auth.user();
  return router.createUrlTree([user ? homeRouteFor(user) : '/login']);
};
