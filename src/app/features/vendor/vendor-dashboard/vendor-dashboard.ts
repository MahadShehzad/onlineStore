import { Component, inject } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-vendor-dashboard',
  template: `
    <h1 class="h3 fw-bold mb-1">Vendor dashboard</h1>
    <p class="text-muted">{{ user()?.name }} · store status:
      <span
        class="badge"
        [class.text-bg-success]="user()?.vendorStatus === 'Approved'"
        [class.text-bg-warning]="user()?.vendorStatus === 'Pending'"
        [class.text-bg-danger]="user()?.vendorStatus === 'Rejected'"
      >{{ user()?.vendorStatus }}</span>
    </p>

    @if (user()?.vendorStatus === 'Pending') {
      <div class="alert alert-warning">
        <i class="bi bi-hourglass-split me-2"></i>
        An admin needs to approve your store before you can list products.
      </div>
    }

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
export class VendorDashboardComponent {
  protected readonly user = inject(AuthService).user;

  protected readonly roadmap = [
    { icon: 'bi-box', title: 'Product management', text: 'Create, edit and delete products with images and variants.', phase: 'Phase 4' },
    { icon: 'bi-clipboard-data', title: 'Inventory', text: 'Track stock counts per product and variant.', phase: 'Phase 4' },
    { icon: 'bi-receipt', title: 'Order management', text: 'Accept, reject and mark orders shipped.', phase: 'Phase 4' },
    { icon: 'bi-graph-up', title: 'Sales dashboard', text: 'Daily and monthly revenue charts.', phase: 'Phase 4' },
    { icon: 'bi-shop', title: 'Store profile', text: 'Logo, banner and description.', phase: 'Phase 4' },
  ];
}
