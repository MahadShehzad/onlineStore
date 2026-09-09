import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';
import { VendorService } from '../../../core/services/vendor.service';
import { NotificationService } from '../../../core/services/notification.service';
import { PlatformSetting, Vendor } from '../../../core/models/vendor.model';
import { PagedResult } from '../../../core/models/catalog.model';
import { PaginationComponent } from '../../../shared/ui/pagination';
import { SpinnerComponent } from '../../../shared/ui/spinner';

@Component({
  selector: 'app-commission-settings',
  imports: [ReactiveFormsModule, FormsModule, PaginationComponent, SpinnerComponent],
  templateUrl: './commission-settings.html',
})
export class CommissionSettingsComponent {
  private readonly fb = inject(FormBuilder);
  private readonly admin = inject(AdminService);
  private readonly vendors = inject(VendorService);
  private readonly notify = inject(NotificationService);

  protected readonly settings = signal<PlatformSetting | null>(null);
  protected readonly vendorPage = signal<PagedResult<Vendor> | null>(null);
  protected readonly loading = signal(true);
  protected readonly savingSettings = signal(false);
  protected readonly page = signal(1);
  protected readonly rowBusy = signal<string | null>(null);
  protected readonly draftRates = new Map<string, number>();

  protected readonly form = this.fb.nonNullable.group({
    defaultCommissionRate: [10, [Validators.required, Validators.min(0), Validators.max(100)]],
    shippingFlatFee: [200, [Validators.required, Validators.min(0)]],
  });

  constructor() {
    this.admin.settings().subscribe((s) => {
      this.settings.set(s);
      this.form.patchValue({ defaultCommissionRate: s.defaultCommissionRate, shippingFlatFee: s.shippingFlatFee });
      this.loading.set(false);
    });
    this.loadVendors();
  }

  private loadVendors(): void {
    this.vendors.list(this.page(), 10, 'Approved').subscribe((r) => {
      this.vendorPage.set(r);
      r.items.forEach((v) => this.draftRates.set(v.id, v.commissionRate));
    });
  }

  protected setPage(p: number): void {
    this.page.set(p);
    this.loadVendors();
  }

  protected saveSettings(): void {
    if (this.form.invalid) return;
    this.savingSettings.set(true);
    const { defaultCommissionRate, shippingFlatFee } = this.form.getRawValue();
    this.admin.updateSettings(defaultCommissionRate, shippingFlatFee).subscribe({
      next: (s) => {
        this.settings.set(s);
        this.savingSettings.set(false);
        this.notify.success('Platform settings saved');
      },
      error: () => this.savingSettings.set(false),
    });
  }

  protected saveRate(v: Vendor): void {
    const rate = this.draftRates.get(v.id) ?? v.commissionRate;
    this.rowBusy.set(v.id);
    this.vendors.setCommission(v.id, rate).subscribe({
      next: () => {
        this.notify.success(`${v.storeName}: ${rate}% commission`);
        this.rowBusy.set(null);
      },
      error: () => this.rowBusy.set(null),
    });
  }
}
