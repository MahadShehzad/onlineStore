import { Injectable } from '@angular/core';
import { User } from '../models/user.model';

const ACCESS_KEY = 'onlinestore:access';
const REFRESH_KEY = 'onlinestore:refresh';
const USER_KEY = 'onlinestore:user';

/**
 * Thin wrapper over localStorage for the JWT pair + cached user. Every access is
 * guarded so SSR / private-mode / disabled-storage never throws.
 */
@Injectable({ providedIn: 'root' })
export class TokenService {
  get accessToken(): string | null {
    return this.read(ACCESS_KEY);
  }

  get refreshToken(): string | null {
    return this.read(REFRESH_KEY);
  }

  get user(): User | null {
    const raw = this.read(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as User;
    } catch {
      return null;
    }
  }

  setSession(accessToken: string, refreshToken: string, user: User): void {
    this.write(ACCESS_KEY, accessToken);
    this.write(REFRESH_KEY, refreshToken);
    this.write(USER_KEY, JSON.stringify(user));
  }

  setUser(user: User): void {
    this.write(USER_KEY, JSON.stringify(user));
  }

  setAccessToken(accessToken: string): void {
    this.write(ACCESS_KEY, accessToken);
  }

  clear(): void {
    this.remove(ACCESS_KEY);
    this.remove(REFRESH_KEY);
    this.remove(USER_KEY);
  }

  private read(key: string): string | null {
    try {
      return globalThis.localStorage?.getItem(key) ?? null;
    } catch {
      return null;
    }
  }

  private write(key: string, value: string): void {
    try {
      globalThis.localStorage?.setItem(key, value);
    } catch {
      /* storage unavailable */
    }
  }

  private remove(key: string): void {
    try {
      globalThis.localStorage?.removeItem(key);
    } catch {
      /* storage unavailable */
    }
  }
}
