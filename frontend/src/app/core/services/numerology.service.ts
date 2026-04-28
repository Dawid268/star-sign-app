import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, timeout } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { NumerologyProfile, StrapiCollectionResponse } from '@star-sign-monorepo/shared-types';
import { API_REQUEST_TIMEOUT_MS } from './api-timeout';

@Injectable({
  providedIn: 'root'
})
export class NumerologyService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  public getProfileByNumber(number: number): Observable<NumerologyProfile | undefined> {
    return this.http
      .get<StrapiCollectionResponse<NumerologyProfile>>(
        `${this.apiUrl}/numerology-profiles?filters[number][$eq]=${number}&pagination[limit]=1`
      )
      .pipe(
        timeout(API_REQUEST_TIMEOUT_MS),
        map((response) => response.data[0])
      );
  }
}
