import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AddressService } from '../../../core/services/address.service';
import { ConfirmService } from '../../../shared/ui/confirm.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Address } from '../../../core/models/commerce.model';
import { SpinnerComponent } from '../../../shared/ui/spinner';
import { EmptyStateComponent } from '../../../shared/ui/empty-state';

@Component({
  selector: 'app-addresses',
  imports: [ReactiveFormsModule, SpinnerComponent, EmptyStateComponent],
  templateUrl: './addresses.html',
})
export class AddressesComponent {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(AddressService);
  private readonly confirm = inject(ConfirmService);
  private readonly notify = inject(NotificationService);

  protected readonly list = signal<Address[]>([]);
  protected readonly loading = signal(true);
  protected readonly editingId = signal<string | null>(null);
  protected readonly formOpen = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    fullName: ['', Validators.required],
    phone: ['', Validators.required],
    line1: ['', Validators.required],
    line2: [''],
    city: ['', Validators.required],
    state: ['', Validators.required],
    postalCode: ['', Validators.required],
    country: ['Pakistan', Validators.required],
    isDefault: [false],
  });

  constructor() {
    this.load();
  }

  private load(): void {
    this.service.list().subscribe((list) => {
      this.list.set(list);
      this.loading.set(false);
    });
  }

  protected startNew(): void {
    this.editingId.set(null);
    this.form.reset({ country: 'Pakistan', isDefault: this.list().length === 0 });
    this.formOpen.set(true);
  }

  protected startEdit(a: Address): void {
    this.editingId.set(a.id);
    this.form.setValue({
      fullName: a.fullName,
      phone: a.phone,
      line1: a.line1,
      line2: a.line2,
      city: a.city,
      state: a.state,
      postalCode: a.postalCode,
      country: a.country,
      isDefault: a.isDefault,
    });
    this.formOpen.set(true);
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const id = this.editingId();
    const request = id ? this.service.update(id, value) : this.service.create(value);
    request.subscribe(() => {
      this.notify.success(id ? 'Address updated' : 'Address added');
      this.formOpen.set(false);
      this.load();
    });
  }

  protected async remove(a: Address): Promise<void> {
    if (await this.confirm.ask(`Delete the address for ${a.fullName}?`, { danger: true, confirmText: 'Delete' })) {
      this.service.remove(a.id).subscribe(() => {
        this.notify.success('Address deleted');
        this.load();
      });
    }
  }
}
