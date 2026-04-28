type SubscriptionStatus = 'inactive' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid';
type SubscriptionPlan = 'monthly' | 'annual';
type ReadingType = 'horoscope' | 'tarot';

const PREMIUM_ACCESS_STATUSES = new Set<SubscriptionStatus>(['trialing', 'active', 'past_due']);
const WARSAW_TIMEZONE = 'Europe/Warsaw';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const getWarsawDate = (date: Date = new Date()): string =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: WARSAW_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);

const shortenText = (value: string, limit = 280): string => {
  const normalized = value.trim().replace(/\s+/g, ' ');
  if (normalized.length <= limit) {
    return normalized;
  }
  return `${normalized.slice(0, Math.max(0, limit - 1)).trim()}…`;
};

const toNullableString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

const toBool = (value: unknown): boolean => value === true || value === 'true';

const toSubscriptionStatus = (value: unknown): SubscriptionStatus => {
  if (value === 'trialing' || value === 'active' || value === 'past_due' || value === 'canceled' || value === 'unpaid') {
    return value;
  }
  return 'inactive';
};

const toSubscriptionPlan = (value: unknown): SubscriptionPlan | null => {
  if (value === 'monthly' || value === 'annual') {
    return value;
  }
  return null;
};

const getPayload = (ctx: any): Record<string, unknown> => {
  const body = ctx.request.body || {};
  if (body.data && typeof body.data === 'object') {
    return body.data;
  }
  if (typeof body === 'object') {
    return body;
  }
  return {};
};

const getUsersPermissionsJwtService = (): any => {
  try {
    return strapi.plugin('users-permissions').service('jwt');
  } catch {
    return null;
  }
};

const getAuthenticatedUser = async (ctx: any): Promise<any | null> => {
  if (ctx.state?.user?.id) {
    return ctx.state.user;
  }

  const authHeader = typeof ctx.request.header?.authorization === 'string'
    ? ctx.request.header.authorization
    : typeof ctx.get === 'function'
      ? ctx.get('authorization')
      : '';

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return null;
  }

  const jwtService = getUsersPermissionsJwtService();
  if (!jwtService?.verify) {
    return null;
  }

  try {
    const payload = await jwtService.verify(token);
    const userId = Number(payload?.id);
    if (!Number.isFinite(userId) || userId <= 0) {
      return null;
    }

    return strapi.db.query('plugin::users-permissions.user').findOne({
      where: { id: userId },
    });
  } catch {
    return null;
  }
};

const ensureUserProfile = async (userId: number): Promise<any> => {
  let profile = await strapi.db.query('api::user-profile.user-profile').findOne({
    where: { user: userId },
    populate: { zodiac_sign: true },
  });

  if (profile) {
    return profile;
  }

  profile = await strapi.db.query('api::user-profile.user-profile').create({
    data: {
      user: userId,
      marketing_consent: false,
      subscription_status: 'inactive',
    },
    populate: { zodiac_sign: true },
  });

  return profile;
};

const getSubscriptionPayload = (profile: any) => {
  const status = toSubscriptionStatus(profile?.subscription_status);
  const plan = toSubscriptionPlan(profile?.subscription_plan);

  return {
    status,
    plan,
    isPremium: PREMIUM_ACCESS_STATUSES.has(status),
    trialEndsAt: profile?.trial_ends_at || null,
    currentPeriodEnd: profile?.current_period_end || null,
    cancelAtPeriodEnd: Boolean(profile?.cancel_at_period_end),
  };
};

const toProfilePayload = (user: any, profile: any) => ({
  id: user.id,
  email: user.email,
  username: user.username,
  birthDate: profile?.birth_date || null,
  birthTime: profile?.birth_time || null,
  birthPlace: profile?.birth_place || null,
  marketingConsent: Boolean(profile?.marketing_consent),
  zodiacSign: profile?.zodiac_sign
    ? {
        id: profile.zodiac_sign.id,
        documentId: profile.zodiac_sign.documentId,
        name: profile.zodiac_sign.name,
        slug: profile.zodiac_sign.slug,
      }
    : null,
});

