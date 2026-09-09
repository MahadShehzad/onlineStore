import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { WishlistService } from '../../../core/services/wishlist.service';
import { ProductSummary } from '../../../core/models/catalog.model';
import { ProductCardComponent } from '../../../shared/ui/product-card';
import { SpinnerComponent } from '../../../shared/ui/spinner';
import { EmptyStateComponent } from '../../../shared/ui/empty-state';

@Component({
  selector: 'app-wishlist',
  imports: [RouterLink, ProductCardComponent, SpinnerComponent, EmptyStateComponent],
  template: `
    <h1 class="h4 fw-bold mb-3">Wishlist</h1>
    @if (loading()) {
      <app-spinner />
    } @else if (items().length === 0) {
      <app-empty-state icon="bi-heart" title="No saved items yet" hint="Tap the heart on any product to save it here.">
        <a routerLink="/app/shop" class="btn btn-primary mt-3">Browse products</a>
      </app-empty-state>
    } @else {
      <div class="row row-cols-2 row-cols-md-3 row-cols-xl-4 g-3">
        @for (p of items(); track p.id) {
          <div class="col"><app-product-card [product]="p" (wishlistChanged)="refresh()" /></div>
        }
      </div>
    }
  `,
})
export class WishlistComponent {
  private readonly wishlist = inject(WishlistService);
  protected readonly items = signal<ProductSummary[]>([]);
  protected readonly loading = signal(true);

  constructor() {
    this.refresh();
  }

  protected refresh(): void {
    this.wishlist.list().then((items) => {
      this.items.set(items);
      this.loading.set(false);
    });
  }
}
