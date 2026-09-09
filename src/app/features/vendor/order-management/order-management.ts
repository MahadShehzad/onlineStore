import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { OrderService } from '../../../core/services/order.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ConfirmService } from '../../../shared/ui/confirm.service';
import { Order, OrderStatus } from '../../../core/models/commerce.model';
import { PagedResult } from '../../../core/models/catalog.model';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { OrderStatusBadgeComponent } from '../../../shared/ui/order-status-badge';
import { PaginationComponent } from '../../../shared/ui/pagination';
import { SpinnerComponent } from '../../../shared/ui/spinner';
import { EmptyStateComponent } from '../../../shared/ui/empty-state';

const STATUSES = ['', 'Pending', 'Accepted', 'Shipped', 'Delivered', 'Rejected', 'Cancelled'];

@Component({
  selector: 'app-order-management',
  imports: [
    RouterLink,
    DatePipe,
    MoneyPipe,
    OrderStatusBadgeComponent,
    PaginationComponent,
    SpinnerComponent,
    EmptyStateComponent,
  ],
  templateUrl: './order-management.html',
})
export class OrderManagementComponent {
  private readonly orders = inject(OrderService);
  private readonly notify = inject(NotificationService);
  private readonly confirm = inject(ConfirmService);

  protected readonly statuses = STATUSES;
  protected readonly result = signal<PagedResult<Order> | null>(null);
  protected readonly loading = signal(true);
  protected readonly page = signal(1);
  protected readonly status = signal('');
  protected readonly busy = signal<string | null>(null);

  constructor() {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.orders.forVendor(this.page(), 10, this.status() || undefined).subscribe({
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

  protected nextActions(o: Order): { label: string; status: OrderStatus; danger?: boolean }[] {
    switch (o.status) {
      case 'Pending':
        return [
          { label: 'Accept', status: 'Accepted' },
          { label: 'Reject', status: 'Rejected', danger: true },
        ];
      case 'Accepted':
        return [{ label: 'Mark shipped', status: 'Shipped' }];
      case 'Shipped':
        return [{ label: 'Mark delivered', status: 'Delivered' }];
      default:
        return [];
    }
  }

  protected async act(o: Order, status: OrderStatus): Promise<void> {
    if (status === 'Rejected' && !(await this.confirm.ask('Reject this order? Stock will be returned.', { danger: true, confirmText: 'Reject' }))) {
      return;
    }
    this.busy.set(o.id);
    this.orders.setStatus(o.id, status).subscribe({
      next: () => {
        this.notify.success(`Order marked ${status}`);
        this.busy.set(null);
        this.load();
      },
      error: () => this.busy.set(null),
    });
  }
}
