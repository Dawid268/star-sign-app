import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, shareReplay, timeout } from 'rxjs';
import {
  BillingCurrency,
  PremiumAccessMode,
  PremiumAccessPolicy,
  PublicMaintenanceModeSettings,
  PublicAppSettingsResponse,
} from '@star-sign-monorepo/shared-types';
import { environment } from '../../../environments/environment';
import { premiumPlanDetails } from '../premium-plans';
import { API_REQUEST_TIMEOUT_MS } from './api-timeout';

export const DEFAULT_PUBLIC_APP_SETTINGS: PublicAppSettingsResponse = {
  premiumMode: 'open',
  premiumAccessPolicy: 'open_access',
  currency: 'PLN',
  monthlyPrice: premiumPlanDetails.monthly.price,
  annualPrice: premiumPlanDetails.annual.price,
  stripeCheckoutEnabled: false,
  paidPremiumEnabled: false,
  trialDays: 7,
  allowPromotionCodes: true,
  maintenanceMode: {
    enabled: false,
    title: 'Pracujemy nad Star Sign',
    message: 'Dopracowujemy stronę i wrócimy za chwilę.',
    eta: null,
    contactUrl: null,
    allowedPaths: [
      '/regulamin',
      '/polityka-prywatnosci',
      '/cookies',
      '/disclaimer',
      '/newsletter/potwierdz',
      '/newsletter/wypisz',
    ],
  },
};

const toPremiumMode = (value: unknown): PremiumAccessMode =>
  value === 'paid' ? 'paid' : 'open';

const toCurrency = (value: unknown): BillingCurrency => {
  if (value === 'EUR' || value === 'USD') {
    return value;
  }

  return 'PLN';
};

const toNumber = (value: unknown, fallback: number): number => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

const toInteger = (value: unknown, fallback: number): number => {
  const parsed = Math.floor(toNumber(value, fallback));
  return Math.min(Math.max(parsed, 0), 90);
};

const toTrimmedString = (value: unknown, fallback: string): string => {
  if (typeof value !== 'string') {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
};

const toNullableIsoDate = (value: unknown): string | null => {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isSafeRelativePath = (value: string): boolean =>
  value.startsWith('/') && !value.startsWith('//') && value.length <= 160;

const toAllowedPaths = (value: unknown): string[] => {
  const rawPaths = Array.isArray(value) ? value : [];
  const paths = rawPaths
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(isSafeRelativePath);

  return paths.length > 0
    ? [...new Set(paths)]
    : DEFAULT_PUBLIC_APP_SETTINGS.maintenanceMode.allowedPaths;
};

const toContactUrl = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const url = value.trim();
  if (
    url.startsWith('https://') ||
    url.startsWith('mailto:') ||
    isSafeRelativePath(url)
  ) {
    return url;
  }

  return null;
};

const normalizeMaintenanceMode = (
  value: unknown,
): PublicMaintenanceModeSettings => {
  const raw = isRecord(value) ? value : {};
  const defaults = DEFAULT_PUBLIC_APP_SETTINGS.maintenanceMode;

  return {
    enabled: raw['enabled'] === true,
    title: toTrimmedString(raw['title'], defaults.title),
    message: toTrimmedString(raw['message'], defaults.message),
    eta: toNullableIsoDate(raw['eta']),
    contactUrl: toContactUrl(raw['contactUrl']),
    allowedPaths: toAllowedPaths(raw['allowedPaths']),
  };
};

const toPremiumAccessPolicy = (
  value: unknown,
  premiumMode: PremiumAccessMode,
): PremiumAccessPolicy => {
  if (value === 'open_access' || value === 'paid_enforced') {
    return value;
  }

  return premiumMode === 'paid' ? 'paid_enforced' : 'open_access';
};

const normalizePublicAppSettings = (
  raw: Partial<PublicAppSettingsResponse>,
): PublicAppSettingsResponse => {
  const premiumMode = toPremiumMode(raw.premiumMode);
  const stripeCheckoutEnabled = raw.stripeCheckoutEnabled === true;
  const paidPremiumEnabled =
    premiumMode === 'paid' &&
    stripeCheckoutEnabled &&
    raw.paidPremiumEnabled === true;

  return {
    premiumMode,
    premiumAccessPolicy: toPremiumAccessPolicy(
      raw.premiumAccessPolicy,
      premiumMode,
    ),
    currency: toCurrency(raw.currency),
    monthlyPrice: toNumber(
      raw.monthlyPrice,
      DEFAULT_PUBLIC_APP_SETTINGS.monthlyPrice,
    ),
    annualPrice: toNumber(
      raw.annualPrice,
      DEFAULT_PUBLIC_APP_SETTINGS.annualPrice,
    ),
    stripeCheckoutEnabled,
    paidPremiumEnabled,
    trialDays: toInteger(raw.trialDays, DEFAULT_PUBLIC_APP_SETTINGS.trialDays),
    allowPromotionCodes: raw.allowPromotionCodes !== false,
    maintenanceMode: normalizeMaintenanceMode(raw.maintenanceMode),
  };
};

@Injectable({
  providedIn: 'root',
})
export class AppSettingsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;
  private readonly settings$ = this.http
    .get<Partial<PublicAppSettingsResponse>>(
      `${this.apiUrl}/app-settings/public`,
      {
        headers: {
          'X-Skip-Loading': 'true',
          'X-Skip-Error-Notification': 'true',
        },
      },
    )
    .pipe(
      timeout(API_REQUEST_TIMEOUT_MS),
      map((settings) => normalizePublicAppSettings(settings)),
      catchError(() => of(DEFAULT_PUBLIC_APP_SETTINGS)),
      shareReplay({ bufferSize: 1, refCount: false }),
    );

  public getPublicAppSettings(): Observable<PublicAppSettingsResponse> {
    return this.settings$;
  }
}
