export type SubscriptionStatus =
  | 'inactive'
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'unpaid';

export type SubscriptionPlan = 'monthly' | 'annual' | null;

export interface UserZodiacSign {
  id: number;
  documentId: string;
  name: string;
  slug: string;
}

export interface AccountProfile {
  id: number;
  email: string;
  username: string;
  birthDate: string | null;
  birthTime: string | null;
  birthPlace: string | null;
  marketingConsent: boolean;
  zodiacSign: UserZodiacSign | null;
}

export interface AccountSubscription {
  status: SubscriptionStatus;
  plan: SubscriptionPlan;
  isPremium: boolean;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

export interface DailyRitualPayload {
  date: string;
  sign: {
    name: string;
    slug: string;
  } | null;
  horoscope: {
    date: string;
    period: string;
    teaser: string;
    premiumContent: string | null;
    isPremiumLocked: boolean;
  };
  tarot: {
    cardName: string | null;
    cardSlug: string | null;
    teaserMessage: string;
    premiumMessage: string | null;
    isPremiumLocked: boolean;
  };
  teaser: string;
  disclaimer: string;
}

export interface AccountDashboardResponse {
  profile: AccountProfile;
  subscription: AccountSubscription;
  daily: DailyRitualPayload;
}

export interface AccountMeResponse {
  profile: AccountProfile;
  subscription: AccountSubscription;
}

export interface AccountReading {
  id: number;
  documentId: string;
  readingType: 'horoscope' | 'tarot';
  title: string;
  summary: string;
  content: string | null;
  period: string | null;
  signSlug: string | null;
  readingDate: string | null;
  isPremium: boolean;
  source: string | null;
  createdAt: string;
}

export interface AccountReadingsResponse {
  data: AccountReading[];
}

export interface SaveTodayReadingResponse {
  saved: boolean;
  reading: AccountReading;
}

export interface SubscriptionCheckoutResponse {
  checkoutUrl: string;
  sessionId: string;
}

export interface SubscriptionPortalResponse {
  url: string;
}

export interface StrapiAuthUser {
  id: number;
  username: string;
  email: string;
}

export interface StrapiAuthResponse {
  jwt: string;
  user: StrapiAuthUser;
}
