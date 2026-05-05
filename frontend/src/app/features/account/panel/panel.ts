import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  PLATFORM_ID,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DatePipe, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  FormBuilder,
  ReactiveFormsModule,
  ValidatorFn,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { toSignal } from '@angular/core/rxjs-interop';
import { finalize, forkJoin, of, startWith } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { AstrologyService } from '../../../core/services/astrology.service';
import { AuthService } from '../../../core/services/auth.service';
import { AccountService } from '../../../core/services/account.service';
import { AnalyticsService } from '../../../core/services/analytics.service';
import {
  AppSettingsService,
  DEFAULT_PUBLIC_APP_SETTINGS,
} from '../../../core/services/app-settings.service';
import { SeoService } from '../../../core/services/seo.service';
import { featureFlags } from '../../../core/feature-flags';
import {
  isPremiumBillingPlan,
  premiumPlanDetails,
} from '../../../core/premium-plans';
import {
  AccountDashboardResponse,
  AccountReading,
  AccountSubscription,
  Ga4Item,
  PublicAppSettingsResponse,
} from '@star-sign-monorepo/shared-types';

@Component({
  selector: 'app-account-panel',
  imports: [ReactiveFormsModule, RouterLink, DatePipe],
  templateUrl: './panel.html',
  styleUrl: './panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountPanel implements OnInit {
  private readonly accountService = inject(AccountService);
  private readonly appSettingsService = inject(AppSettingsService);
  private readonly authService = inject(AuthService);
  private readonly astrologyService = inject(AstrologyService);
  private readonly analyticsService = inject(AnalyticsService);
  private readonly seoService = inject(SeoService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));

  public readonly loading = signal(true);
  public readonly error = signal<string | null>(null);
  public readonly profileSaving = signal(false);
  public readonly readingSaving = signal<null | 'horoscope' | 'tarot'>(null);
  public readonly billingLoading = signal(false);
  public readonly isDeletingAccount = signal(false);
  public readonly successMessage = signal<string | null>(null);
  public readonly shopEnabled = featureFlags.shopEnabled;

  public readonly dashboard = signal<AccountDashboardResponse | null>(null);
  public readonly readings = signal<AccountReading[]>([]);
  public readonly appSettings = signal(DEFAULT_PUBLIC_APP_SETTINGS);

  public readonly isPremium = computed(() =>
    Boolean(
      this.dashboard()?.subscription.hasPremiumAccess ??
      this.dashboard()?.subscription.isPremium,
    ),
  );
  public readonly subscription = computed<AccountSubscription | null>(
    () => this.dashboard()?.subscription || null,
  );
  public readonly paidPremiumEnabled = computed(
    () => this.appSettings().paidPremiumEnabled,
  );
  public readonly monthlyPremiumLabel = computed(
    () =>
      `Premium ${this.formatPrice(this.appSettings().monthlyPrice, this.appSettings().currency)} / mies.`,
  );
  public readonly annualPremiumLabel = computed(
    () =>
      `Premium ${this.formatPrice(this.appSettings().annualPrice, this.appSettings().currency)} / rok`,
  );

  public readonly profileForm = this.formBuilder.nonNullable.group({
    birthDate: ['', [this.dateValidator()]],
    birthTime: [''],
    birthPlace: [''],
    marketingConsent: [false],
  });

  private readonly birthDateValue = toSignal(
    this.profileForm.controls.birthDate.valueChanges.pipe(
      startWith(this.profileForm.controls.birthDate.value),
    ),
    { initialValue: this.profileForm.controls.birthDate.value },
  );

  public readonly derivedZodiacSign = computed(() => {
    const birthDate = this.birthDateValue();
    if (!birthDate || this.profileForm.controls.birthDate.invalid) {
      return null;
    }

    const parsedDate = this.parseBirthDateInput(birthDate);
    return parsedDate ? this.astrologyService.getSunSign(parsedDate) : null;
  });

  private dateValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;
      const selectedDate = this.parseBirthDateInput(control.value);
      if (!selectedDate) {
        return { invalidPastDate: true };
      }
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (selectedDate > today) {
        return { futureDate: true };
      }
      if (selectedDate.getFullYear() < 1900) {
        return { invalidPastDate: true };
      }
      return null;
    };
  }

  private parseBirthDateInput(value: string): Date | null {
    const [year, month, day] = value.split('-').map(Number);
    if (!year || !month || !day) {
      return null;
    }

    const date = new Date(year, month - 1, day);
    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return null;
    }

    return date;
  }

  public ngOnInit(): void {
    this.seoService.updateSeo(
      'Panel użytkownika',
      'Prywatny panel użytkownika Star Sign z profilem, subskrypcją i zapisanymi odczytami.',
      {
        canonicalUrl: this.seoService.absoluteUrl('/panel'),
        robots: 'noindex,nofollow',
      },
    );

    this.loadPanelData();
  }

  public loadPanelData(): void {
    this.loading.set(true);
    this.error.set(null);

    this.accountService
      .getMe()
      .pipe(
        switchMap((me) => {
          if (!me) {
            this.authService.expireSession();
            const returnUrl =
              this.router.url && this.router.url.startsWith('/')
                ? this.router.url
                : '/panel';
            void this.router.navigate(['/logowanie'], {
              queryParams: { returnUrl },
            });
            return of(null);
          }

          return forkJoin({
            me: of(me),
            appSettings: this.appSettingsService.getPublicAppSettings(),
            dashboard: this.accountService.getDashboard(),
            readings: this.accountService.getReadings(30),
          });
        }),
        finalize(() => this.loading.set(false)),
        catchError((error: unknown) => {
          if (this.handleUnauthorized(error)) {
            return of(null);
          }
          this.error.set(
            'Nie udało się pobrać panelu użytkownika. Spróbuj ponownie.',
          );
          return of(null);
        }),
      )
      .subscribe((payload) => {
        if (!payload) {
          return;
        }

        this.appSettings.set(payload.appSettings);
        this.dashboard.set(payload.dashboard);
        this.readings.set(payload.readings.data);

        if (payload.dashboard?.subscription) {
          this.trackPremiumSubscriptionConversion(
            payload.dashboard.subscription,
          );
        }

        const profile = payload.me?.profile;
        if (!profile) return;
        this.profileForm.setValue({
          birthDate: profile.birthDate || '',
          birthTime: profile.birthTime || '',
          birthPlace: profile.birthPlace || '',
          marketingConsent: profile.marketingConsent,
        });

        this.authService.updateUser({
          id: profile.id,
          email: profile.email,
          username: profile.username,
        });
      });
  }

  public saveProfile(): void {
    if (this.profileSaving() || this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    const values = this.profileForm.getRawValue();
    this.profileSaving.set(true);
    this.successMessage.set(null);
    this.error.set(null);

    this.accountService
      .updateProfile({
        birthDate: values.birthDate || null,
        birthTime: values.birthTime || null,
        birthPlace: values.birthPlace?.trim() || null,
        marketingConsent: Boolean(values.marketingConsent),
      })
      .pipe(
        finalize(() => this.profileSaving.set(false)),
        catchError((error: unknown) => {
          if (this.handleUnauthorized(error)) {
            return of(null);
          }
          this.error.set('Nie udało się zapisać profilu.');
          return of(null);
        }),
      )
      .subscribe((response) => {
        if (!response) {
          return;
        }
        this.successMessage.set('Profil został zapisany.');
        this.loadPanelData();
      });
  }

  public saveTodayReading(type: 'horoscope' | 'tarot'): void {
    if (this.readingSaving()) {
      return;
    }

    this.readingSaving.set(type);
    this.successMessage.set(null);
    this.error.set(null);

    this.accountService
      .saveTodayReading(type)
      .pipe(
        finalize(() => this.readingSaving.set(null)),
        catchError((error: unknown) => {
          if (this.handleUnauthorized(error)) {
            return of(null);
          }
          this.error.set('Nie udało się zapisać odczytu.');
          return of(null);
        }),
      )
      .subscribe((result) => {
        if (!result) {
          return;
        }

        if (result.saved) {
          this.readings.update((current) => [result.reading, ...current]);
          this.successMessage.set(
            'Dzisiejszy odczyt został zapisany w archiwum.',
          );
        } else {
          this.successMessage.set('Dzisiejszy odczyt jest już zapisany.');
        }
      });
  }

  public startSubscription(plan: 'monthly' | 'annual'): void {
    if (this.billingLoading()) {
      return;
    }

    if (!this.paidPremiumEnabled()) {
      this.successMessage.set(
        'Premium jest obecnie otwarte. Płatności subskrypcyjne nie są uruchomione.',
      );
      return;
    }

    this.billingLoading.set(true);
    this.error.set(null);

    this.accountService
      .startSubscriptionCheckout(plan)
      .pipe(
        finalize(() => this.billingLoading.set(false)),
        catchError((error: unknown) => {
          if (this.handleUnauthorized(error)) {
            return of(null);
          }
          this.error.set('Nie udało się uruchomić płatności subskrypcji.');
          return of(null);
        }),
      )
      .subscribe((response) => {
        if (!response) {
          return;
        }

        if (this.browser) {
          window.location.assign(response.checkoutUrl);
        }
      });
  }

  public openSubscriptionPortal(): void {
    if (this.billingLoading()) {
      return;
    }

    this.billingLoading.set(true);
    this.error.set(null);

    this.accountService
      .openSubscriptionPortal()
      .pipe(
        finalize(() => this.billingLoading.set(false)),
        catchError((error: unknown) => {
          if (this.handleUnauthorized(error)) {
            return of(null);
          }
          this.error.set('Nie udało się otworzyć panelu Stripe.');
          return of(null);
        }),
      )
      .subscribe((response) => {
        if (!response) {
          return;
        }

        if (this.browser) {
          window.location.assign(response.url);
        }
      });
  }

  public deleteAccount(): void {
    if (
      !confirm(
        'Czy na pewno chcesz usunąć swoje konto? Ta operacja jest nieodwracalna i spowoduje utratę wszystkich zapisanych danych oraz aktywnej subskrypcji.',
      )
    ) {
      return;
    }

    this.isDeletingAccount.set(true);
    this.accountService.deleteAccount().subscribe({
      next: () => {
        this.isDeletingAccount.set(false);
        this.logout();
      },
      error: (err) => {
        this.isDeletingAccount.set(false);
        this.error.set(
          err.error?.message ||
            'Nie udało się usunąć konta. Skontaktuj się z obsługą.',
        );
      },
    });
  }

  public logout(): void {
    this.authService.logout();
    this.router.navigateByUrl('/');
  }

  public subscriptionLabel(status: AccountSubscription['status']): string {
    switch (status) {
      case 'active':
        return 'Aktywna';
      case 'trialing':
        return 'Okres próbny';
      case 'past_due':
        return 'Wymaga płatności';
      case 'canceled':
        return 'Anulowana';
      case 'unpaid':
        return 'Nieopłacona';
      default:
        return 'Nieaktywna';
    }
  }

  public subscriptionPlanLabel(plan: string | null | undefined): string {
    if (!plan) return 'brak';
    switch (plan.toLowerCase()) {
      case 'monthly':
        return 'Miesięczny';
      case 'annual':
        return 'Roczny';
      default:
        return plan;
    }
  }

  public readingTypeLabel(type: string | null | undefined): string {
    if (!type) return 'Inny';
    switch (type.toLowerCase()) {
      case 'horoscope':
        return 'Horoskop';
      case 'tarot':
        return 'Tarot';
      default:
        return type;
    }
  }

  public subscriptionBadgeClass(status: AccountSubscription['status']): string {
    switch (status) {
      case 'active':
      case 'trialing':
        return 'bg-emerald-100 text-emerald-800';
      case 'past_due':
      case 'unpaid':
        return 'bg-amber-100 text-amber-800';
      case 'canceled':
        return 'bg-slate-200 text-slate-700';
      default:
        return 'bg-rose-100 text-rose-700';
    }
  }

  private trackPremiumSubscriptionConversion(
    subscription: AccountSubscription,
  ): void {
    if (!this.browser) {
      return;
    }

    const query = this.route.snapshot.queryParamMap;
    if (query.get('subscription') !== 'success') {
      return;
    }

    const sessionId = query.get('session_id')?.trim();
    if (!sessionId || this.wasPremiumPurchaseTracked(sessionId)) {
      return;
    }

    const planParam = query.get('plan');
    const plan = isPremiumBillingPlan(planParam)
      ? planParam
      : isPremiumBillingPlan(subscription.plan)
        ? subscription.plan
        : null;

    if (!plan) {
      return;
    }

    const settings = this.appSettings();
    const planDetails = this.getPlanDetails(plan, settings);
    const item = {
      item_id: `premium_${plan}`,
      item_name: planDetails.itemName,
      item_brand: 'Star Sign',
      item_category: 'subscription',
      price: planDetails.price,
      quantity: 1,
    } satisfies Ga4Item;

    this.analyticsService.trackProductEvent('purchase', {
      ...this.buildPremiumAnalyticsParams(settings, {
        transaction_id: sessionId,
        value: planDetails.price,
        price: planDetails.price,
        checkout_type: 'premium',
        ui_surface: 'account_panel',
        funnel_step: 'purchase',
        plan,
        items: [item],
      }),
    });
    this.analyticsService.trackPremiumSubscriptionConversion(
      this.buildPremiumAnalyticsParams(settings, {
        transaction_id: sessionId,
        value: planDetails.price,
        price: planDetails.price,
        plan,
        status: subscription.status,
        ui_surface: 'account_panel',
        funnel_step: 'subscription_conversion',
      }),
    );
    window.sessionStorage.setItem(this.premiumPurchaseKey(sessionId), 'true');
  }

  private getPlanDetails(
    plan: 'monthly' | 'annual',
    settings: PublicAppSettingsResponse,
  ): { itemName: string; price: number } {
    return {
      itemName: premiumPlanDetails[plan].itemName,
      price: plan === 'annual' ? settings.annualPrice : settings.monthlyPrice,
    };
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

  private wasPremiumPurchaseTracked(sessionId: string): boolean {
    return (
      window.sessionStorage.getItem(this.premiumPurchaseKey(sessionId)) ===
      'true'
    );
  }

  private premiumPurchaseKey(sessionId: string): string {
    return `star-sign:ga4:premium-purchase:${sessionId}`;
  }

  private handleUnauthorized(error: unknown): boolean {
    if (
      error instanceof HttpErrorResponse &&
      (error.status === 401 || error.status === 403)
    ) {
      this.authService.expireSession();
      const returnUrl =
        this.router.url && this.router.url.startsWith('/')
          ? this.router.url
          : '/panel';
      void this.router.navigate(['/logowanie'], {
        queryParams: { returnUrl },
      });
      return true;
    }
    return false;
  }
}
