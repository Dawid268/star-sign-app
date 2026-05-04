import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  canReadPremiumContent,
  hasPremiumContent,
  sanitizePremiumEntity,
  sanitizePremiumResponse,
} from './premium-content';

const words = (prefix: string, count: number): string =>
  Array.from({ length: count }, (_, index) => `${prefix}${index}`).join(' ');

const validPremiumContent = (): string => `
Relacje: ${words('relacja', 75)}
Praca: ${words('praca', 75)}
Energia dnia: ${words('energia', 75)}
Rytuał: ${words('rytual', 75)}
Pytanie refleksyjne: ${words('pytanie', 75)}
`;

const stubPremiumMode = (premiumMode: 'open' | 'paid'): void => {
  vi.stubGlobal('strapi', {
    db: {
      query: vi.fn((uid: string) => {
        if (uid === 'api::app-setting.app-setting') {
          return {
            findOne: vi.fn(async () => ({ premium_mode: premiumMode })),
          };
        }

        throw new Error(`Unexpected query uid: ${uid}`);
      }),
    },
  });
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('premium-content helpers', () => {
  it('detects meaningful premium content', () => {
    expect(hasPremiumContent(validPremiumContent())).toBe(true);
    expect(hasPremiumContent('   ')).toBe(false);
    expect(hasPremiumContent(null)).toBe(false);
  });

  it('allows guest premium reads while premium mode is open', async () => {
    stubPremiumMode('open');

    await expect(canReadPremiumContent({ request: { header: {} } })).resolves.toBe(
      true,
    );
  });

  it('blocks guest premium reads when premium mode is paid', async () => {
    stubPremiumMode('paid');

    await expect(canReadPremiumContent({ request: { header: {} } })).resolves.toBe(
      false,
    );
  });

  it('removes premiumContent for non-premium responses and keeps marker', () => {
    const entity = sanitizePremiumEntity(
      {
        id: 1,
        title: 'Article',
        content: 'Public section',
        premiumContent: validPremiumContent(),
      },
      false,
    );

    expect(entity).toEqual({
      id: 1,
      title: 'Article',
      content: 'Public section',
      hasPremiumContent: true,
    });
  });

  it('keeps premiumContent for premium responses', () => {
    const entity = sanitizePremiumEntity(
      {
        id: 1,
        title: 'Article',
        content: 'Public section',
        premiumContent: validPremiumContent(),
      },
      true,
    );

    expect(entity).toEqual({
      id: 1,
      title: 'Article',
      content: 'Public section',
      premiumContent: validPremiumContent(),
      hasPremiumContent: true,
    });
  });

  it('does not mark weak premium content as available', () => {
    const entity = sanitizePremiumEntity(
      {
        id: 1,
        title: 'Article',
        content: 'Public section',
        premiumContent: 'Krótki dopisek bez realnej wartości.',
      },
      true,
    );

    expect(entity).toEqual({
      id: 1,
      title: 'Article',
      content: 'Public section',
      hasPremiumContent: false,
    });
  });

  it('marks nested attributes content without leaking it', () => {
    const entity = sanitizePremiumEntity(
      {
        id: 1,
        attributes: {
          title: 'Article',
          content: 'Public nested section',
          premiumContent: validPremiumContent(),
        },
      },
      false,
    );

    expect(entity).toEqual({
      id: 1,
      hasPremiumContent: true,
      attributes: {
        title: 'Article',
        content: 'Public nested section',
        hasPremiumContent: true,
      },
    });
  });

  it('sanitizes collection responses', () => {
    const response = sanitizePremiumResponse(
      {
        data: [
          { id: 1, content: 'Public', premiumContent: validPremiumContent() },
          { id: 2, premiumContent: null },
        ],
        meta: { pagination: { total: 2 } },
      },
      false,
    );

    expect(response).toEqual({
      data: [
        { id: 1, content: 'Public', hasPremiumContent: true },
        { id: 2, hasPremiumContent: false },
      ],
      meta: { pagination: { total: 2 } },
    });
  });

  it('removes premiumContent from populated nested relations for non-premium users', () => {
    const response = sanitizePremiumResponse(
      {
        data: {
          id: 1,
          title: 'Parent article',
          content: 'Parent public section',
          premiumContent: validPremiumContent(),
          relatedArticles: [
            {
              id: 2,
              title: 'Nested article',
              content: 'Nested public section',
              premiumContent: validPremiumContent(),
            },
          ],
        },
      },
      false,
    );

    expect(response).toEqual({
      data: {
        id: 1,
        title: 'Parent article',
        content: 'Parent public section',
        hasPremiumContent: true,
        relatedArticles: [
          {
            id: 2,
            title: 'Nested article',
            content: 'Nested public section',
            hasPremiumContent: true,
          },
        ],
      },
    });
  });
});
