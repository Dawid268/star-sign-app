import { MEDIA_USAGE_LOG_UID } from '../constants';
import type { MediaUsageLogRecord, Strapi } from '../types';

const getId = (value: unknown): number | null => {
  if (typeof value === 'number') {
    return value;
  }

  if (value && typeof value === 'object' && 'id' in value && typeof (value as { id: unknown }).id === 'number') {
    return (value as { id: number }).id;
  }

  return null;
};

const mediaUsage = ({ strapi }: { strapi: Strapi }) => {
  const entityService = strapi.entityService as any;

  return {
    async list(limit = 200): Promise<MediaUsageLogRecord[]> {
      return (await entityService.findMany(MEDIA_USAGE_LOG_UID, {
        sort: [{ used_at: 'desc' }, { id: 'desc' }],
        limit: Math.max(1, Math.min(limit, 1000)),
        populate: ['workflow', 'media_asset'],
      })) as MediaUsageLogRecord[];
    },

    async create(input: {
      mediaAssetId: number;
      workflowId?: number;
      contentUid: string;
      contentEntryId: number;
      contextKey: string;
      usedAt?: Date;
      targetDate?: string;
    }): Promise<MediaUsageLogRecord> {
      const created = (await entityService.create(MEDIA_USAGE_LOG_UID, {
        data: {
          media_asset: input.mediaAssetId,
          workflow: input.workflowId ?? null,
          content_uid: input.contentUid,
          content_entry_id: input.contentEntryId,
          context_key: input.contextKey,
          used_at: input.usedAt ?? new Date(),
          target_date: input.targetDate ?? null,
        },
        populate: ['workflow', 'media_asset'],
      })) as MediaUsageLogRecord;

      return created;
    },

    serialize(item: MediaUsageLogRecord): Record<string, unknown> {
      return {
        ...item,
        workflow: getId(item.workflow),
        media_asset: getId(item.media_asset),
      };
    },
  };
};

export default mediaUsage;
