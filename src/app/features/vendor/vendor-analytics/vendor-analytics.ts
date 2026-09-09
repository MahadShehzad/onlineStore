import { Component, inject, signal } from '@angular/core';
import { VendorService } from '../../../core/services/vendor.service';
import { VendorAnalytics } from '../../../core/models/vendor.model';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { BarChartComponent } from '../../../shared/ui/bar-chart';
import { SpinnerComponent } from '../../../shared/ui/spinner';

@Component({
  selector: 'app-vendor-analytics',
  imports: [MoneyPipe, BarChartComponent, SpinnerComponent],
  template: `
    <h1 class="h4 fw-bold mb-3">Sales analytics</h1>
    @if (loading()) {
      <app-spinner />
    } @else if (data(); as a) {
      <div class="row g-3 mb-4">
        <div class="col-6 col-lg-3"><div class="card"><div class="card-body">
          <div class="small text-muted">Revenue (net)</div><div class="h5 fw-bold text-brand mb-0">{{ a.totalRevenue | money }}</div>
        </div></div></div>
        <div class="col-6 col-lg-3"><div class="card"><div class="card-body">
          <div class="small text-muted">Orders</div><div class="h5 fw-bold mb-0">{{ a.totalOrders }}</div>
        </div></div></div>
        <div class="col-6 col-lg-3"><div class="card"><div class="card-body">
          <div class="small text-muted">Commission paid</div><div class="h5 fw-bold mb-0">{{ a.commissionPaid | money }}</div>
        </div></div></div>
        <div class="col-6 col-lg-3"><div class="card"><div class="card-body">
          <div class="small text-muted">Pending orders</div><div class="h5 fw-bold mb-0">{{ a.pendingOrders }}</div>
        </div></div></div>
      </div>

      <div class="card mb-3"><div class="card-body">
        <h2 class="h6 fw-bold">Daily revenue — last 14 days</h2>
        <app-bar-chart [points]="a.daily" title="Daily revenue" />
      </div></div>

      <div class="card"><div class="card-body">
        <h2 class="h6 fw-bold">Monthly revenue — last 12 months</h2>
        <app-bar-chart [points]="a.monthly" title="Monthly revenue" />
      </div></div>
    }
  `,
})
export class VendorAnalyticsComponent {
  private readonly vendors = inject(VendorService);
  protected readonly data = signal<VendorAnalytics | null>(null);
  protected readonly loading = signal(true);

  constructor() {
    this.vendors.analytics().subscribe({
      next: (a) => {
        this.data.set(a);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
