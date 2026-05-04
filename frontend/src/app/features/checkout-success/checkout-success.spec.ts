import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CheckoutSuccess } from './checkout-success';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { CheckoutService } from '../../core/services/checkout.service';
import { AnalyticsService } from '../../core/services/analytics.service';
import { RouterTestingModule } from '@angular/router/testing';
import { featureFlags } from '../../core/feature-flags';

describe('CheckoutSuccess', () => {
  let component: CheckoutSuccess;
  let fixture: ComponentFixture<CheckoutSuccess>;
  let checkoutService: { getAnalyticsSummary: ReturnType<typeof vi.fn> };
  let analyticsService: { trackPurchase: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    featureFlags.shopEnabled = false;
    window.sessionStorage.clear();
    checkoutService = {
      getAnalyticsSummary: vi.fn().mockReturnValue(
        of({
          sessionId: 'cs_test',
          orderDocumentId: 'order-1',
          status: 'paid',
          currency: 'PLN',
          total: 99,
          items: [],
        }),
      ),
    };
    analyticsService = {
      trackPurchase: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [CheckoutSuccess, RouterTestingModule],
      providers: [
        { provide: CheckoutService, useValue: checkoutService },
        { provide: AnalyticsService, useValue: analyticsService },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: convertToParamMap({ session_id: 'cs_test' }),
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CheckoutSuccess);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    featureFlags.shopEnabled = false;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should send purchase event once for paid checkout session', () => {
    expect(checkoutService.getAnalyticsSummary).toHaveBeenCalledWith('cs_test');
    expect(analyticsService.trackPurchase).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: 'cs_test',
        status: 'paid',
      }),
    );
    expect(component.analyticsStatus()).toBe('sent');

    fixture.destroy();
    fixture = TestBed.createComponent(CheckoutSuccess);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(analyticsService.trackPurchase).toHaveBeenCalledTimes(1);
    expect(component.analyticsStatus()).toBe('skipped');
  });

  it('should hide shop CTA when shop feature flag is disabled', () => {
    const host = fixture.nativeElement as HTMLElement;

    expect(component.shopEnabled).toBe(false);
    expect(host.textContent).not.toContain('Wróć do Sklepu');
    expect(
      host
        .querySelector<HTMLAnchorElement>('a.btn-primary')
        ?.getAttribute('href'),
    ).toBe('/');
  });
});
