import { TestBed } from '@angular/core/testing';
import { AnalyticsService } from './analytics.service';
import { CookieService } from 'ngx-cookie-service';
import { PLATFORM_ID } from '@angular/core';
import { RuntimeConfigService } from './runtime-config.service';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { EMPTY, of } from 'rxjs';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let cookieServiceMock: any;
  let httpClientMock: { post: ReturnType<typeof vi.fn> };
  let runtimeConfigMock: {
    ga4MeasurementId: ReturnType<typeof vi.fn>;
    gtmContainerId: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    cookieServiceMock = {
      get: vi.fn(),
      set: vi.fn(),
    };
    httpClientMock = {
      post: vi.fn(() => of({ accepted: true })),
    };
    runtimeConfigMock = {
      ga4MeasurementId: vi.fn().mockReturnValue(''),
      gtmContainerId: vi.fn().mockReturnValue(''),
    };

    TestBed.configureTestingModule({
      providers: [
        AnalyticsService,
        { provide: CookieService, useValue: cookieServiceMock },
        { provide: HttpClient, useValue: httpClientMock },
        { provide: RuntimeConfigService, useValue: runtimeConfigMock },
        { provide: Router, useValue: { events: EMPTY, url: '/test' } },
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    });

    service = TestBed.inject(AnalyticsService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete (window as any).gtag;
    delete (window as any).dataLayer;
    const scripts = document.head.querySelectorAll(
      'script[src*="googletagmanager"]',
    );
    scripts.forEach((s) => s.remove());
    window.sessionStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should not load GA if no consent cookie', () => {
    cookieServiceMock.get.mockReturnValue('');
    const spy = vi.spyOn(document.head, 'appendChild');

    service.init();
    expect(spy).not.toHaveBeenCalled();
  });

  it('should not load GA if analytics consent is false', () => {
    cookieServiceMock.get.mockReturnValue(JSON.stringify({ analytics: false }));
    const spy = vi.spyOn(document.head, 'appendChild');

    service.init();
    expect(spy).not.toHaveBeenCalled();
  });

  it('should load GA if analytics consent is true and GA ID is set', () => {
    cookieServiceMock.get.mockReturnValue(JSON.stringify({ analytics: true }));
    runtimeConfigMock.ga4MeasurementId.mockReturnValue('G-TEST');

    const spy = vi.spyOn(document.head, 'appendChild');

    service.init();
    expect(spy).toHaveBeenCalled();
    const script = spy.mock.calls[0][0] as HTMLScriptElement;
    expect(script.src).toContain('googletagmanager.com/gtag/js?id=G-TEST');
  });

  it('should load GTM before GA when a GTM container is configured', () => {
    cookieServiceMock.get.mockImplementation((name: string) =>
      name === 'cookie-consent-v2' ? JSON.stringify({ analytics: true }) : '',
    );
    runtimeConfigMock.ga4MeasurementId.mockReturnValue('G-TEST');
    runtimeConfigMock.gtmContainerId.mockReturnValue('GTM-ABC123');

    const spy = vi.spyOn(document.head, 'appendChild');

    service.init();
    service.trackEvent('premium_content_view', { content_id: 'h-1' });

    expect(spy).toHaveBeenCalled();
    const script = spy.mock.calls[0][0] as HTMLScriptElement;
    expect(script.src).toContain('googletagmanager.com/gtm.js?id=GTM-ABC123');
    expect((window as any).dataLayer).toContainEqual(
      expect.objectContaining({
        event: 'premium_content_view',
        content_id: 'h-1',
      }),
    );
  });

  it('should not init if not in browser', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        AnalyticsService,
        { provide: CookieService, useValue: cookieServiceMock },
        { provide: HttpClient, useValue: httpClientMock },
        { provide: RuntimeConfigService, useValue: runtimeConfigMock },
        { provide: Router, useValue: { events: EMPTY, url: '/test' } },
        { provide: PLATFORM_ID, useValue: 'server' },
      ],
    });
    const ssrService = TestBed.inject(AnalyticsService);
    const spy = vi.spyOn(document.head, 'appendChild');
    ssrService.init();
    expect(spy).not.toHaveBeenCalled();
  });

  it('should track events only with consent', () => {
    service.trackEvent('test_event');
    expect((window as any).dataLayer).toBeUndefined();

    cookieServiceMock.get.mockReturnValue(JSON.stringify({ analytics: true }));
    runtimeConfigMock.ga4MeasurementId.mockReturnValue('G-123');
    service.init();

    service.trackEvent('test_event', { foo: 'bar' });
    expect((window as any).dataLayer).toContainEqual(
      expect.arrayContaining([
        'event',
        'test_event',
        expect.objectContaining({ foo: 'bar' }),
      ]),
    );
  });

  it('should handle late consent', () => {
    service.setGaId('G-LATE');
    service.onConsentGranted();
    expect((window as any).gtag).toBeDefined();
  });

  it('should ignore placeholder GA IDs', () => {
    cookieServiceMock.get.mockReturnValue(JSON.stringify({ analytics: true }));
    runtimeConfigMock.ga4MeasurementId.mockReturnValue('G-XXXXXXXXXX');
    const spy = vi.spyOn(document.head, 'appendChild');

    service.init();

    expect(spy).not.toHaveBeenCalled();
  });

  it('should emit standard e-commerce events', () => {
    cookieServiceMock.get.mockReturnValue(JSON.stringify({ analytics: true }));
    runtimeConfigMock.ga4MeasurementId.mockReturnValue('G-TEST');
    service.init();

    service.trackAddToCart(
      {
        id: 1,
        documentId: 'product-1',
        name: 'Amulet',
        slug: 'amulet',
        description: 'Test',
        price: 25,
        currency: 'PLN',
        category: 'Talizmany',
      },
      2,
    );

    expect((window as any).dataLayer).toContainEqual(
      expect.arrayContaining([
        'event',
        'add_to_cart',
        expect.objectContaining({
          currency: 'PLN',
          value: 50,
          items: [
            expect.objectContaining({
              item_id: 'product-1',
              item_name: 'Amulet',
              quantity: 2,
            }),
          ],
        }),
      ]),
    );
  });

  it('should send first-party premium analytics without GA consent', () => {
    cookieServiceMock.get.mockReturnValue('');

    service.trackDailyHoroscopeView({
      content_type: 'horoscope',
      content_id: 'horoscope-baran-dzienny',
      content_slug: 'dzienny-baran',
      sign_slug: 'baran',
      horoscope_period: 'dzienny',
      premium_mode: 'open',
      access_state: 'open',
    });

    expect(httpClientMock.post).toHaveBeenCalledWith(
      '/api/analytics/events',
      expect.objectContaining({
        event_type: 'daily_horoscope_view',
        visitor_id: expect.any(String),
        session_id: expect.any(String),
        content_id: 'horoscope-baran-dzienny',
      }),
    );
    expect((window as any).dataLayer).toBeUndefined();
  });
});
