import {
  Component,
  ChangeDetectionStrategy,
  computed,
  inject,
  OnInit,
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
import { map, of, switchMap, take } from 'rxjs';

import { AnalyticsService } from '../../core/services/analytics.service';
import {
  Ga4Item,
  PublicAppSettingsResponse,
} from '@star-sign-monorepo/shared-types';
import { featureFlags } from '../../core/feature-flags';
import {
  PremiumBillingPlan,
  premiumPlanDetails,
} from '../../core/premium-plans';
import {
  AppSettingsService,
  DEFAULT_PUBLIC_APP_SETTINGS,
} from '../../core/services/app-settings.service';

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
export class Premium implements OnInit {
  private readonly accountService = inject(AccountService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly analyticsService = inject(AnalyticsService);
  private readonly appSettingsService = inject(AppSettingsService);

  public readonly isAnnual = signal(true);
  public readonly isLoading = signal(false);
  public readonly appSettings = signal(DEFAULT_PUBLIC_APP_SETTINGS);
  public readonly adsEnabled = featureFlags.adsEnabled;
  public readonly selectedPlan = computed<PremiumBillingPlan>(() =>
    this.isAnnual() ? 'annual' : 'monthly',
  );
  public readonly canStartCheckout = computed(
    () => this.appSettings().paidPremiumEnabled,
  );
  public readonly selectedPriceLabel = computed(() =>
    this.formatPrice(
      this.getPlanPrice(this.selectedPlan(), this.appSettings()),
      this.appSettings().currency,
    ),
  );
  public readonly annualMonthlyEquivalentLabel = computed(() =>
    this.formatPrice(
      this.appSettings().annualPrice / 12,
      this.appSettings().currency,
    ),
  );
  public readonly primaryCtaLabel = computed(() =>
    this.canStartCheckout()
      ? 'Dołącz do Kręgu ✦'
      : this.isPremium()
        ? 'Zarządzaj subskrypcją ✦'
        : this.isLoggedIn()
          ? 'Przejdź do panelu ✦'
          : 'Załóż konto i zapisz odczyty ✦',
  );

  public readonly isLoggedIn = this.authService.isLoggedIn;
  public readonly isPremium = toSignal(
    toObservable(this.isLoggedIn).pipe(
      switchMap((loggedIn) =>
        loggedIn
          ? this.accountService
              .getMe()
              .pipe(
                map(
                  (me) =>
                    !!(
                      me?.subscription?.hasPremiumAccess ??
                      me?.subscription?.isPremium
                    ),
                ),
              )
          : of(false),
      ),
    ),
    { initialValue: false },
  );

  public ngOnInit(): void {
    this.appSettingsService
      .getPublicAppSettings()
      .pipe(take(1))
      .subscribe((settings) => {
        this.appSettings.set(settings);
        this.analyticsService.trackPremiumPricingView(
          this.buildPremiumAnalyticsParams(settings, {
            content_type: 'premium_page',
            ui_surface: 'premium_page',
            funnel_step: 'pricing_view',
            route: '/premium',
          }),
        );
      });
  }

  public toggleBilling(): void {
    this.isAnnual.update((v) => !v);
    this.analyticsService.trackEvent('premium_billing_toggle', {
      isAnnual: this.isAnnual(),
    });
  }

  public joinMagicCircle(): void {
    const plan = this.isAnnual() ? 'annual' : 'monthly';
    const settings = this.appSettings();
    const planDetails = this.getPlanDetails(plan, settings);

    this.analyticsService.trackPremiumCtaClick(
      this.buildPremiumAnalyticsParams(settings, {
        content_type: 'premium_page',
        plan,
        value: planDetails.price,
        price: planDetails.price,
        ui_surface: 'premium_page',
        cta_location: 'premium_page_primary',
        funnel_step: 'cta_click',
        route: '/premium',
      }),
    );

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

    if (!this.canStartCheckout()) {
      this.router.navigate(['/panel']);
      return;
    }

    this.isLoading.set(true);

    const checkoutItem: Ga4Item = {
      item_id: `premium_${plan}`,
      item_name: planDetails.itemName,
      item_brand: 'Star Sign',
      item_category: 'subscription',
      price: planDetails.price,
      quantity: 1,
    };

    this.analyticsService.trackBeginCheckout(
      [checkoutItem],
      this.buildPremiumAnalyticsParams(settings, {
        checkout_type: 'premium',
        plan,
        value: planDetails.price,
        price: planDetails.price,
        ui_surface: 'premium_page',
        cta_location: 'premium_page_primary',
        funnel_step: 'begin_checkout',
      }),
    );

    this.accountService.startSubscriptionCheckout(plan).subscribe({
      next: (response) => {
        if (response.checkoutUrl) {
          this.analyticsService.trackCheckoutRedirect(
            this.buildPremiumAnalyticsParams(settings, {
              type: 'premium',
              plan,
              value: planDetails.price,
              price: planDetails.price,
              ui_surface: 'premium_page',
              cta_location: 'premium_page_primary',
              funnel_step: 'checkout_redirect',
            }),
          );
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

  private getPlanDetails(
    plan: PremiumBillingPlan,
    settings: PublicAppSettingsResponse,
  ): { itemName: string; price: number } {
    return {
      itemName: premiumPlanDetails[plan].itemName,
      price: this.getPlanPrice(plan, settings),
    };
  }

  private getPlanPrice(
    plan: PremiumBillingPlan,
    settings: PublicAppSettingsResponse,
  ): number {
    return plan === 'annual' ? settings.annualPrice : settings.monthlyPrice;
  }

  private buildPremiumAnalyticsParams(
    settings: PublicAppSettingsResponse,
    params: Record<string, unknown>,
  ): Record<string, unknown> {
    return {
      ...params,
      premium_mode: settings.premiumMode,
      access_state: settings.premiumMode === 'open' ? 'open' : 'paid',
      currency: settings.currency,
    };
  }

  private formatPrice(
    price: number,
    currency: PublicAppSettingsResponse['currency'],
  ): string {
    return new Intl.NumberFormat('pl-PL', {
      style: 'currency',
      currency,
      minimumFractionDigits: Number.isInteger(price) ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(price);
  }
}
