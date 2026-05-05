import type { Context } from 'koa';

import type { AuditEventRecord, Strapi } from '../types';
import { toSafeErrorMessage } from './json';
import { getPluginService } from './plugin';

type AuditTrailService = {
  recordFromContext: (
    ctx: Context,
    input: {
      action: string;
      outcome: AuditEventRecord['outcome'];
      severity?: AuditEventRecord['severity'];
      resourceUid?: string;
      resourceId?: string | number;
      resourceLabel?: string;
      metadata?: Record<string, unknown>;
    }
  ) => Promise<AuditEventRecord | null>;
};

export const recordAdminAuditEvent = async (
  strapi: Strapi,
  ctx: Context,
  input: Parameters<AuditTrailService['recordFromContext']>[1]
): Promise<void> => {
  try {
    const service = getPluginService<Partial<AuditTrailService>>(strapi, 'audit-trail');
    if (typeof service?.recordFromContext === 'function') {
      await service.recordFromContext(ctx, input);
    }
  } catch (error) {
    strapi.log.warn(`[aico] admin audit event skipped: ${toSafeErrorMessage(error)}`);
  }
};
