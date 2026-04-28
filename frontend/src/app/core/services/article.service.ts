import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, timeout } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { StrapiCollectionResponse } from '@star-sign-monorepo/shared-types';
import { Article } from '@star-sign-monorepo/shared-types';
import { API_REQUEST_TIMEOUT_MS } from './api-timeout';

@Injectable({
  providedIn: 'root'
})
export class ArticleService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  public getRecentArticles(limit = 3): Observable<Article[]> {
    return this.http
      .get<StrapiCollectionResponse<Article>>(`${this.apiUrl}/articles?sort=publishedAt:desc&pagination[limit]=${limit}&populate=category`)
      .pipe(
        timeout(API_REQUEST_TIMEOUT_MS),
        map((response) => response.data),
        catchError(() => of([]))
      );
  }

  public getArticleBySlug(slug: string): Observable<Article | undefined> {
    return this.http
      .get<StrapiCollectionResponse<Article>>(`${this.apiUrl}/articles?filters[slug][$eq]=${slug}&populate=category`)
      .pipe(
        timeout(API_REQUEST_TIMEOUT_MS),
        map((response) => response.data[0]),
        catchError(() => of(undefined))
      );
  }
}
