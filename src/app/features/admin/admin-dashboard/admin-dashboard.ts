import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminService } from '../../../core/services/admin.service';
import { AdminAnalytics } from '../../../core/models/vendor.model';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { BarChartComponent } from '../../../shared/ui/bar-chart';
import { SpinnerComponent } from '../../../shared/ui/spinner';

@Component({
  selector: 'app-admin-dashboard',
  imports: [RouterLink, MoneyPipe, BarChartComponent, SpinnerComponent],
  templateUrl: './admin-dashboard.html',
})
export class AdminDashboardComponent {
  private readonly admin = inject(AdminService);
  protected readonly data = signal<AdminAnalytics | null>(null);
  protected readonly loading = signal(true);

  constructor() {
    this.admin.analytics().subscribe({
      next: (a) => {
        this.data.set(a);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
