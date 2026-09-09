import { Component, computed, input, output } from '@angular/core';
import { DecimalPipe } from '@angular/common';

/** Read-only star display, or interactive when `editable` is set. */
@Component({
  selector: 'app-star-rating',
  template: `
    <span class="d-inline-flex align-items-center" [style.gap.rem]="0.1">
      @for (star of stars(); track $index) {
        <button
          type="button"
          class="btn btn-link p-0 border-0 lh-1"
          [class.pe-none]="!editable()"
          [attr.aria-label]="star + ' star' + (star === 1 ? '' : 's')"
          (click)="pick(star)"
          (mouseenter)="hover = star"
          (mouseleave)="hover = 0"
        >
          <i
            class="bi"
            [class.bi-star-fill]="star <= (hover || value())"
            [class.bi-star]="star > (hover || value())"
            [style.color]="'#e8a13c'"
            [style.font-size.rem]="size()"
          ></i>
        </button>
      }
      @if (showValue()) {
        <span class="ms-1 small text-muted">{{ value() | number: '1.1-1' }}</span>
      }
    </span>
  `,
  imports: [DecimalPipe],
})
export class StarRatingComponent {
  readonly value = input(0);
  readonly editable = input(false);
  readonly showValue = input(false);
  readonly size = input(1);
  readonly rate = output<number>();

  protected hover = 0;
  protected readonly stars = computed(() => [1, 2, 3, 4, 5]);

  protected pick(star: number): void {
    if (this.editable()) this.rate.emit(star);
  }
}
