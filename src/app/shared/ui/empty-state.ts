import { Component, input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  template: `
    <div class="text-center text-muted py-5">
      <i class="bi {{ icon() }} fs-1 opacity-50"></i>
      <p class="mt-2 mb-0 fw-semibold">{{ title() }}</p>
      @if (hint()) {
        <p class="small mb-0">{{ hint() }}</p>
      }
      <ng-content />
    </div>
  `,
})
export class EmptyStateComponent {
  readonly icon = input('bi-inbox');
  readonly title = input('Nothing here yet');
  readonly hint = input('');
}
