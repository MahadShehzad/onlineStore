import { Injectable, signal } from '@angular/core';

interface ConfirmState {
  title: string;
  message: string;
  confirmText: string;
  danger: boolean;
  resolve: (ok: boolean) => void;
}

/** Promise-based confirm dialog. One <app-confirm-dialog> lives in the root component. */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  readonly state = signal<ConfirmState | null>(null);

  ask(
    message: string,
    opts: { title?: string; confirmText?: string; danger?: boolean } = {},
  ): Promise<boolean> {
    return new Promise((resolve) => {
      this.state.set({
        title: opts.title ?? 'Please confirm',
        message,
        confirmText: opts.confirmText ?? 'Confirm',
        danger: opts.danger ?? false,
        resolve,
      });
    });
  }

  answer(ok: boolean): void {
    this.state()?.resolve(ok);
    this.state.set(null);
  }
}
