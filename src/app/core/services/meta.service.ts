import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { PlatformSetting } from '../models/vendor.model';

const FALLBACK: PlatformSetting = {
  defaultCommissionRate: 10,
  shippingFlatFee: 200,
  currencyCode: 'PKR',
  currencySymbol: 'Rs',
};

/** Public platform config (currency, shipping fee). Loaded once at startup. */
@Injectable({ providedIn: 'root' })
export class MetaService {
  private readonly http = inject(HttpClient);
  readonly settings = signal<PlatformSetting>(FALLBACK);

  async load(): Promise<void> {
    try {
      this.settings.set(await firstValueFrom(this.http.get<PlatformSetting>('/api/meta')));
    } catch {
      this.settings.set(FALLBACK);
    }
  }

  get symbol(): string {
    return this.settings().currencySymbol;
  }
}
