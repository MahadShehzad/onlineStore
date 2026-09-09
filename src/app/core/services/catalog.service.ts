import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Category,
  PagedResult,
  ProductDetail,
  ProductFilters,
  ProductInput,
  ProductQuery,
  ProductSummary,
} from '../models/catalog.model';
import { toParams } from './http-params';

@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly http = inject(HttpClient);

  categories(): Observable<Category[]> {
    return this.http.get<Category[]>('/api/categories');
  }

  browse(query: ProductQuery): Observable<PagedResult<ProductSummary>> {
    const sort = query.sort === 'newest' ? undefined : query.sort;
    return this.http.get<PagedResult<ProductSummary>>('/api/products', {
      params: toParams({ ...query, sort }),
    });
  }

  filters(categorySlug?: string): Observable<ProductFilters> {
    return this.http.get<ProductFilters>('/api/products/filters', {
      params: toParams({ categorySlug }),
    });
  }

  detail(idOrSlug: string): Observable<ProductDetail> {
    return this.http.get<ProductDetail>(`/api/products/${idOrSlug}`);
  }

  related(id: string): Observable<ProductSummary[]> {
    return this.http.get<ProductSummary[]>(`/api/products/${id}/related`);
  }

  // ---- vendor-owned ----

  mine(page: number, pageSize: number, search?: string): Observable<PagedResult<ProductSummary>> {
    return this.http.get<PagedResult<ProductSummary>>('/api/products/mine', {
      params: toParams({ page, pageSize, search }),
    });
  }

  create(input: ProductInput): Observable<ProductDetail> {
    return this.http.post<ProductDetail>('/api/products', input);
  }

  update(id: string, input: ProductInput): Observable<ProductDetail> {
    return this.http.put<ProductDetail>(`/api/products/${id}`, input);
  }

  remove(id: string): Observable<unknown> {
    return this.http.delete(`/api/products/${id}`);
  }
}
