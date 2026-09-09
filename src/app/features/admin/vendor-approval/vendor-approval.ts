import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VendorService } from '../../../core/services/vendor.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Vendor } from '../../../core/models/vendor.model';
import { PagedResult } from '../../../core/models/catalog.model';
import { PaginationComponent } from '../../../shared/ui/pagination';
import { SpinnerComponent } from '../../../shared/ui/spinner';
import { EmptyStateComponent } from '../../../shared/ui/empty-state';
import { FallbackImgDirective } from '../../../shared/directives/fallback-img.directive';

@Component({
  selector: 'app-vendor-approval',
  imports: [DatePipe, FormsModule, PaginationComponent, SpinnerComponent, EmptyStateComponent, FallbackImgDirective],
  templateUrl: './vendor-approval.html',
})
export class VendorApprovalComponent {
  private readonly vendors = inject(VendorService);
  private readonly notify = inject(NotificationService);

  protected readonly statuses = ['Pending', 'Approved', 'Rejected', ''];
  protected readonly result = signal<PagedResult<Vendor> | null>(null);
  protected readonly loading = signal(true);
  protected readonly page = signal(1);
  protected readonly status = signal('Pending');
  protected readonly busy = signal<string | null>(null);
  protected readonly rejectingId = signal<string | null>(null);
  protected rejectReason = '';

  constructor() {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.vendors.list(this.page(), 10, this.status() || undefined).subscribe({
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

  protected approve(v: Vendor): void {
    this.busy.set(v.id);
    this.vendors.approve(v.id).subscribe({
      next: () => {
        this.notify.success(`${v.storeName} approved`);
        this.busy.set(null);
        this.load();
      },
      error: () => this.busy.set(null),
    });
  }

  protected confirmReject(v: Vendor): void {
    this.busy.set(v.id);
    this.vendors.reject(v.id, this.rejectReason.trim()).subscribe({
      next: () => {
        this.notify.success(`${v.storeName} rejected`);
        this.rejectingId.set(null);
        this.rejectReason = '';
        this.busy.set(null);
        this.load();
      },
      error: () => this.busy.set(null),
    });
  }
}
