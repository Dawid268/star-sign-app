import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');
const siteUrl = process.env['FRONTEND_URL'] || 'http://localhost:4200';
const strapiApiUrl = process.env['API_URL'] || 'http://localhost:1337/api';
const strapiApiBaseUrl = strapiApiUrl.endsWith('/') ? strapiApiUrl.slice(0, -1) : strapiApiUrl;
const useE2eMockApi = process.env['E2E_MOCK_API'] === 'true';
const e2eApiLogEnabled = process.env['E2E_MOCK_API_LOG'] === 'true';
const shopEnabled = process.env['SHOP_ENABLED'] === 'true' || process.env['FRONTEND_SHOP_ENABLED'] === 'true';

const app = express();
const angularApp = new AngularNodeAppEngine();

type StrapiCollectionResponse<T> = {
  data: T[];
  meta?: {
    pagination?: {
      page: number;
      pageCount: number;
    };
  };
};

const escapeXml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const fetchAll = async <T>(resource: string): Promise<T[]> => {
  const pageSize = 100;
  let page = 1;
  let pageCount = 1;
  const results: T[] = [];

  do {
    const separator = resource.includes('?') ? '&' : '?';
    const url = `${strapiApiUrl}/${resource}${separator}pagination[page]=${page}&pagination[pageSize]=${pageSize}`;
    const response = await fetch(url);
    if (!response.ok) {
      break;
    }

    const payload = (await response.json()) as StrapiCollectionResponse<T>;
    results.push(...payload.data);
    pageCount = payload.meta?.pagination?.pageCount ?? 1;
    page += 1;
  } while (page <= pageCount);

  return results;
};

const readRequestBody = async (req: express.Request): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    req.on('data', (chunk: Uint8Array) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });

const createCollection = <T>(data: T[]) => ({
  data,
  meta: {
    pagination: {
      page: 1,
      pageSize: data.length,
      pageCount: 1,
      total: data.length,
    },
  },
});

const mockJwt = 'mock-jwt-token';
const mockUser = {
  id: 1,
  username: 'gwiezdny_rytual',
  email: 'demo@starsign.local',
};

let mockProfile = {
  id: 1,
  email: mockUser.email,
  username: mockUser.username,
  birthDate: null as string | null,
  birthTime: null as string | null,
  birthPlace: null as string | null,
  marketingConsent: false,
  zodiacSign: null as { id: number; name: string; slug: string; documentId: string } | null,
};

let mockSubscription = {
  status: 'inactive',
  plan: null as 'monthly' | 'annual' | null,
  isPremium: false,
  trialEndsAt: null as string | null,
  currentPeriodEnd: null as string | null,
  cancelAtPeriodEnd: false,
};

let mockReadings: Array<{
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
}> = [];

let readingIdSeed = 1;

