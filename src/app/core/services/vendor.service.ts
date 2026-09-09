import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PagedResult } from '../models/catalog.model';
import { StoreSettingsInput, Vendor, VendorAnalytics } from '../models/vendor.model';
import { toParams } from './http-params';

@Injectable({ providedIn: 'root' })
export class VendorService {
  private readonly http = inject(HttpClient);

  // ---- vendor: own store ----
  mine(): Observable<Vendor> {
    return this.http.get<Vendor>('/api/vendors/me');
  }

  updateStore(input: StoreSettingsInput): Observable<Vendor> {
    return this.http.put<Vendor>('/api/vendors/me', input);
  }

  analytics(): Observable<VendorAnalytics> {
    return this.http.get<VendorAnalytics>('/api/analytics/vendor');
  }

  publicStore(id: string): Observable<Vendor> {
    return this.http.get<Vendor>(`/api/vendors/${id}`);
  }

  // ---- admin ----
  list(page: number, pageSize: number, status?: string, search?: string): Observable<PagedResult<Vendor>> {
    return this.http.get<PagedResult<Vendor>>('/api/vendors', {
      params: toParams({ page, pageSize, status, search }),
    });
  }

  approve(id: string): Observable<Vendor> {
    return this.http.post<Vendor>(`/api/vendors/${id}/approve`, {});
  }

  reject(id: string, reason: string): Observable<Vendor> {
    return this.http.post<Vendor>(`/api/vendors/${id}/reject`, { reason });
  }

  setCommission(id: string, commissionRate: number): Observable<Vendor> {
    return this.http.put<Vendor>(`/api/vendors/${id}/commission`, { commissionRate });
  }
}
