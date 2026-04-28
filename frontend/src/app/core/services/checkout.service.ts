import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CheckoutSessionRequest, CheckoutSessionResponse } from '@star-sign-monorepo/shared-types';
import { featureFlags } from '../feature-flags';

@Injectable({
  providedIn: 'root'
})
export class CheckoutService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  public createSession(payload: CheckoutSessionRequest): Observable<CheckoutSessionResponse> {
    if (!featureFlags.shopEnabled) {
      return throwError(() => new Error('Shop feature is disabled.'));
    }

    return this.http.post<CheckoutSessionResponse>(`${this.apiUrl}/checkout/session`, payload);
  }
}
