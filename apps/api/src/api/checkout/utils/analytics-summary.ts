type OrderStatus = 'pending' | 'paid' | 'cancelled' | 'failed';

export type OrderRecord = {
  id: number;
  documentId?: string;
  status?: string;
  currency?: string;
  total_amount?: unknown;
  stripe_session_id?: string;
};

export type OrderItemRecord = {
  product_document_id?: string;
  product_name?: string;
  quantity?: unknown;
  unit_price?: unknown;
  line_total?: unknown;
};

const normalizeStatus = (status: string | undefined): OrderStatus => {
  if (status === 'paid' || status === 'cancelled' || status === 'failed') {
    return status;
  }

  return 'pending';
};

const toMoneyNumber = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeCurrency = (currency: string | undefined): string =>
  (currency || 'pln').toUpperCase();

export const serializeCheckoutAnalyticsSummary = (
  order: OrderRecord,
  items: OrderItemRecord[],
) => ({
  sessionId: order.stripe_session_id || '',
  orderDocumentId: order.documentId || String(order.id),
  status: normalizeStatus(order.status),
  currency: normalizeCurrency(order.currency),
  total: toMoneyNumber(order.total_amount),
  items: items.map((item) => ({
    productDocumentId: item.product_document_id || '',
    productName: item.product_name || 'Produkt Star Sign',
    quantity: Number(item.quantity) || 0,
    unitPrice: toMoneyNumber(item.unit_price),
    lineTotal: toMoneyNumber(item.line_total),
  })),
});
