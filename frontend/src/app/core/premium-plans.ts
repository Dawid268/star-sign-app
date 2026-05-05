export type PremiumBillingPlan = 'monthly' | 'annual';

export const premiumPlanDetails: Record<
  PremiumBillingPlan,
  { itemName: string; price: number }
> = {
  annual: {
    itemName: 'Premium roczny',
    price: 199,
  },
  monthly: {
    itemName: 'Premium miesięczny',
    price: 24.99,
  },
};

export const isPremiumBillingPlan = (
  value: string | null | undefined,
): value is PremiumBillingPlan => value === 'monthly' || value === 'annual';
