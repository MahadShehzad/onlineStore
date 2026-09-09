import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { NotificationService } from '../services/notification.service';

/**
 * Surfaces transport / server failures as a toast so no request fails silently.
 * 401s are left alone — the auth interceptor owns the refresh flow, and a
 * genuine "not signed in" is handled by the guards.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const notify = inject(NotificationService);

  return next(req).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse && err.status !== 401) {
        notify.error(messageFor(err));
      }
      return throwError(() => err);
    }),
  );
};

function messageFor(err: HttpErrorResponse): string {
  if (err.status === 0) return 'Cannot reach the server. Check your connection.';
  if (err.status === 403) return 'You do not have permission to do that.';
  if (err.status >= 500) return 'The server ran into a problem. Please try again.';
  return err.error?.error ?? err.message ?? 'Request failed.';
}
