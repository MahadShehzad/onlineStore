import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ConfirmService } from '../../../shared/ui/confirm.service';
import { AdminUser } from '../../../core/models/vendor.model';
import { PagedResult } from '../../../core/models/catalog.model';
import { PaginationComponent } from '../../../shared/ui/pagination';
import { SpinnerComponent } from '../../../shared/ui/spinner';
import { EmptyStateComponent } from '../../../shared/ui/empty-state';

@Component({
  selector: 'app-user-management',
  imports: [DatePipe, FormsModule, PaginationComponent, SpinnerComponent, EmptyStateComponent],
  templateUrl: './user-management.html',
})
export class UserManagementComponent {
  private readonly admin = inject(AdminService);
  private readonly notify = inject(NotificationService);
  private readonly confirm = inject(ConfirmService);

  protected readonly roles = ['', 'Customer', 'Vendor', 'Admin'];
  protected readonly result = signal<PagedResult<AdminUser> | null>(null);
  protected readonly loading = signal(true);
  protected readonly page = signal(1);
  protected readonly role = signal('');
  protected search = '';
  protected readonly busy = signal<string | null>(null);

  constructor() {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.admin.users(this.page(), 12, this.role() || undefined, this.search.trim() || undefined).subscribe({
      next: (r) => {
        this.result.set(r);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected setRole(r: string): void {
    this.role.set(r);
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

  protected async toggleBlock(u: AdminUser): Promise<void> {
    const blocking = !u.isBlocked;
    if (blocking && !(await this.confirm.ask(`Block ${u.name}? They will be signed out immediately.`, { danger: true, confirmText: 'Block' }))) {
      return;
    }
    this.busy.set(u.id);
    this.admin.setBlocked(u.id, blocking).subscribe({
      next: () => {
        this.notify.success(blocking ? 'User blocked' : 'User unblocked');
        this.busy.set(null);
        this.load();
      },
      error: () => this.busy.set(null),
    });
  }
}
