import { Injectable, inject, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { CookieService } from 'ngx-cookie-service';
import { filter } from 'rxjs/operators';
import {
  CartItem,
  CheckoutAnalyticsSummary,
  Ga4Item,
  Product,
} from '@star-sign-monorepo/shared-types';
import { RuntimeConfigService } from './runtime-config.service';

type GtagFunction = (...args: [command: string, ...params: unknown[]]) => void;
type AnalyticsParams = Record<string, unknown>;
type CookieConsentPayload = {
  analytics?: unknown;
};

declare global {
  interface Window {
    dataLayer?: unknown[][];
    gtag?: GtagFunction;
  }
}

@Injectable({
  providedIn: 'root',
})
export class AnalyticsService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly cookieService = inject(CookieService);
  private readonly router = inject(Router);
  private readonly runtimeConfig = inject(RuntimeConfigService);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  private gaId = '';
  private hasConsent = signal(false);

  public init(): void {
    if (!this.isBrowser) return;

    this.setGaId(this.runtimeConfig.ga4MeasurementId());
    this.checkConsent();
    this.setupRouteTracking();
  }

  private checkConsent(): void {
    const consentJson = this.cookieService.get('cookie-consent-v2');
    if (consentJson) {
      try {
        const consent = JSON.parse(consentJson) as CookieConsentPayload;
        if (consent.analytics === true) {
          this.hasConsent.set(true);
          this.loadGoogleAnalytics();
        }
      } catch (e) {
        console.error('Failed to parse cookie consent for analytics', e);
      }
    }
  }

  private setupRouteTracking(): void {
    this.router.events
      .pipe(
        filter(
          (event): event is NavigationEnd => event instanceof NavigationEnd,
        ),
      )
      .subscribe((event) => {
        this.trackPageView(event.urlAfterRedirects);
      });
  }

  private loadGoogleAnalytics(): void {
    if (!this.gaId || !this.isBrowser) return;
    if (window.gtag) return;

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${this.gaId}`;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    const gtag: GtagFunction = (...args) => {
      window.dataLayer?.push(args);
    };
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', this.gaId, {
      anonymize_ip: true,
      send_page_view: false,
    });
  }

  public trackPageView(url: string): void {
    if (!this.isBrowser || !this.hasConsent()) return;

    const gtag = window.gtag;
    if (gtag) {
      gtag('event', 'page_view', {
        page_path: url,
        page_location: window.location.href,
        page_title: document.title,
      });
    }
  }

  public trackEvent(eventName: string, params: AnalyticsParams = {}): void {
    if (!this.isBrowser || !this.hasConsent()) {
      return;
    }

    const gtag = window.gtag;
    if (gtag) {
      gtag('event', eventName, {
        ...params,
        timestamp: new Date().toISOString(),
      });
    }
  }

  public trackFeatureUse(
    featureName: string,
    details: AnalyticsParams = {},
  ): void {
    this.trackEvent('feature_use', {
      feature_name: featureName,
      ...details,
    });
  }

  public trackViewItem(product: Product): void {
    const item = this.toGa4Item(product);
    this.trackEvent('view_item', {
      currency: product.currency || 'PLN',
      value: product.price,
      items: [item],
    });
  }

  public trackAddToCart(product: Product, quantity = 1): void {
    const item = this.toGa4Item(product, quantity);
    this.trackEvent('add_to_cart', {
      currency: product.currency || 'PLN',
      value: product.price * quantity,
      items: [item],
    });
  }

  public trackBeginCheckout(
    items: ReadonlyArray<CartItem | Ga4Item>,
    context: AnalyticsParams = {},
  ): void {
    const ga4Items = items.map((item) => this.toGa4Item(item));
    const firstCurrency = this.resolveCurrency(items[0]);
    const computedValue = ga4Items.reduce(
      (sum, item) => sum + (item.price || 0) * (item.quantity || 1),
      0,
    );

    this.trackEvent('begin_checkout', {
      currency: context['currency'] || firstCurrency || 'PLN',
      value: context['value'] ?? computedValue,
      items: ga4Items,
      ...context,
    });
  }

  public trackPurchase(summary: CheckoutAnalyticsSummary): void {
    if (summary.status !== 'paid') {
      return;
    }

    this.trackEvent('purchase', {
      transaction_id: summary.orderDocumentId,
      currency: summary.currency,
      value: summary.total,
      items: summary.items.map(
        (item) =>
          ({
            item_id: item.productDocumentId,
            item_name: item.productName,
            price: item.unitPrice,
            quantity: item.quantity,
          }) satisfies Ga4Item,
      ),
    });
  }

  public setGaId(id: string): void {
    this.gaId = this.normalizeGaId(id);
    if (this.hasConsent()) {
      this.loadGoogleAnalytics();
    }
  }

  /**
   * Called when user accepts cookies after initial load
   */
  public onConsentGranted(): void {
    if (!this.hasConsent()) {
      this.hasConsent.set(true);
      this.loadGoogleAnalytics();
      this.trackPageView(this.router.url);
    }
  }

  private normalizeGaId(id: string): string {
    const trimmed = id.trim();
    if (
      !trimmed ||
      /^(replace_me.*|changeme|change_me|your_.+|G-X+)$/i.test(trimmed)
    ) {
      return '';
    }

    return /^G-[A-Z0-9]+$/i.test(trimmed) ? trimmed : '';
  }

  private toGa4Item(
    input: Product | CartItem | Ga4Item,
    quantity = 1,
  ): Ga4Item {
    if ('product' in input) {
      return this.toGa4Item(input.product, input.quantity);
    }

    if ('item_id' in input) {
      return input;
    }

    return {
      item_id: input.sku || input.documentId,
      item_name: input.name,
      item_brand: 'Star Sign',
      item_category: input.category,
      price: input.price,
      quantity,
    };
  }

  private resolveCurrency(
    input: CartItem | Ga4Item | undefined,
  ): string | undefined {
    if (!input || !('product' in input)) {
      return undefined;
    }

    return input.product.currency;
  }
}
