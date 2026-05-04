import { type Page, type Route } from '@playwright/test';

const pagination = {
  page: 1,
  pageSize: 12,
  pageCount: 1,
  total: 0,
};

const signs = [
  {
    id: 1,
    documentId: 'sign-baran',
    name: 'Baran',
    slug: 'baran',
    date_range: '21.03 - 19.04',
    element: 'Ogień',
    planet: 'Mars',
    symbol: '♈',
    description: 'Baran działa szybko, odważnie i bez zbędnego zwlekania.',
  },
  {
    id: 2,
    documentId: 'sign-byk',
    name: 'Byk',
    slug: 'byk',
    date_range: '20.04 - 20.05',
    element: 'Ziemia',
    planet: 'Wenus',
    symbol: '♉',
    description: 'Byk ceni spokój, stabilność i dobrze zaplanowane decyzje.',
  },
];

const articles = [
  {
    id: 1,
    documentId: 'article-energia-wiosny',
    slug: 'energia-wiosny',
    title: 'Energia wiosny i Twój znak',
    excerpt: 'Sprawdź, jak nowy sezon wpływa na Twoją energię.',
    content:
      'Publiczny fragment artykułu o energii wiosny jest dostępny bez konta.',
    hasPremiumContent: true,
    publishedAt: '2026-05-01T08:00:00.000Z',
    read_time_minutes: 4,
    category: { name: 'Astrologia', slug: 'astrologia' },
  },
  {
    id: 2,
    documentId: 'article-retrogradacja',
    slug: 'retrogradacja-merkurego',
    title: 'Retrogradacja Merkurego bez chaosu',
    excerpt: 'Praktyczne wskazówki na spokojniejszy czas.',
    content: 'Publiczny przewodnik po retrogradacji Merkurego.',
    publishedAt: '2026-04-29T08:00:00.000Z',
    read_time_minutes: 6,
    category: { name: 'Horoskopy', slug: 'horoskopy' },
  },
  {
    id: 3,
    documentId: 'article-rytualy',
    slug: 'male-rytualy',
    title: 'Małe rytuały na dobry początek dnia',
    excerpt: 'Proste praktyki wspierające codzienną uważność.',
    content: 'Publiczny opis małych rytuałów na dobry początek dnia.',
    publishedAt: '2026-04-25T08:00:00.000Z',
    read_time_minutes: 5,
    category: { name: 'Astrologia', slug: 'astrologia' },
  },
];

const horoscopes = [
  {
    id: 1,
    documentId: 'horoscope-baran-dzienny',
    period: 'Dzienny',
    type: 'Ogólny',
    content: 'Darmowy horoskop dla Barana: dzień sprzyja spokojnym decyzjom.',
    hasPremiumContent: true,
    date: '2026-05-02',
    zodiac_sign: signs[0],
  },
  {
    id: 2,
    documentId: 'horoscope-baran-chinski',
    period: 'Dzienny',
    type: 'Chiński',
    content:
      'Darmowy horoskop chiński dla Barana prowadzi do cierpliwego działania.',
    hasPremiumContent: true,
    date: '2026-05-02',
    zodiac_sign: signs[0],
  },
];

const accountProfile = {
  id: 1,
  email: 'tester@example.com',
  username: 'E2E Tester',
  birthDate: '1990-01-01',
  birthTime: '08:30',
  birthPlace: 'Warszawa',
  marketingConsent: false,
  zodiacSign: {
    id: 10,
    documentId: 'sign-koziorozec',
    name: 'Koziorożec',
    slug: 'koziorozec',
  },
};

const accountSubscription = {
  status: 'inactive',
  plan: null,
  isPremium: false,
  trialEndsAt: null,
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
};

const accountDaily = {
  date: '2026-05-02',
  sign: {
    name: 'Koziorożec',
    slug: 'koziorozec',
  },
  horoscope: {
    date: '2026-05-02',
    period: 'Dzienny',
    teaser: 'Dzisiaj wybierz spokojne tempo i jeden konkretny priorytet.',
    premiumContent: null,
    isPremiumLocked: true,
  },
  tarot: {
    cardName: 'Gwiazda',
    cardSlug: 'gwiazda',
    teaserMessage: 'Karta dnia zachęca do cierpliwego działania.',
    premiumMessage: null,
    isPremiumLocked: true,
  },
  teaser: 'Twój rytuał dnia jest gotowy do spokojnego przejrzenia.',
  disclaimer: 'Treści mają charakter rozrywkowy i refleksyjny.',
};

