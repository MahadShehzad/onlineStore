import { Component, computed, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { TimeSeriesPoint } from '../../core/models/vendor.model';

/**
 * Dependency-free responsive bar chart (inline SVG). Plots `revenue` per point
 * and shows the value + label on hover via <title>.
 */
@Component({
  selector: 'app-bar-chart',
  template: `
    <div class="w-100" style="overflow-x: auto">
      <svg
        [attr.viewBox]="'0 0 ' + width() + ' 180'"
        preserveAspectRatio="none"
        class="w-100"
        style="min-width: 480px; height: 180px"
        role="img"
        [attr.aria-label]="title()"
      >
        @for (bar of bars(); track bar.label) {
          <g>
            <rect
              [attr.x]="bar.x"
              [attr.y]="bar.y"
              [attr.width]="barWidth()"
              [attr.height]="bar.h"
              rx="3"
              fill="var(--c-teal, #0f3040)"
              opacity="0.85"
            >
              <title>{{ bar.label }}: {{ bar.value | number: '1.0-0' }}</title>
            </rect>
            <text
              [attr.x]="bar.x + barWidth() / 2"
              y="175"
              text-anchor="middle"
              font-size="9"
              fill="#6b6b6b"
            >
              {{ bar.short }}
            </text>
          </g>
        }
      </svg>
    </div>
  `,
  imports: [DecimalPipe],
})
export class BarChartComponent {
  readonly points = input<TimeSeriesPoint[]>([]);
  readonly title = input('Revenue');

  private readonly gap = 6;
  protected readonly width = computed(() => Math.max(480, this.points().length * 34));
  protected readonly barWidth = computed(() => {
    const n = Math.max(1, this.points().length);
    return (this.width() - this.gap * (n + 1)) / n;
  });

  protected readonly bars = computed(() => {
    const pts = this.points();
    const max = Math.max(1, ...pts.map((p) => p.revenue));
    const chartH = 150;
    return pts.map((p, i) => {
      const h = Math.max(2, (p.revenue / max) * chartH);
      return {
        label: p.label,
        short: p.label.split(' ')[0],
        value: p.revenue,
        x: this.gap + i * (this.barWidth() + this.gap),
        y: chartH - h + 8,
        h,
      };
    });
  });
}
