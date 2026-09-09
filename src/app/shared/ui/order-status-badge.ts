import { Component, computed, input } from '@angular/core';
import { OrderStatus } from '../../core/models/commerce.model';

@Component({
  selector: 'app-order-status-badge',
  template: `<span class="badge" [class]="cls()">{{ status() }}</span>`,
})
export class OrderStatusBadgeComponent {
  readonly status = input.required<OrderStatus>();

  protected readonly cls = computed(() => {
    switch (this.status()) {
      case 'Delivered':
        return 'text-bg-success';
      case 'Shipped':
        return 'text-bg-primary';
      case 'Accepted':
        return 'text-bg-info';
      case 'Rejected':
      case 'Cancelled':
        return 'text-bg-danger';
      default:
        return 'text-bg-warning';
    }
  });
}
