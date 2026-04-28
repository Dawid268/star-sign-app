import { describe, expect, it, vi } from 'vitest';

import { PLUGIN_ID, PUBLICATION_TICKET_UID, RUN_STATUS, TOPIC_QUEUE_UID, WORKFLOW_UID } from '../constants';
import orchestrator from '../services/orchestrator';
import topics from '../services/topics';
import workflows from '../services/workflows';
import type { Strapi } from '../types';
import { formatDateInZone } from '../utils/date-time';
import { suggestMediaMapping } from '../utils/media-mapping';

const createStrapi = (services: Record<string, unknown>, entityService: Record<string, unknown>): Strapi =>
  ({
    entityService,
    plugin: (id: string) => {
      if (id !== PLUGIN_ID) {
        throw new Error(`Unexpected plugin ${id}`);
      }

      return {
        service: (name: string) => services[name],
      };
    },
    log: {
      error: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    },
  }) as unknown as Strapi;

describe('ai-content-orchestrator runtime', () => {
  it('counts rescheduled publication tickets as an unsuccessful publish run', async () => {
    const now = new Date('2026-04-28T10:00:00.000Z');
    const complete = vi.fn();
    const updates: Array<{ uid: string; id: number; payload: unknown }> = [];
    const entityService = {
      findMany: vi.fn(async (uid: string) => {
        if (uid === PUBLICATION_TICKET_UID) {
          return [
            {
              id: 1,
              status: 'scheduled',
              retries: 0,
              workflow: { id: 7 },
              content_uid: 'api::article.article',
              content_entry_id: 404,
            },
          ];
        }

        return [];
      }),
      findOne: vi.fn(async () => null),
      update: vi.fn(async (uid: string, id: number, payload: unknown) => {
        updates.push({ uid, id, payload });
        return {};
      }),
    };
    const strapi = createStrapi(
      {
        workflows: {
          getById: vi.fn(async () => ({ id: 7, retry_max: 3, retry_backoff_seconds: 15 })),
          markPublishSlot: vi.fn(),
          setStatus: vi.fn(),
        },
        runs: {
          create: vi.fn(async () => ({ id: 99 })),
          complete,
        },
      },
      entityService
    );

    await orchestrator({ strapi }).processPublicationTick(now);

    expect(updates[0]).toMatchObject({ uid: PUBLICATION_TICKET_UID, id: 1 });
    expect(complete).toHaveBeenCalledWith(
      expect.objectContaining({
        runId: 99,
        status: RUN_STATUS.failed,
        details: expect.objectContaining({ published: 0, rescheduled: 1, failed: 0, tickets: 1 }),
      })
    );
  });

  it('finds a publish cron occurrence by local day in the workflow timezone', () => {
    const strapi = createStrapi({}, {});
    const api = orchestrator({ strapi });
    const publishAt = api.getPublishDateForLocalDay('0 0 * * *', '2026-04-28', 'Europe/Warsaw');

    expect(formatDateInZone(publishAt, 'Europe/Warsaw')).toBe('2026-04-28');
    expect(publishAt.toISOString()).toBe('2026-04-27T22:00:00.000Z');
  });

  it('allows disabled workflow drafts without a token but blocks enabled workflows without one', () => {
    const strapi = createStrapi({}, {});
    const service = workflows({ strapi });

    expect(() =>
      service.validateInput(
        {
          enabled: false,
          workflow_type: 'horoscope',
          generate_cron: '0 23 * * *',
          publish_cron: '0 0 * * *',
        },
        true
      )
    ).not.toThrow();

    expect(() =>
      service.validateInput(
        {
          enabled: true,
          workflow_type: 'horoscope',
          generate_cron: '0 23 * * *',
          publish_cron: '0 0 * * *',
        },
        true
      )
    ).toThrow('wyłączony draft');
  });

  it('requires a category for daily card workflows', () => {
    const strapi = createStrapi({}, {});
    const service = workflows({ strapi });

    expect(() =>
      service.validateInput(
        {
          enabled: true,
          apiToken: 'test-token',
          workflow_type: 'daily_card',
          generate_cron: '0 23 * * *',
          publish_cron: '0 0 * * *',
        },
        true
      )
    ).toThrow('article/daily_card');
  });

  it('lets mixed topic workflows claim unassigned pending topics', async () => {
    const update = vi.fn(async () => ({}));
    const entityService = {
      findOne: vi.fn(async (uid: string) => {
        if (uid === WORKFLOW_UID) {
          return { topic_mode: 'mixed' };
        }

        return { id: 12, title: 'Unassigned topic', workflow: { id: 5 } };
      }),
      findMany: vi.fn(async (uid: string, query: Record<string, unknown>) => {
        expect(uid).toBe(TOPIC_QUEUE_UID);
        expect(query.filters).toMatchObject({
          status: 'pending',
          $or: [{ workflow: 5 }, { workflow: { $null: true } }],
        });

        return [{ id: 12, title: 'Unassigned topic', status: 'pending', workflow: null }];
      }),
      update,
    };
    const strapi = createStrapi({}, entityService);

    const next = await topics({ strapi }).takeNextForWorkflow(5, new Date('2026-04-28T10:00:00.000Z'));

    expect(next?.id).toBe(12);
    expect(update).toHaveBeenCalledWith(
      TOPIC_QUEUE_UID,
      12,
      expect.objectContaining({
        data: expect.objectContaining({ status: 'processing', workflow: 5 }),
      })
    );
  });

  it('maps Polish horoscope filenames to horoscope media suggestions', () => {
    const suggestion = suggestMediaMapping({
      fileName: 'horoskop-baran-dzienny-01.webp',
      existingAssetKeys: new Set(),
    });

    expect(suggestion).toMatchObject({
      purpose: 'horoscope_sign',
      sign_slug: 'baran',
      period_scope: 'daily',
      asset_key: 'horoscope-baran-daily-01',
    });
  });
});
