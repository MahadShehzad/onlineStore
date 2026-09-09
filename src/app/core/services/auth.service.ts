import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, firstValueFrom, tap } from 'rxjs';
import { Role, User } from '../models/user.model';
import {
  AuthResponse,
  AuthResult,
  LoginPayload,
  RegisterPayload,
} from '../models/auth.model';
import { TokenService } from './token.service';

/**
 * JWT auth against the .NET API. Access token (short-lived) rides on every
 * request via the interceptor; the refresh token (persisted) silently mints a
 * new pair when the access token expires. The current user is a signal so
 * guards, the shell and feature pages all react to sign-in / sign-out.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly tokens = inject(TokenService);

  private readonly _user = signal<User | null>(this.tokens.user);

  readonly user = this._user.asReadonly();
  readonly isAuthenticated = computed(() => this._user() !== null);
  readonly role = computed<Role | null>(() => this._user()?.role ?? null);

  async register(payload: RegisterPayload): Promise<AuthResult> {
    return this.exchange(this.http.post<AuthResponse>('/api/auth/register', payload));
  }

  async login(payload: LoginPayload): Promise<AuthResult> {
    return this.exchange(this.http.post<AuthResponse>('/api/auth/login', payload));
  }

  /** Used by the interceptor on a 401 — returns the fresh access token or throws. */
  refresh(): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>('/api/auth/refresh', {
        refreshToken: this.tokens.refreshToken ?? '',
      })
      .pipe(
        tap((res) => {
          this.tokens.setSession(res.accessToken, res.refreshToken, res.user);
          this._user.set(res.user);
        }),
      );
  }

  /** Re-validate the cached session against the API on app start. */
  async restore(): Promise<void> {
    if (!this.tokens.refreshToken) return;
    try {
      const me = await firstValueFrom(this.http.get<User>('/api/auth/me'));
      this.tokens.setUser(me);
      this._user.set(me);
    } catch {
      // interceptor already tried a refresh; if we're here the session is dead.
      this.clearSession();
    }
  }

  async logout(): Promise<void> {
    const refreshToken = this.tokens.refreshToken;
    if (refreshToken) {
      try {
        await firstValueFrom(this.http.post('/api/auth/logout', { refreshToken }));
      } catch {
        /* best effort */
      }
    }
    this.clearSession();
  }

  clearSession(): void {
    this.tokens.clear();
    this._user.set(null);
  }

  /** Push a fresh user snapshot (e.g. after editing the profile). */
  applyUser(user: User): void {
    this.tokens.setUser(user);
    this._user.set(user);
  }

  hasAnyRole(allowed: readonly Role[]): boolean {
    const current = this.role();
    return current !== null && allowed.includes(current);
  }

  private async exchange(request: Observable<AuthResponse>): Promise<AuthResult> {
    try {
      const res = await firstValueFrom(request);
      this.tokens.setSession(res.accessToken, res.refreshToken, res.user);
      this._user.set(res.user);
      return { ok: true, user: res.user };
    } catch (err: unknown) {
      const error =
        (err as { error?: { error?: string } })?.error?.error ??
        'Something went wrong. Is the API running?';
      return { ok: false, error };
    }
  }
}
