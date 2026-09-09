import { Pipe, PipeTransform, inject } from '@angular/core';
import { MetaService } from '../../core/services/meta.service';

/**
 * Formats a number as the platform currency, e.g. `Rs 18,999`.
 * Impure so the symbol updates once /api/meta resolves.
 */
@Pipe({ name: 'money', pure: false })
export class MoneyPipe implements PipeTransform {
  private readonly meta = inject(MetaService);

  transform(value: number | null | undefined): string {
    const n = typeof value === 'number' && isFinite(value) ? value : 0;
    return `${this.meta.symbol} ${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  }
}
