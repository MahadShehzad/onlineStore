import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { OrderService } from '../../../core/services/order.service';
import { Order } from '../../../core/models/commerce.model';
import { PagedResult } from '../../../core/models/catalog.model';
import { OrderStatusBadgeComponent } from '../../../shared/ui/order-status-badge';
import { PaginationComponent } from '../../../shared/ui/pagination';
import { SpinnerComponent } from '../../../shared/ui/spinner';
import { EmptyStateComponent } from '../../../shared/ui/empty-state';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';

const STATUSES = ['', 'Pending', 'Accepted', 'Shipped', 'Delivered', 'Rejected', 'Cancelled'];

@Component({
  selector: 'app-order-history',
  imports: [
    RouterLink,
    DatePipe,
    OrderStatusBadgeComponent,
    PaginationComponent,
    SpinnerComponent,
    EmptyStateComponent,
    MoneyPipe,
  ],
  templateUrl: './order-history.html',
})
export class OrderHistoryComponent {
  private readonly orders = inject(OrderService);

  protected readonly statuses = STATUSES;
  protected readonly result = signal<PagedResult<Order> | null>(null);
  protected readonly loading = signal(true);
  protected readonly page = signal(1);
  protected readonly status = signal('');

  constructor() {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.orders.mine(this.page(), 8, this.status() || undefined).subscribe({
      next: (r) => {
        this.result.set(r);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected setStatus(s: string): void {
    this.status.set(s);
    this.page.set(1);
    this.load();
  }

  protected setPage(p: number): void {
    this.page.set(p);
    this.load();
  }
}
