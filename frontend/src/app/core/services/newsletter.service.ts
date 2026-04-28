import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { NewsletterActionResponse, NewsletterSubscribeRequest, NewsletterSubscribeResponse } from '@star-sign-monorepo/shared-types';

@Injectable({
  providedIn: 'root'
})
export class NewsletterService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  public subscribe(payload: NewsletterSubscribeRequest): Observable<NewsletterSubscribeResponse> {
    return this.http.post<NewsletterSubscribeResponse>(`${this.apiUrl}/newsletter/subscribe`, payload);
  }

  public confirm(token: string): Observable<NewsletterActionResponse> {
    return this.http.get<NewsletterActionResponse>(`${this.apiUrl}/newsletter/confirm/${encodeURIComponent(token)}`);
  }

  public unsubscribe(token: string): Observable<NewsletterActionResponse> {
    return this.http.get<NewsletterActionResponse>(`${this.apiUrl}/newsletter/unsubscribe/${encodeURIComponent(token)}`);
  }
}
