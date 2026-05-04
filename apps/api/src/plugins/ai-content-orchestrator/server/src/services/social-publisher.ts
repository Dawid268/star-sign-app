import axios, { AxiosError } from 'axios';
import { createHash, createHmac, randomBytes } from 'crypto';

import {
  DEFAULT_RETRY_BACKOFF_SECONDS,
  DEFAULT_RETRY_MAX,
  SOCIAL_CHANNELS,
  SOCIAL_POST_TICKET_UID,
} from '../constants';
import type { SocialPlatform, SocialPostTicketRecord, Strapi, WorkflowRecord } from '../types';
import { toSafeErrorMessage } from '../utils/json';
import { getAicoPromptTemplate, renderAicoPromptTemplate } from '../utils/aico-contract';
import { getPluginService } from '../utils/plugin';

const GRAPH_API_BASE = 'https://graph.facebook.com/v19.0';
const X_UPLOAD_MEDIA_URL = 'https://upload.twitter.com/1.1/media/upload.json';
const X_STATUS_UPDATE_URL = 'https://api.twitter.com/1.1/statuses/update.json';
const X_VERIFY_URL = 'https://api.twitter.com/1.1/account/verify_credentials.json';
const DEFAULT_SOCIAL_IMAGE_URL =
  process.env.AICO_SOCIAL_DEFAULT_IMAGE_URL || 'https://star-sign.app/assets/og-default.jpg';
const MAX_TICKET_BATCH = 50;

type OpenRouterService = {
  requestJson: (input: {
    model: string;
    apiToken: string;
    prompt: string;
    schemaDescription: string;
    temperature?: number;
    maxCompletionTokens?: number;
  }) => Promise<{
    payload: unknown;
  }>;
};

type WorkflowService = {
  getById: (id: number) => Promise<WorkflowRecord | null>;
  decryptTokenForRuntime: (record: WorkflowRecord) => Promise<string>;
  decryptEncryptedValue: (encrypted: string, label: string) => string;
  normalizeRuntime: (record: WorkflowRecord) => Promise<{
    enabledChannels: SocialPlatform[];
    llmModel: string;
    retryMax: number;
    retryBackoffSeconds: number;
  }>;
};

type PublishClassification = {
  retryable: boolean;
  blockedReason?: string;
  retryAfterSeconds?: number;
  providerPayload?: Record<string, unknown>;
};

type ChannelStatus = {
  platform: SocialPlatform;
  status: 'ready' | 'needs_action' | 'blocked' | 'degraded';
  message: string;
  details?: Record<string, unknown>;
};

class PublishGuardrailError extends Error {
  readonly classification: PublishClassification;

  constructor(message: string, classification: PublishClassification) {
    super(message);
    this.name = 'PublishGuardrailError';
    this.classification = classification;
  }
}

const PLATFORM_SET = new Set<SocialPlatform>(SOCIAL_CHANNELS);

const normalizePlatform = (value: unknown): SocialPlatform | null => {
  const candidate = String(value ?? '')
    .trim()
    .toLowerCase();

  return PLATFORM_SET.has(candidate as SocialPlatform) ? (candidate as SocialPlatform) : null;
};

const getWorkflowId = (workflow: SocialPostTicketRecord['workflow']): number | null => {
  if (typeof workflow === 'number') {
    return workflow;
  }

  if (workflow && typeof workflow === 'object' && typeof workflow.id === 'number') {
    return workflow.id;
  }

  return null;
};

const getRunId = (run: SocialPostTicketRecord['source_run']): number | null => {
  if (typeof run === 'number') {
    return run;
  }

  if (run && typeof run === 'object' && typeof run.id === 'number') {
    return run.id;
  }

  return null;
};

const isPublicHttpUrl = (value: string): boolean => {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return false;
    }

    const host = parsed.hostname.toLowerCase();
    if (host === 'localhost' || host.endsWith('.local')) {
      return false;
    }

    if (/^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host)) {
      return false;
    }

    const parts = host.split('.').map((part) => Number(part));
    if (parts.length === 4 && parts.every((part) => Number.isFinite(part))) {
      if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) {
        return false;
      }
      if (parts[0] === 169 && parts[1] === 254) {
        return false;
      }
      if (parts[0] === 0) {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
};

const toAbsoluteUrl = (value: string, serverUrl: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  if (!trimmed.startsWith('/')) {
    return null;
  }

  const base = serverUrl.trim().replace(/\/$/, '');
  if (!base) {
    return null;
  }

  return `${base}${trimmed}`;
};

const appendLinkIfMissing = (text: string, link?: string | null): string => {
  const caption = text.trim();
  if (!link) {
    return caption;
  }

  if (caption.includes(link)) {
    return caption;
  }

  if (!caption) {
    return link;
  }

  return `${caption}\n\n${link}`;
};

const removeInlineLinks = (text: string): string =>
  text
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

const composeCaptionForPlatform = (
  platform: SocialPlatform,
  caption: string,
  link?: string | null
): string => {
  if (platform === 'instagram') {
    const withoutLinks = removeInlineLinks(caption);
    if (!link) {
      return withoutLinks;
    }
    return `${withoutLinks}\n\nLink w bio`;
  }

  if (platform === 'twitter') {
    const withLink = appendLinkIfMissing(caption, link);
    if (withLink.length <= 280) {
      return withLink;
    }

    const suffix = link ? ` ${link}` : '';
    const maxBodyLength = Math.max(0, 280 - suffix.length - 1);
    const body = withLink.slice(0, maxBodyLength).trimEnd();
    return `${body}…${suffix}`.trim();
  }

  return appendLinkIfMissing(caption, link);
};

