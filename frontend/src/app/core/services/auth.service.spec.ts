import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { HttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';
import { PLATFORM_ID } from '@angular/core';
import { vi } from 'vitest';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  const mockSession = {
    jwt: 'test-token',
    user: { id: 1, username: 'testuser', email: 'test@example.com' },
  };

  beforeEach(() => {
    // Mock localStorage
    const store: Record<string, string> = {};
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key) => store[key] || null),
      setItem: vi.fn((key, value) => {
        store[key] = value.toString();
      }),
      removeItem: vi.fn((key) => {
        delete store[key];
      }),
      clear: vi.fn(() => {
        for (const key in store) delete store[key];
      }),
    });

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AuthService, { provide: PLATFORM_ID, useValue: 'browser' }],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    vi.unstubAllGlobals();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should login and persist session', () => {
    service.login('user', 'pass').subscribe((res) => {
      expect(res.jwt).toBe('test-token');
      expect(service.isLoggedIn()).toBe(true);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/local`);
    req.flush(mockSession);

    expect(localStorage.setItem).toHaveBeenCalled();
  });

  it('should logout and clear storage', () => {
    service.logout();
    expect(service.isLoggedIn()).toBe(false);
    expect(localStorage.removeItem).toHaveBeenCalled();
  });

  it('should expire session and clear storage without requiring a logout action', () => {
    service.login('user', 'pass').subscribe();
    httpMock.expectOne(`${environment.apiUrl}/auth/local`).flush(mockSession);

    service.expireSession();

    expect(service.isLoggedIn()).toBe(false);
    expect(service.token()).toBeNull();
    expect(localStorage.removeItem).toHaveBeenCalled();
  });

  it('should update user', () => {
    service.login('u', 'p').subscribe();
    httpMock.expectOne((req) => true).flush(mockSession);

    const newUser = { ...mockSession.user, username: 'updated' } as any;
    service.updateUser(newUser);
    expect(service.user()?.username).toBe('updated');
  });

  it('should register and persist session', () => {
    const regInput = { username: 'new', email: 'new@a.com', password: '123' };
    service.register(regInput).subscribe((res) => {
      expect(res.jwt).toBe('test-token');
      expect(service.isLoggedIn()).toBe(true);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/local/register`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(regInput);
    req.flush(mockSession);
  });

  it('should handle registration error', () => {
    service.register({} as any).subscribe({
      error: (err) => expect(err.status).toBe(400),
    });
    const req = httpMock.expectOne(`${environment.apiUrl}/auth/local/register`);
    req.flush('Error', { status: 400, statusText: 'Bad Request' });
  });

  it('should handle login error', () => {
    service.login('u', 'p').subscribe({
      error: (err) => expect(err.status).toBe(401),
    });
    const req = httpMock.expectOne(`${environment.apiUrl}/auth/local`);
    req.flush('Error', { status: 401, statusText: 'Unauthorized' });
  });

  it('should not update user if no session exists', () => {
    service.logout();
    service.updateUser({ id: 99 } as any);
    expect(service.user()).toBeNull();
  });

  it('should handle malformed JSON in storage', () => {
    vi.mocked(localStorage.getItem).mockReturnValue('invalid-json');

    // Use runInInjectionContext if possible, but simpler to just re-configure TestBed
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AuthService, { provide: PLATFORM_ID, useValue: 'browser' }],
    });
    const corruptedService = TestBed.inject(AuthService);

    expect(corruptedService.isLoggedIn()).toBe(false);
    expect(localStorage.removeItem).toHaveBeenCalled();
  });

  it('should handle session with missing JWT in storage', () => {
    vi.mocked(localStorage.getItem).mockReturnValue(
      JSON.stringify({ user: { id: 1 } }),
    );

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AuthService, { provide: PLATFORM_ID, useValue: 'browser' }],
    });
    const corruptedService = TestBed.inject(AuthService);

    expect(corruptedService.isLoggedIn()).toBe(false);
  });

  it('should not use storage if not in browser', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AuthService, { provide: PLATFORM_ID, useValue: 'server' }],
    });
    const ssrService = TestBed.inject(AuthService);

    ssrService.logout();
    expect(localStorage.removeItem).not.toHaveBeenCalled();

    ssrService.login('u', 'p').subscribe();
    const req = TestBed.inject(HttpTestingController).expectOne(() => true);
    req.flush(mockSession);
    expect(localStorage.setItem).not.toHaveBeenCalled();
  });

  it('should restore valid session from storage', () => {
    vi.mocked(localStorage.getItem).mockReturnValue(
      JSON.stringify(mockSession),
    );

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AuthService, { provide: PLATFORM_ID, useValue: 'browser' }],
    });
    const restoredService = TestBed.inject(AuthService);

    expect(restoredService.isLoggedIn()).toBe(true);
    expect(restoredService.token()).toBe('test-token');
  });
});
