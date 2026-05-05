export interface Ga4Item {
  item_id: string;
  item_name: string;
  item_brand?: string;
  item_category?: string;
  item_variant?: string;
  price?: number;
  quantity?: number;
}

export type CheckoutAnalyticsStatus =
  | 'pending'
  | 'paid'
  | 'cancelled'
  | 'failed';

export interface CheckoutAnalyticsSummaryItem {
  productDocumentId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface CheckoutAnalyticsSummary {
  sessionId: string;
  orderDocumentId: string;
  status: CheckoutAnalyticsStatus;
  currency: string;
  total: number;
  items: CheckoutAnalyticsSummaryItem[];
}
