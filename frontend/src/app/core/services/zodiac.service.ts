import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, timeout } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { StrapiCollectionResponse } from '@star-sign-monorepo/shared-types';
import { ZodiacSign } from '@star-sign-monorepo/shared-types';
import { API_REQUEST_TIMEOUT_MS } from './api-timeout';

type HoroscopePeriod = 'Dzienny' | 'Tygodniowy' | 'Miesięczny' | 'Roczny';

export interface HoroscopeEntry {
  id: number;
  documentId: string;
  period: HoroscopePeriod;
  content: string;
  date: string;
}

@Injectable({
  providedIn: 'root'
})
export class ZodiacService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  private readonly periodMap: Record<string, HoroscopePeriod> = {
    dzienny: 'Dzienny',
    tygodniowy: 'Tygodniowy',
    miesieczny: 'Miesięczny',
    roczny: 'Roczny',
  };

  public getZodiacSigns(): Observable<ZodiacSign[]> {
    return this.http
      .get<StrapiCollectionResponse<ZodiacSign>>(`${this.apiUrl}/zodiac-signs?sort=id:asc`)
      .pipe(
        timeout(API_REQUEST_TIMEOUT_MS),
        map((response) => response.data),
        catchError(() => of([]))
      );
  }

  public getHoroscope(type: string, signSlug: string): Observable<HoroscopeEntry | undefined> {
    const period = this.periodMap[type] || 'Dzienny';
    return this.http
      .get<StrapiCollectionResponse<HoroscopeEntry>>(
        `${this.apiUrl}/horoscopes?filters[period][$eq]=${period}&filters[zodiac_sign][slug][$eq]=${signSlug}&sort=date:desc`
      )
      .pipe(
        timeout(API_REQUEST_TIMEOUT_MS),
        map((response) => response.data[0]),
        catchError(() => of(undefined))
      );
  }
}
