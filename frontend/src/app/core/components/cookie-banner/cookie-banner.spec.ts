import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CookieBanner } from './cookie-banner';
import { CookieService } from 'ngx-cookie-service';
import { RouterTestingModule } from '@angular/router/testing';
import { AnalyticsService } from '../../services/analytics.service';
import { vi } from 'vitest';
import { featureFlags } from '../../feature-flags';

describe('CookieBanner', () => {
  let component: CookieBanner;
  let fixture: ComponentFixture<CookieBanner>;
  let cookieService: any;
  let analyticsService: { onConsentGranted: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    vi.useFakeTimers();
    featureFlags.adsEnabled = false;
    cookieService = {
      get: vi.fn(),
      set: vi.fn(),
    };
    analyticsService = {
      onConsentGranted: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [CookieBanner, RouterTestingModule],
      providers: [
        { provide: CookieService, useValue: cookieService },
        { provide: AnalyticsService, useValue: analyticsService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CookieBanner);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    featureFlags.adsEnabled = false;
    vi.useRealTimers();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should be visible if no consent cookie exists', () => {
    cookieService.get.mockReturnValue('');
    component.ngOnInit();
    vi.advanceTimersByTime(1500);
    expect(component.isVisible()).toBe(true);
  });

  it('should NOT be visible if consent cookie exists', () => {
    cookieService.get.mockReturnValue('accepted');
    component.ngOnInit();
    vi.advanceTimersByTime(1500);
    expect(component.isVisible()).toBe(false);
  });

  it('should save consent on acceptAll', () => {
    component.acceptAll();
    expect(cookieService.set).toHaveBeenCalledWith(
      'cookie-consent-v2',
      JSON.stringify({ necessary: true, analytics: true, marketing: false }),
      365,
      '/',
    );
    expect(component.isVisible()).toBe(false);
    expect(analyticsService.onConsentGranted).toHaveBeenCalled();
  });

  it('should save minimal consent on declineAll', () => {
    component.declineAll();
    expect(cookieService.set).toHaveBeenCalledWith(
      'cookie-consent-v2',
      JSON.stringify({ necessary: true, analytics: false, marketing: false }),
      365,
      '/',
    );
    expect(component.isVisible()).toBe(false);
    expect(analyticsService.onConsentGranted).not.toHaveBeenCalled();
  });

  it('should expose optional decline on the first banner layer', () => {
    component.isVisible.set(true);
    fixture.detectChanges();

    const declineButton = (
      fixture.nativeElement as HTMLElement
    ).querySelector<HTMLButtonElement>('[data-test="cookie-decline-button"]');

    expect(declineButton?.textContent).toContain('Odrzuć opcjonalne');
    declineButton?.click();

    expect(cookieService.set).toHaveBeenCalledWith(
      'cookie-consent-v2',
      JSON.stringify({ necessary: true, analytics: false, marketing: false }),
      365,
      '/',
    );
  });

  it('should leave optional consent disabled by default in settings', () => {
    expect(component.consent()).toEqual({
      necessary: true,
      analytics: false,
      marketing: false,
    });
  });

  it('should toggle settings and update selected options', () => {
    expect(component.showSettings()).toBe(false);
    component.toggleSettings();
    expect(component.showSettings()).toBe(true);

    component.updateOption('analytics', {
      target: { checked: false },
    } as unknown as Event);
    component.updateOption('marketing', {
      target: { checked: true },
    } as unknown as Event);

    expect(component.consent()).toEqual({
      necessary: true,
      analytics: false,
      marketing: false,
    });
  });

  it('should save selected consent without analytics callback when analytics is off', () => {
    component.updateOption('analytics', {
      target: { checked: false },
    } as unknown as Event);
    component.acceptSelected();

    expect(cookieService.set).toHaveBeenCalledWith(
      'cookie-consent-v2',
      JSON.stringify({ necessary: true, analytics: false, marketing: false }),
      365,
      '/',
    );
    expect(analyticsService.onConsentGranted).not.toHaveBeenCalled();
  });

  it('should render marketing consent only when ads feature flag is enabled', () => {
    component.isVisible.set(true);
    component.toggleSettings();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain(
      'Marketingowe',
    );

    featureFlags.adsEnabled = true;
    fixture = TestBed.createComponent(CookieBanner);
    component = fixture.componentInstance;
    component.isVisible.set(true);
    component.toggleSettings();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Marketingowe',
    );
  });

  it('should render action buttons and handle settings flow from DOM', () => {
    component.isVisible.set(true);
    fixture.detectChanges();

    const settingsButton = (
      fixture.nativeElement as HTMLElement
    ).querySelector<HTMLButtonElement>('[data-test="cookie-settings-button"]');
    settingsButton?.click();
    fixture.detectChanges();

    expect(component.showSettings()).toBe(true);
    const buttons = fixture.nativeElement.querySelectorAll('button');
    const saveSelectedButton = buttons[buttons.length - 1] as HTMLButtonElement;
    saveSelectedButton.click();

    expect(cookieService.set).toHaveBeenCalled();
  });
});