const composePremiumHoroscope = (baseText: string, profile: any): string => {
  const hints: string[] = [];

  if (profile?.birth_time) {
    hints.push(`Najsilniejszy moment introspekcji wypada dziś około ${profile.birth_time}.`);
  }
  if (profile?.birth_place) {
    hints.push(`Wróć myślami do intencji, którą nosisz od czasu związku z miejscem ${profile.birth_place}.`);
  }
  if (!hints.length) {
    hints.push('Wersja premium wzmacnia codzienny przekaz o osobisty kontekst i konkretne kierunki działania.');
  }

  return `${baseText}\n\n${hints.join(' ')}`;
};

const composePremiumTarot = (baseText: string, profile: any): string => {
  const preface = profile?.zodiac_sign?.name
    ? `Dla znaku ${profile.zodiac_sign.name} ta karta sugeruje skupienie na jednym priorytecie i świadome domykanie rozpoczętych wątków.`
    : 'Ta karta zachęca do prostoty działań i spokojnego domykania otwartych tematów.';

  return `${baseText}\n\n${preface}`;
};

const getDailyTarotDraw = async (): Promise<any | null> => {
  const today = getWarsawDate();

  let draw = await strapi.db.query('api::daily-tarot-draw.daily-tarot-draw').findOne({
    where: { draw_date: today },
    populate: { card: true },
  });

  if (draw) {
    return draw;
  }

  const cards = await strapi.db.query('api::tarot-card.tarot-card').findMany({
    where: { publishedAt: { $notNull: true } },
  });

  if (!cards.length) {
    return null;
  }

  const randomIndex = Math.floor(Math.random() * cards.length);
  const selectedCard = cards[randomIndex];

  try {
    draw = await strapi.db.query('api::daily-tarot-draw.daily-tarot-draw').create({
      data: {
        draw_date: today,
        card: selectedCard.id,
      },
      populate: { card: true },
    });
  } catch (error) {
    strapi.log.warn('Wykryto równoległe tworzenie dzisiejszej karty tarota.', error);
    draw = await strapi.db.query('api::daily-tarot-draw.daily-tarot-draw').findOne({
      where: { draw_date: today },
      populate: { card: true },
    });
  }

  return draw;
};

const getLatestHoroscopeForSign = async (signId: number | null): Promise<any | null> => {
  if (!signId) {
    return null;
  }

  const items = await strapi.db.query('api::horoscope.horoscope').findMany({
    where: {
      period: 'Dzienny',
      zodiac_sign: signId,
      publishedAt: { $notNull: true },
    },
    orderBy: [{ date: 'desc' }, { id: 'desc' }],
    limit: 1,
  });

  return items?.[0] || null;
};

const buildDailyPayload = async (profile: any) => {
  const subscription = getSubscriptionPayload(profile);
  const isPremium = subscription.isPremium;
  const today = getWarsawDate();

  const sign = profile?.zodiac_sign || null;
  const horoscope = await getLatestHoroscopeForSign(sign?.id || null);
  const draw = await getDailyTarotDraw();

  const horoscopeContent = typeof horoscope?.content === 'string' && horoscope.content.trim().length
    ? horoscope.content.trim()
    : 'Dzisiejsza energia zachęca do spokoju i zauważenia małych sygnałów, które prowadzą Cię do dobrych decyzji.';

  const tarotBaseMessage =
    toNullableString(draw?.message) ||
    toNullableString(draw?.card?.meaning_upright) ||
    'Karta dnia podpowiada, aby działać cierpliwie i zostawić przestrzeń na intuicję.';

  const teaser = [
    sign?.name ? `Dziś szczególnie wspiera Cię energia znaku ${sign.name}.` : 'Dziś postaw na rytuał małych kroków.',
    'W darmowej wersji dostajesz skrócony wgląd i najważniejszą wskazówkę dnia.',
  ].join(' ');

  return {
    date: today,
    sign: sign
      ? {
          name: sign.name,
          slug: sign.slug,
        }
      : null,
    horoscope: {
      date: horoscope?.date || today,
      period: 'dzienny',
      teaser: shortenText(horoscopeContent, 320),
      premiumContent: isPremium ? composePremiumHoroscope(horoscopeContent, profile) : null,
      isPremiumLocked: !isPremium,
    },
    tarot: {
      cardName: draw?.card?.name || null,
      cardSlug: draw?.card?.slug || null,
      teaserMessage: shortenText(tarotBaseMessage, 220),
      premiumMessage: isPremium ? composePremiumTarot(tarotBaseMessage, profile) : null,
      isPremiumLocked: !isPremium,
    },
    teaser,
    disclaimer:
      'Treści astrologiczne i tarotowe mają charakter refleksyjno-rozrywkowy i nie stanowią porady medycznej, prawnej ani finansowej.',
  };
};

