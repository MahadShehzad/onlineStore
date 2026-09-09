import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ProductSummary } from '../models/catalog.model';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class WishlistService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  private readonly _ids = signal<Set<string>>(new Set());
  readonly ids = this._ids.asReadonly();
  readonly count = computed(() => this._ids().size);

  has(productId: string): boolean {
    return this._ids().has(productId);
  }

  async load(): Promise<void> {
    if (this.auth.role() !== 'Customer') {
      this._ids.set(new Set());
      return;
    }
    try {
      const ids = await firstValueFrom(this.http.get<string[]>('/api/wishlist/ids'));
      this._ids.set(new Set(ids));
    } catch {
      this._ids.set(new Set());
    }
  }

  list(): Promise<ProductSummary[]> {
    return firstValueFrom(this.http.get<ProductSummary[]>('/api/wishlist'));
  }

  async toggle(productId: string): Promise<boolean> {
    const res = await firstValueFrom(
      this.http.post<{ wishlisted: boolean }>('/api/wishlist/toggle', { productId }),
    );
    this._ids.update((set) => {
      const next = new Set(set);
      if (res.wishlisted) next.add(productId);
      else next.delete(productId);
      return next;
    });
    return res.wishlisted;
  }

  reset(): void {
    this._ids.set(new Set());
  }
}
