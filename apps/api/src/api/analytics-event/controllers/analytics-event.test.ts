import { afterEach, describe, expect, it, vi } from 'vitest';

import analyticsEventController from './analytics-event';

type CreatedEvent = {
  data: Record<string, unknown>;
};

const createCtx = (body: Record<string, unknown>, authHeader = '') => ({
  request: {
    body,
    header: authHeader ? { authorization: authHeader } : {},
  },
  state: {},
  status: undefined as number | undefined,
  body: undefined as unknown,
  badRequest: vi.fn((message: string) => ({ message })),
  get: vi.fn((name: string) => {
    if (name.toLowerCase() === 'user-agent') {
      return 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Safari/604.1';
    }

    if (name.toLowerCase() === 'authorization') {
      return authHeader;
    }

    return '';
  }),
});

const createStrapiMock = (
  profile: Record<string, unknown> | null = null,
) => {
  const createdEvents: CreatedEvent[] = [];
  const analyticsQuery = {
    findOne: vi.fn(async ({ where }) => {
      const uniqueKey = where?.unique_key;
      return (
        createdEvents.find(
          (event) =>
            event.data['event_type'] === where?.event_type &&
            event.data['unique_key'] === uniqueKey &&
            event.data['is_unique_daily'] === where?.is_unique_daily,
        ) ?? null
      );
    }),
    create: vi.fn(async (input: CreatedEvent) => {
      createdEvents.push(input);
      return { id: createdEvents.length, ...input.data };
    }),
  };
  const jwtService = {
    verify: vi.fn(async (token: string) =>
      token === 'valid-jwt' ? { id: 42 } : {},
    ),
  };
  const profileQuery = {
    findOne: vi.fn(async () => profile),
  };

  vi.stubGlobal('strapi', {
    db: {
      query: vi.fn((uid: string) => {
        if (uid === 'api::analytics-event.analytics-event') {
          return analyticsQuery;
        }

        if (uid === 'api::user-profile.user-profile') {
          return profileQuery;
        }

        throw new Error(`Unexpected query uid: ${uid}`);
      }),
    },
    plugin: vi.fn(() => ({
      service: vi.fn(() => jwtService),
    })),
  });

  return { analyticsQuery, createdEvents, jwtService, profileQuery };
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('analytics event controller', () => {
  it('stores guest events without a user relation', async () => {
    const { analyticsQuery } = createStrapiMock();
    const ctx = createCtx({
      event_type: 'daily_horoscope_view',
      visitor_id: 'visitor-1',
      session_id: 'session-1',
      user: 999,
      content_type: 'horoscope',
      content_id: 'horoscope-baran-dzienny',
      sign_slug: 'baran',
      horoscope_period: 'dzienny',
      premium_mode: 'open',
      route: '/horoskopy/dzienny/baran',
    });

    await analyticsEventController.track(ctx);

    expect(ctx.status).toBe(202);
    const data = analyticsQuery.create.mock.calls[0]?.[0].data;
    expect(data).toEqual(
      expect.objectContaining({
        event_type: 'daily_horoscope_view',
        visitor_id: 'visitor-1',
        session_id: 'session-1',
        device_category: 'mobile',
        browser_family: 'Safari',
        auth_state: 'guest',
        visitor_segment: 'guest',
        premium_mode: 'open',
        premium_access_policy: 'open_access',
      }),
    );
    expect(data).not.toHaveProperty('user');
  });

  it('resolves logged-in user from JWT and ignores spoofed body user IDs', async () => {
    const { analyticsQuery, jwtService } = createStrapiMock();
    const ctx = createCtx(
      {
        event_type: 'premium_cta_click',
        visitor_id: 'visitor-2',
        session_id: 'session-2',
        user: 999,
      },
      'Bearer valid-jwt',
    );

    await analyticsEventController.track(ctx);

    expect(jwtService.verify).toHaveBeenCalledWith('valid-jwt');
    expect(analyticsQuery.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        event_type: 'premium_cta_click',
        user: 42,
        auth_state: 'logged_in',
        visitor_segment: 'logged_in',
        subscription_status: 'inactive',
      }),
    });
  });

  it('segments logged-in premium subscribers from user profile status', async () => {
    const { analyticsQuery, profileQuery } = createStrapiMock({
      subscription_status: 'active',
      subscription_plan: 'annual',
    });
    const ctx = createCtx(
      {
        event_type: 'premium_content_view',
        visitor_id: 'visitor-5',
        session_id: 'session-5',
        premium_mode: 'open',
        access_state: 'open',
        funnel_step: 'content_view',
        ui_surface: 'horoscope_reader',
      },
      'Bearer valid-jwt',
    );

    await analyticsEventController.track(ctx);

    expect(profileQuery.findOne).toHaveBeenCalledWith({
      where: { user: 42 },
    });
    expect(analyticsQuery.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        user: 42,
        auth_state: 'logged_in',
        visitor_segment: 'premium_subscriber',
        subscription_status: 'active',
        subscription_plan: 'annual',
        premium_access_policy: 'open_access',
        funnel_step: 'content_view',
        ui_surface: 'horoscope_reader',
      }),
    });
  });

  it('marks only the first premium content view per visitor and day as unique', async () => {
    const { analyticsQuery } = createStrapiMock();
    const payload = {
      event_type: 'premium_content_view',
      occurred_at: '2026-05-04T10:00:00.000Z',
      visitor_id: 'visitor-3',
      session_id: 'session-3',
      content_type: 'horoscope',
      content_id: 'horoscope-baran-dzienny',
      route: '/horoskopy/dzienny/baran',
    };

    const firstCtx = createCtx(payload);
    await analyticsEventController.track(firstCtx);

    const secondCtx = createCtx({ ...payload, session_id: 'session-4' });
    await analyticsEventController.track(secondCtx);

    expect(firstCtx.body).toEqual({ accepted: true, uniqueDaily: true });
    expect(secondCtx.body).toEqual({ accepted: true, uniqueDaily: false });
    expect(analyticsQuery.create).toHaveBeenNthCalledWith(1, {
      data: expect.objectContaining({
        is_unique_daily: true,
        unique_key:
          'visitor-3:horoscope:horoscope-baran-dzienny:2026-05-04',
      }),
    });
    expect(analyticsQuery.create).toHaveBeenNthCalledWith(2, {
      data: expect.objectContaining({
        is_unique_daily: false,
        unique_key:
          'visitor-3:horoscope:horoscope-baran-dzienny:2026-05-04',
      }),
    });
  });

  it('rejects unsupported event types', async () => {
    createStrapiMock();
    const ctx = createCtx({
      event_type: 'spoofed_event',
      visitor_id: 'visitor-4',
      session_id: 'session-4',
    });

    await analyticsEventController.track(ctx);

    expect(ctx.badRequest).toHaveBeenCalledWith(
      'Nieobsługiwany typ zdarzenia analitycznego.',
    );
  });
});
