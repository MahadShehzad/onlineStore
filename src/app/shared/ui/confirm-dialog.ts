import { Component, inject } from '@angular/core';
import { ConfirmService } from './confirm.service';

@Component({
  selector: 'app-confirm-dialog',
  template: `
    @if (confirm.state(); as s) {
      <div class="modal fade show d-block" tabindex="-1" role="dialog">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">{{ s.title }}</h5>
              <button type="button" class="btn-close" (click)="confirm.answer(false)"></button>
            </div>
            <div class="modal-body">
              <p class="mb-0">{{ s.message }}</p>
            </div>
            <div class="modal-footer">
              <button class="btn btn-outline-secondary" (click)="confirm.answer(false)">Cancel</button>
              <button
                class="btn"
                [class.btn-danger]="s.danger"
                [class.btn-primary]="!s.danger"
                (click)="confirm.answer(true)"
              >
                {{ s.confirmText }}
              </button>
            </div>
          </div>
        </div>
      </div>
      <div class="modal-backdrop fade show"></div>
    }
  `,
})
export class ConfirmDialogComponent {
  protected readonly confirm = inject(ConfirmService);
}
