import { Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { CatalogService } from '../../../core/services/catalog.service';
import {
  Category,
  PagedResult,
  ProductFilters,
  ProductQuery,
  ProductSummary,
} from '../../../core/models/catalog.model';
import { ProductCardComponent } from '../../../shared/ui/product-card';
import { PaginationComponent } from '../../../shared/ui/pagination';
import { SpinnerComponent } from '../../../shared/ui/spinner';
import { EmptyStateComponent } from '../../../shared/ui/empty-state';

type Sort = NonNullable<ProductQuery['sort']>;

@Component({
  selector: 'app-product-list',
  imports: [
    FormsModule,
    ProductCardComponent,
    PaginationComponent,
    SpinnerComponent,
    EmptyStateComponent,
  ],
  templateUrl: './product-list.html',
})
export class ProductListComponent {
  private readonly catalog = inject(CatalogService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly routeQuery = toSignal(
    this.route.queryParamMap.pipe(
      map((p) => ({ category: p.get('category') ?? '', search: p.get('search') ?? '' })),
    ),
    { initialValue: { category: '', search: '' } },
  );

  protected readonly categories = signal<Category[]>([]);
  protected readonly filterMeta = signal<ProductFilters>({ brands: [], minPrice: 0, maxPrice: 0 });
  protected readonly result = signal<PagedResult<ProductSummary> | null>(null);
  protected readonly loading = signal(true);
  protected readonly filtersOpen = signal(false);

  protected readonly page = signal(1);
  protected readonly sort = signal<Sort>('newest');
  protected readonly brand = signal('');
  protected readonly minRating = signal(0);
  protected readonly priceMin = signal<number | null>(null);
  protected readonly priceMax = signal<number | null>(null);

  protected readonly activeCategory = computed(() =>
    this.categories().find((c) => c.slug === this.routeQuery().category),
  );
  protected readonly heading = computed(() => {
    if (this.activeCategory()) return this.activeCategory()!.name;
    const s = this.routeQuery().search;
    return s ? `Results for "${s}"` : 'All products';
  });

  constructor() {
    this.catalog.categories().subscribe((c) => this.categories.set(c));

    // reset filters + reload brand list when the route category/search changes
    effect(() => {
      const q = this.routeQuery();
      this.page.set(1);
      this.brand.set('');
      this.priceMin.set(null);
      this.priceMax.set(null);
      this.catalog.filters(q.category || undefined).subscribe((f) => this.filterMeta.set(f));
    });

    // (re)fetch products whenever the route query or any filter changes
    effect(() => {
      const q: ProductQuery = {
        page: this.page(),
        pageSize: 12,
        sort: this.sort(),
        categorySlug: this.routeQuery().category || undefined,
        search: this.routeQuery().search || undefined,
        brand: this.brand() || undefined,
        minRating: this.minRating() || undefined,
        minPrice: this.priceMin() ?? undefined,
        maxPrice: this.priceMax() ?? undefined,
      };
      this.loading.set(true);
      this.catalog.browse(q).subscribe({
        next: (r) => {
          this.result.set(r);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
    });
  }

  protected setPage(p: number): void {
    this.page.set(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  protected setSort(value: string): void {
    this.sort.set(value as Sort);
    this.page.set(1);
  }

  protected setBrand(value: string): void {
    this.brand.set(value);
    this.page.set(1);
  }

  protected setMinRating(value: number): void {
    this.minRating.set(this.minRating() === value ? 0 : value);
    this.page.set(1);
  }

  protected applyPrice(): void {
    this.page.set(1);
  }

  protected clearFilters(): void {
    this.brand.set('');
    this.minRating.set(0);
    this.priceMin.set(null);
    this.priceMax.set(null);
    this.page.set(1);
  }

  protected pickCategory(slug: string): void {
    this.router.navigate(['/app/products'], { queryParams: slug ? { category: slug } : {} });
  }
}