const normalizeChannels = (value: unknown): SocialPlatform[] => {
  if (!Array.isArray(value)) {
    return [...SOCIAL_CHANNELS];
  }

  const channels = value
    .map((item) => normalizePlatform(item))
    .filter((item): item is SocialPlatform => item !== null);

  return channels.length > 0 ? Array.from(new Set(channels)) : [...SOCIAL_CHANNELS];
};

const buildIdempotencyKey = (input: {
  workflowId: number;
  contentUid: string;
  contentId: number;
  platform: SocialPlatform;
  scheduledAt: string;
}): string => {
  const raw = [
    String(input.workflowId),
    input.contentUid,
    String(input.contentId),
    input.platform,
    input.scheduledAt,
  ].join(':');

  return createHash('sha256').update(raw).digest('hex');
};

const isAxios = (error: unknown): error is AxiosError => axios.isAxiosError(error);

const parseRetryAfterSeconds = (
  headers: Record<string, unknown> | undefined,
  now: Date
): number | undefined => {
  if (!headers) {
    return undefined;
  }

  const retryAfterRaw = headers['retry-after'];
  if (typeof retryAfterRaw === 'string') {
    const asNumber = Number(retryAfterRaw);
    if (Number.isFinite(asNumber) && asNumber > 0) {
      return Math.floor(asNumber);
    }

    const asDate = new Date(retryAfterRaw);
    if (Number.isFinite(asDate.getTime())) {
      const diff = Math.ceil((asDate.getTime() - now.getTime()) / 1000);
      if (diff > 0) {
        return diff;
      }
    }
  }

  const resetRaw = headers['x-rate-limit-reset'];
  if (typeof resetRaw === 'string') {
    const resetEpoch = Number(resetRaw);
    if (Number.isFinite(resetEpoch)) {
      const diff = Math.ceil(resetEpoch - now.getTime() / 1000);
      if (diff > 0) {
        return diff;
      }
    }
  }

  return undefined;
};

const computeBackoffSeconds = (
  base: number,
  attempt: number,
  retryAfterSeconds?: number
): number => {
  if (retryAfterSeconds && retryAfterSeconds > 0) {
    return Math.min(60 * 60, retryAfterSeconds);
  }

  const multiplier = Math.min(8, 2 ** Math.max(0, attempt - 1));
  return Math.min(60 * 60, Math.max(15, Math.floor(base * multiplier)));
};

const sleep = async (ms: number): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, ms));
};

