import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Order, OrderStatus } from '../models/commerce.model';
import { PagedResult } from '../models/catalog.model';
import { toParams } from './http-params';

@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly http = inject(HttpClient);

  checkout(addressId: string, paymentMethod: string): Observable<Order[]> {
    return this.http.post<Order[]>('/api/orders/checkout', { addressId, paymentMethod });
  }

  mine(page: number, pageSize: number, status?: string): Observable<PagedResult<Order>> {
    return this.http.get<PagedResult<Order>>('/api/orders/mine', {
      params: toParams({ page, pageSize, status }),
    });
  }

  forVendor(page: number, pageSize: number, status?: string): Observable<PagedResult<Order>> {
    return this.http.get<PagedResult<Order>>('/api/orders/vendor', {
      params: toParams({ page, pageSize, status }),
    });
  }

  all(page: number, pageSize: number, status?: string, search?: string): Observable<PagedResult<Order>> {
    return this.http.get<PagedResult<Order>>('/api/orders', {
      params: toParams({ page, pageSize, status, search }),
    });
  }

  detail(id: string): Observable<Order> {
    return this.http.get<Order>(`/api/orders/${id}`);
  }

  cancel(id: string): Observable<Order> {
    return this.http.post<Order>(`/api/orders/${id}/cancel`, {});
  }

  setStatus(id: string, status: OrderStatus, reason?: string): Observable<Order> {
    return this.http.put<Order>(`/api/orders/${id}/status`, { status, reason });
  }
}
