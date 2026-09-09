import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Cart } from '../models/commerce.model';
import { AuthService } from './auth.service';

const EMPTY: Cart = { lines: [], subtotal: 0, count: 0 };

/**
 * Server-backed cart. Held as a signal so the header badge and the cart page
 * stay in sync after every mutation.
 */
@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  private readonly _cart = signal<Cart>(EMPTY);
  readonly cart = this._cart.asReadonly();
  readonly count = computed(() => this._cart().count);

  async load(): Promise<void> {
    if (this.auth.role() !== 'Customer') {
      this._cart.set(EMPTY);
      return;
    }
    try {
      this._cart.set(await firstValueFrom(this.http.get<Cart>('/api/cart')));
    } catch {
      this._cart.set(EMPTY);
    }
  }

  async add(productId: string, quantity: number, variantId?: string | null): Promise<void> {
    this._cart.set(
      await firstValueFrom(
        this.http.post<Cart>('/api/cart/items', { productId, quantity, variantId: variantId ?? null }),
      ),
    );
  }

  async setQuantity(lineId: string, quantity: number): Promise<void> {
    this._cart.set(
      await firstValueFrom(this.http.put<Cart>(`/api/cart/items/${lineId}`, { quantity })),
    );
  }

  async remove(lineId: string): Promise<void> {
    this._cart.set(await firstValueFrom(this.http.delete<Cart>(`/api/cart/items/${lineId}`)));
  }

  async clear(): Promise<void> {
    this._cart.set(await firstValueFrom(this.http.delete<Cart>('/api/cart')));
  }

  reset(): void {
    this._cart.set(EMPTY);
  }
}
