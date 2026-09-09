import { Component, inject } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-customer-dashboard',
  template: `
    <h1 class="h3 fw-bold mb-1">Welcome back, {{ user()?.name }}</h1>
    <p class="text-muted">Your shopping home. Browsing and cart arrive in Phase 2.</p>

    <div class="row g-3 mt-1">
      @for (card of roadmap; track card.title) {
        <div class="col-sm-6 col-lg-4">
          <div class="card h-100">
            <div class="card-body">
              <i class="bi {{ card.icon }} fs-3 text-brand"></i>
              <h2 class="h6 fw-bold mt-2">{{ card.title }}</h2>
              <p class="text-muted small mb-2">{{ card.text }}</p>
              <span class="badge text-bg-secondary">{{ card.phase }}</span>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class CustomerDashboardComponent {
  protected readonly user = inject(AuthService).user;

  protected readonly roadmap = [
    { icon: 'bi-grid', title: 'Browse products', text: 'Category pages, search, filters by price, rating and brand.', phase: 'Phase 2' },
    { icon: 'bi-cart', title: 'Cart & checkout', text: 'Add to cart, pick an address, place an order.', phase: 'Phase 2–3' },
    { icon: 'bi-box-seam', title: 'Order tracking', text: 'Follow each order from pending to delivered.', phase: 'Phase 3' },
    { icon: 'bi-heart', title: 'Wishlist', text: 'Save products for later.', phase: 'Phase 2' },
    { icon: 'bi-star', title: 'Reviews', text: 'Rate products you have purchased.', phase: 'Phase 3' },
    { icon: 'bi-credit-card', title: 'Payments', text: 'Stripe test-mode checkout.', phase: 'Phase 6' },
  ];
}
