import { describe, expect, it, vi, afterEach } from 'vitest';

import accountController, {
  resolveZodiacSignSlugFromBirthDate,
} from './account';

const zodiacSigns = {
  baran: { id: 1, documentId: 'zodiac-baran', name: 'Baran', slug: 'baran' },
  koziorozec: {
    id: 10,
    documentId: 'zodiac-koziorozec',
    name: 'Koziorożec',
    slug: 'koziorozec',
  },
};

const createCtx = (body: Record<string, unknown>) => ({
  state: {
    user: {
      id: 123,
      email: 'test@example.com',
      username: 'test',
    },
  },
  request: {
    body,
    header: {},
  },
  body: undefined as unknown,
  unauthorized: vi.fn(),
  badRequest: vi.fn(),
});

const createStrapiMock = () => {
  const userProfileQuery = {
    findOne: vi.fn().mockResolvedValue({
      id: 7,
      subscription_status: 'inactive',
    }),
    update: vi.fn().mockImplementation(async (input) => ({
      id: input.where.id,
      birth_date: input.data.birth_date,
      birth_time: input.data.birth_time,
      birth_place: input.data.birth_place,
      marketing_consent: input.data.marketing_consent,
      subscription_status: 'inactive',
      zodiac_sign: input.data.zodiac_sign
        ? Object.values(zodiacSigns).find(
            (sign) => sign.id === input.data.zodiac_sign,
          )
        : null,
    })),
  };
  const zodiacSignQuery = {
    findOne: vi.fn().mockImplementation(async ({ where }) => {
      const slug = where?.slug as keyof typeof zodiacSigns;
      return zodiacSigns[slug] || null;
    }),
  };

  const strapiMock = {
    db: {
      query: vi.fn((uid: string) => {
        if (uid === 'api::user-profile.user-profile') {
          return userProfileQuery;
        }
        if (uid === 'api::zodiac-sign.zodiac-sign') {
          return zodiacSignQuery;
        }
        throw new Error(`Unexpected query uid: ${uid}`);
      }),
    },
  };

  vi.stubGlobal('strapi', strapiMock);

  return { userProfileQuery, zodiacSignQuery };
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('account zodiac profile resolution', () => {
  it('resolves western zodiac sign slugs from birth dates', () => {
    expect(resolveZodiacSignSlugFromBirthDate('1990-01-01')).toBe(
      'koziorozec',
    );
    expect(resolveZodiacSignSlugFromBirthDate('2020-03-20')).toBe('ryby');
    expect(resolveZodiacSignSlugFromBirthDate('2020-03-21')).toBe('baran');
    expect(resolveZodiacSignSlugFromBirthDate('2020-04-19')).toBe('baran');
    expect(resolveZodiacSignSlugFromBirthDate('2020-04-20')).toBe('byk');
    expect(resolveZodiacSignSlugFromBirthDate('2020-05-21')).toBe(
      'bliznieta',
    );
    expect(resolveZodiacSignSlugFromBirthDate('2020-06-21')).toBe('rak');
    expect(resolveZodiacSignSlugFromBirthDate('2020-07-23')).toBe('lew');
    expect(resolveZodiacSignSlugFromBirthDate('2020-08-23')).toBe('panna');
    expect(resolveZodiacSignSlugFromBirthDate('2020-09-23')).toBe('waga');
    expect(resolveZodiacSignSlugFromBirthDate('2020-10-23')).toBe('skorpion');
    expect(resolveZodiacSignSlugFromBirthDate('2020-11-22')).toBe('strzelec');
    expect(resolveZodiacSignSlugFromBirthDate('2020-12-22')).toBe(
      'koziorozec',
    );
    expect(resolveZodiacSignSlugFromBirthDate('2020-01-20')).toBe('wodnik');
    expect(resolveZodiacSignSlugFromBirthDate('2020-02-19')).toBe('ryby');
  });

  it('sets zodiac_sign from birthDate when profile is updated', async () => {
    const { userProfileQuery, zodiacSignQuery } = createStrapiMock();
    const ctx = createCtx({
      birthDate: '1990-01-01',
      birthTime: '12:00',
      birthPlace: 'Warszawa',
      zodiacSignSlug: 'baran',
      marketingConsent: true,
    });

    await accountController.updateProfile(ctx);

    expect(zodiacSignQuery.findOne).toHaveBeenCalledWith({
      where: { slug: 'koziorozec' },
    });
    expect(userProfileQuery.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          birth_date: '1990-01-01',
          birth_time: '12:00',
          birth_place: 'Warszawa',
          marketing_consent: true,
          zodiac_sign: zodiacSigns.koziorozec.id,
        }),
      }),
    );
  });

  it('clears zodiac_sign when birthDate is cleared', async () => {
    const { userProfileQuery, zodiacSignQuery } = createStrapiMock();
    const ctx = createCtx({
      birthDate: '',
      zodiacSignSlug: 'baran',
      marketingConsent: false,
    });

    await accountController.updateProfile(ctx);

    expect(zodiacSignQuery.findOne).not.toHaveBeenCalled();
    expect(userProfileQuery.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          birth_date: null,
          zodiac_sign: null,
        }),
      }),
    );
  });

  it('keeps zodiacSignSlug as a legacy fallback when birthDate is omitted', async () => {
    const { userProfileQuery, zodiacSignQuery } = createStrapiMock();
    const ctx = createCtx({
      zodiacSignSlug: 'baran',
      marketingConsent: true,
    });

    await accountController.updateProfile(ctx);

    expect(zodiacSignQuery.findOne).toHaveBeenCalledWith({
      where: { slug: 'baran' },
    });
    expect(userProfileQuery.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          zodiac_sign: zodiacSigns.baran.id,
        }),
      }),
    );
  });
});