if (useE2eMockApi) {
  app.use('/api', express.json(), (req, res) => {
    if (e2eApiLogEnabled) {
      console.log(`[mock-api] ${req.method} ${req.path}`);
    }

    const signs = [
      { id: 1, name: 'Baran', slug: 'baran', date_range: '21.03 - 19.04', element: 'Ogień' },
      { id: 2, name: 'Byk', slug: 'byk', date_range: '20.04 - 20.05', element: 'Ziemia' },
      { id: 3, name: 'Bliźnięta', slug: 'bliznieta', date_range: '21.05 - 20.06', element: 'Powietrze' },
      { id: 4, name: 'Rak', slug: 'rak', date_range: '21.06 - 22.07', element: 'Woda' },
    ];

    const articles = [
      {
        id: 1,
        slug: 'energia-wiosny',
        title: 'Energia Wiosny i Twój Znak',
        excerpt: 'Sprawdź, jak nowy sezon wpływa na Twoją energię i decyzje.',
        publishedAt: new Date().toISOString(),
        read_time_minutes: 4,
        category: { id: 1, name: 'Astrologia' },
      },
      {
        id: 2,
        slug: 'retrogradacja-merkurego',
        title: 'Retrogradacja Merkurego bez chaosu',
        excerpt: 'Praktyczne wskazówki, jak przejść przez retrogradację spokojniej.',
        publishedAt: new Date().toISOString(),
        read_time_minutes: 6,
        category: { id: 2, name: 'Poradnik' },
      },
    ];

    const products = [
      {
        id: 1,
        documentId: 'prod-amulet-1',
        name: 'Amulet Harmonii',
        slug: 'amulet-harmonii',
        description: 'Delikatny talizman wspierający codzienną równowagę.',
        price: 129,
        category: 'Talizmany',
        symbol: '✦',
        currency: 'PLN',
        sku: 'AMU-HAR-001',
        stock_status: 'in_stock',
      },
      {
        id: 2,
        documentId: 'prod-krysztal-1',
        name: 'Kryształ Intencji',
        slug: 'krysztal-intencji',
        description: 'Kryształ do pracy z intencją i medytacją.',
        price: 89,
        category: 'Kryształy',
        symbol: '✧',
        currency: 'PLN',
        sku: 'KRY-INT-001',
        stock_status: 'in_stock',
      },
    ];

    const normalizedPath = req.path.replace(/\/$/, '') || '/';
    const authHeader = req.headers.authorization || '';
    const isAuthorized = authHeader === `Bearer ${mockJwt}`;

    const today = new Date().toISOString().slice(0, 10);

    const dailyPayload = {
      date: today,
      sign: mockProfile.zodiacSign
        ? {
            name: mockProfile.zodiacSign.name,
            slug: mockProfile.zodiacSign.slug,
          }
        : null,
      horoscope: {
        date: today,
        period: 'dzienny',
        teaser: 'Krótki, darmowy wgląd astrologiczny na dzisiaj.',
        premiumContent: mockSubscription.isPremium
          ? 'Pełna interpretacja premium z dodatkowymi wskazówkami i kontekstem osobistym.'
          : null,
        isPremiumLocked: !mockSubscription.isPremium,
      },
      tarot: {
        cardName: 'The Star',
        cardSlug: 'the-star',
        teaserMessage: 'Karta dnia zachęca do spokoju i wiary w proces.',
        premiumMessage: mockSubscription.isPremium
          ? 'Wersja premium: pogłębiona interpretacja karty dla relacji, pracy i energii tygodnia.'
          : null,
        isPremiumLocked: !mockSubscription.isPremium,
      },
      teaser: 'Darmowy rytuał dnia działa od razu po zalogowaniu.',
      disclaimer:
        'Treści mają charakter refleksyjno-rozrywkowy i nie stanowią porady medycznej, prawnej ani finansowej.',
    };

    if (req.method === 'POST' && normalizedPath === '/auth/local') {
      res.json({
        jwt: mockJwt,
        user: mockUser,
      });
      return;
    }

    if (req.method === 'POST' && normalizedPath === '/auth/local/register') {
      const payload = (req.body || {}) as { email?: string; username?: string };
      if (typeof payload.email === 'string' && payload.email.trim()) {
        mockUser.email = payload.email.trim().toLowerCase();
      }
      if (typeof payload.username === 'string' && payload.username.trim()) {
        mockUser.username = payload.username.trim();
      }
      mockProfile = {
        ...mockProfile,
        email: mockUser.email,
        username: mockUser.username,
      };
      res.json({
        jwt: mockJwt,
        user: mockUser,
      });
      return;
    }

    if (req.method === 'GET' && normalizedPath === '/zodiac-signs') {
      res.json(createCollection(signs));
      return;
    }

    if (req.method === 'GET' && normalizedPath === '/articles') {
      const slug = typeof req.query['filters[slug][$eq]'] === 'string' ? req.query['filters[slug][$eq]'] : undefined;
      const payload = slug ? articles.filter((article) => article.slug === slug) : articles;
      res.json(createCollection(payload));
      return;
    }

    if (req.method === 'GET' && normalizedPath === '/products') {
      if (!shopEnabled) {
        res.status(404).json({ error: 'Shop disabled' });
        return;
      }

      const documentId = typeof req.query['filters[documentId][$eq]'] === 'string' ? req.query['filters[documentId][$eq]'] : undefined;
      const category = typeof req.query['filters[category][$eq]'] === 'string' ? req.query['filters[category][$eq]'] : undefined;
      let payload = products;
      if (documentId) {
        payload = payload.filter((product) => product.documentId === documentId);
      }
      if (category) {
        payload = payload.filter((product) => product.category === category);
      }
      res.json(createCollection(payload));
      return;
    }

    if (req.method === 'GET' && normalizedPath.startsWith('/products/')) {
      if (!shopEnabled) {
        res.status(404).json({ error: 'Shop disabled' });
        return;
      }

      const documentId = normalizedPath.replace('/products/', '');
      const product = products.find((item) => item.documentId === documentId);
      res.json({ data: product || null });
      return;
    }

    if (req.method === 'GET' && normalizedPath === '/daily-tarot/today') {
      res.json({
        date: new Date().toISOString().slice(0, 10),
        card: {
          id: 1,
          name: 'The Star',
          slug: 'the-star',
          upright_meaning: 'Nadzieja, spokój i odnowa energii.',
        },
        message: 'To dobry dzień na spokojne decyzje.',
      });
      return;
    }

    if (req.method === 'POST' && normalizedPath === '/newsletter/subscribe') {
      res.status(202).json({ accepted: true });
      return;
    }

    if (req.method === 'POST' && normalizedPath === '/checkout/session') {
      if (!shopEnabled) {
        res.status(404).json({ error: 'Shop disabled' });
        return;
      }

      res.json({
        checkoutUrl: 'https://example.com/checkout/mock-session',
        sessionId: 'cs_test_mock',
      });
      return;
    }

    if (!isAuthorized && normalizedPath.startsWith('/account/')) {
      res.status(401).json({
        error: {
          status: 401,
          name: 'UnauthorizedError',
          message: 'Brak autoryzacji.',
        },
      });
      return;
    }

    if (req.method === 'GET' && normalizedPath === '/account/me') {
      res.json({
        profile: mockProfile,
        subscription: mockSubscription,
      });
      return;
    }

    if (req.method === 'PUT' && normalizedPath === '/account/profile') {
      const payload = (req.body || {}) as {
        birthDate?: string | null;
        birthTime?: string | null;
        birthPlace?: string | null;
        zodiacSignSlug?: string | null;
        marketingConsent?: boolean;
      };
      const matchedSign = payload.zodiacSignSlug ? signs.find((sign) => sign.slug === payload.zodiacSignSlug) : null;
      mockProfile = {
        ...mockProfile,
        birthDate: payload.birthDate || null,
        birthTime: payload.birthTime || null,
        birthPlace: payload.birthPlace || null,
        marketingConsent: Boolean(payload.marketingConsent),
        zodiacSign: matchedSign
          ? {
              id: matchedSign.id,
              name: matchedSign.name,
              slug: matchedSign.slug,
              documentId: `zodiac-${matchedSign.slug}`,
            }
          : null,
      };
      res.json({
        profile: mockProfile,
        subscription: mockSubscription,
      });
      return;
    }

    if (req.method === 'GET' && normalizedPath === '/account/dashboard') {
      res.json({
        profile: mockProfile,
        subscription: mockSubscription,
        daily: dailyPayload,
      });
      return;
    }

    if (req.method === 'GET' && normalizedPath === '/account/readings') {
      res.json({ data: mockReadings });
      return;
    }

    if (req.method === 'POST' && normalizedPath === '/account/readings/save-today') {
      const payload = (req.body || {}) as { readingType?: 'horoscope' | 'tarot' };
      const readingType: 'horoscope' | 'tarot' = payload.readingType === 'tarot' ? 'tarot' : 'horoscope';
      const existing = mockReadings.find((item) => item.readingType === readingType && item.readingDate === today);

      if (existing) {
        res.json({ saved: false, reading: existing });
        return;
      }

      const reading: (typeof mockReadings)[number] = {
        id: readingIdSeed++,
        documentId: `reading-${readingIdSeed}`,
        readingType,
        title: readingType === 'tarot' ? 'Karta dnia' : 'Horoskop dnia',
        summary: readingType === 'tarot' ? dailyPayload.tarot.teaserMessage : dailyPayload.horoscope.teaser,
        content:
          readingType === 'tarot'
            ? (dailyPayload.tarot.premiumMessage || dailyPayload.tarot.teaserMessage)
            : (dailyPayload.horoscope.premiumContent || dailyPayload.horoscope.teaser),
        period: readingType === 'horoscope' ? 'dzienny' : null,
        signSlug: dailyPayload.sign?.slug || null,
        readingDate: today,
        isPremium: mockSubscription.isPremium,
        source: 'daily-ritual',
        createdAt: new Date().toISOString(),
      };

      mockReadings = [reading, ...mockReadings];
      res.json({ saved: true, reading });
      return;
    }

    if (req.method === 'POST' && normalizedPath === '/account/subscription/checkout') {
      const payload = (req.body || {}) as { plan?: 'monthly' | 'annual' };
      const plan = payload.plan === 'annual' ? 'annual' : 'monthly';
      mockSubscription = {
        status: 'trialing',
        plan,
        isPremium: true,
        trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        currentPeriodEnd: new Date(Date.now() + (plan === 'annual' ? 365 : 30) * 24 * 60 * 60 * 1000).toISOString(),
        cancelAtPeriodEnd: false,
      };
      res.json({
        checkoutUrl: 'https://example.com/checkout/mock-premium',
        sessionId: 'cs_test_mock_premium',
      });
      return;
    }

    if (req.method === 'POST' && normalizedPath === '/account/subscription/portal') {
      res.json({
        url: 'https://billing.stripe.com/mock-portal',
      });
      return;
    }

    res.status(404).json({
      error: {
        status: 404,
        name: 'NotFoundError',
        message: `No mock handler for ${req.method} ${req.path}`,
      },
    });
  });
} else {
  app.use('/api', async (req, res, next) => {
    try {
      const method = req.method.toUpperCase();
      const targetUrl = `${strapiApiBaseUrl}${req.url}`;
      const headers = new Headers();

      for (const [key, value] of Object.entries(req.headers)) {
        if (key.toLowerCase() === 'host' || value === undefined) {
          continue;
        }

        if (Array.isArray(value)) {
          value.forEach((item) => headers.append(key, item));
        } else {
          headers.set(key, value);
        }
      }

      const shouldForwardBody = method !== 'GET' && method !== 'HEAD';
      const requestBody = shouldForwardBody ? await readRequestBody(req) : undefined;
      const requestInit: RequestInit = {
        method,
        headers,
      };

      if (requestBody) {
        requestInit.body = requestBody as unknown as BodyInit;
      }

      const response = await fetch(targetUrl, requestInit);

      res.status(response.status);

      const setCookieHeader = response.headers.getSetCookie?.();
      if (setCookieHeader && setCookieHeader.length > 0) {
        res.setHeader('set-cookie', setCookieHeader);
      }

      response.headers.forEach((value, key) => {
        if (key === 'set-cookie') {
          return;
        }
        res.setHeader(key, value);
      });

      const payload = Buffer.from(await response.arrayBuffer());
      res.send(payload);
    } catch (error) {
      next(error);
    }
  });
}

