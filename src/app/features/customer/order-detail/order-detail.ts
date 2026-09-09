import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrderService } from '../../../core/services/order.service';
import { DisputeService } from '../../../core/services/dispute.service';
import { ConfirmService } from '../../../shared/ui/confirm.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Order } from '../../../core/models/commerce.model';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { FallbackImgDirective } from '../../../shared/directives/fallback-img.directive';
import { OrderStatusBadgeComponent } from '../../../shared/ui/order-status-badge';
import { SpinnerComponent } from '../../../shared/ui/spinner';

interface Step {
  label: string;
  icon: string;
  at: string | null;
  done: boolean;
}

@Component({
  selector: 'app-order-detail',
  imports: [
    RouterLink,
    DatePipe,
    FormsModule,
    MoneyPipe,
    FallbackImgDirective,
    OrderStatusBadgeComponent,
    SpinnerComponent,
  ],
  templateUrl: './order-detail.html',
})
export class OrderDetailComponent {
  private readonly orders = inject(OrderService);
  private readonly disputes = inject(DisputeService);
  private readonly confirm = inject(ConfirmService);
  private readonly notify = inject(NotificationService);
  private readonly router = inject(Router);

  readonly id = input.required<string>();

  protected readonly order = signal<Order | null>(null);
  protected readonly loading = signal(true);
  protected readonly showDispute = signal(false);
  protected disputeSubject = '';
  protected disputeBody = '';

  protected readonly steps = computed<Step[]>(() => {
    const o = this.order();
    if (!o) return [];
    if (o.status === 'Rejected' || o.status === 'Cancelled') {
      return [
        { label: 'Placed', icon: 'bi-bag-check', at: o.createdAt, done: true },
        { label: o.status, icon: 'bi-x-circle', at: null, done: true },
      ];
    }
    return [
      { label: 'Placed', icon: 'bi-bag-check', at: o.createdAt, done: true },
      { label: 'Accepted', icon: 'bi-check2-circle', at: o.acceptedAt, done: !!o.acceptedAt },
      { label: 'Shipped', icon: 'bi-truck', at: o.shippedAt, done: !!o.shippedAt },
      { label: 'Delivered', icon: 'bi-box-seam', at: o.deliveredAt, done: !!o.deliveredAt },
    ];
  });

  constructor() {
    effect(() => {
      const id = this.id();
      this.loading.set(true);
      this.orders.detail(id).subscribe({
        next: (o) => {
          this.order.set(o);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.router.navigate(['/app/orders']);
        },
      });
    });
  }

  protected async cancel(): Promise<void> {
    if (!(await this.confirm.ask('Cancel this order?', { confirmText: 'Cancel order', danger: true }))) return;
    this.orders.cancel(this.id()).subscribe((o) => {
      this.order.set(o);
      this.notify.success('Order cancelled');
    });
  }

  protected raiseDispute(): void {
    if (this.disputeSubject.trim().length < 3 || this.disputeBody.trim().length < 5) {
      this.notify.error('Add a subject and a short description.');
      return;
    }
    this.disputes.create(this.id(), this.disputeSubject.trim(), this.disputeBody.trim()).subscribe(() => {
      this.notify.success('Complaint submitted. An admin will review it.');
      this.showDispute.set(false);
      this.disputeSubject = '';
      this.disputeBody = '';
    });
  }
}
