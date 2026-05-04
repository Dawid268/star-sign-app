import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { App } from './app';
import { AnalyticsService } from './core/services/analytics.service';
import { CheckoutService } from './core/services/checkout.service';
import { CartItem } from '@star-sign-monorepo/shared-types';

describe('App', () => {
  let checkoutService: { createSession: ReturnType<typeof vi.fn> };
  let analyticsService: {
    init: ReturnType<typeof vi.fn>;
    trackEvent: ReturnType<typeof vi.fn>;
    trackBeginCheckout: ReturnType<typeof vi.fn>;
  };

  const cartItem: CartItem = {
    product: {
      id: 1,
      documentId: 'product-1',
      name: 'Amulet',
      slug: 'amulet',
      description: 'Test product',
      price: 50,
    },
    quantity: 2,
  };

  beforeEach(async () => {
    checkoutService = {
      createSession: vi.fn(),
    };
    analyticsService = {
      init: vi.fn(),
      trackEvent: vi.fn(),
      trackBeginCheckout: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        { provide: CheckoutService, useValue: checkoutService },
        { provide: AnalyticsService, useValue: analyticsService },
      ],
    }).compileComponents();
  });

  it('should create the app and initialize analytics', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const app = fixture.componentInstance;

    expect(app).toBeTruthy();
    expect(analyticsService.init).toHaveBeenCalled();
  });

  it('should guard cart and checkout when shop is disabled', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    app.openCart();
    app.startCheckout([cartItem]);

    expect(checkoutService.createSession).not.toHaveBeenCalled();
    expect(app.checkoutInProgress()).toBe(false);
  });

  it('should skip checkout for empty carts and in-progress checkout', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    Object.defineProperty(app, 'shopEnabled', { value: true });

    app.startCheckout([]);
    app.checkoutInProgress.set(true);
    app.startCheckout([cartItem]);

    expect(checkoutService.createSession).not.toHaveBeenCalled();
  });

  it('should redirect to checkout session on success', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    Object.defineProperty(app, 'shopEnabled', { value: true });
    checkoutService.createSession.mockReturnValue(
      of({
        checkoutUrl: 'https://checkout.example/session',
        sessionId: 'cs_test',
      }),
    );
    const assignSpy = vi.fn();
    const locationSpy = vi.spyOn(window, 'location', 'get').mockReturnValue({
      ...window.location,
      assign: assignSpy,
    } as Location);

    app.startCheckout([cartItem]);

    expect(checkoutService.createSession).toHaveBeenCalledWith({
      items: [{ productDocumentId: 'product-1', quantity: 2 }],
    });
    expect(analyticsService.trackBeginCheckout).toHaveBeenCalledWith(
      [cartItem],
      {
        checkout_type: 'shop',
      },
    );
    expect(analyticsService.trackEvent).toHaveBeenCalledWith(
      'checkout_redirect',
      {
        type: 'shop',
      },
    );
    expect(assignSpy).toHaveBeenCalledWith('https://checkout.example/session');

    locationSpy.mockRestore();
  });

  it('should reset in-progress state and track checkout errors', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    Object.defineProperty(app, 'shopEnabled', { value: true });
    const consoleSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    checkoutService.createSession.mockReturnValue(
      throwError(() => new Error('Stripe failed')),
    );

    app.startCheckout([cartItem]);

    expect(app.checkoutInProgress()).toBe(false);
    expect(analyticsService.trackEvent).toHaveBeenCalledWith('checkout_error', {
      type: 'shop',
      error: 'Stripe failed',
    });

    consoleSpy.mockRestore();
  });
});
