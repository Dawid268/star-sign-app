import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  heroCheck,
  heroSparkles,
  heroStar,
  heroBolt,
} from '@ng-icons/heroicons/outline';
import { AccountService } from '../../core/services/account.service';
import { AuthService } from '../../core/services/auth.service';
import { toSignal, toObservable } from '@angular/core/rxjs-interop';
import { map, of, switchMap } from 'rxjs';

import { AnalyticsService } from '../../core/services/analytics.service';
import { Ga4Item } from '@star-sign-monorepo/shared-types';
import { featureFlags } from '../../core/feature-flags';
import { premiumPlanDetails } from '../../core/premium-plans';

@Component({
  selector: 'app-premium',
  standalone: true,
  imports: [NgIcon],
  viewProviders: [
    provideIcons({ heroCheck, heroSparkles, heroStar, heroBolt }),
  ],
  templateUrl: './premium.html',
  styleUrl: './premium.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Premium {
  private readonly accountService = inject(AccountService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly analyticsService = inject(AnalyticsService);

  public readonly isAnnual = signal(true);
  public readonly isLoading = signal(false);
  public readonly adsEnabled = featureFlags.adsEnabled;

  public readonly isLoggedIn = this.authService.isLoggedIn;
  public readonly isPremium = toSignal(
    toObservable(this.isLoggedIn).pipe(
      switchMap((loggedIn) =>
        loggedIn
          ? this.accountService
              .getMe()
              .pipe(map((me) => !!me?.subscription?.isPremium))
          : of(false),
      ),
    ),
    { initialValue: false },
  );

  public toggleBilling(): void {
    this.isAnnual.update((v) => !v);
    this.analyticsService.trackEvent('premium_billing_toggle', {
      isAnnual: this.isAnnual(),
    });
  }

  public joinMagicCircle(): void {
    if (!this.isLoggedIn()) {
      this.analyticsService.trackEvent('premium_join_attempt_unauth');
      this.router.navigate(['/logowanie'], {
        queryParams: { returnUrl: '/premium' },
      });
      return;
    }

    if (this.isPremium()) {
      this.router.navigate(['/panel/subskrypcja']);
      return;
    }

    this.isLoading.set(true);
    const plan = this.isAnnual() ? 'annual' : 'monthly';
    const planDetails = premiumPlanDetails[plan];

    const checkoutItem: Ga4Item = {
      item_id: `premium_${plan}`,
      item_name: planDetails.itemName,
      item_brand: 'Star Sign',
      item_category: 'subscription',
      price: planDetails.price,
      quantity: 1,
    };

    this.analyticsService.trackBeginCheckout([checkoutItem], {
      checkout_type: 'premium',
      plan,
      currency: 'PLN',
      value: planDetails.price,
    });

    this.accountService.startSubscriptionCheckout(plan).subscribe({
      next: (response) => {
        if (response.checkoutUrl) {
          this.analyticsService.trackEvent('checkout_redirect', {
            type: 'premium',
            plan,
          });
          window.location.href = response.checkoutUrl;
        }
      },
      error: (error) => {
        this.isLoading.set(false);
        this.analyticsService.trackEvent('checkout_error', {
          type: 'premium',
          plan,
          error: error.message,
        });
      },
    });
  }
}
