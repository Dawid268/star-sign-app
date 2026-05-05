import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import {
  AppSettingsService,
  DEFAULT_PUBLIC_APP_SETTINGS,
} from './app-settings.service';
import { environment } from '../../../environments/environment';

describe('AppSettingsService', () => {
  let service: AppSettingsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AppSettingsService],
    });

    service = TestBed.inject(AppSettingsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should load public app settings without auth-only UI side effects', () => {
    service.getPublicAppSettings().subscribe((settings) => {
      expect(settings).toEqual({
        premiumMode: 'paid',
        premiumAccessPolicy: 'paid_enforced',
        currency: 'EUR',
        monthlyPrice: 39.99,
        annualPrice: 299,
        stripeCheckoutEnabled: true,
        paidPremiumEnabled: true,
        trialDays: 14,
        allowPromotionCodes: false,
        maintenanceMode: {
          enabled: true,
          title: 'Przerwa techniczna',
          message: 'Wracamy po aktualizacji.',
          eta: '2026-05-05T18:00:00.000Z',
          contactUrl: 'mailto:pomoc@example.com',
          allowedPaths: ['/polityka-prywatnosci'],
        },
      });
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/app-settings/public`);
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.get('X-Skip-Loading')).toBe('true');
    expect(req.request.headers.get('X-Skip-Error-Notification')).toBe('true');
    req.flush({
      premiumMode: 'paid',
      premiumAccessPolicy: 'paid_enforced',
      currency: 'EUR',
      monthlyPrice: '39.99',
      annualPrice: 299,
      stripeCheckoutEnabled: true,
      paidPremiumEnabled: true,
      trialDays: 14,
      allowPromotionCodes: false,
      maintenanceMode: {
        enabled: true,
        title: ' Przerwa techniczna ',
        message: ' Wracamy po aktualizacji. ',
        eta: '2026-05-05T18:00:00.000Z',
        contactUrl: 'mailto:pomoc@example.com',
        allowedPaths: [
          '/polityka-prywatnosci',
          '//bad.example',
          'https://bad.example',
          '/polityka-prywatnosci',
        ],
      },
      stripeMonthlyPriceId: 'price_hidden',
    });
  });

  it('should keep checkout disabled when backend does not explicitly expose paid readiness', () => {
    service.getPublicAppSettings().subscribe((settings) => {
      expect(settings.premiumMode).toBe('paid');
      expect(settings.stripeCheckoutEnabled).toBe(true);
      expect(settings.paidPremiumEnabled).toBe(false);
      expect(settings.maintenanceMode.enabled).toBe(false);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/app-settings/public`);
    req.flush({
      premiumMode: 'paid',
      stripeCheckoutEnabled: true,
    });
  });

  it('should fallback to open settings when endpoint fails', () => {
    service.getPublicAppSettings().subscribe((settings) => {
      expect(settings).toEqual(DEFAULT_PUBLIC_APP_SETTINGS);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/app-settings/public`);
    req.flush('fail', { status: 503, statusText: 'Service Unavailable' });
  });

  it('should sanitize invalid maintenance mode values', () => {
    service.getPublicAppSettings().subscribe((settings) => {
      expect(settings.maintenanceMode).toEqual({
        enabled: true,
        title: 'Pracujemy nad Star Sign',
        message: 'Dopracowujemy stronę i wrócimy za chwilę.',
        eta: null,
        contactUrl: null,
        allowedPaths: [
          '/regulamin',
          '/polityka-prywatnosci',
          '/cookies',
          '/disclaimer',
          '/newsletter/potwierdz',
          '/newsletter/wypisz',
        ],
      });
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/app-settings/public`);
    req.flush({
      maintenanceMode: {
        enabled: true,
        title: '',
        message: '   ',
        eta: 'not-a-date',
        contactUrl: 'javascript:alert(1)',
        allowedPaths: ['bad-path'],
      },
    });
  });
});
