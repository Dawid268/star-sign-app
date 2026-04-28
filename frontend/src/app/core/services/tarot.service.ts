import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, of } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { StrapiCollectionResponse } from '@star-sign-monorepo/shared-types';
import { DailyTarotDrawResponse, TarotCard } from '@star-sign-monorepo/shared-types';
import { API_REQUEST_TIMEOUT_MS } from './api-timeout';

@Injectable({
  providedIn: 'root'
})
export class TarotService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  public getDailyCard(): Observable<DailyTarotDrawResponse> {
    return this.http.get<DailyTarotDrawResponse>(`${this.apiUrl}/daily-tarot/today`).pipe(timeout(API_REQUEST_TIMEOUT_MS));
  }

  public getCardBySlug(slug: string): Observable<TarotCard | undefined> {
    return this.http
      .get<StrapiCollectionResponse<TarotCard>>(`${this.apiUrl}/tarot-cards?filters[slug][$eq]=${slug}`)
      .pipe(
        timeout(API_REQUEST_TIMEOUT_MS),
        map((response) => response.data[0]),
        catchError(() => of(undefined))
      );
  }
}
