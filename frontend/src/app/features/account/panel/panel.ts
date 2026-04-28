import { ChangeDetectionStrategy, Component, OnInit, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { DatePipe, isPlatformBrowser } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ZodiacService } from '../../../core/services/zodiac.service';
import { AuthService } from '../../../core/services/auth.service';
import { AccountService } from '../../../core/services/account.service';
import { featureFlags } from '../../../core/feature-flags';
import { AccountDashboardResponse, AccountReading, AccountSubscription, ZodiacSign } from '@star-sign-monorepo/shared-types';

@Component({
  selector: 'app-account-panel',
  imports: [ReactiveFormsModule, RouterLink, DatePipe],
  templateUrl: './panel.html',
  styleUrl: './panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountPanel implements OnInit {
  private readonly accountService = inject(AccountService);
  private readonly authService = inject(AuthService);
  private readonly zodiacService = inject(ZodiacService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));

  public readonly loading = signal(true);
  public readonly error = signal<string | null>(null);
  public readonly profileSaving = signal(false);
  public readonly readingSaving = signal<null | 'horoscope' | 'tarot'>(null);
  public readonly billingLoading = signal(false);
  public readonly successMessage = signal<string | null>(null);
  public readonly shopEnabled = featureFlags.shopEnabled;

  public readonly zodiacSigns = signal<ZodiacSign[]>([]);
  public readonly dashboard = signal<AccountDashboardResponse | null>(null);
  public readonly readings = signal<AccountReading[]>([]);

  public readonly isPremium = computed(() => Boolean(this.dashboard()?.subscription.isPremium));
  public readonly subscription = computed<AccountSubscription | null>(() => this.dashboard()?.subscription || null);

  public readonly profileForm = this.formBuilder.nonNullable.group({
    birthDate: [''],
    birthTime: [''],
    birthPlace: [''],
    zodiacSignSlug: [''],
    marketingConsent: [false],
  });

  public ngOnInit(): void {
    this.zodiacService.getZodiacSigns().subscribe({
      next: (signs) => this.zodiacSigns.set(signs),
      error: () => this.zodiacSigns.set([]),
    });
    this.loadPanelData();
  }

  public loadPanelData(): void {
    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      me: this.accountService.getMe(),
      dashboard: this.accountService.getDashboard(),
      readings: this.accountService.getReadings(30),
    })
      .pipe(
        finalize(() => this.loading.set(false)),
        catchError((error: unknown) => {
          if (this.handleUnauthorized(error)) {
            return of(null);
          }
          this.error.set('Nie udało się pobrać panelu użytkownika. Spróbuj ponownie.');
          return of(null);
        })
      )
      .subscribe((payload) => {
        if (!payload) {
          return;
        }

        this.dashboard.set(payload.dashboard);
        this.readings.set(payload.readings.data);

        const profile = payload.me.profile;
        this.profileForm.setValue({
          birthDate: profile.birthDate || '',
          birthTime: profile.birthTime || '',
          birthPlace: profile.birthPlace || '',
          zodiacSignSlug: profile.zodiacSign?.slug || '',
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
    if (this.profileSaving()) {
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
        zodiacSignSlug: values.zodiacSignSlug || null,
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
        })
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
        })
      )
      .subscribe((result) => {
        if (!result) {
          return;
        }

        if (result.saved) {
          this.readings.update((current) => [result.reading, ...current]);
          this.successMessage.set('Dzisiejszy odczyt został zapisany w archiwum.');
        } else {
          this.successMessage.set('Dzisiejszy odczyt jest już zapisany.');
        }
      });
  }

  public startSubscription(plan: 'monthly' | 'annual'): void {
    if (this.billingLoading()) {
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
        })
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
        })
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

  private handleUnauthorized(error: unknown): boolean {
    if (error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403)) {
      this.authService.logout();
      this.router.navigateByUrl('/logowanie');
      return true;
    }
    return false;
  }
}
