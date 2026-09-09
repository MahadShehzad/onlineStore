import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrderService } from '../../../core/services/order.service';
import { Order } from '../../../core/models/commerce.model';
import { PagedResult } from '../../../core/models/catalog.model';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { OrderStatusBadgeComponent } from '../../../shared/ui/order-status-badge';
import { PaginationComponent } from '../../../shared/ui/pagination';
import { SpinnerComponent } from '../../../shared/ui/spinner';
import { EmptyStateComponent } from '../../../shared/ui/empty-state';

const STATUSES = ['', 'Pending', 'Accepted', 'Shipped', 'Delivered', 'Rejected', 'Cancelled'];

@Component({
  selector: 'app-order-oversight',
  imports: [
    RouterLink,
    DatePipe,
    FormsModule,
    MoneyPipe,
    OrderStatusBadgeComponent,
    PaginationComponent,
    SpinnerComponent,
    EmptyStateComponent,
  ],
  templateUrl: './order-oversight.html',
})
export class OrderOversightComponent {
  private readonly orders = inject(OrderService);

  protected readonly statuses = STATUSES;
  protected readonly result = signal<PagedResult<Order> | null>(null);
  protected readonly loading = signal(true);
  protected readonly page = signal(1);
  protected readonly status = signal('');
  protected search = '';

  constructor() {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.orders.all(this.page(), 15, this.status() || undefined, this.search.trim() || undefined).subscribe({
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

  protected runSearch(): void {
    this.page.set(1);
    this.load();
  }

  protected setPage(p: number): void {
    this.page.set(p);
    this.load();
  }
}
