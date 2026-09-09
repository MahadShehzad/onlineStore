import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Address, AddressInput } from '../models/commerce.model';

@Injectable({ providedIn: 'root' })
export class AddressService {
  private readonly http = inject(HttpClient);

  list(): Observable<Address[]> {
    return this.http.get<Address[]>('/api/addresses');
  }

  create(input: AddressInput): Observable<Address> {
    return this.http.post<Address>('/api/addresses', input);
  }

  update(id: string, input: AddressInput): Observable<Address> {
    return this.http.put<Address>(`/api/addresses/${id}`, input);
  }

  remove(id: string): Observable<unknown> {
    return this.http.delete(`/api/addresses/${id}`);
  }
}
