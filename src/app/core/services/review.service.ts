import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PagedResult, Review } from '../models/catalog.model';
import { toParams } from './http-params';

export interface ReviewEligibility {
  canReview: boolean;
  alreadyReviewed: boolean;
  purchased: boolean;
}

@Injectable({ providedIn: 'root' })
export class ReviewService {
  private readonly http = inject(HttpClient);

  forProduct(productId: string, page: number, pageSize = 5): Observable<PagedResult<Review>> {
    return this.http.get<PagedResult<Review>>(`/api/reviews/product/${productId}`, {
      params: toParams({ page, pageSize }),
    });
  }

  eligibility(productId: string): Observable<ReviewEligibility> {
    return this.http.get<ReviewEligibility>(`/api/reviews/eligibility/${productId}`);
  }

  create(productId: string, rating: number, comment: string): Observable<Review> {
    return this.http.post<Review>('/api/reviews', { productId, rating, comment });
  }
}
