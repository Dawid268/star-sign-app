import type { PremiumAccessMode } from './user-account.types';

export type BillingCurrency = 'PLN' | 'EUR' | 'USD';
export type PremiumAccessPolicy = 'open_access' | 'paid_enforced';

export interface PublicMaintenanceModeSettings {
  enabled: boolean;
  title: string;
  message: string;
  eta: string | null;
  contactUrl: string | null;
  allowedPaths: string[];
}

export interface PublicAppSettingsResponse {
  premiumMode: PremiumAccessMode;
  premiumAccessPolicy: PremiumAccessPolicy;
  currency: BillingCurrency;
  monthlyPrice: number;
  annualPrice: number;
  stripeCheckoutEnabled: boolean;
  paidPremiumEnabled: boolean;
  trialDays: number;
  allowPromotionCodes: boolean;
  maintenanceMode: PublicMaintenanceModeSettings;
}