const collection = <T>(data: T[]) => ({
  data,
  meta: {
    pagination: {
      ...pagination,
      total: data.length,
    },
  },
});

const fulfillJson = (route: Route, status: number, json: unknown) =>
  route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(json),
  });

const handleArticles = (route: Route): Promise<void> => {
  const url = new URL(route.request().url());
  const slug = url.searchParams.get('filters[slug][$eq]');
  const category = url.searchParams.get('filters[category][name][$eq]');
  const search =
    url.searchParams.get('filters[$or][0][title][$containsi]') ??
    url.searchParams.get('filters[$or][1][excerpt][$containsi]');

  let payload = articles;

  if (slug) {
    payload = payload.filter((article) => article.slug === slug);
  }

  if (category && category !== 'Wszystko') {
    payload = payload.filter((article) => article.category?.name === category);
  }

  if (search) {
    const normalized = search.toLocaleLowerCase('pl-PL');
    payload = payload.filter(
      (article) =>
        article.title.toLocaleLowerCase('pl-PL').includes(normalized) ||
        article.excerpt.toLocaleLowerCase('pl-PL').includes(normalized),
    );
  }

  return fulfillJson(route, 200, collection(payload));
};

const handleHoroscopes = (route: Route): Promise<void> => {
  const url = new URL(route.request().url());
  const period = url.searchParams.get('filters[period][$eq]');
  const type = url.searchParams.get('filters[type][$eq]');
  const signSlug = url.searchParams.get('filters[zodiac_sign][slug][$eq]');

  const payload = horoscopes.filter(
    (horoscope) =>
      (!period || horoscope.period === period) &&
      (!type || horoscope.type === type) &&
      (!signSlug || horoscope.zodiac_sign.slug === signSlug),
  );

  return fulfillJson(route, 200, collection(payload));
};

export const mockApi = async (page: Page): Promise<void> => {
  await page.route(
    '**/api/checkout/session/cs_test_mock/analytics-summary',
    (route) =>
      fulfillJson(route, 200, {
        sessionId: 'cs_test_mock',
        orderDocumentId: 'order-mock',
        status: 'paid',
        currency: 'PLN',
        total: 79,
        items: [
          {
            productDocumentId: 'mock-product',
            productName: 'Mock Produkt Star Sign',
            quantity: 1,
            unitPrice: 79,
            lineTotal: 79,
          },
        ],
      }),
  );

  await page.route('**/api/zodiac-signs**', (route) =>
    fulfillJson(route, 200, collection(signs)),
  );

  await page.route('**/api/articles**', handleArticles);

  await page.route('**/api/horoscopes**', handleHoroscopes);

  await page.route('**/api/account/me', (route) =>
    fulfillJson(route, 200, {
      profile: accountProfile,
      subscription: accountSubscription,
    }),
  );

  await page.route('**/api/account/dashboard', (route) =>
    fulfillJson(route, 200, {
      profile: accountProfile,
      subscription: accountSubscription,
      daily: accountDaily,
    }),
  );

  await page.route('**/api/account/readings**', (route) =>
    fulfillJson(route, 200, {
      data: [
        {
          id: 1,
          documentId: 'reading-e2e',
          readingType: 'tarot',
          title: 'Karta dnia',
          summary: 'Krótki zapisany odczyt do testów responsywnych.',
          content: null,
          period: null,
          signSlug: null,
          readingDate: '2026-05-02',
          isPremium: false,
          source: 'e2e',
          createdAt: '2026-05-02T08:00:00.000Z',
        },
      ],
    }),
  );

  await page.route('**/api/daily-tarot/today**', (route) =>
    fulfillJson(route, 200, {
      date: '2026-05-02',
      card: {
        id: 1,
        documentId: 'tarot-star',
        name: 'Gwiazda',
        slug: 'gwiazda',
        arcana: 'Wielkie Arkana',
        symbol: '✦',
        meaning_upright: 'Nadzieja, spokój i odnowa energii.',
        description:
          'Darmowe przesłanie karty dnia pokazuje kierunek bez blokady kontem.',
      },
      message: 'To dobry dzień na spokojne decyzje.',
    }),
  );

  await page.route('**/api/newsletter/subscribe', (route) =>
    fulfillJson(route, 202, { accepted: true }),
  );

  await page.route('**/api/contact', (route) =>
    fulfillJson(route, 202, {
      success: true,
      message: 'Wiadomość wysłana',
    }),
  );
};
