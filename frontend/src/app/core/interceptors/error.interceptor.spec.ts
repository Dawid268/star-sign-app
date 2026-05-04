import {
  HttpClient,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { vi } from 'vitest';

import { errorInterceptor } from './error.interceptor';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification';

describe('errorInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let authService: { expireSession: ReturnType<typeof vi.fn> };
  let notificationService: { error: ReturnType<typeof vi.fn> };
  let router: { url: string; navigate: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    authService = {
      expireSession: vi.fn(),
    };
    notificationService = {
      error: vi.fn(),
    };
    router = {
      url: '/panel',
      navigate: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authService },
        { provide: NotificationService, useValue: notificationService },
        { provide: Router, useValue: router },
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('expires local session and redirects on authenticated request 401', () => {
    http.get('/api/account/me').subscribe({ error: () => undefined });

    const req = httpMock.expectOne('/api/account/me');
    req.flush(
      { error: { message: 'Unauthorized' } },
      { status: 401, statusText: 'Unauthorized' },
    );

    expect(authService.expireSession).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/logowanie'], {
      queryParams: { returnUrl: '/panel' },
    });
    expect(notificationService.error).toHaveBeenCalledWith(
      'Twoja sesja wygasła. Zaloguj się ponownie.',
    );
  });

  it('does not expire session for failed local login attempts', () => {
    http.post('/api/auth/local', {}).subscribe({ error: () => undefined });

    const req = httpMock.expectOne('/api/auth/local');
    req.flush(
      { error: { message: 'Invalid identifier or password' } },
      { status: 400, statusText: 'Bad Request' },
    );

    expect(authService.expireSession).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
    expect(notificationService.error).not.toHaveBeenCalled();
  });
});
