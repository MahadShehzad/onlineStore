import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { User } from '../../../core/models/user.model';

@Component({
  selector: 'app-profile',
  imports: [ReactiveFormsModule],
  templateUrl: './profile.html',
})
export class ProfileComponent {
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly notify = inject(NotificationService);

  protected readonly user = this.auth.user;
  protected readonly savingProfile = signal(false);
  protected readonly savingPassword = signal(false);

  protected readonly profileForm = this.fb.nonNullable.group({
    name: [this.user()?.name ?? '', [Validators.required, Validators.minLength(2)]],
    phone: [this.user()?.phone ?? ''],
    avatarUrl: [this.user()?.avatarUrl ?? ''],
  });

  protected readonly passwordForm = this.fb.nonNullable.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(6)]],
  });

  protected async saveProfile(): Promise<void> {
    if (this.profileForm.invalid) return;
    this.savingProfile.set(true);
    try {
      const updated = await firstValueFrom(
        this.http.put<User>('/api/auth/profile', this.profileForm.getRawValue()),
      );
      this.auth.applyUser(updated);
      this.notify.success('Profile updated');
    } finally {
      this.savingProfile.set(false);
    }
  }

  protected async savePassword(): Promise<void> {
    if (this.passwordForm.invalid) return;
    this.savingPassword.set(true);
    try {
      await firstValueFrom(this.http.put('/api/auth/password', this.passwordForm.getRawValue()));
      this.passwordForm.reset();
      this.notify.success('Password changed');
    } finally {
      this.savingPassword.set(false);
    }
  }
}
