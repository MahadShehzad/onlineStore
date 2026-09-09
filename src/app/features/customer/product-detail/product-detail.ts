import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CatalogService } from '../../../core/services/catalog.service';
import { ReviewService } from '../../../core/services/review.service';
import { CartService } from '../../../core/services/cart.service';
import { WishlistService } from '../../../core/services/wishlist.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import {
  PagedResult,
  ProductDetail,
  ProductSummary,
  ProductVariant,
  Review,
} from '../../../core/models/catalog.model';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { FallbackImgDirective } from '../../../shared/directives/fallback-img.directive';
import { StarRatingComponent } from '../../../shared/ui/star-rating';
import { SpinnerComponent } from '../../../shared/ui/spinner';
import { ProductCardComponent } from '../../../shared/ui/product-card';
import { PaginationComponent } from '../../../shared/ui/pagination';

@Component({
  selector: 'app-product-detail',
  imports: [
    RouterLink,
    DatePipe,
    FormsModule,
    MoneyPipe,
    FallbackImgDirective,
    StarRatingComponent,
    SpinnerComponent,
    ProductCardComponent,
    PaginationComponent,
  ],
  templateUrl: './product-detail.html',
})
export class ProductDetailComponent {
  private readonly catalog = inject(CatalogService);
  private readonly reviews = inject(ReviewService);
  private readonly cart = inject(CartService);
  private readonly auth = inject(AuthService);
  private readonly notify = inject(NotificationService);
  protected readonly wishlist = inject(WishlistService);
  private readonly router = inject(Router);

  /** route param (withComponentInputBinding). */
  readonly slug = input.required<string>();

  protected readonly product = signal<ProductDetail | null>(null);
  protected readonly related = signal<ProductSummary[]>([]);
  protected readonly loading = signal(true);
  protected readonly activeImage = signal(0);
  protected readonly quantity = signal(1);
  protected readonly selectedVariantId = signal<string | null>(null);
  protected readonly adding = signal(false);

  protected readonly reviewPage = signal<PagedResult<Review> | null>(null);
  protected readonly rp = signal(1);
  protected readonly canReview = signal(false);
  protected readonly myRating = signal(0);
  protected myComment = '';
  protected readonly submittingReview = signal(false);

  protected readonly isCustomer = computed(() => this.auth.role() === 'Customer');
  protected readonly currentPrice = computed(() => {
    const p = this.product();
    if (!p) return 0;
    const v = p.variants.find((x) => x.id === this.selectedVariantId());
    return p.price + (v?.priceDelta ?? 0);
  });
  protected readonly availableStock = computed(() => {
    const p = this.product();
    if (!p) return 0;
    const v = p.variants.find((x) => x.id === this.selectedVariantId());
    return v?.stock ?? p.stock;
  });
  protected readonly variantGroups = computed<{ name: string; options: ProductVariant[] }[]>(() => {
    const p = this.product();
    if (!p) return [];
    const groups = new Map<string, ProductVariant[]>();
    for (const v of p.variants) {
      groups.set(v.name, [...(groups.get(v.name) ?? []), v]);
    }
    return [...groups.entries()].map(([name, options]) => ({ name, options }));
  });

  constructor() {
    // react to slug changes (navigating between products reuses the component)
    effect(() => this.load(this.slug()));
  }

  private load(slug: string): void {
    this.loading.set(true);
    this.catalog.detail(slug).subscribe({
      next: (p) => {
        this.product.set(p);
        this.loading.set(false);
        this.activeImage.set(0);
        this.selectedVariantId.set(p.variants[0]?.id ?? null);
        this.quantity.set(1);
        this.catalog.related(p.id).subscribe((r) => this.related.set(r));
        this.loadReviews(1);
        if (this.isCustomer()) {
          this.reviews.eligibility(p.id).subscribe((e) => this.canReview.set(e.canReview));
        }
      },
      error: () => {
        this.loading.set(false);
        this.router.navigate(['/app/products']);
      },
    });
  }

  protected loadReviews(page: number): void {
    const p = this.product();
    if (!p) return;
    this.rp.set(page);
    this.reviews.forProduct(p.id, page).subscribe((r) => this.reviewPage.set(r));
  }

  protected pickVariant(id: string): void {
    this.selectedVariantId.set(id);
    if (this.quantity() > this.availableStock()) this.quantity.set(Math.max(1, this.availableStock()));
  }

  protected changeQty(delta: number): void {
    const next = this.quantity() + delta;
    if (next >= 1 && next <= this.availableStock()) this.quantity.set(next);
  }

  protected async addToCart(): Promise<void> {
    const p = this.product();
    if (!p) return;
    if (!this.isCustomer()) {
      this.notify.info('Sign in as a customer to shop.');
      this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }
    this.adding.set(true);
    try {
      await this.cart.add(p.id, this.quantity(), this.selectedVariantId());
      this.notify.success('Added to cart');
    } finally {
      this.adding.set(false);
    }
  }

  protected async toggleWishlist(): Promise<void> {
    const p = this.product();
    if (!p) return;
    if (!this.isCustomer()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }
    const on = await this.wishlist.toggle(p.id);
    this.notify.info(on ? 'Saved to wishlist' : 'Removed from wishlist');
  }

  protected async submitReview(): Promise<void> {
    const p = this.product();
    if (!p || this.myRating() === 0 || this.myComment.trim().length < 3) {
      this.notify.error('Pick a rating and write a short comment.');
      return;
    }
    this.submittingReview.set(true);
    try {
      await new Promise<void>((resolve, reject) =>
        this.reviews.create(p.id, this.myRating(), this.myComment.trim()).subscribe({
          next: () => resolve(),
          error: reject,
        }),
      );
      this.notify.success('Thanks for your review!');
      this.myRating.set(0);
      this.myComment = '';
      this.canReview.set(false);
      this.loadReviews(1);
      this.catalog.detail(p.id).subscribe((fresh) => this.product.set(fresh));
    } catch {
      /* handled by interceptor */
    } finally {
      this.submittingReview.set(false);
    }
  }
}
