import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { CartService } from '../../../core/services/cart.service';
import { WishlistService } from '../../../core/services/wishlist.service';
import { homeRouteFor } from '../../../core/models/user.model';

type SignupRole = 'Customer' | 'Vendor';

@Component({
  selector: 'app-signup',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './signup.html',
})
export class SignupComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly cart = inject(CartService);
  private readonly wishlist = inject(WishlistService);

  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);
  /** Selected account type — a signal so the template reacts immediately on click. */
  protected readonly role = signal<SignupRole>('Customer');

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    storeName: [''],
  });

  protected selectRole(role: SignupRole): void {
    this.role.set(role);
    const store = this.form.controls.storeName;
    if (role === 'Vendor') {
      store.addValidators(Validators.required);
    } else {
      store.clearValidators();
      store.setValue('');
    }
    store.updateValueAndValidity();
  }

  protected async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.error.set(null);

    const { name, email, password, storeName } = this.form.getRawValue();
    const role = this.role();
    const result = await this.auth.register({
      name,
      email,
      password,
      role,
      storeName: role === 'Vendor' ? storeName : undefined,
    });
    this.submitting.set(false);

    if (!result.ok) {
      this.error.set(result.error);
      return;
    }
    await Promise.all([this.cart.load(), this.wishlist.load()]);
    await this.router.navigateByUrl(homeRouteFor(result.user));
  }
}
