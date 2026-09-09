import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CartLine } from '../../../core/models/commerce.model';
import { CartService } from '../../../core/services/cart.service';
import { MetaService } from '../../../core/services/meta.service';
import { ConfirmService } from '../../../shared/ui/confirm.service';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { FallbackImgDirective } from '../../../shared/directives/fallback-img.directive';
import { EmptyStateComponent } from '../../../shared/ui/empty-state';

@Component({
  selector: 'app-cart',
  imports: [RouterLink, MoneyPipe, FallbackImgDirective, EmptyStateComponent],
  templateUrl: './cart.html',
})
export class CartComponent {
  protected readonly cartService = inject(CartService);
  private readonly meta = inject(MetaService);
  private readonly confirm = inject(ConfirmService);

  protected readonly cart = this.cartService.cart;
  protected readonly busyLine = signal<string | null>(null);

  protected readonly groups = computed<{ storeName: string; lines: CartLine[] }[]>(() => {
    const map = new Map<string, { storeName: string; lines: CartLine[] }>();
    for (const line of this.cart().lines) {
      const g = map.get(line.vendorId) ?? { storeName: line.storeName, lines: [] };
      g.lines.push(line);
      map.set(line.vendorId, g);
    }
    return [...map.values()];
  });

  protected readonly shipping = computed(() =>
    this.groups().length * this.meta.settings().shippingFlatFee,
  );
  protected readonly total = computed(() => this.cart().subtotal + this.shipping());

  protected async setQty(lineId: string, qty: number): Promise<void> {
    if (qty < 1) return;
    this.busyLine.set(lineId);
    try {
      await this.cartService.setQuantity(lineId, qty);
    } finally {
      this.busyLine.set(null);
    }
  }

  protected async remove(lineId: string): Promise<void> {
    await this.cartService.remove(lineId);
  }

  protected async clear(): Promise<void> {
    if (await this.confirm.ask('Remove everything from your cart?', { confirmText: 'Clear cart', danger: true })) {
      await this.cartService.clear();
    }
  }
}
