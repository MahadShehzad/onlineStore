import { Component, input } from '@angular/core';

@Component({
  selector: 'app-spinner',
  template: `
    <div class="d-flex justify-content-center align-items-center gap-2 text-muted py-4">
      <span class="spinner-border spinner-border-sm"></span>
      <span>{{ label() }}</span>
    </div>
  `,
})
export class SpinnerComponent {
  readonly label = input('Loading…');
}
