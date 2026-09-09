import { Component, inject, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProductSummary } from '../../core/models/catalog.model';
import { AuthService } from '../../core/services/auth.service';
import { CartService } from '../../core/services/cart.service';
import { WishlistService } from '../../core/services/wishlist.service';
import { NotificationService } from '../../core/services/notification.service';
import { MoneyPipe } from '../pipes/money.pipe';
import { FallbackImgDirective } from '../directives/fallback-img.directive';
import { StarRatingComponent } from './star-rating';

@Component({
  selector: 'app-product-card',
  imports: [RouterLink, MoneyPipe, FallbackImgDirective, StarRatingComponent],
  template: `
    <div class="card h-100 position-relative product-card">
      @if (canShop()) {
        <button
          type="button"
          class="btn btn-sm btn-light rounded-circle position-absolute top-0 end-0 m-2 shadow-sm"
          [attr.aria-label]="wishlisted() ? 'Remove from wishlist' : 'Add to wishlist'"
          (click)="toggleWishlist()"
        >
          <i class="bi" [class.bi-heart-fill]="wishlisted()" [class.bi-heart]="!wishlisted()"
             [class.text-danger]="wishlisted()"></i>
        </button>
      }

      <a [routerLink]="['/product', product().slug]" class="text-decoration-none text-reset">
        <img
          [appImg]="product().images[0] ?? ''"
          [src]="product().images[0] ?? ''"
          [alt]="product().name"
          class="card-img-top"
          style="aspect-ratio: 1; object-fit: cover"
        />
      </a>

      <div class="card-body d-flex flex-column">
        <div class="small text-muted">{{ product().storeName }}</div>
        <a [routerLink]="['/product', product().slug]" class="fw-semibold text-reset text-decoration-none">
          {{ product().name }}
        </a>
        <div class="my-1">
          <app-star-rating [value]="product().rating" [size]="0.8" />
          <span class="small text-muted">({{ product().ratingCount }})</span>
        </div>
        <div class="fw-bold text-brand mt-auto">{{ product().price | money }}</div>

        @if (product().stock === 0) {
          <span class="badge text-bg-secondary mt-2 align-self-start">Out of stock</span>
        } @else if (canShop()) {
          <button
            class="btn btn-sm btn-primary mt-2"
            [disabled]="busy()"
            (click)="addToCart()"
          >
            <i class="bi bi-cart-plus me-1"></i> Add to cart
          </button>
        }
      </div>
    </div>
  `,
  styles: [
    `.product-card { transition: transform .15s ease, box-shadow .15s ease; }
     .product-card:hover { transform: translateY(-3px); box-shadow: 0 12px 30px rgba(15,48,64,.12); }`,
  ],
})
export class ProductCardComponent {
  private readonly auth = inject(AuthService);
  private readonly cart = inject(CartService);
  private readonly wishlist = inject(WishlistService);
  private readonly notify = inject(NotificationService);

  readonly product = input.required<ProductSummary>();
  readonly wishlistChanged = output<void>();

  protected readonly busy = signal(false);

  protected canShop(): boolean {
    return this.auth.role() === 'Customer';
  }

  protected wishlisted(): boolean {
    return this.wishlist.has(this.product().id);
  }

  protected async addToCart(): Promise<void> {
    this.busy.set(true);
    try {
      await this.cart.add(this.product().id, 1);
      this.notify.success('Added to cart');
    } finally {
      this.busy.set(false);
    }
  }

  protected async toggleWishlist(): Promise<void> {
    const on = await this.wishlist.toggle(this.product().id);
    this.notify.info(on ? 'Saved to wishlist' : 'Removed from wishlist');
    this.wishlistChanged.emit();
  }
}
