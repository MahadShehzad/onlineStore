import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CartService } from '../../../core/services/cart.service';
import { AddressService } from '../../../core/services/address.service';
import { OrderService } from '../../../core/services/order.service';
import { MetaService } from '../../../core/services/meta.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Address } from '../../../core/models/commerce.model';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { SpinnerComponent } from '../../../shared/ui/spinner';

@Component({
  selector: 'app-checkout',
  imports: [RouterLink, ReactiveFormsModule, FormsModule, MoneyPipe, SpinnerComponent],
  templateUrl: './checkout.html',
})
export class CheckoutComponent {
  private readonly fb = inject(FormBuilder);
  private readonly cartService = inject(CartService);
  private readonly addresses = inject(AddressService);
  private readonly orders = inject(OrderService);
  private readonly meta = inject(MetaService);
  private readonly notify = inject(NotificationService);
  private readonly router = inject(Router);

  protected readonly cart = this.cartService.cart;
  protected readonly addressList = signal<Address[]>([]);
  protected readonly loading = signal(true);
  protected readonly placing = signal(false);
  protected readonly selectedAddressId = signal<string | null>(null);
  protected readonly showNewAddress = signal(false);
  protected readonly paymentMethod = signal<'Card (test)' | 'Cash on delivery'>('Card (test)');

  /** Demo card fields — no validation, any input is accepted. */
  protected card = { number: '', name: '', expiry: '', cvc: '' };

  protected readonly storeCount = computed(() => new Set(this.cart().lines.map((l) => l.vendorId)).size);
  protected readonly shipping = computed(() => this.storeCount() * this.meta.settings().shippingFlatFee);
  protected readonly total = computed(() => this.cart().subtotal + this.shipping());

  protected readonly addressForm = this.fb.nonNullable.group({
    fullName: ['', Validators.required],
    phone: ['', Validators.required],
    line1: ['', Validators.required],
    line2: [''],
    city: ['', Validators.required],
    state: ['', Validators.required],
    postalCode: ['', Validators.required],
    country: ['Pakistan', Validators.required],
  });

  constructor() {
    if (this.cart().lines.length === 0) {
      this.router.navigate(['/app/cart']);
      return;
    }
    this.addresses.list().subscribe((list) => {
      this.addressList.set(list);
      this.selectedAddressId.set(list.find((a) => a.isDefault)?.id ?? list[0]?.id ?? null);
      this.showNewAddress.set(list.length === 0);
      this.loading.set(false);
    });
  }

  protected saveAddress(): void {
    if (this.addressForm.invalid) {
      this.addressForm.markAllAsTouched();
      return;
    }
    const input = { ...this.addressForm.getRawValue(), isDefault: this.addressList().length === 0 };
    this.addresses.create(input).subscribe((created) => {
      this.addressList.update((list) => [...list, created]);
      this.selectedAddressId.set(created.id);
      this.showNewAddress.set(false);
      this.addressForm.reset({ country: 'Pakistan' });
      this.notify.success('Address saved');
    });
  }

  protected async placeOrder(): Promise<void> {
    const addressId = this.selectedAddressId();
    if (!addressId) {
      this.notify.error('Add a shipping address first.');
      return;
    }
    let method = this.paymentMethod() as string;
    if (method === 'Card (test)') {
      const digits = this.card.number.replace(/\D/g, '');
      method = digits.length >= 4 ? `Card •••• ${digits.slice(-4)}` : 'Card (test)';
    }

    this.placing.set(true);
    this.orders.checkout(addressId, method).subscribe({
      next: async (created) => {
        await this.cartService.load();
        this.notify.success(`Order placed — ${created.length} order(s) created.`);
        this.router.navigate(created.length === 1 ? ['/app/orders', created[0].id] : ['/app/orders']);
      },
      error: () => this.placing.set(false),
    });
  }
}