app.get('/healthz', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'star-sign-frontend',
    uptimeSeconds: Math.round(process.uptime()),
  });
});

app.get('/robots.txt', (_req, res) => {
  res.type('text/plain');
  res.send(`User-agent: *\nAllow: /\nSitemap: ${siteUrl}/sitemap.xml\n`);
});

app.get('/sitemap.xml', async (_req, res) => {
  const staticPaths = [
    '/',
    '/horoskopy',
    '/tarot',
    '/tarot/karta-dnia',
    '/artykuly',
    '/numerologia',
    '/regulamin',
    '/polityka-prywatnosci',
    '/cookies',
    '/disclaimer',
    ...(shopEnabled ? ['/sklep'] : []),
  ];

  try {
    const [articles, signs, products] = await Promise.all([
      fetchAll<{ slug?: string }>('articles?fields[0]=slug'),
      fetchAll<{ slug?: string }>('zodiac-signs?fields[0]=slug'),
      shopEnabled ? fetchAll<{ documentId?: string }>('products?fields[0]=documentId') : Promise.resolve([]),
    ]);

    const articlePaths = articles
      .map((article) => article.slug)
      .filter((slug): slug is string => Boolean(slug))
      .map((slug) => `/artykuly/${slug}`);

    const signPaths = signs
      .map((sign) => sign.slug)
      .filter((slug): slug is string => Boolean(slug))
      .flatMap((slug) => [
        `/znaki/${slug}`,
        `/horoskopy/dzienny/${slug}`,
        `/horoskopy/tygodniowy/${slug}`,
        `/horoskopy/miesieczny/${slug}`,
        `/horoskopy/roczny/${slug}`,
      ]);

    const productPaths = products
      .map((product) => product.documentId)
      .filter((documentId): documentId is string => Boolean(documentId))
      .map((documentId) => `/sklep/produkt/${documentId}`);

    const allPaths = [...new Set([...staticPaths, ...articlePaths, ...signPaths, ...productPaths])];
    const now = new Date().toISOString();

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allPaths
  .map(
    (path) => `  <url>
    <loc>${escapeXml(`${siteUrl}${path}`)}</loc>
    <lastmod>${now}</lastmod>
  </url>`
  )
  .join('\n')}
</urlset>`;

    res.type('application/xml');
    res.send(xml);
  } catch (error) {
    res.status(500).type('application/xml').send(
      `<?xml version="1.0" encoding="UTF-8"?><error>${escapeXml(String(error))}</error>`
    );
  }
});

/**
 * Example Express Rest API endpoints can be defined here.
 * Uncomment and define endpoints as necessary.
 *
 * Example:
 * ```ts
 * app.get('/api/{*splat}', (req, res) => {
 *   // Handle API request
 * });
 * ```
 */

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  if (e2eApiLogEnabled && req.path === '/') {
    console.log('[ssr] handling /');
  }

  angularApp
    .handle(req)
    .then((response) => {
      if (e2eApiLogEnabled && req.path === '/') {
        console.log(`[ssr] completed / (${response ? 'response' : 'next'})`);
      }
      return response ? writeResponseToNodeResponse(response, res) : next();
    })
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, () => {
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
