import { Component, inject, signal } from '@angular/core';
import { AdminService } from '../../../core/services/admin.service';
import { AdminAnalytics } from '../../../core/models/vendor.model';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { BarChartComponent } from '../../../shared/ui/bar-chart';
import { SpinnerComponent } from '../../../shared/ui/spinner';

@Component({
  selector: 'app-admin-analytics',
  imports: [MoneyPipe, BarChartComponent, SpinnerComponent],
  template: `
    <h1 class="h4 fw-bold mb-3">Platform analytics</h1>
    @if (loading()) {
      <app-spinner />
    } @else if (data(); as a) {
      <div class="row g-3 mb-4">
        <div class="col-6 col-md-3"><div class="card"><div class="card-body">
          <div class="small text-muted">GMV (net)</div><div class="h5 fw-bold text-brand mb-0">{{ a.gmv | money }}</div>
        </div></div></div>
        <div class="col-6 col-md-3"><div class="card"><div class="card-body">
          <div class="small text-muted">Commission earned</div><div class="h5 fw-bold mb-0">{{ a.commissionEarned | money }}</div>
        </div></div></div>
        <div class="col-6 col-md-3"><div class="card"><div class="card-body">
          <div class="small text-muted">Total orders</div><div class="h5 fw-bold mb-0">{{ a.orderCount }}</div>
        </div></div></div>
        <div class="col-6 col-md-3"><div class="card"><div class="card-body">
          <div class="small text-muted">Approved vendors</div><div class="h5 fw-bold mb-0">{{ a.vendorCount }}</div>
        </div></div></div>
      </div>

      <div class="card mb-3"><div class="card-body">
        <h2 class="h6 fw-bold">Monthly GMV — last 12 months</h2>
        <app-bar-chart [points]="a.monthly" title="Monthly GMV" />
      </div></div>

      <div class="card"><div class="card-body">
        <h2 class="h6 fw-bold">Top vendors by revenue</h2>
        <div class="table-responsive">
          <table class="table align-middle mb-0">
            <thead><tr><th>#</th><th>Store</th><th class="text-end">Revenue</th><th class="text-end">Orders</th></tr></thead>
            <tbody>
              @for (v of a.topVendors; track v.vendorId; let i = $index) {
                <tr><td>{{ i + 1 }}</td><td>{{ v.storeName }}</td>
                  <td class="text-end fw-semibold">{{ v.revenue | money }}</td>
                  <td class="text-end">{{ v.orders }}</td></tr>
              } @empty {
                <tr><td colspan="4" class="text-center text-muted py-3">No sales yet.</td></tr>
              }
            </tbody>
          </table>
        </div>
      </div></div>
    }
  `,
})
export class AdminAnalyticsComponent {
  private readonly admin = inject(AdminService);
  protected readonly data = signal<AdminAnalytics | null>(null);
  protected readonly loading = signal(true);

  constructor() {
    this.admin.analytics().subscribe({
      next: (a) => {
        this.data.set(a);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
