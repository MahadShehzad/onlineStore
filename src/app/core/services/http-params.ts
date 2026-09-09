import { HttpParams } from '@angular/common/http';

/** Build HttpParams from a plain object, skipping null/undefined/'' values. */
export function toParams(query: Record<string, unknown>): HttpParams {
  let params = new HttpParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined || value === '') continue;
    params = params.set(key, String(value));
  }
  return params;
}
