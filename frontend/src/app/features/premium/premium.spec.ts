import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Premium } from './premium';
import { AccountService } from '../../core/services/account.service';
import { AuthService } from '../../core/services/auth.service';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { signal } from '@angular/core';
import { featureFlags } from '../../core/feature-flags';
import { AnalyticsService } from '../../core/services/analytics.service';
import {
  AppSettingsService,
  DEFAULT_PUBLIC_APP_SETTINGS,
} from '../../core/services/app-settings.service';
import { PublicAppSettingsResponse } from '@star-sign-monorepo/shared-types';

describe('Premium', () => {
  let component: Premium;
  let fixture: ComponentFixture<Premium>;
  let accountServiceMock: any;
  let authServiceMock: any;
  let analyticsServiceMock: any;
  let appSettingsServiceMock: Pick<AppSettingsService, 'getPublicAppSettings'>;
  let router: Router;

  const paidSettings: PublicAppSettingsResponse = {
    ...DEFAULT_PUBLIC_APP_SETTINGS,
    premiumMode: 'paid',
    premiumAccessPolicy: 'paid_enforced',
    currency: 'EUR',
    monthlyPrice: 39.99,
    annualPrice: 299,
    stripeCheckoutEnabled: true,
    paidPremiumEnabled: true,
    trialDays: 14,
  };

  beforeEach(async () => {
    featureFlags.adsEnabled = false;
    accountServiceMock = {
      getMe: vi
        .fn()
        .mockReturnValue(of({ subscription: { isPremium: false } })),
      startSubscriptionCheckout: vi
        .fn()
        .mockReturnValue(of({ checkoutUrl: 'https://stripe.com/checkout' })),
    };

    authServiceMock = {
      isLoggedIn: signal(true),
    };
    analyticsServiceMock = {
      trackBeginCheckout: vi.fn(),
      trackEvent: vi.fn(),
      trackCheckoutRedirect: vi.fn(),
      trackPremiumCtaClick: vi.fn(),
      trackPremiumPricingView: vi.fn(),
    };
    appSettingsServiceMock = {
      getPublicAppSettings: vi
        .fn()
        .mockReturnValue(of(DEFAULT_PUBLIC_APP_SETTINGS)),
    };

    await TestBed.configureTestingModule({
      imports: [Premium],
      providers: [
        provideRouter([]),
        { provide: AccountService, useValue: accountServiceMock },
        { provide: AuthService, useValue: authServiceMock },
        { provide: AnalyticsService, useValue: analyticsServiceMock },
        { provide: AppSettingsService, useValue: appSettingsServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Premium);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate');
    fixture.detectChanges();
  });

  afterEach(() => {
    featureFlags.adsEnabled = false;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should toggle billing period', () => {
    expect(component.isAnnual()).toBe(true);
    component.toggleBilling();
    expect(component.isAnnual()).toBe(false);
  });

  it('should redirect to login if not logged in', () => {
    authServiceMock.isLoggedIn.set(false);
    component.joinMagicCircle();
    expect(router.navigate).toHaveBeenCalledWith(
      ['/logowanie'],
      expect.anything(),
    );
  });

  it('should not start checkout while Premium remains open', () => {
    component.joinMagicCircle();

    expect(accountServiceMock.startSubscriptionCheckout).not.toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/panel']);
    expect(analyticsServiceMock.trackBeginCheckout).not.toHaveBeenCalled();
    expect(analyticsServiceMock.trackPremiumCtaClick).toHaveBeenCalledWith(
      expect.objectContaining({
        plan: 'annual',
        value: 199,
        price: 199,
        premium_mode: 'open',
        access_state: 'open',
      }),
    );
  });

  it('should clarify the open Premium CTA for logged-in users', () => {
    expect(component.primaryCtaLabel()).toBe('Przejdź do panelu ✦');

    authServiceMock.isLoggedIn.set(false);

    expect(component.primaryCtaLabel()).toBe(
      'Załóż konto i zapisz odczyty ✦',
    );
  });

  it('should start checkout if paid Premium is enabled and user is not premium', () => {
    component.appSettings.set(paidSettings);

    component.joinMagicCircle();
    expect(accountServiceMock.startSubscriptionCheckout).toHaveBeenCalledWith(
      'annual',
    );
    expect(analyticsServiceMock.trackBeginCheckout).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          item_id: 'premium_annual',
          item_name: 'Premium roczny',
          item_category: 'subscription',
          price: 299,
          quantity: 1,
        }),
      ],
      expect.objectContaining({
        checkout_type: 'premium',
        plan: 'annual',
        currency: 'EUR',
        value: 299,
        price: 299,
        premium_mode: 'paid',
        access_state: 'paid',
        ui_surface: 'premium_page',
        cta_location: 'premium_page_primary',
        funnel_step: 'begin_checkout',
      }),
    );
    expect(analyticsServiceMock.trackPremiumCtaClick).toHaveBeenCalledWith(
      expect.objectContaining({
        plan: 'annual',
        value: 299,
        price: 299,
        premium_mode: 'paid',
        access_state: 'paid',
        cta_location: 'premium_page_primary',
        funnel_step: 'cta_click',
      }),
    );
    expect(analyticsServiceMock.trackCheckoutRedirect).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'premium',
        plan: 'annual',
        value: 299,
        funnel_step: 'checkout_redirect',
      }),
    );
  });

  it('should handle checkout error gracefully', () => {
    component.appSettings.set(paidSettings);
    accountServiceMock.startSubscriptionCheckout.mockReturnValue(
      throwError(() => new Error('API Error')),
    );
    component.joinMagicCircle();
    expect(component.isLoading()).toBe(false);
  });

  it('should hide no-ads benefit when ads are globally disabled', () => {
    expect(component.adsEnabled).toBe(false);
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain(
      'Brak reklam i treści sponsorowanych',
    );
  });

  it('should expose accessible billing toggle label', () => {
    const toggle = (
      fixture.nativeElement as HTMLElement
    ).querySelector<HTMLButtonElement>('[data-test="premium-billing-toggle"]');

    expect(toggle?.getAttribute('aria-label')).toBe(
      'Przełącz na płatność miesięczną',
    );

    component.toggleBilling();
    fixture.detectChanges();

    expect(toggle?.getAttribute('aria-label')).toBe(
      'Przełącz na płatność roczną',
    );
  });

  it('should render prices from public App Settings', () => {
    component.appSettings.set(paidSettings);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toMatch(
      /299\s*€/,
    );
  });
});