const formatReading = (reading: any) => ({
  id: reading.id,
  documentId: reading.documentId,
  readingType: reading.reading_type,
  title: reading.title,
  summary: reading.summary,
  content: reading.content || null,
  period: reading.period || null,
  signSlug: reading.sign_slug || null,
  readingDate: reading.reading_date || null,
  isPremium: Boolean(reading.is_premium),
  source: reading.source || null,
  createdAt: reading.createdAt,
});

const createStripeSubscriptionCheckoutSession = async (input: {
  secretKey: string;
  priceId: string;
  plan: SubscriptionPlan;
  userId: number;
  customerEmail: string;
  customerId?: string | null;
  frontendUrl: string;
}): Promise<{ id: string; url: string; customerId: string | null }> => {
  const params = new URLSearchParams();
  params.set('mode', 'subscription');
  params.set('line_items[0][price]', input.priceId);
  params.set('line_items[0][quantity]', '1');
  params.set('subscription_data[trial_period_days]', '7');
  params.set('client_reference_id', String(input.userId));
  params.set('allow_promotion_codes', 'true');
  params.set('metadata[userId]', String(input.userId));
  params.set('metadata[plan]', input.plan);
  params.set('subscription_data[metadata][userId]', String(input.userId));
  params.set('subscription_data[metadata][plan]', input.plan);
  params.set('success_url', `${input.frontendUrl}/panel?subscription=success&session_id={CHECKOUT_SESSION_ID}`);
  params.set('cancel_url', `${input.frontendUrl}/panel?subscription=cancel`);

  if (input.customerId) {
    params.set('customer', input.customerId);
  } else if (EMAIL_PATTERN.test(input.customerEmail)) {
    params.set('customer_email', input.customerEmail);
  }

  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${input.secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  const sessionId = typeof payload.id === 'string' ? payload.id : null;
  const sessionUrl = typeof payload.url === 'string' ? payload.url : null;
  const customerId = typeof payload.customer === 'string' ? payload.customer : null;

  if (!response.ok || !sessionId || !sessionUrl) {
    throw new Error(`Nie udało się utworzyć sesji subskrypcyjnej Stripe Checkout. Kod: ${response.status}`);
  }

  return {
    id: sessionId,
    url: sessionUrl,
    customerId,
  };
};

const createStripeCustomerPortalSession = async (input: {
  secretKey: string;
  customerId: string;
  returnUrl: string;
}): Promise<string> => {
  const params = new URLSearchParams();
  params.set('customer', input.customerId);
  params.set('return_url', input.returnUrl);

  const response = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${input.secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  const portalUrl = typeof payload.url === 'string' ? payload.url : null;
  if (!response.ok || !portalUrl) {
    throw new Error(`Nie udało się utworzyć sesji portalu klienta Stripe. Kod: ${response.status}`);
  }
  return portalUrl;
};

const saveReadingForType = async (input: {
  userId: number;
  readingType: ReadingType;
  daily: any;
  isPremium: boolean;
}) => {
  const today = input.daily?.date || getWarsawDate();

  const existing = await strapi.db.query('api::user-reading.user-reading').findOne({
    where: {
      user: input.userId,
      reading_type: input.readingType,
      reading_date: today,
    },
    orderBy: [{ createdAt: 'desc' }],
  });

  if (existing) {
    return {
      saved: false,
      reading: formatReading(existing),
    };
  }

  if (input.readingType === 'horoscope') {
    const created = await strapi.db.query('api::user-reading.user-reading').create({
      data: {
        user: input.userId,
        reading_type: 'horoscope',
        title: `Horoskop dnia ${today}`,
        summary: input.daily.horoscope.teaser,
        content: input.isPremium ? input.daily.horoscope.premiumContent : input.daily.horoscope.teaser,
        period: 'dzienny',
        sign_slug: input.daily.sign?.slug || null,
        reading_date: today,
        is_premium: input.isPremium,
        source: 'daily-ritual',
      },
    });

    return {
      saved: true,
      reading: formatReading(created),
    };
  }

  const created = await strapi.db.query('api::user-reading.user-reading').create({
    data: {
      user: input.userId,
      reading_type: 'tarot',
      title: input.daily.tarot.cardName ? `Karta dnia: ${input.daily.tarot.cardName}` : `Tarot dnia ${today}`,
      summary: input.daily.tarot.teaserMessage,
      content: input.isPremium ? input.daily.tarot.premiumMessage : input.daily.tarot.teaserMessage,
      sign_slug: input.daily.sign?.slug || null,
      reading_date: today,
      is_premium: input.isPremium,
      source: 'daily-ritual',
      metadata: {
        cardSlug: input.daily.tarot.cardSlug,
      },
    },
  });

  return {
    saved: true,
    reading: formatReading(created),
  };
};

export default {
  async me(ctx: any) {
    const user = await getAuthenticatedUser(ctx);
    if (!user) {
      return ctx.unauthorized('Musisz się zalogować.');
    }

    const profile = await ensureUserProfile(user.id);
    ctx.body = {
      profile: toProfilePayload(user, profile),
      subscription: getSubscriptionPayload(profile),
    };
  },

  async updateProfile(ctx: any) {
    const user = await getAuthenticatedUser(ctx);
    if (!user) {
      return ctx.unauthorized('Musisz się zalogować.');
    }

    const payload = getPayload(ctx);
    const zodiacSignSlug = toNullableString(payload.zodiacSignSlug);
    const birthDate = toNullableString(payload.birthDate);
    const birthTime = toNullableString(payload.birthTime);
    const birthPlace = toNullableString(payload.birthPlace);
    const marketingConsent = toBool(payload.marketingConsent);

    const profile = await ensureUserProfile(user.id);

    let zodiacSignId: number | null = null;
    if (zodiacSignSlug) {
      const sign = await strapi.db.query('api::zodiac-sign.zodiac-sign').findOne({
        where: { slug: zodiacSignSlug },
      });
      if (!sign) {
        return ctx.badRequest('Nie znaleziono wskazanego znaku zodiaku.');
      }
      zodiacSignId = sign.id;
    }

    const updated = await strapi.db.query('api::user-profile.user-profile').update({
      where: { id: profile.id },
      data: {
        birth_date: birthDate,
        birth_time: birthTime,
        birth_place: birthPlace,
        marketing_consent: marketingConsent,
        zodiac_sign: zodiacSignId,
      },
      populate: { zodiac_sign: true },
    });

    ctx.body = {
      profile: toProfilePayload(user, updated),
      subscription: getSubscriptionPayload(updated),
    };
  },

  async dashboard(ctx: any) {
    const user = await getAuthenticatedUser(ctx);
    if (!user) {
      return ctx.unauthorized('Musisz się zalogować.');
    }

    const profile = await ensureUserProfile(user.id);
    const daily = await buildDailyPayload(profile);

    ctx.body = {
      profile: toProfilePayload(user, profile),
      subscription: getSubscriptionPayload(profile),
      daily,
    };
  },

  async readings(ctx: any) {
    const user = await getAuthenticatedUser(ctx);
    if (!user) {
      return ctx.unauthorized('Musisz się zalogować.');
    }

    const limitRaw = Number(ctx.query?.limit);
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 50) : 20;

    const items = await strapi.db.query('api::user-reading.user-reading').findMany({
      where: { user: user.id },
      orderBy: [{ reading_date: 'desc' }, { createdAt: 'desc' }],
      limit,
    });

    ctx.body = {
      data: items.map(formatReading),
    };
  },

  async saveTodayReading(ctx: any) {
    const user = await getAuthenticatedUser(ctx);
    if (!user) {
      return ctx.unauthorized('Musisz się zalogować.');
    }

    const payload = getPayload(ctx);
    const readingType = payload.readingType === 'tarot' ? 'tarot' : 'horoscope';

    const profile = await ensureUserProfile(user.id);
    const subscription = getSubscriptionPayload(profile);
    const daily = await buildDailyPayload(profile);

    const result = await saveReadingForType({
      userId: user.id,
      readingType,
      daily,
      isPremium: subscription.isPremium,
    });

    ctx.body = result;
  },

  async subscriptionCheckout(ctx: any) {
    const user = await getAuthenticatedUser(ctx);
    if (!user) {
      return ctx.unauthorized('Musisz się zalogować.');
    }

    const payload = getPayload(ctx);
    const plan = payload.plan === 'annual' ? 'annual' : 'monthly';

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const monthlyPriceId = process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID;
    const annualPriceId = process.env.STRIPE_PREMIUM_ANNUAL_PRICE_ID;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';

    if (!stripeSecretKey || !monthlyPriceId || !annualPriceId) {
      ctx.status = 503;
      ctx.body = { error: 'Subskrypcje nie są jeszcze skonfigurowane.' };
      return;
    }

    const profile = await ensureUserProfile(user.id);
    const priceId = plan === 'annual' ? annualPriceId : monthlyPriceId;

    try {
      const session = await createStripeSubscriptionCheckoutSession({
        secretKey: stripeSecretKey,
        plan,
        priceId,
        userId: user.id,
        customerEmail: user.email || '',
        customerId: toNullableString(profile?.stripe_customer_id),
        frontendUrl,
      });

      const patch: Record<string, unknown> = {};
      if (session.customerId && !profile?.stripe_customer_id) {
        patch.stripe_customer_id = session.customerId;
      }
      patch.subscription_plan = plan;

      await strapi.db.query('api::user-profile.user-profile').update({
        where: { id: profile.id },
        data: patch,
      });

      ctx.body = {
        checkoutUrl: session.url,
        sessionId: session.id,
      };
    } catch (error) {
      strapi.log.error('Nie udało się zainicjalizować sesji subskrypcji Stripe Checkout.', error);
      ctx.status = 502;
      ctx.body = { error: 'Nie udało się zainicjalizować subskrypcji.' };
    }
  },

  async subscriptionPortal(ctx: any) {
    const user = await getAuthenticatedUser(ctx);
    if (!user) {
      return ctx.unauthorized('Musisz się zalogować.');
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      ctx.status = 503;
      ctx.body = { error: 'Panel subskrypcji nie jest jeszcze skonfigurowany.' };
      return;
    }

    const profile = await ensureUserProfile(user.id);
    const customerId = toNullableString(profile?.stripe_customer_id);
    if (!customerId) {
      return ctx.badRequest('Brak aktywnego klienta Stripe dla tego konta.');
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';

    try {
      const url = await createStripeCustomerPortalSession({
        secretKey: stripeSecretKey,
        customerId,
        returnUrl: `${frontendUrl}/panel/subskrypcja`,
      });

      ctx.body = { url };
    } catch (error) {
      strapi.log.error('Nie udało się utworzyć sesji panelu klienta Stripe.', error);
      ctx.status = 502;
      ctx.body = { error: 'Nie udało się otworzyć panelu subskrypcji.' };
    }
  },
};
