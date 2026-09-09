import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { VendorService } from '../../../core/services/vendor.service';
import { OrderService } from '../../../core/services/order.service';
import { VendorAnalytics } from '../../../core/models/vendor.model';
import { Order } from '../../../core/models/commerce.model';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { BarChartComponent } from '../../../shared/ui/bar-chart';
import { OrderStatusBadgeComponent } from '../../../shared/ui/order-status-badge';
import { SpinnerComponent } from '../../../shared/ui/spinner';

@Component({
  selector: 'app-vendor-dashboard',
  imports: [
    RouterLink,
    DatePipe,
    MoneyPipe,
    BarChartComponent,
    OrderStatusBadgeComponent,
    SpinnerComponent,
  ],
  templateUrl: './vendor-dashboard.html',
})
export class VendorDashboardComponent {
  protected readonly user = inject(AuthService).user;
  private readonly vendors = inject(VendorService);
  private readonly orders = inject(OrderService);

  protected readonly analytics = signal<VendorAnalytics | null>(null);
  protected readonly recent = signal<Order[]>([]);
  protected readonly loading = signal(true);

  constructor() {
    this.vendors.analytics().subscribe({
      next: (a) => {
        this.analytics.set(a);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
    this.orders.forVendor(1, 5).subscribe((r) => this.recent.set(r.items));
  }
}
