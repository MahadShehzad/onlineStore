import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { DisputeService } from '../../../core/services/dispute.service';
import { Dispute } from '../../../core/models/commerce.model';
import { SpinnerComponent } from '../../../shared/ui/spinner';
import { EmptyStateComponent } from '../../../shared/ui/empty-state';

@Component({
  selector: 'app-disputes',
  imports: [RouterLink, DatePipe, SpinnerComponent, EmptyStateComponent],
  template: `
    <h1 class="h4 fw-bold mb-3">My complaints</h1>
    @if (loading()) {
      <app-spinner />
    } @else if (list().length === 0) {
      <app-empty-state icon="bi-chat-left-dots" title="No complaints"
        hint="Raise a complaint from an order's page if something goes wrong." />
    } @else {
      <div class="d-flex flex-column gap-3">
        @for (d of list(); track d.id) {
          <div class="card">
            <div class="card-body">
              <div class="d-flex justify-content-between align-items-start">
                <h2 class="h6 fw-bold mb-1">{{ d.subject }}</h2>
                <span class="badge"
                  [class.text-bg-warning]="d.status === 'Open'"
                  [class.text-bg-success]="d.status === 'Resolved'"
                  [class.text-bg-secondary]="d.status === 'Rejected'">{{ d.status }}</span>
              </div>
              <p class="text-muted small mb-1">{{ d.description }}</p>
              <div class="small text-muted">
                Order <a [routerLink]="['/app/orders', d.orderId]">#{{ d.orderId.slice(0, 8) }}</a>
                · raised {{ d.createdAt | date: 'mediumDate' }}
              </div>
              @if (d.resolution) {
                <div class="alert alert-info small mt-2 mb-0"><strong>Response:</strong> {{ d.resolution }}</div>
              }
            </div>
          </div>
        }
      </div>
    }
  `,
})
export class DisputesComponent {
  private readonly service = inject(DisputeService);
  protected readonly list = signal<Dispute[]>([]);
  protected readonly loading = signal(true);

  constructor() {
    this.service.mine().subscribe((d) => {
      this.list.set(d);
      this.loading.set(false);
    });
  }
}
