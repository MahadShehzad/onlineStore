import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CatalogService } from '../../../core/services/catalog.service';
import { Category, ProductSummary } from '../../../core/models/catalog.model';
import { ProductCardComponent } from '../../../shared/ui/product-card';
import { SpinnerComponent } from '../../../shared/ui/spinner';

@Component({
  selector: 'app-shop',
  imports: [RouterLink, FormsModule, ProductCardComponent, SpinnerComponent],
  templateUrl: './shop.html',
})
export class ShopComponent {
  private readonly catalog = inject(CatalogService);
  private readonly router = inject(Router);

  protected readonly categories = signal<Category[]>([]);
  protected readonly featured = signal<ProductSummary[]>([]);
  protected readonly topRated = signal<ProductSummary[]>([]);
  protected readonly loading = signal(true);
  protected term = '';

  constructor() {
    this.load();
  }

  private load(): void {
    this.catalog.categories().subscribe((c) => this.categories.set(c));
    this.catalog.browse({ pageSize: 8, sort: 'newest' }).subscribe((r) => {
      this.featured.set(r.items);
      this.loading.set(false);
    });
    this.catalog.browse({ pageSize: 4, sort: 'rating' }).subscribe((r) => this.topRated.set(r.items));
  }

  protected search(): void {
    this.router.navigate(['/app/products'], {
      queryParams: this.term.trim() ? { search: this.term.trim() } : {},
    });
  }
}
