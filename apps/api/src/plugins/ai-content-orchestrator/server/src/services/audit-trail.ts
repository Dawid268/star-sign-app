import { createHash, randomUUID } from 'crypto';

import type { Context } from 'koa';

import { AUDIT_EVENT_UID } from '../constants';
import type { AuditEventRecord, Strapi } from '../types';
import { getEntityService } from '../utils/entity-service';
import { toSafeErrorMessage } from '../utils/json';

type AuditActor = {
  actorType: 'admin' | 'system' | 'unknown';
  actorId?: string;
  requestId?: string;
  ipHash?: string;
};

type RecordAuditEventInput = {
  action: string;
  outcome: AuditEventRecord['outcome'];
  severity?: AuditEventRecord['severity'];
  actor?: AuditActor;
  resourceUid?: string;
  resourceId?: string | number;
  resourceLabel?: string;
  metadata?: Record<string, unknown>;
};

type ListAuditEventsInput = {
  action?: string;
  outcome?: AuditEventRecord['outcome'];
  resourceUid?: string;
  resourceId?: string | number;
  limit?: number;
};

const SENSITIVE_KEY_PATTERN =
  /(token|secret|password|credential|authorization|cookie|api[_-]?key|encrypted|prompt|llmtraces|messages|raw|response|provider_payload)/i;
const MAX_ARRAY_ITEMS = 20;
const MAX_STRING_LENGTH = 600;
const MAX_DEPTH = 5;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const toAuditString = (value: unknown): string | undefined => {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  return undefined;
};

const getHeader = (ctx: Context, names: string[]): string | undefined => {
  for (const name of names) {
    const viaGetter = typeof ctx.get === 'function' ? ctx.get(name) : '';
    if (viaGetter) {
      return viaGetter;
    }

    const headers = ctx.request?.headers as Record<string, unknown> | undefined;
    const direct = headers?.[name.toLowerCase()];
    if (typeof direct === 'string' && direct.trim()) {
      return direct.trim();
    }
  }

  return undefined;
};

const hashIp = (ip?: string): string | undefined => {
  const normalized = ip?.trim();
  if (!normalized) {
    return undefined;
  }

  const salt = process.env.AICO_AUDIT_IP_HASH_SALT ?? 'aico-local-audit';
  return createHash('sha256').update(`${salt}:${normalized}`).digest('hex');
};

const extractActorFromContext = (ctx: Context): AuditActor => {
  const user = (ctx.state as { user?: { id?: unknown } } | undefined)?.user;
  const actorId = toAuditString(user?.id);
  const requestId = getHeader(ctx, ['x-request-id', 'x-correlation-id']);
  const forwardedFor = getHeader(ctx, ['x-forwarded-for']);
  const ip = forwardedFor?.split(',')[0]?.trim() || ctx.ip || ctx.request?.ip;

  return {
    actorType: actorId ? 'admin' : 'unknown',
    actorId,
    requestId,
    ipHash: hashIp(ip),
  };
};

const redactValue = (value: unknown, depth = 0): unknown => {
  if (depth > MAX_DEPTH) {
    return '[TRUNCATED_DEPTH]';
  }

  if (typeof value === 'string') {
    return value.length > MAX_STRING_LENGTH
      ? `${value.slice(0, MAX_STRING_LENGTH)}...[TRUNCATED]`
      : value;
  }

  if (Array.isArray(value)) {
    return value.slice(0, MAX_ARRAY_ITEMS).map((item) => redactValue(item, depth + 1));
  }

  if (!isRecord(value)) {
    return value;
  }

  return Object.entries(value).reduce<Record<string, unknown>>((acc, [key, entry]) => {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      acc[key] = '[REDACTED]';
      return acc;
    }

    acc[key] = redactValue(entry, depth + 1);
    return acc;
  }, {});
};

const sanitizeMetadata = (metadata?: Record<string, unknown>): Record<string, unknown> => {
  if (!metadata) {
    return {};
  }

  const redacted = redactValue(metadata);
  return isRecord(redacted) ? redacted : { value: redacted };
};

const auditTrail = ({ strapi }: { strapi: Strapi }) => {
  const entityService = getEntityService(strapi);

  return {
    sanitizeMetadata,

    extractActorFromContext,

    async record(input: RecordAuditEventInput): Promise<AuditEventRecord | null> {
      try {
        const now = new Date();
        return await entityService.create<AuditEventRecord>(AUDIT_EVENT_UID, {
          data: {
            event_key: `audit-${now.getTime()}-${randomUUID()}`,
            action: input.action,
            outcome: input.outcome,
            severity: input.severity ?? (input.outcome === 'failure' ? 'error' : 'info'),
            occurred_at: now,
            actor_type: input.actor?.actorType ?? 'system',
            actor_id: input.actor?.actorId ?? null,
            resource_uid: input.resourceUid ?? null,
            resource_id:
              typeof input.resourceId === 'undefined' ? null : String(input.resourceId),
            resource_label: input.resourceLabel ?? null,
            request_id: input.actor?.requestId ?? null,
            ip_hash: input.actor?.ipHash ?? null,
            metadata: sanitizeMetadata(input.metadata),
          },
        });
      } catch (error) {
        const message = toSafeErrorMessage(error);
        strapi.log.error(`[aico] audit trail write failed: ${message}`);

        if (process.env.AICO_AUDIT_TRAIL_STRICT === 'true') {
          throw error;
        }

        return null;
      }
    },

    async recordFromContext(
      ctx: Context,
      input: Omit<RecordAuditEventInput, 'actor'>
    ): Promise<AuditEventRecord | null> {
      return this.record({
        ...input,
        actor: extractActorFromContext(ctx),
      });
    },

    async list(input: ListAuditEventsInput = {}): Promise<AuditEventRecord[]> {
      const filters: Record<string, unknown> = {};

      if (input.action) {
        filters.action = input.action;
      }

      if (input.outcome) {
        filters.outcome = input.outcome;
      }

      if (input.resourceUid) {
        filters.resource_uid = input.resourceUid;
      }

      if (typeof input.resourceId !== 'undefined') {
        filters.resource_id = String(input.resourceId);
      }

      return entityService.findMany<AuditEventRecord>(AUDIT_EVENT_UID, {
        filters,
        sort: [{ occurred_at: 'desc' }, { id: 'desc' }],
        limit: Math.max(1, Math.min(500, Number(input.limit ?? 100))),
      });
    },
  };
};

export default auditTrail;
