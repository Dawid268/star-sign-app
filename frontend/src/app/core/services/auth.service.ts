import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { StrapiAuthResponse, StrapiAuthUser } from '@star-sign-monorepo/shared-types';

type AuthSession = {
  jwt: string;
  user: StrapiAuthUser;
};

const AUTH_STORAGE_KEY = 'star-sign-auth-session';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly apiUrl = environment.apiUrl;
  private readonly browser = isPlatformBrowser(this.platformId);

  private readonly sessionState = signal<AuthSession | null>(this.readSessionFromStorage());

  public readonly session = computed(() => this.sessionState());
  public readonly user = computed(() => this.sessionState()?.user || null);
  public readonly isLoggedIn = computed(() => Boolean(this.sessionState()?.jwt));
  public readonly token = computed(() => this.sessionState()?.jwt || null);

  public login(identifier: string, password: string): Observable<StrapiAuthResponse> {
    return this.http
      .post<StrapiAuthResponse>(`${this.apiUrl}/auth/local`, {
        identifier,
        password,
      })
      .pipe(tap((response) => this.persistAuth(response)));
  }

  public register(input: { username: string; email: string; password: string }): Observable<StrapiAuthResponse> {
    return this.http.post<StrapiAuthResponse>(`${this.apiUrl}/auth/local/register`, input).pipe(
      tap((response) => this.persistAuth(response))
    );
  }

  public logout(): void {
    this.sessionState.set(null);
    if (this.browser) {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }

  public updateUser(user: StrapiAuthUser): void {
    const current = this.sessionState();
    if (!current) {
      return;
    }

    const next = {
      ...current,
      user,
    };

    this.sessionState.set(next);
    this.writeSessionToStorage(next);
  }

  private persistAuth(payload: StrapiAuthResponse): void {
    const next = {
      jwt: payload.jwt,
      user: payload.user,
    };
    this.sessionState.set(next);
    this.writeSessionToStorage(next);
  }

  private readSessionFromStorage(): AuthSession | null {
    if (!this.browser) {
      return null;
    }

    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw) as AuthSession;
      if (!parsed?.jwt || !parsed?.user?.id) {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        return null;
      }
      return parsed;
    } catch {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      return null;
    }
  }

  private writeSessionToStorage(session: AuthSession): void {
    if (!this.browser) {
      return;
    }
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  }
}
