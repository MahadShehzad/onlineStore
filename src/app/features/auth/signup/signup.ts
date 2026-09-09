import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { homeRouteFor } from '../../../core/models/user.model';

@Component({
  selector: 'app-signup',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './signup.html',
})
export class SignupComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    role: this.fb.nonNullable.control<'Customer' | 'Vendor'>('Customer'),
    storeName: [''],
  });

  protected readonly isVendor = computed(() => this.form.controls.role.value === 'Vendor');

  protected selectRole(role: 'Customer' | 'Vendor'): void {
    this.form.controls.role.setValue(role);
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

    const { name, email, password, role, storeName } = this.form.getRawValue();
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
    await this.router.navigateByUrl(homeRouteFor(result.user));
    // fresh account — carts/wishlists start empty, nothing to load

  }
}
