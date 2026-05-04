import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { AccountService } from './account.service';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { of } from 'rxjs';

describe('AccountService', () => {
  let service: AccountService;
  let httpMock: HttpTestingController;
  let authServiceMock: any;

  beforeEach(() => {
    authServiceMock = {
      isLoggedIn: () => true,
    };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AccountService,
        { provide: AuthService, useValue: authServiceMock },
      ],
    });
    service = TestBed.inject(AccountService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should get me when logged in', () => {
    const mockResponse = { profile: { username: 'test' } };
    service.getMe().subscribe((res) => {
      expect(res?.profile.username).toBe('test');
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/account/me`);
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('should return null when not logged in', () => {
    authServiceMock.isLoggedIn = () => false;
    service.getMe().subscribe((res) => {
      expect(res).toBeNull();
    });

    httpMock.expectNone(`${environment.apiUrl}/account/me`);
  });

  it('should update profile', () => {
    const mockInput = {
      birthDate: '1990-01-01',
      birthTime: null,
      birthPlace: null,
      marketingConsent: true,
    };
    service.updateProfile(mockInput).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/account/profile`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(mockInput);
    expect(req.request.body).not.toHaveProperty('zodiacSignSlug');
    req.flush({});
  });

  it('should delete account', () => {
    service.deleteAccount().subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/account/profile`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
