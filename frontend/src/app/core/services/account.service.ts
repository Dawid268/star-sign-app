import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, timeout, tap } from 'rxjs';
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

import { AnalyticsService } from './analytics.service';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class AccountService {
  private readonly http = inject(HttpClient);
  private readonly analyticsService = inject(AnalyticsService);
  private readonly authService = inject(AuthService);
  private readonly apiUrl = environment.apiUrl;

  public getMe(): Observable<AccountMeResponse | null> {
    if (!this.authService.isLoggedIn()) {
      return of(null);
    }
    return this.http
      .get<AccountMeResponse>(`${this.apiUrl}/account/me`)
      .pipe(timeout(API_REQUEST_TIMEOUT_MS));
  }

  public updateProfile(input: {
    birthDate: string | null;
    birthTime: string | null;
    birthPlace: string | null;
    zodiacSignSlug?: string | null;
    marketingConsent: boolean;
  }): Observable<AccountMeResponse> {
    return this.http
      .put<AccountMeResponse>(`${this.apiUrl}/account/profile`, input)
      .pipe(
        timeout(API_REQUEST_TIMEOUT_MS),
        tap(() => this.analyticsService.trackEvent('profile_update')),
      );
  }

  public getDashboard(): Observable<AccountDashboardResponse> {
    return this.http
      .get<AccountDashboardResponse>(`${this.apiUrl}/account/dashboard`)
      .pipe(timeout(API_REQUEST_TIMEOUT_MS));
  }

  public getReadings(limit = 20): Observable<AccountReadingsResponse> {
    return this.http
      .get<AccountReadingsResponse>(
        `${this.apiUrl}/account/readings?limit=${Math.max(1, Math.floor(limit))}`,
      )
      .pipe(timeout(API_REQUEST_TIMEOUT_MS));
  }

  public saveTodayReading(
    readingType: 'horoscope' | 'tarot',
  ): Observable<SaveTodayReadingResponse> {
    return this.http
      .post<SaveTodayReadingResponse>(
        `${this.apiUrl}/account/readings/save-today`,
        { readingType },
      )
      .pipe(
        timeout(API_REQUEST_TIMEOUT_MS),
        tap(() =>
          this.analyticsService.trackEvent('reading_save', {
            type: readingType,
          }),
        ),
      );
  }

  public startSubscriptionCheckout(
    plan: 'monthly' | 'annual',
  ): Observable<SubscriptionCheckoutResponse> {
    return this.http
      .post<SubscriptionCheckoutResponse>(
        `${this.apiUrl}/account/subscription/checkout`,
        { plan },
      )
      .pipe(timeout(API_REQUEST_TIMEOUT_MS));
  }

  public openSubscriptionPortal(): Observable<SubscriptionPortalResponse> {
    return this.http
      .post<SubscriptionPortalResponse>(
        `${this.apiUrl}/account/subscription/portal`,
        {},
      )
      .pipe(timeout(API_REQUEST_TIMEOUT_MS));
  }

  public deleteAccount(): Observable<void> {
    return this.http
      .delete<void>(`${this.apiUrl}/account/profile`)
      .pipe(timeout(API_REQUEST_TIMEOUT_MS));
  }
}
