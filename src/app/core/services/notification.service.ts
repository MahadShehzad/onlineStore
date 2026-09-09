import { Injectable, signal } from '@angular/core';

export type ToastKind = 'info' | 'success' | 'error';

export interface Toast {
  id: number;
  kind: ToastKind;
  text: string;
}

/** App-wide transient toasts. Rendered once by the root component. */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private seq = 0;
  readonly toasts = signal<Toast[]>([]);

  info(text: string): void {
    this.push('info', text);
  }

  success(text: string): void {
    this.push('success', text);
  }

  error(text: string): void {
    this.push('error', text);
  }

  dismiss(id: number): void {
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }

  private push(kind: ToastKind, text: string): void {
    const id = ++this.seq;
    this.toasts.update((list) => [...list, { id, kind, text }]);
    setTimeout(() => this.dismiss(id), 5000);
  }
}
