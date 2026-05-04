import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Navbar } from './core/components/navbar/navbar';
import { Footer } from './core/components/footer/footer';
import { CartComponent } from '@org/cart';
import { CartItem } from '@star-sign-monorepo/shared-types';
import { NotificationToastComponent } from './core/components/notification-toast';
import { CheckoutService } from './core/services/checkout.service';
import { featureFlags } from './core/feature-flags';
import { CookieBanner } from './core/components/cookie-banner/cookie-banner';
import { LoadingBar } from './core/components/loading-bar/loading-bar';
import { AnalyticsService } from './core/services/analytics.service';
import { OnInit } from '@angular/core';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    Navbar,
    Footer,
    CartComponent,
    CookieBanner,
    NotificationToastComponent,
    LoadingBar,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App implements OnInit {
  private readonly checkoutService = inject(CheckoutService);
  private readonly analyticsService = inject(AnalyticsService);
  protected readonly title = signal('Star Sign');
  public readonly shopEnabled = featureFlags.shopEnabled;
  public readonly cart = viewChild<CartComponent>(CartComponent);
  public readonly checkoutInProgress = signal(false);

  public ngOnInit(): void {
    this.analyticsService.init();
  }

  public openCart(): void {
    if (!this.shopEnabled) {
      return;
    }

    this.cart()?.toggle();
  }

  public startCheckout(items: CartItem[]): void {
    if (!this.shopEnabled || !items.length || this.checkoutInProgress()) {
      return;
    }

    this.checkoutInProgress.set(true);

    this.analyticsService.trackBeginCheckout(items, { checkout_type: 'shop' });

    this.checkoutService
      .createSession({
        items: items.map((item) => ({
          productDocumentId: item.product.documentId,
          quantity: item.quantity,
        })),
      })
      .subscribe({
        next: (response) => {
          this.analyticsService.trackCheckoutRedirect({
            type: 'shop',
          });
          window.location.assign(response.checkoutUrl);
        },
        error: (error) => {
          console.error('Nie udało się zainicjalizować płatności.', error);
          this.analyticsService.trackEvent('checkout_error', {
            type: 'shop',
            error: error.message,
          });
          this.checkoutInProgress.set(false);
        },
      });
  }
}
