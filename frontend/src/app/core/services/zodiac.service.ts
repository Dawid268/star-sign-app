import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, timeout } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { StrapiCollectionResponse } from '@star-sign-monorepo/shared-types';
import { ZodiacSign } from '@star-sign-monorepo/shared-types';
import { API_REQUEST_TIMEOUT_MS } from './api-timeout';
import { SpecialHoroscopeTypeName } from '../horoscope-type-definitions';

type HoroscopePeriod = 'Dzienny' | 'Tygodniowy' | 'Miesięczny' | 'Roczny';
type HoroscopeType =
  | 'Ogólny'
  | 'Miłosny'
  | 'Zawodowy'
  | 'Finansowy'
  | SpecialHoroscopeTypeName;

type HoroscopeQuery = {
  period: HoroscopePeriod;
  type: HoroscopeType;
};

export interface HoroscopeEntry {
  id: number;
  documentId: string;
  period: HoroscopePeriod;
  type?: HoroscopeType;
  content: string;
  premiumContent?: string | null;
  hasPremiumContent?: boolean;
  date: string;
}

@Injectable({
  providedIn: 'root',
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

  private readonly specialTypeMap: Record<string, SpecialHoroscopeTypeName> = {
    chinski: 'Chiński',
    celtycki: 'Celtycki',
    egipski: 'Egipski',
  };

  public getZodiacSigns(): Observable<ZodiacSign[]> {
    return this.http
      .get<
        StrapiCollectionResponse<ZodiacSign>
      >(`${this.apiUrl}/zodiac-signs?sort=id:asc&populate[0]=image`)
      .pipe(
        timeout(API_REQUEST_TIMEOUT_MS),
        map((response) => response.data),
        catchError(() => of([])),
      );
  }

  public getHoroscope(
    type: string,
    signSlug: string,
  ): Observable<HoroscopeEntry | undefined> {
    const query = this.resolveHoroscopeQuery(type);

    if (!query) {
      return of(undefined);
    }

    return this.http
      .get<
        StrapiCollectionResponse<HoroscopeEntry>
      >(`${this.apiUrl}/horoscopes?filters[period][$eq]=${encodeURIComponent(query.period)}&filters[type][$eq]=${encodeURIComponent(query.type)}&filters[zodiac_sign][slug][$eq]=${encodeURIComponent(signSlug)}&sort=date:desc&populate[zodiac_sign][populate]=image`)
      .pipe(
        timeout(API_REQUEST_TIMEOUT_MS),
        map((response) => response.data[0]),
        catchError(() => of(undefined)),
      );
  }

  private resolveHoroscopeQuery(typeSlug: string): HoroscopeQuery | undefined {
    const period = this.periodMap[typeSlug];
    if (period) {
      return { period, type: 'Ogólny' };
    }

    const specialType = this.specialTypeMap[typeSlug];
    if (specialType) {
      return { period: 'Dzienny', type: specialType };
    }

    return undefined;
  }
}
