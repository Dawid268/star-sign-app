import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AccountPanel } from './panel';
import { AccountService } from '../../../core/services/account.service';
import { AuthService } from '../../../core/services/auth.service';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';
import { RouterTestingModule } from '@angular/router/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { PLATFORM_ID } from '@angular/core';
import { vi } from 'vitest';
import { SeoService } from '../../../core/services/seo.service';
import { AnalyticsService } from '../../../core/services/analytics.service';

describe('AccountPanel', () => {
  let component: AccountPanel;
  let fixture: ComponentFixture<AccountPanel>;
  let accountService: any;
  let authService: any;
  let seoService: any;
  let analyticsService: any;
  let routeSnapshot: { queryParamMap: ReturnType<typeof convertToParamMap> };
  let router: any;

  const mockDashboard = {
    subscription: {
      isPremium: true,
      hasPremiumAccess: true,
      accessMode: 'paid',
      status: 'active',
      currentPeriodEnd: '2026-12-31',
      plan: 'annual',
    },
    profileCompleteness: 100,
    daily: {
      date: '2026-04-29',
      teaser: 'Test teaser',
      disclaimer: 'Test disclaimer',
      horoscope: {
        teaser: 'Horoscope teaser',
        premiumContent: 'Premium content',
      },
      tarot: {
        cardName: 'The Fool',
        teaserMessage: 'Tarot teaser',
        premiumMessage: 'Premium tarot',
      },
    },
  };

  const mockMe = {
    profile: {
      id: 1,
      username: 'test',
      email: 'test@example.com',
      marketingConsent: true,
      birthDate: '1990-01-01',
      birthTime: null,
      birthPlace: null,
    },
  };

  const mockReadings = { data: [] };

  beforeEach(async () => {
    accountService = {
      getMe: vi.fn().mockReturnValue(of(mockMe)),
      getDashboard: vi.fn().mockReturnValue(of(mockDashboard)),
      getReadings: vi.fn().mockReturnValue(of(mockReadings)),
      updateProfile: vi.fn().mockReturnValue(of({ success: true })),
      saveTodayReading: vi.fn(),
      startSubscriptionCheckout: vi.fn(),
      openSubscriptionPortal: vi.fn(),
      deleteAccount: vi.fn(),
    };
    authService = {
      updateUser: vi.fn(),
      logout: vi.fn(),
      expireSession: vi.fn(),
    };
    seoService = {
      absoluteUrl: vi.fn((path: string) => `https://star-sign.pl${path}`),
      updateSeo: vi.fn(),
    };
    analyticsService = {
      trackEvent: vi.fn(),
      trackProductEvent: vi.fn(),
      trackPremiumSubscriptionConversion: vi.fn(),
    };
    routeSnapshot = {
      queryParamMap: convertToParamMap({}),
    };
    router = {
      navigateByUrl: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [AccountPanel, RouterTestingModule, ReactiveFormsModule],
      providers: [
        { provide: AccountService, useValue: accountService },
        { provide: AuthService, useValue: authService },
        { provide: SeoService, useValue: seoService },
        { provide: AnalyticsService, useValue: analyticsService },
        { provide: ActivatedRoute, useValue: { snapshot: routeSnapshot } },
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AccountPanel);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate');
    vi.spyOn(router, 'navigateByUrl');
    fixture.detectChanges();
  });

  afterEach(() => {
    window.sessionStorage.clear();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should configure noindex SEO for private account panel', () => {
    expect(seoService.updateSeo).toHaveBeenCalledWith(
      'Panel użytkownika',
      expect.any(String),
      {
        canonicalUrl: 'https://star-sign.pl/panel',
        robots: 'noindex,nofollow',
      },
    );
  });

  it('should load dashboard data on init', () => {
    expect(accountService.getDashboard).toHaveBeenCalled();
    expect(component.isPremium()).toBe(true);
    expect(component.profileForm.value.birthDate).toBe('1990-01-01');
  });

  it('should track Premium purchase after successful Stripe return', () => {
    analyticsService.trackProductEvent.mockClear();
    analyticsService.trackPremiumSubscriptionConversion.mockClear();
    routeSnapshot.queryParamMap = convertToParamMap({
      subscription: 'success',
      plan: 'annual',
      session_id: 'cs_live_123',
    });

    component.loadPanelData();

    expect(analyticsService.trackProductEvent).toHaveBeenCalledWith(
      'purchase',
      expect.objectContaining({
        transaction_id: 'cs_live_123',
        currency: 'PLN',
        value: 199,
        price: 199,
        checkout_type: 'premium',
        plan: 'annual',
        items: [
          expect.objectContaining({
            item_id: 'premium_annual',
            item_name: 'Premium roczny',
            price: 199,
            quantity: 1,
          }),
        ],
      }),
    );
    expect(
      analyticsService.trackPremiumSubscriptionConversion,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        transaction_id: 'cs_live_123',
        currency: 'PLN',
        value: 199,
        price: 199,
        plan: 'annual',
        status: 'active',
      }),
    );
  });

  it('should save profile', () => {
    component.saveProfile();
    expect(accountService.updateProfile).toHaveBeenCalledWith({
      birthDate: '1990-01-01',
      birthTime: null,
      birthPlace: null,
      marketingConsent: true,
    });
    expect(component.successMessage()).toBe('Profil został zapisany.');
  });

  it('should show derived zodiac sign from birth date', () => {
    component.profileForm.controls.birthDate.setValue('1990-01-01');
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(component.derivedZodiacSign()).toBe('Koziorożec');
    expect(host.textContent).toContain('Twój znak:');
    expect(host.textContent).toContain('Koziorożec');
  });

  it('should save optional natal chart fields without zodiacSignSlug', () => {
    component.profileForm.patchValue({
      birthTime: '12:30',
      birthPlace: ' Warszawa ',
    });

    component.saveProfile();

    expect(accountService.updateProfile).toHaveBeenCalledWith({
      birthDate: '1990-01-01',
      birthTime: '12:30',
      birthPlace: 'Warszawa',
      marketingConsent: true,
    });
  });

  it('should logout', () => {
    component.logout();
    expect(authService.logout).toHaveBeenCalled();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/');
  });

  it('should save today reading', () => {
    accountService.saveTodayReading.mockReturnValue(
      of({ saved: true, reading: { id: 1 } }),
    );
    component.saveTodayReading('horoscope');
    expect(accountService.saveTodayReading).toHaveBeenCalledWith('horoscope');
    expect(component.readings().length).toBe(1);
    expect(component.successMessage()).toBe(
      'Dzisiejszy odczyt został zapisany w archiwum.',
    );
  });

  it('should handle already saved reading', () => {
    accountService.saveTodayReading.mockReturnValue(of({ saved: false }));
    component.saveTodayReading('tarot');
    expect(component.successMessage()).toBe(
      'Dzisiejszy odczyt jest już zapisany.',
    );
  });

  it('should start subscription checkout', () => {
    const assignSpy = vi.fn();
    const locationSpy = vi.spyOn(window, 'location', 'get').mockReturnValue({
      ...window.location,
      assign: assignSpy,
    } as any);

    accountService.startSubscriptionCheckout.mockReturnValue(
      of({ checkoutUrl: 'https://stripe.com' }),
    );

    component.startSubscription('monthly');
    expect(accountService.startSubscriptionCheckout).toHaveBeenCalledWith(
      'monthly',
    );
    expect(assignSpy).toHaveBeenCalledWith('https://stripe.com');
    locationSpy.mockRestore();
  });

  it('should open subscription portal', () => {
    const assignSpy = vi.fn();
    const locationSpy = vi.spyOn(window, 'location', 'get').mockReturnValue({
      ...window.location,
      assign: assignSpy,
    } as any);

    accountService.openSubscriptionPortal.mockReturnValue(
      of({ url: 'https://billing.stripe.com' }),
    );

    component.openSubscriptionPortal();
    expect(accountService.openSubscriptionPortal).toHaveBeenCalled();
    expect(assignSpy).toHaveBeenCalledWith('https://billing.stripe.com');
    locationSpy.mockRestore();
  });

  it('should return correct subscription labels', () => {
    expect(component.subscriptionLabel('active')).toBe('Aktywna');
    expect(component.subscriptionLabel('trialing')).toBe('Okres próbny');
    expect(component.subscriptionLabel('past_due')).toBe('Wymaga płatności');
    expect(component.subscriptionLabel('canceled')).toBe('Anulowana');
    expect(component.subscriptionLabel('unpaid')).toBe('Nieopłacona');
    expect(component.subscriptionLabel('none' as any)).toBe('Nieaktywna');
  });

  it('should return correct subscription badge classes', () => {
    expect(component.subscriptionBadgeClass('active')).toContain('emerald');
    expect(component.subscriptionBadgeClass('past_due')).toContain('amber');
    expect(component.subscriptionBadgeClass('canceled')).toContain('slate');
    expect(component.subscriptionBadgeClass('none' as any)).toContain('rose');
  });

  it('should handle general loading error', () => {
    accountService.getDashboard.mockReturnValue(
      throwError(() => new Error('fail')),
    );
    component.loadPanelData();
    expect(component.error()).toBe(
      'Nie udało się pobrać panelu użytkownika. Spróbuj ponownie.',
    );
  });

  it('should handle unauthorized error', () => {
    accountService.getDashboard.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 401 })),
    );
    vi.spyOn(router, 'url', 'get').mockReturnValue('/panel');
    component.loadPanelData();
    expect(authService.expireSession).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/logowanie'], {
      queryParams: { returnUrl: '/panel' },
    });
  });

  it('should not load dashboard or readings when account validation fails', () => {
    accountService.getMe.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 401 })),
    );
    accountService.getDashboard.mockClear();
    accountService.getReadings.mockClear();
    vi.spyOn(router, 'url', 'get').mockReturnValue('/panel');

    component.loadPanelData();

    expect(accountService.getDashboard).not.toHaveBeenCalled();
    expect(accountService.getReadings).not.toHaveBeenCalled();
    expect(authService.expireSession).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/logowanie'], {
      queryParams: { returnUrl: '/panel' },
    });
  });

  it('should reject future birth date and not save profile', () => {
    component.profileForm.patchValue({ birthDate: '2999-01-01' });
    component.saveProfile();
    expect(
      component.profileForm.controls.birthDate.hasError('futureDate'),
    ).toBe(true);
    expect(accountService.updateProfile).not.toHaveBeenCalled();
  });

  it('should load dashboard even when profile is missing', () => {
    accountService.getMe.mockReturnValue(of({ profile: null }));

    component.loadPanelData();

    expect(component.dashboard()).toEqual(mockDashboard);
    expect(authService.updateUser).toHaveBeenCalledTimes(1);
  });

  it('should show profile save error without success message', () => {
    accountService.updateProfile.mockReturnValue(
      throwError(() => new Error('save failed')),
    );

    component.saveProfile();

    expect(component.error()).toBe('Nie udało się zapisać profilu.');
    expect(component.successMessage()).toBeNull();
  });

  it('should show checkout error and reset billing loading', () => {
    accountService.startSubscriptionCheckout.mockReturnValue(
      throwError(() => new Error('checkout failed')),
    );

    component.startSubscription('annual');

    expect(component.error()).toBe(
      'Nie udało się uruchomić płatności subskrypcji.',
    );
    expect(component.billingLoading()).toBe(false);
  });

  it('should show portal error and reset billing loading', () => {
    accountService.openSubscriptionPortal.mockReturnValue(
      throwError(() => new Error('portal failed')),
    );

    component.openSubscriptionPortal();

    expect(component.error()).toBe('Nie udało się otworzyć panelu Stripe.');
    expect(component.billingLoading()).toBe(false);
  });

  it('should cancel account deletion when confirmation is rejected', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    component.deleteAccount();

    expect(accountService.deleteAccount).not.toHaveBeenCalled();
    expect(component.isDeletingAccount()).toBe(false);
    confirmSpy.mockRestore();
  });

  it('should delete account and logout on success', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    accountService.deleteAccount.mockReturnValue(of({ deleted: true }));

    component.deleteAccount();

    expect(accountService.deleteAccount).toHaveBeenCalled();
    expect(authService.logout).toHaveBeenCalled();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/');
    expect(component.isDeletingAccount()).toBe(false);
    confirmSpy.mockRestore();
  });

  it('should show delete-account backend error', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    accountService.deleteAccount.mockReturnValue(
      throwError(() => ({
        error: { message: 'Nie można usunąć konta z aktywną subskrypcją.' },
      })),
    );

    component.deleteAccount();

    expect(component.error()).toBe(
      'Nie można usunąć konta z aktywną subskrypcją.',
    );
    expect(component.isDeletingAccount()).toBe(false);
    confirmSpy.mockRestore();
  });

  it('should redirect to login for forbidden panel responses', () => {
    accountService.getDashboard.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 403 })),
    );
    vi.spyOn(router, 'url', 'get').mockReturnValue('/panel');

    component.loadPanelData();

    expect(authService.expireSession).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/logowanie'], {
      queryParams: { returnUrl: '/panel' },
    });
  });

  it('should format plan and reading labels', () => {
    expect(component.subscriptionPlanLabel(null)).toBe('brak');
    expect(component.subscriptionPlanLabel('monthly')).toBe('Miesięczny');
    expect(component.subscriptionPlanLabel('annual')).toBe('Roczny');
    expect(component.subscriptionPlanLabel('custom')).toBe('custom');
    expect(component.readingTypeLabel(null)).toBe('Inny');
    expect(component.readingTypeLabel('horoscope')).toBe('Horoskop');
    expect(component.readingTypeLabel('tarot')).toBe('Tarot');
    expect(component.readingTypeLabel('ritual')).toBe('ritual');
  });

  it('should show user-facing empty state when dashboard data is unavailable', () => {
    accountService.getDashboard.mockReturnValue(of(null));

    fixture = TestBed.createComponent(AccountPanel);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('Panel jest jeszcze pusty');
    expect(host.textContent).not.toContain('seed danych');
    expect(
      host.querySelector<HTMLAnchorElement>('a[href="/panel#profil"]'),
    ).toBeTruthy();
    expect(
      host.querySelector<HTMLAnchorElement>('a[href="/tarot/karta-dnia"]'),
    ).toBeTruthy();
  });
});
