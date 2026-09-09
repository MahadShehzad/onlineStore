import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { VendorService } from '../../../core/services/vendor.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Vendor } from '../../../core/models/vendor.model';
import { SpinnerComponent } from '../../../shared/ui/spinner';
import { FallbackImgDirective } from '../../../shared/directives/fallback-img.directive';

@Component({
  selector: 'app-store-settings',
  imports: [ReactiveFormsModule, SpinnerComponent, FallbackImgDirective],
  templateUrl: './store-settings.html',
})
export class StoreSettingsComponent {
  private readonly fb = inject(FormBuilder);
  private readonly vendors = inject(VendorService);
  private readonly auth = inject(AuthService);
  private readonly notify = inject(NotificationService);

  protected readonly vendor = signal<Vendor | null>(null);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    storeName: ['', [Validators.required, Validators.minLength(2)]],
    description: [''],
    storeLogo: [''],
    storeBanner: [''],
  });

  constructor() {
    this.vendors.mine().subscribe((v) => {
      this.vendor.set(v);
      this.form.patchValue({
        storeName: v.storeName,
        description: v.description,
        storeLogo: v.storeLogo,
        storeBanner: v.storeBanner,
      });
      this.loading.set(false);
    });
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.vendors.updateStore(this.form.getRawValue()).subscribe({
      next: (v) => {
        this.vendor.set(v);
        this.saving.set(false);
        this.notify.success('Store updated');
      },
      error: () => this.saving.set(false),
    });
  }
}
