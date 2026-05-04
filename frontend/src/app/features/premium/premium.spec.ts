import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Premium } from './premium';
import { AccountService } from '../../core/services/account.service';
import { AuthService } from '../../core/services/auth.service';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { signal } from '@angular/core';
import { featureFlags } from '../../core/feature-flags';
import { AnalyticsService } from '../../core/services/analytics.service';

describe('Premium', () => {
  let component: Premium;
  let fixture: ComponentFixture<Premium>;
  let accountServiceMock: any;
  let authServiceMock: any;
  let analyticsServiceMock: any;
  let router: Router;

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

    await TestBed.configureTestingModule({
      imports: [Premium],
      providers: [
        provideRouter([]),
        { provide: AccountService, useValue: accountServiceMock },
        { provide: AuthService, useValue: authServiceMock },
        { provide: AnalyticsService, useValue: analyticsServiceMock },
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

  it('should start checkout if logged in and not premium', () => {
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
          price: 199,
          quantity: 1,
        }),
      ],
      {
        checkout_type: 'premium',
        plan: 'annual',
        currency: 'PLN',
        value: 199,
        price: 199,
      },
    );
    expect(analyticsServiceMock.trackPremiumCtaClick).toHaveBeenCalledWith(
      expect.objectContaining({
        plan: 'annual',
        value: 199,
        price: 199,
      }),
    );
    expect(analyticsServiceMock.trackCheckoutRedirect).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'premium',
        plan: 'annual',
      }),
    );
  });

  it('should handle checkout error gracefully', () => {
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
});
