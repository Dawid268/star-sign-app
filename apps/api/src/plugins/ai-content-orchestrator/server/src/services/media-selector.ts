import { MEDIA_ASSET_UID, MEDIA_USAGE_LOG_UID } from '../constants';
import type { MediaAssetRecord, Strapi } from '../types';

const getId = (value: unknown): number | null => {
  if (typeof value === 'number') {
    return value;
  }

  if (value && typeof value === 'object' && 'id' in value && typeof (value as { id: unknown }).id === 'number') {
    return (value as { id: number }).id;
  }

  return null;
};

const mediaSelector = ({ strapi }: { strapi: Strapi }) => {
  const entityService = strapi.entityService as any;

  return {
    async resolveForArticle(input: {
      workflowType: 'article' | 'daily_card';
      imageAssetKey?: string | null;
      requiredSignSlug?: string | null;
      contextKey: string;
      now: Date;
      targetDate?: string;
    }): Promise<{ mediaAssetId: number; mediaAssetKey: string; uploadFileId: number }> {
      const candidates = (await entityService.findMany(MEDIA_ASSET_UID, {
        filters: {
          active: true,
          ...(input.imageAssetKey ? { asset_key: input.imageAssetKey.trim() } : {}),
          ...(!input.imageAssetKey && input.workflowType === 'daily_card'
            ? { purpose: { $in: ['daily_card', 'fallback_general'] } }
            : {}),
        },
        sort: [{ priority: 'desc' }, { use_count: 'asc' }, { last_used_at: 'asc' }, { id: 'asc' }],
        populate: ['asset'],
        limit: 200,
      })) as MediaAssetRecord[];

      if (candidates.length === 0) {
        if (input.workflowType === 'article') {
          throw new Error(`Nie znaleziono media-asset dla klucza "${input.imageAssetKey ?? ''}".`);
        }
        throw new Error('Brak aktywnych media-asset dla workflow daily_card.');
      }

      if (input.workflowType === 'article' && !input.imageAssetKey?.trim()) {
        throw new Error('Workflow article wymaga ustawionego image_asset_key w topic queue.');
      }

      const strictSignSlug = input.requiredSignSlug?.trim() || null;
      const filteredBySign = strictSignSlug
        ? candidates.filter((item) => (item.sign_slug?.trim() || null) === strictSignSlug)
        : candidates;

      if (strictSignSlug && filteredBySign.length === 0) {
        throw new Error(`Brak media-asset ze znakiem "${strictSignSlug}" (lock sign_slug).`);
      }

      const usable = filteredBySign.filter((item) => Boolean(getId(item.asset)));

      if (usable.length === 0) {
        throw new Error('Znalezione media-asset nie mają podpiętego pliku w Media Library.');
      }

      for (const candidate of usable) {
        const cooldownDays =
          typeof candidate.cooldown_days === 'number'
            ? Math.max(0, Math.min(30, Math.floor(candidate.cooldown_days)))
            : 3;

        if (cooldownDays > 0) {
          const cutoffDate = new Date(input.now.getTime() - cooldownDays * 24 * 60 * 60 * 1000);

          const recent = (await entityService.findMany(MEDIA_USAGE_LOG_UID, {
            filters: {
              context_key: input.contextKey,
              media_asset: candidate.id,
              used_at: {
                $gte: cutoffDate.toISOString(),
              },
            },
            sort: [{ used_at: 'desc' }],
            limit: 1,
          })) as Array<{ id: number }>;

          if (recent[0]) {
            continue;
          }
        }

        const uploadFileId = getId(candidate.asset);
        if (!uploadFileId) {
          continue;
        }

        return {
          mediaAssetId: candidate.id,
          mediaAssetKey: candidate.asset_key,
          uploadFileId,
        };
      }

      throw new Error('Brak dostępnych media-asset po uwzględnieniu cooldown i reguł doboru.');
    },

    async registerUsage(input: {
      mediaAssetId: number;
      workflowId?: number;
      contentUid: string;
      contentEntryId: number;
      contextKey: string;
      targetDate?: string;
    }): Promise<void> {
      const now = new Date();

      await entityService.create(MEDIA_USAGE_LOG_UID, {
        data: {
          media_asset: input.mediaAssetId,
          workflow: input.workflowId ?? null,
          content_uid: input.contentUid,
          content_entry_id: input.contentEntryId,
          context_key: input.contextKey,
          used_at: now,
          target_date: input.targetDate ?? null,
        },
      });

      const current = (await entityService.findOne(MEDIA_ASSET_UID, input.mediaAssetId)) as MediaAssetRecord | null;

      if (!current) {
        return;
      }

      await entityService.update(MEDIA_ASSET_UID, input.mediaAssetId, {
        data: {
          last_used_at: now,
          use_count: Math.max(0, Number(current.use_count ?? 0)) + 1,
        },
      });
    },
  };
};

export default mediaSelector;
