import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AccountDashboardResponse,
  AccountMeResponse,
  AccountReadingsResponse,
  SaveTodayReadingResponse,
  SubscriptionCheckoutResponse,
  SubscriptionPortalResponse,
} from '@star-sign-monorepo/shared-types';
import { API_REQUEST_TIMEOUT_MS } from './api-timeout';

@Injectable({
  providedIn: 'root',
})
export class AccountService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  public getMe(): Observable<AccountMeResponse> {
    return this.http.get<AccountMeResponse>(`${this.apiUrl}/account/me`).pipe(timeout(API_REQUEST_TIMEOUT_MS));
  }

  public updateProfile(input: {
    birthDate: string | null;
    birthTime: string | null;
    birthPlace: string | null;
    zodiacSignSlug: string | null;
    marketingConsent: boolean;
  }): Observable<AccountMeResponse> {
    return this.http.put<AccountMeResponse>(`${this.apiUrl}/account/profile`, input).pipe(timeout(API_REQUEST_TIMEOUT_MS));
  }

  public getDashboard(): Observable<AccountDashboardResponse> {
    return this.http.get<AccountDashboardResponse>(`${this.apiUrl}/account/dashboard`).pipe(timeout(API_REQUEST_TIMEOUT_MS));
  }

  public getReadings(limit = 20): Observable<AccountReadingsResponse> {
    return this.http
      .get<AccountReadingsResponse>(`${this.apiUrl}/account/readings?limit=${Math.max(1, Math.floor(limit))}`)
      .pipe(timeout(API_REQUEST_TIMEOUT_MS));
  }

  public saveTodayReading(readingType: 'horoscope' | 'tarot'): Observable<SaveTodayReadingResponse> {
    return this.http
      .post<SaveTodayReadingResponse>(`${this.apiUrl}/account/readings/save-today`, { readingType })
      .pipe(timeout(API_REQUEST_TIMEOUT_MS));
  }

  public startSubscriptionCheckout(plan: 'monthly' | 'annual'): Observable<SubscriptionCheckoutResponse> {
    return this.http
      .post<SubscriptionCheckoutResponse>(`${this.apiUrl}/account/subscription/checkout`, { plan })
      .pipe(timeout(API_REQUEST_TIMEOUT_MS));
  }

  public openSubscriptionPortal(): Observable<SubscriptionPortalResponse> {
    return this.http
      .post<SubscriptionPortalResponse>(`${this.apiUrl}/account/subscription/portal`, {})
      .pipe(timeout(API_REQUEST_TIMEOUT_MS));
  }
}