const oauthEncode = (value: string): string =>
  encodeURIComponent(value).replace(
    /[!'()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`
  );

const buildOAuthHeader = (input: {
  method: 'GET' | 'POST';
  url: string;
  queryParams?: Record<string, string>;
  bodyParams?: Record<string, string>;
  consumerKey: string;
  consumerSecret: string;
  token: string;
  tokenSecret: string;
}): string => {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: input.consumerKey,
    oauth_nonce: randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: input.token,
    oauth_version: '1.0',
  };

  const allParams: Array<[string, string]> = [];
  for (const [key, value] of Object.entries(oauthParams)) {
    allParams.push([key, value]);
  }
  for (const [key, value] of Object.entries(input.queryParams ?? {})) {
    allParams.push([key, value]);
  }
  for (const [key, value] of Object.entries(input.bodyParams ?? {})) {
    allParams.push([key, value]);
  }

  const encoded = allParams
    .map(([key, value]) => [oauthEncode(key), oauthEncode(value)] as const)
    .sort(([aKey, aValue], [bKey, bValue]) => {
      if (aKey === bKey) {
        return aValue.localeCompare(bValue);
      }
      return aKey.localeCompare(bKey);
    })
    .map(([key, value]) => `${key}=${value}`)
    .join('&');

  const signatureBase = [
    input.method.toUpperCase(),
    oauthEncode(input.url),
    oauthEncode(encoded),
  ].join('&');

  const signingKey = `${oauthEncode(input.consumerSecret)}&${oauthEncode(input.tokenSecret)}`;
  const signature = createHmac('sha1', signingKey).update(signatureBase).digest('base64');

  const headerParams = {
    ...oauthParams,
    oauth_signature: signature,
  };

  const serialized = Object.entries(headerParams)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${oauthEncode(key)}="${oauthEncode(value)}"`)
    .join(', ');

  return `OAuth ${serialized}`;
};

const normalizeTeaserPayload = (
  payload: unknown,
  channels: SocialPlatform[],
  fallback: { title: string; excerpt: string }
): Array<{ platform: SocialPlatform; caption: string }> => {
  const fallbackCaption =
    `${fallback.title}${fallback.excerpt ? `\n\n${fallback.excerpt}` : ''}`.trim();

  if (
    !payload ||
    typeof payload !== 'object' ||
    !Array.isArray((payload as { teasers?: unknown }).teasers)
  ) {
    return channels.map((platform) => ({ platform, caption: fallbackCaption }));
  }

  const teaserMap = new Map<SocialPlatform, string>();

  for (const item of (payload as { teasers: unknown[] }).teasers) {
    if (!item || typeof item !== 'object') {
      continue;
    }

    const platform = normalizePlatform((item as { platform?: unknown }).platform);
    const caption = String((item as { caption?: unknown }).caption ?? '').trim();

    if (platform && caption) {
      teaserMap.set(platform, caption);
    }
  }

  return channels.map((platform) => ({
    platform,
    caption: teaserMap.get(platform) || fallbackCaption,
  }));
};

const socialPublisher = ({ strapi }: { strapi: Strapi }) => {
  const entityService = strapi.entityService as any;

  const workflowService = (): WorkflowService =>
    getPluginService<WorkflowService>(strapi, 'workflows');
  const llmService = (): OpenRouterService =>
    getPluginService<OpenRouterService>(strapi, 'open-router');

  return {
    async generateTeaser(input: {
      workflowId: number;
      runId: number;
      contentUid: string;
      contentId: number;
      contentTitle: string;
      contentExcerpt: string;
      targetUrl: string;
      mediaUrl?: string;
      publishAt: Date;
    }): Promise<{ created: number; skipped: number; channels: SocialPlatform[] }> {
      const workflow = await workflowService().getById(input.workflowId);
      if (!workflow) {
        throw new Error(`Workflow #${input.workflowId} nie istnieje.`);
      }

      const normalized = await workflowService().normalizeRuntime(workflow);
      const channels = normalizeChannels(workflow.enabled_channels ?? normalized.enabledChannels);

      if (channels.length === 0) {
        return { created: 0, skipped: 0, channels: [] };
      }

      let teaserPayload: unknown = null;

      try {
        const apiToken = await workflowService().decryptTokenForRuntime(workflow);
        const prompt = renderAicoPromptTemplate(getAicoPromptTemplate('socialTeaser'), {
          channels: channels.join(', '),
          contentTitle: input.contentTitle,
          contentExcerpt: input.contentExcerpt,
          targetUrl: input.targetUrl,
        });

        const response = await llmService().requestJson({
          model: normalized.llmModel,
          apiToken,
          prompt,
          schemaDescription: 'JSON teasers by platform',
          temperature: 0.6,
          maxCompletionTokens: 600,
        });
        teaserPayload = response.payload;
      } catch (error) {
        strapi.log.warn(
          `[aico] Fallback teaser generation for workflow #${workflow.id}: ${toSafeErrorMessage(error)}`
        );
      }

      const teasers = normalizeTeaserPayload(teaserPayload, channels, {
        title: input.contentTitle,
        excerpt: input.contentExcerpt,
      });

      const scheduledAtIso = input.publishAt.toISOString();
      let created = 0;
      let skipped = 0;

      for (const teaser of teasers) {
        const idempotencyKey = buildIdempotencyKey({
          workflowId: input.workflowId,
          contentUid: input.contentUid,
          contentId: input.contentId,
          platform: teaser.platform,
          scheduledAt: scheduledAtIso,
        });

        const existing = (await entityService.findMany(SOCIAL_POST_TICKET_UID, {
          filters: { idempotency_key: idempotencyKey },
          limit: 1,
        })) as SocialPostTicketRecord[];

        if (existing[0]) {
          skipped += 1;
          continue;
        }

        const caption = composeCaptionForPlatform(teaser.platform, teaser.caption, input.targetUrl);

        await entityService.create(SOCIAL_POST_TICKET_UID, {
          data: {
            platform: teaser.platform,
            status: 'scheduled',
            caption,
            media_url: input.mediaUrl || null,
            target_url: input.targetUrl || null,
            scheduled_at: input.publishAt,
            attempt_count: 0,
            idempotency_key: idempotencyKey,
            provider_payload: {
              channel: teaser.platform,
              source: 'editorial-teaser',
            },
            workflow: input.workflowId,
            source_run: input.runId,
            related_content_uid: input.contentUid,
            related_content_id: input.contentId,
          },
        });

        created += 1;
      }

      return { created, skipped, channels };
    },

    async publishPending(
      now: Date
    ): Promise<{ processed: number; published: number; failed: number; rescheduled: number }> {
      const tickets = (await entityService.findMany(SOCIAL_POST_TICKET_UID, {
        filters: {
          status: {
            $in: ['scheduled', 'pending'],
          },
          scheduled_at: {
            $lte: now.toISOString(),
          },
          $or: [
            { next_attempt_at: { $null: true } },
            { next_attempt_at: { $lte: now.toISOString() } },
          ],
        },
        sort: [{ scheduled_at: 'asc' }, { id: 'asc' }],
        populate: ['workflow'],
        limit: MAX_TICKET_BATCH,
      })) as SocialPostTicketRecord[];

      let published = 0;
      let failed = 0;
      let rescheduled = 0;

      for (const ticket of tickets) {
        const outcome = await this.publishTicket(ticket, now);
        if (outcome === 'published') {
          published += 1;
        } else if (outcome === 'rescheduled') {
          rescheduled += 1;
        } else {
          failed += 1;
        }
      }

      return {
        processed: tickets.length,
        published,
        failed,
        rescheduled,
      };
    },

    async listTickets(input?: {
      platform?: string;
      status?: string;
      workflowId?: number;
      limit?: number;
      page?: number;
    }): Promise<SocialPostTicketRecord[]> {
      const filters: Record<string, unknown> = {};

      if (input?.platform && normalizePlatform(input.platform)) {
        filters.platform = normalizePlatform(input.platform);
      }

      if (input?.status) {
        filters.status = input.status;
      }

      if (input?.workflowId && Number.isFinite(input.workflowId)) {
        filters.workflow = input.workflowId;
      }

      const page = Math.max(1, Number(input?.page ?? 1));
      const limit = Math.max(1, Math.min(200, Number(input?.limit ?? 50)));
      const start = (page - 1) * limit;

      return (await entityService.findMany(SOCIAL_POST_TICKET_UID, {
        filters,
        sort: [{ scheduled_at: 'desc' }, { id: 'desc' }],
        populate: ['workflow', 'source_run'],
        start,
        limit,
      })) as SocialPostTicketRecord[];
    },

    async retryTicket(id: number): Promise<SocialPostTicketRecord> {
      const ticket = (await entityService.findOne(SOCIAL_POST_TICKET_UID, id, {
        populate: ['workflow', 'source_run'],
      })) as SocialPostTicketRecord | null;

      if (!ticket) {
        throw new Error(`Ticket social #${id} nie istnieje.`);
      }

      if (ticket.status === 'published' || ticket.status === 'canceled') {
        throw new Error(`Ticket #${id} ma status ${ticket.status} i nie może zostać ponowiony.`);
      }

      const updated = (await entityService.update(SOCIAL_POST_TICKET_UID, id, {
        data: {
          status: 'scheduled',
          blocked_reason: null,
          last_error: null,
          next_attempt_at: new Date(),
        },
        populate: ['workflow', 'source_run'],
      })) as SocialPostTicketRecord;

      return updated;
    },

    async cancelTicket(id: number): Promise<SocialPostTicketRecord> {
      const ticket = (await entityService.findOne(SOCIAL_POST_TICKET_UID, id, {
        populate: ['workflow', 'source_run'],
      })) as SocialPostTicketRecord | null;

      if (!ticket) {
        throw new Error(`Ticket social #${id} nie istnieje.`);
      }

      if (ticket.status === 'published') {
        throw new Error('Opublikowany ticket nie może zostać anulowany.');
      }

      const updated = (await entityService.update(SOCIAL_POST_TICKET_UID, id, {
        data: {
          status: 'canceled',
          next_attempt_at: null,
          blocked_reason: 'manually_canceled',
        },
        populate: ['workflow', 'source_run'],
      })) as SocialPostTicketRecord;

      return updated;
    },

    async testConnection(input: { workflowId: number; channels?: unknown }): Promise<{
      workflowId: number;
      overall: 'ready' | 'needs_action' | 'blocked' | 'degraded';
      channels: ChannelStatus[];
    }> {
      const workflow = await workflowService().getById(input.workflowId);
      if (!workflow) {
        throw new Error(`Workflow #${input.workflowId} nie istnieje.`);
      }

      const channels = normalizeChannels(input.channels ?? workflow.enabled_channels);
      const results: ChannelStatus[] = [];

      for (const channel of channels) {
        results.push(await this.testChannelConnection(channel, workflow));
      }

      const overall = results.some((item) => item.status === 'blocked')
        ? 'blocked'
        : results.some((item) => item.status === 'degraded')
          ? 'degraded'
          : results.some((item) => item.status === 'needs_action')
            ? 'needs_action'
            : 'ready';

      return {
        workflowId: workflow.id,
        overall,
        channels: results,
      };
    },

    async dryRunPublish(input: {
      workflowId: number;
      channels?: unknown;
      caption?: string;
      mediaUrl?: string;
      targetUrl?: string;
    }): Promise<{
      workflowId: number;
      overall: 'ready' | 'needs_action' | 'blocked' | 'degraded';
      channels: Array<ChannelStatus & { renderedCaption: string }>;
    }> {
      const workflow = await workflowService().getById(input.workflowId);
      if (!workflow) {
        throw new Error(`Workflow #${input.workflowId} nie istnieje.`);
      }

      const channels = normalizeChannels(input.channels ?? workflow.enabled_channels);

      const baseCaption = String(input.caption ?? 'Przykładowy autopost Star Sign').trim();
      const targetUrl = input.targetUrl?.trim() || 'https://star-sign.app';
      const mediaUrl = input.mediaUrl?.trim() || DEFAULT_SOCIAL_IMAGE_URL;

      const channelResults: Array<ChannelStatus & { renderedCaption: string }> = [];

      for (const channel of channels) {
        const connection = await this.testChannelConnection(channel, workflow);
        const renderedCaption = composeCaptionForPlatform(channel, baseCaption, targetUrl);

        if (connection.status === 'ready') {
          try {
            this.assertPublishGuardrails({
              platform: channel,
              caption: renderedCaption,
              mediaUrl,
              targetUrl,
              enabledChannels: normalizeChannels(workflow.enabled_channels),
            });
          } catch (error) {
            const message = toSafeErrorMessage(error);
            channelResults.push({
              platform: channel,
              status: 'blocked',
              message,
              renderedCaption,
            });
            continue;
          }
        }

        channelResults.push({
          ...connection,
          renderedCaption,
        });
      }

      const overall = channelResults.some((item) => item.status === 'blocked')
        ? 'blocked'
        : channelResults.some((item) => item.status === 'degraded')
          ? 'degraded'
          : channelResults.some((item) => item.status === 'needs_action')
            ? 'needs_action'
            : 'ready';

      return {
        workflowId: workflow.id,
        overall,
        channels: channelResults,
      };
    },

    async publishTicket(
      ticket: SocialPostTicketRecord,
      now: Date
    ): Promise<'published' | 'failed' | 'rescheduled'> {
      const workflow = await this.resolveTicketWorkflow(ticket);
      const attemptCount = Math.max(0, Number(ticket.attempt_count ?? 0)) + 1;

      try {
        if (!workflow) {
          throw new PublishGuardrailError('Ticket social nie ma przypisanego workflow.', {
            retryable: false,
            blockedReason: 'missing_workflow',
          });
        }

        const platform = normalizePlatform(ticket.platform);
        if (!platform) {
          throw new PublishGuardrailError(`Nieobsługiwana platforma: ${String(ticket.platform)}`, {
            retryable: false,
            blockedReason: 'unsupported_platform',
          });
        }

        const mediaUrl = await this.resolveMediaUrlForTicket(ticket, workflow);
        const caption = composeCaptionForPlatform(
          platform,
          ticket.caption || '',
          ticket.target_url || undefined
        );

        const enabledChannels = normalizeChannels(workflow.enabled_channels);
        this.assertPublishGuardrails({
          platform,
          caption,
          mediaUrl,
          targetUrl: ticket.target_url || undefined,
          enabledChannels,
        });

        const publishResult = await this.publishToProvider({
          platform,
          caption,
          mediaUrl,
          targetUrl: ticket.target_url || undefined,
          workflow,
        });

        await entityService.update(SOCIAL_POST_TICKET_UID, ticket.id, {
          data: {
            status: 'published',
            published_on: now,
            attempt_count: attemptCount,
            next_attempt_at: null,
            last_error: null,
            blocked_reason: null,
            media_url: mediaUrl,
            provider_post_id: publishResult.providerPostId || null,
            provider_payload: publishResult.providerPayload || null,
          },
        });

        return 'published';
      } catch (error) {
        const workflowRetryMax = workflow?.retry_max ?? DEFAULT_RETRY_MAX;
        const workflowBackoff = workflow?.retry_backoff_seconds ?? DEFAULT_RETRY_BACKOFF_SECONDS;
        const classification = this.classifyPublishError(error, now);

        if (classification.retryable && attemptCount < workflowRetryMax) {
          const retryIn = computeBackoffSeconds(
            workflowBackoff,
            attemptCount,
            classification.retryAfterSeconds
          );
          const nextAttemptAt = new Date(now.getTime() + retryIn * 1000);

          await entityService.update(SOCIAL_POST_TICKET_UID, ticket.id, {
            data: {
              status: 'scheduled',
              attempt_count: attemptCount,
              next_attempt_at: nextAttemptAt,
              last_error: toSafeErrorMessage(error),
              blocked_reason: null,
              provider_payload: classification.providerPayload || null,
            },
          });

          return 'rescheduled';
        }

        await entityService.update(SOCIAL_POST_TICKET_UID, ticket.id, {
          data: {
            status: 'failed',
            attempt_count: attemptCount,
            next_attempt_at: null,
            last_error: toSafeErrorMessage(error),
            blocked_reason: classification.blockedReason || 'publish_failed',
            provider_payload: classification.providerPayload || null,
          },
        });

        return 'failed';
      }
    },

    classifyPublishError(error: unknown, now: Date): PublishClassification {
      if (error instanceof PublishGuardrailError) {
        return error.classification;
      }

      if (isAxios(error)) {
        const status = error.response?.status;
        const headers = (error.response?.headers as Record<string, unknown> | undefined) ?? {};

        if (status === 429) {
          return {
            retryable: true,
            blockedReason: 'rate_limited',
            retryAfterSeconds: parseRetryAfterSeconds(headers, now),
            providerPayload: {
              status,
              data: error.response?.data,
            },
          };
        }

        if (status && (status >= 500 || status === 408 || status === 409 || status === 425)) {
          return {
            retryable: true,
            blockedReason: 'provider_unavailable',
            providerPayload: {
              status,
              data: error.response?.data,
            },
          };
        }

        return {
          retryable: false,
          blockedReason: 'provider_rejected',
          providerPayload: {
            status,
            data: error.response?.data,
          },
        };
      }

      const message = toSafeErrorMessage(error).toLowerCase();
      const transientHints = [
        'timeout',
        'timed out',
        'socket',
        'econnreset',
        'enotfound',
        'network',
      ];

      if (transientHints.some((hint) => message.includes(hint))) {
        return {
          retryable: true,
          blockedReason: 'network_error',
        };
      }

      return {
        retryable: false,
        blockedReason: 'publish_failed',
      };
    },

    async resolveTicketWorkflow(ticket: SocialPostTicketRecord): Promise<WorkflowRecord | null> {
      if (ticket.workflow && typeof ticket.workflow === 'object') {
        return ticket.workflow as unknown as WorkflowRecord;
      }

      const workflowId = getWorkflowId(ticket.workflow);
      if (!workflowId) {
        return null;
      }

      return workflowService().getById(workflowId);
    },

    assertPublishGuardrails(input: {
      platform: SocialPlatform;
      caption: string;
      mediaUrl: string;
      targetUrl?: string;
      enabledChannels: SocialPlatform[];
    }): void {
      if (!input.enabledChannels.includes(input.platform)) {
        throw new PublishGuardrailError(`Kanał ${input.platform} nie jest aktywny w workflow.`, {
          retryable: false,
          blockedReason: 'channel_disabled',
        });
      }

      if (!input.caption.trim()) {
        throw new PublishGuardrailError('Caption nie może być pusty.', {
          retryable: false,
          blockedReason: 'invalid_caption',
        });
      }

      if (!input.mediaUrl.trim()) {
        throw new PublishGuardrailError('Brak URL obrazu dla publikacji social.', {
          retryable: false,
          blockedReason: 'missing_media',
        });
      }

      if (!isPublicHttpUrl(input.mediaUrl)) {
        throw new PublishGuardrailError(`URL obrazu nie jest publiczny: ${input.mediaUrl}`, {
          retryable: false,
          blockedReason: 'media_url_not_public',
        });
      }

      if (input.targetUrl && !isPublicHttpUrl(input.targetUrl)) {
        throw new PublishGuardrailError(`URL docelowy nie jest publiczny: ${input.targetUrl}`, {
          retryable: false,
          blockedReason: 'target_url_not_public',
        });
      }

      if (input.platform === 'twitter' && input.caption.length > 280) {
        throw new PublishGuardrailError('Caption dla X przekracza limit 280 znaków.', {
          retryable: false,
          blockedReason: 'caption_too_long',
        });
      }
    },

    async resolveMediaUrlForTicket(
      ticket: SocialPostTicketRecord,
      workflow: WorkflowRecord
    ): Promise<string> {
      const mediaCandidate = ticket.media_url?.trim();
      if (mediaCandidate) {
        return mediaCandidate;
      }

      const serverUrl = String(strapi.config.get('server.url') || '').trim();

      if (ticket.related_content_uid && ticket.related_content_id) {
        try {
          const entry = (await entityService.findOne(
            ticket.related_content_uid,
            ticket.related_content_id,
            {
              populate: ['image'],
            }
          )) as Record<string, unknown> | null;

          const image = (entry?.image || null) as { url?: string } | null;
          if (image?.url) {
            const absolute = toAbsoluteUrl(image.url, serverUrl);
            if (absolute) {
              return absolute;
            }
          }
        } catch (error) {
          strapi.log.warn(
            `[aico] Nie udało się pobrać obrazu dla ${ticket.related_content_uid}#${ticket.related_content_id}: ${toSafeErrorMessage(error)}`
          );
        }
      }

      if (DEFAULT_SOCIAL_IMAGE_URL) {
        return DEFAULT_SOCIAL_IMAGE_URL;
      }

      throw new PublishGuardrailError(
        `Brak obrazu do publikacji w ticket #${ticket.id} (workflow #${workflow.id}).`,
        {
          retryable: false,
          blockedReason: 'missing_media',
        }
      );
    },

    async publishToProvider(input: {
      platform: SocialPlatform;
      caption: string;
      mediaUrl: string;
      targetUrl?: string;
      workflow: WorkflowRecord;
    }): Promise<{ providerPostId?: string; providerPayload?: Record<string, unknown> }> {
      if (input.platform === 'facebook') {
        return this.publishToFacebook(input);
      }

      if (input.platform === 'instagram') {
        return this.publishToInstagram(input);
      }

      if (input.platform === 'twitter') {
        return this.publishToX(input);
      }

      throw new PublishGuardrailError(`Nieobsługiwana platforma: ${input.platform}`, {
        retryable: false,
        blockedReason: 'unsupported_platform',
      });
    },

    async publishToFacebook(input: {
      caption: string;
      mediaUrl: string;
      targetUrl?: string;
      workflow: WorkflowRecord;
    }): Promise<{ providerPostId?: string; providerPayload?: Record<string, unknown> }> {
      if (!input.workflow.fb_page_id || !input.workflow.fb_access_token_encrypted) {
        throw new PublishGuardrailError('Workflow nie ma kompletnej konfiguracji Facebook.', {
          retryable: false,
          blockedReason: 'missing_facebook_config',
        });
      }

      const token = workflowService().decryptEncryptedValue(
        input.workflow.fb_access_token_encrypted,
        `Facebook token workflow #${input.workflow.id}`
      );

      const message = appendLinkIfMissing(input.caption, input.targetUrl);
      const endpoint = `${GRAPH_API_BASE}/${input.workflow.fb_page_id}/photos`;

      const response = await axios.post(
        endpoint,
        {
          url: input.mediaUrl,
          caption: message,
          published: true,
          access_token: token,
        },
        {
          timeout: 20_000,
        }
      );

      const providerPostId = String(response.data?.post_id || response.data?.id || '');
      if (!providerPostId) {
        throw new PublishGuardrailError('Facebook API nie zwróciło ID posta.', {
          retryable: true,
          blockedReason: 'facebook_missing_post_id',
          providerPayload: { data: response.data as Record<string, unknown> },
        });
      }

      return {
        providerPostId,
        providerPayload: {
          endpoint,
          postId: providerPostId,
        },
      };
    },

    async publishToInstagram(input: {
      caption: string;
      mediaUrl: string;
      workflow: WorkflowRecord;
    }): Promise<{ providerPostId?: string; providerPayload?: Record<string, unknown> }> {
      if (!input.workflow.ig_user_id || !input.workflow.ig_access_token_encrypted) {
        throw new PublishGuardrailError('Workflow nie ma kompletnej konfiguracji Instagram.', {
          retryable: false,
          blockedReason: 'missing_instagram_config',
        });
      }

      if (!isPublicHttpUrl(input.mediaUrl)) {
        throw new PublishGuardrailError('Instagram wymaga publicznego URL obrazu.', {
          retryable: false,
          blockedReason: 'media_url_not_public',
        });
      }

      const token = workflowService().decryptEncryptedValue(
        input.workflow.ig_access_token_encrypted,
        `Instagram token workflow #${input.workflow.id}`
      );

      const createContainer = await axios.post(
        `${GRAPH_API_BASE}/${input.workflow.ig_user_id}/media`,
        {
          image_url: input.mediaUrl,
          caption: input.caption,
          access_token: token,
        },
        {
          timeout: 20_000,
        }
      );

      const creationId = String(createContainer.data?.id || '');
      if (!creationId) {
        throw new PublishGuardrailError('Instagram API nie zwróciło creation_id.', {
          retryable: true,
          blockedReason: 'instagram_missing_creation_id',
          providerPayload: {
            data: createContainer.data as Record<string, unknown>,
          },
        });
      }

      const statusTrace: Array<{ attempt: number; status_code?: string; status?: string }> = [];
      let ready = false;

      for (let attempt = 1; attempt <= 10; attempt += 1) {
        const statusResponse = await axios.get(`${GRAPH_API_BASE}/${creationId}`, {
          params: {
            fields: 'status_code,status',
            access_token: token,
          },
          timeout: 15_000,
        });

        const statusCode = String(statusResponse.data?.status_code || '');
        const status = String(statusResponse.data?.status || '');
        statusTrace.push({ attempt, status_code: statusCode, status });

        if (statusCode === 'FINISHED') {
          ready = true;
          break;
        }

        if (statusCode === 'ERROR' || statusCode === 'EXPIRED') {
          throw new PublishGuardrailError(`Instagram container status: ${statusCode}`, {
            retryable: true,
            blockedReason: 'instagram_container_error',
            providerPayload: {
              creationId,
              statusTrace,
            },
          });
        }

        await sleep(2_000);
      }

      if (!ready) {
        throw new PublishGuardrailError('Instagram container nie osiągnął stanu FINISHED.', {
          retryable: true,
          blockedReason: 'instagram_container_timeout',
          providerPayload: {
            creationId,
            statusTrace,
          },
        });
      }

      const publishResponse = await axios.post(
        `${GRAPH_API_BASE}/${input.workflow.ig_user_id}/media_publish`,
        {
          creation_id: creationId,
          access_token: token,
        },
        {
          timeout: 20_000,
        }
      );

      const postId = String(publishResponse.data?.id || '');
      if (!postId) {
        throw new PublishGuardrailError('Instagram publish nie zwrócił ID posta.', {
          retryable: true,
          blockedReason: 'instagram_missing_post_id',
          providerPayload: {
            creationId,
            data: publishResponse.data as Record<string, unknown>,
          },
        });
      }

      return {
        providerPostId: postId,
        providerPayload: {
          creationId,
          statusTrace,
          postId,
        },
      };
    },

    async publishToX(input: {
      caption: string;
      mediaUrl: string;
      workflow: WorkflowRecord;
    }): Promise<{ providerPostId?: string; providerPayload?: Record<string, unknown> }> {
      if (
        !input.workflow.x_api_key ||
        !input.workflow.x_api_secret_encrypted ||
        !input.workflow.x_access_token_encrypted ||
        !input.workflow.x_access_token_secret_encrypted
      ) {
        throw new PublishGuardrailError('Workflow nie ma kompletnej konfiguracji X (OAuth 1.0a).', {
          retryable: false,
          blockedReason: 'missing_x_config',
        });
      }

      const consumerKey = input.workflow.x_api_key;
      const consumerSecret = workflowService().decryptEncryptedValue(
        input.workflow.x_api_secret_encrypted,
        `X API secret workflow #${input.workflow.id}`
      );
      const token = workflowService().decryptEncryptedValue(
        input.workflow.x_access_token_encrypted,
        `X access token workflow #${input.workflow.id}`
      );
      const tokenSecret = workflowService().decryptEncryptedValue(
        input.workflow.x_access_token_secret_encrypted,
        `X access token secret workflow #${input.workflow.id}`
      );

      const imageResponse = await axios.get<ArrayBuffer>(input.mediaUrl, {
        responseType: 'arraybuffer',
        timeout: 20_000,
      });
      const mediaBase64 = Buffer.from(imageResponse.data).toString('base64');

      const mediaBody = {
        media_data: mediaBase64,
      };
      const mediaAuthHeader = buildOAuthHeader({
        method: 'POST',
        url: X_UPLOAD_MEDIA_URL,
        bodyParams: mediaBody,
        consumerKey,
        consumerSecret,
        token,
        tokenSecret,
      });

      const mediaUploadResponse = await axios.post(
        X_UPLOAD_MEDIA_URL,
        new URLSearchParams(mediaBody).toString(),
        {
          headers: {
            Authorization: mediaAuthHeader,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          timeout: 30_000,
        }
      );

      const mediaId = String(
        mediaUploadResponse.data?.media_id_string || mediaUploadResponse.data?.media_id || ''
      );
      if (!mediaId) {
        throw new PublishGuardrailError('X media upload nie zwrócił media_id.', {
          retryable: true,
          blockedReason: 'x_missing_media_id',
          providerPayload: {
            data: mediaUploadResponse.data as Record<string, unknown>,
          },
        });
      }

      const statusBody = {
        status: input.caption,
        media_ids: mediaId,
      };

      const statusAuthHeader = buildOAuthHeader({
        method: 'POST',
        url: X_STATUS_UPDATE_URL,
        bodyParams: statusBody,
        consumerKey,
        consumerSecret,
        token,
        tokenSecret,
      });

      const statusResponse = await axios.post(
        X_STATUS_UPDATE_URL,
        new URLSearchParams(statusBody).toString(),
        {
          headers: {
            Authorization: statusAuthHeader,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          timeout: 20_000,
        }
      );

      const postId = String(statusResponse.data?.id_str || statusResponse.data?.id || '');
      if (!postId) {
        throw new PublishGuardrailError('X publish nie zwrócił ID posta.', {
          retryable: true,
          blockedReason: 'x_missing_post_id',
          providerPayload: {
            mediaId,
            data: statusResponse.data as Record<string, unknown>,
          },
        });
      }

      return {
        providerPostId: postId,
        providerPayload: {
          mediaId,
          postId,
        },
      };
    },

    async testChannelConnection(
      platform: SocialPlatform,
      workflow: WorkflowRecord
    ): Promise<ChannelStatus> {
      try {
        if (platform === 'facebook') {
          if (!workflow.fb_page_id || !workflow.fb_access_token_encrypted) {
            return {
              platform,
              status: 'needs_action',
              message: 'Brak fb_page_id lub tokena Facebook.',
            };
          }

          const token = workflowService().decryptEncryptedValue(
            workflow.fb_access_token_encrypted,
            `Facebook token workflow #${workflow.id}`
          );

          const response = await axios.get(`${GRAPH_API_BASE}/${workflow.fb_page_id}`, {
            params: {
              fields: 'id,name',
              access_token: token,
            },
            timeout: 15_000,
          });

          return {
            platform,
            status: 'ready',
            message: 'Połączenie Facebook OK.',
            details: {
              pageId: response.data?.id,
              pageName: response.data?.name,
            },
          };
        }

        if (platform === 'instagram') {
          if (!workflow.ig_user_id || !workflow.ig_access_token_encrypted) {
            return {
              platform,
              status: 'needs_action',
              message: 'Brak ig_user_id lub tokena Instagram.',
            };
          }

          const token = workflowService().decryptEncryptedValue(
            workflow.ig_access_token_encrypted,
            `Instagram token workflow #${workflow.id}`
          );

          const response = await axios.get(`${GRAPH_API_BASE}/${workflow.ig_user_id}`, {
            params: {
              fields: 'id,username',
              access_token: token,
            },
            timeout: 15_000,
          });

          return {
            platform,
            status: 'ready',
            message: 'Połączenie Instagram OK.',
            details: {
              userId: response.data?.id,
              username: response.data?.username,
            },
          };
        }

        if (
          !workflow.x_api_key ||
          !workflow.x_api_secret_encrypted ||
          !workflow.x_access_token_encrypted ||
          !workflow.x_access_token_secret_encrypted
        ) {
          return {
            platform,
            status: 'needs_action',
            message: 'Brak kompletu credentiali X (api key/secret + access token/secret).',
          };
        }

        const consumerKey = workflow.x_api_key;
        const consumerSecret = workflowService().decryptEncryptedValue(
          workflow.x_api_secret_encrypted,
          `X API secret workflow #${workflow.id}`
        );
        const token = workflowService().decryptEncryptedValue(
          workflow.x_access_token_encrypted,
          `X access token workflow #${workflow.id}`
        );
        const tokenSecret = workflowService().decryptEncryptedValue(
          workflow.x_access_token_secret_encrypted,
          `X access token secret workflow #${workflow.id}`
        );

        const queryParams = {
          include_entities: 'false',
          skip_status: 'true',
        };

        const authHeader = buildOAuthHeader({
          method: 'GET',
          url: X_VERIFY_URL,
          queryParams,
          consumerKey,
          consumerSecret,
          token,
          tokenSecret,
        });

        const response = await axios.get(X_VERIFY_URL, {
          params: queryParams,
          headers: {
            Authorization: authHeader,
          },
          timeout: 15_000,
        });

        return {
          platform,
          status: 'ready',
          message: 'Połączenie X OK.',
          details: {
            userId: response.data?.id_str,
            screenName: response.data?.screen_name,
          },
        };
      } catch (error) {
        if (isAxios(error) && error.response?.status === 401) {
          return {
            platform,
            status: 'blocked',
            message: `Błąd autoryzacji ${platform}: 401`,
            details: {
              status: error.response.status,
              data: error.response.data as Record<string, unknown>,
            },
          };
        }

        if (isAxios(error) && error.response?.status === 403) {
          return {
            platform,
            status: 'blocked',
            message: `Dostęp odrzucony przez ${platform}: 403`,
            details: {
              status: error.response.status,
              data: error.response.data as Record<string, unknown>,
            },
          };
        }

        return {
          platform,
          status: 'degraded',
          message: `Połączenie ${platform} chwilowo niedostępne: ${toSafeErrorMessage(error)}`,
        };
      }
    },
  };
};

export default socialPublisher;
