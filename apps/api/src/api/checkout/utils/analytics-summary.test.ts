import { describe, expect, it } from 'vitest';

import { serializeCheckoutAnalyticsSummary } from './analytics-summary';

describe('serializeCheckoutAnalyticsSummary', () => {
  it('returns only public analytics fields', () => {
    const summary = serializeCheckoutAnalyticsSummary(
      {
        id: 10,
        documentId: 'order-doc',
        status: 'paid',
        currency: 'pln',
        total_amount: '149.50',
        stripe_session_id: 'cs_test_123',
      },
      [
        {
          product_document_id: 'product-1',
          product_name: 'Amulet',
          quantity: 2,
          unit_price: '49.75',
          line_total: '99.50',
        },
        {
          product_document_id: 'product-2',
          product_name: 'Karta',
          quantity: 1,
          unit_price: '50',
          line_total: '50',
        },
      ],
    );

    expect(summary).toEqual({
      sessionId: 'cs_test_123',
      orderDocumentId: 'order-doc',
      status: 'paid',
      currency: 'PLN',
      total: 149.5,
      items: [
        {
          productDocumentId: 'product-1',
          productName: 'Amulet',
          quantity: 2,
          unitPrice: 49.75,
          lineTotal: 99.5,
        },
        {
          productDocumentId: 'product-2',
          productName: 'Karta',
          quantity: 1,
          unitPrice: 50,
          lineTotal: 50,
        },
      ],
    });
  });

  it('normalizes unknown status to pending', () => {
    const summary = serializeCheckoutAnalyticsSummary(
      {
        id: 11,
        status: 'processing',
        total_amount: null,
      },
      [],
    );

    expect(summary.status).toBe('pending');
    expect(summary.currency).toBe('PLN');
    expect(summary.total).toBe(0);
  });
});
