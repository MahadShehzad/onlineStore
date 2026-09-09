import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Dispute } from '../models/commerce.model';

@Injectable({ providedIn: 'root' })
export class DisputeService {
  private readonly http = inject(HttpClient);

  mine(): Observable<Dispute[]> {
    return this.http.get<Dispute[]>('/api/disputes/mine');
  }

  create(orderId: string, subject: string, description: string): Observable<Dispute> {
    return this.http.post<Dispute>('/api/disputes', { orderId, subject, description });
  }
}
