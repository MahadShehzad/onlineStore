import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Dispute } from '../../../core/models/commerce.model';
import { PagedResult } from '../../../core/models/catalog.model';
import { PaginationComponent } from '../../../shared/ui/pagination';
import { SpinnerComponent } from '../../../shared/ui/spinner';
import { EmptyStateComponent } from '../../../shared/ui/empty-state';

@Component({
  selector: 'app-dispute-management',
  imports: [RouterLink, DatePipe, FormsModule, PaginationComponent, SpinnerComponent, EmptyStateComponent],
  templateUrl: './dispute-management.html',
})
export class DisputeManagementComponent {
  private readonly admin = inject(AdminService);
  private readonly notify = inject(NotificationService);

  protected readonly statuses = ['Open', 'Resolved', 'Rejected', ''];
  protected readonly result = signal<PagedResult<Dispute> | null>(null);
  protected readonly loading = signal(true);
  protected readonly page = signal(1);
  protected readonly status = signal('Open');
  protected readonly workingId = signal<string | null>(null);
  protected readonly busy = signal<string | null>(null);
  protected resolutionText = '';

  constructor() {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.admin.disputes(this.page(), 10, this.status() || undefined).subscribe({
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

  protected resolve(d: Dispute, outcome: 'Resolved' | 'Rejected'): void {
    if (this.resolutionText.trim().length < 3) {
      this.notify.error('Add a short resolution note.');
      return;
    }
    this.busy.set(d.id);
    this.admin.resolveDispute(d.id, outcome, this.resolutionText.trim()).subscribe({
      next: () => {
        this.notify.success(`Dispute ${outcome.toLowerCase()}`);
        this.workingId.set(null);
        this.resolutionText = '';
        this.busy.set(null);
        this.load();
      },
      error: () => this.busy.set(null),
    });
  }
}
