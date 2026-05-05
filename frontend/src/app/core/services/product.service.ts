import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, timeout } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  StrapiCollectionResponse,
  Product,
} from '@star-sign-monorepo/shared-types';
import { API_REQUEST_TIMEOUT_MS } from './api-timeout';
import { featureFlags } from '../feature-flags';

@Injectable({
  providedIn: 'root',
})
export class ProductService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  public getProducts(category?: string): Observable<Product[]> {
    if (!featureFlags.shopEnabled) {
      return of([]);
    }

    let url = `${this.apiUrl}/products?populate=*`;
    if (category && category !== 'Wszystko') {
      url += `&filters[category][$eq]=${encodeURIComponent(category)}`;
    }
    return this.http.get<StrapiCollectionResponse<Product>>(url).pipe(
      timeout(API_REQUEST_TIMEOUT_MS),
      map((response) => response.data),
      catchError(() => of([])),
    );
  }

  public getProductById(documentId: string): Observable<Product> {
    if (!featureFlags.shopEnabled) {
      return throwError(
        () => new Error('Funkcja sklepu jest tymczasowo wyłączona.'),
      );
    }

    return this.http
      .get<{
        data: Product;
      }>(`${this.apiUrl}/products/${documentId}?populate=*`)
      .pipe(
        timeout(API_REQUEST_TIMEOUT_MS),
        map((response) => response.data),
      );
  }
}
