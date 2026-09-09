import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import {
  Observable,
  catchError,
  finalize,
  map,
  shareReplay,
  switchMap,
  throwError,
} from 'rxjs';
import { AuthService } from '../services/auth.service';
import { TokenService } from '../services/token.service';

/** Endpoints that must never trigger a refresh-retry loop. */
const AUTH_PATHS = ['/api/auth/login', '/api/auth/register', '/api/auth/refresh'];

/** Shared in-flight refresh so a burst of 401s triggers a single refresh call. */
let refreshInFlight: Observable<string> | null = null;

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const tokens = inject(TokenService);
  const auth = inject(AuthService);

  const withAuth = (token: string | null) =>
    token && !req.headers.has('Authorization')
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

  const isAuthCall = AUTH_PATHS.some((p) => req.url.includes(p));

  return next(withAuth(tokens.accessToken)).pipe(
    catchError((err: unknown) => {
      const is401 = err instanceof HttpErrorResponse && err.status === 401;
      if (!is401 || isAuthCall || !tokens.refreshToken) {
        return throwError(() => err);
      }

      refreshInFlight ??= auth.refresh().pipe(
        map((res) => res.accessToken),
        catchError((refreshErr) => {
          auth.clearSession();
          return throwError(() => refreshErr);
        }),
        finalize(() => {
          refreshInFlight = null;
        }),
        shareReplay(1),
      );

      return refreshInFlight.pipe(
        switchMap((freshToken) =>
          next(req.clone({ setHeaders: { Authorization: `Bearer ${freshToken}` } })),
        ),
      );
    }),
  );
};
