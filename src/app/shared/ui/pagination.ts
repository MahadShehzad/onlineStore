import { Component, computed, input, output } from '@angular/core';

/** Server-side pager. Emits the 1-based page the user picked. */
@Component({
  selector: 'app-pagination',
  template: `
    @if (totalPages() > 1) {
      <nav class="d-flex justify-content-center mt-4">
        <ul class="pagination mb-0">
          <li class="page-item" [class.disabled]="page() === 1">
            <button class="page-link" (click)="go(page() - 1)" [disabled]="page() === 1">
              <i class="bi bi-chevron-left"></i>
            </button>
          </li>
          @for (p of pages(); track p) {
            @if (p === -1) {
              <li class="page-item disabled"><span class="page-link">…</span></li>
            } @else {
              <li class="page-item" [class.active]="p === page()">
                <button class="page-link" (click)="go(p)">{{ p }}</button>
              </li>
            }
          }
          <li class="page-item" [class.disabled]="page() === totalPages()">
            <button class="page-link" (click)="go(page() + 1)" [disabled]="page() === totalPages()">
              <i class="bi bi-chevron-right"></i>
            </button>
          </li>
        </ul>
      </nav>
    }
  `,
})
export class PaginationComponent {
  readonly page = input(1);
  readonly totalPages = input(1);
  readonly pageChange = output<number>();

  protected readonly pages = computed<number[]>(() => {
    const total = this.totalPages();
    const current = this.page();
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

    const set = new Set([1, total, current, current - 1, current + 1]);
    const sorted = [...set].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);

    const out: number[] = [];
    let prev = 0;
    for (const p of sorted) {
      if (p - prev > 1) out.push(-1);
      out.push(p);
      prev = p;
    }
    return out;
  });

  protected go(p: number): void {
    if (p >= 1 && p <= this.totalPages() && p !== this.page()) {
      this.pageChange.emit(p);
    }
  }
}
