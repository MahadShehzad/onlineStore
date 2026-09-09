import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PagedResult } from '../models/catalog.model';
import { AdminAnalytics, AdminUser, PlatformSetting } from '../models/vendor.model';
import { Dispute } from '../models/commerce.model';
import { toParams } from './http-params';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);

  users(page: number, pageSize: number, role?: string, search?: string): Observable<PagedResult<AdminUser>> {
    return this.http.get<PagedResult<AdminUser>>('/api/admin/users', {
      params: toParams({ page, pageSize, role, search }),
    });
  }

  setBlocked(id: string, blocked: boolean): Observable<AdminUser> {
    return this.http.put<AdminUser>(`/api/admin/users/${id}/block`, { blocked });
  }

  settings(): Observable<PlatformSetting> {
    return this.http.get<PlatformSetting>('/api/admin/settings');
  }

  updateSettings(defaultCommissionRate: number, shippingFlatFee: number): Observable<PlatformSetting> {
    return this.http.put<PlatformSetting>('/api/admin/settings', {
      defaultCommissionRate,
      shippingFlatFee,
    });
  }

  analytics(): Observable<AdminAnalytics> {
    return this.http.get<AdminAnalytics>('/api/analytics/admin');
  }

  disputes(page: number, pageSize: number, status?: string): Observable<PagedResult<Dispute>> {
    return this.http.get<PagedResult<Dispute>>('/api/disputes', {
      params: toParams({ page, pageSize, status }),
    });
  }

  resolveDispute(id: string, status: 'Resolved' | 'Rejected', resolution: string): Observable<Dispute> {
    return this.http.put<Dispute>(`/api/disputes/${id}/resolve`, { status, resolution });
  }
}
