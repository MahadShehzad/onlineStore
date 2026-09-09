import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { CatalogService } from '../../core/services/catalog.service';
import { homeRouteFor } from '../../core/models/user.model';
import { Category, ProductSummary } from '../../core/models/catalog.model';
import { MoneyPipe } from '../../shared/pipes/money.pipe';
import { FallbackImgDirective } from '../../shared/directives/fallback-img.directive';
import { StarRatingComponent } from '../../shared/ui/star-rating';

@Component({
  selector: 'app-home',
  imports: [RouterLink, FormsModule, MoneyPipe, FallbackImgDirective, StarRatingComponent],
  templateUrl: './home.html',
})
export class HomeComponent {
  private readonly auth = inject(AuthService);
  private readonly catalog = inject(CatalogService);
  private readonly router = inject(Router);

  protected readonly user = this.auth.user;
  protected readonly appHome = computed(() => {
    const u = this.user();
    return u ? homeRouteFor(u) : '/login';
  });

  protected readonly categories = signal<Category[]>([]);
  protected readonly featured = signal<ProductSummary[]>([]);
  protected term = '';

  protected readonly perks = [
    { icon: 'bi-shop-window', title: 'Many stores, one cart', text: 'Shop products from independent vendors in a single checkout.' },
    { icon: 'bi-shield-check', title: 'Buyer protection', text: 'Track every order from pending to delivered, backed by dispute support.' },
    { icon: 'bi-truck', title: 'Fast fulfilment', text: 'Vendors manage their own stock so listings stay accurate.' },
  ];

  constructor() {
    this.catalog.categories().subscribe((c) => this.categories.set(c.slice(0, 6)));
    this.catalog.browse({ pageSize: 8, sort: 'rating' }).subscribe((r) => this.featured.set(r.items));
  }

  protected go(): void {
    if (this.user()) {
      this.router.navigate(['/app/products'], {
        queryParams: this.term.trim() ? { search: this.term.trim() } : {},
      });
    } else {
      this.router.navigate(['/login']);
    }
  }
}
