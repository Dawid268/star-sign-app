import {
  MEDIA_ASSET_UID,
  RUN_LOG_UID,
  TOPIC_QUEUE_UID,
  WORKFLOW_UID,
  WORKFLOW_STATUS,
} from '../constants';
import type { MediaAssetRecord, Strapi, TopicQueueItemRecord, WorkflowRecord } from '../types';

const getId = (value: unknown): number | null => {
  if (typeof value === 'number') {
    return value;
  }

  if (value && typeof value === 'object' && 'id' in value && typeof (value as { id: unknown }).id === 'number') {
    return (value as { id: number }).id;
  }

  return null;
};

const diagnostics = ({ strapi }: { strapi: Strapi }) => {
  const entityService = strapi.entityService as any;

  return {
    async getSummary(): Promise<Record<string, unknown>> {
      const [workflows, mediaAssets, pendingTopics, failedRuns] = (await Promise.all([
        entityService.findMany(WORKFLOW_UID, {
          sort: { id: 'asc' },
          populate: ['article_category'],
          limit: 1000,
        }),
        entityService.findMany(MEDIA_ASSET_UID, {
          sort: [{ purpose: 'asc' }, { asset_key: 'asc' }],
          populate: ['asset'],
          limit: 10000,
        }),
        entityService.findMany(TOPIC_QUEUE_UID, {
          filters: { status: 'pending' },
          sort: [{ scheduled_for: 'asc' }, { createdAt: 'asc' }],
          populate: ['workflow'],
          limit: 100,
        }),
        entityService.findMany(RUN_LOG_UID, {
          filters: { status: 'failed' },
          sort: { started_at: 'desc' },
          populate: ['workflow'],
          limit: 10,
        }),
      ])) as [WorkflowRecord[], MediaAssetRecord[], TopicQueueItemRecord[], Array<Record<string, unknown>>];

      const linkedActiveAssets = mediaAssets.filter((asset) => Boolean(asset.active) && Boolean(getId(asset.asset)));
      const hasLinkedPurpose = (purposes: string[]): boolean =>
        linkedActiveAssets.some((asset) => purposes.includes(asset.purpose));

      const workflowIssues = workflows.flatMap((workflow) => {
        const issues: string[] = [];
        const needsCategory = workflow.workflow_type === 'article' || workflow.workflow_type === 'daily_card';

        if (workflow.enabled && !workflow.llm_api_token_encrypted?.trim()) {
          issues.push('enabled workflow nie ma tokena OpenRouter');
        }

        if (needsCategory && !getId(workflow.article_category)) {
          issues.push('brak kategorii dla article/daily_card');
        }

        if (workflow.workflow_type === 'daily_card' && !hasLinkedPurpose(['daily_card', 'fallback_general'])) {
          issues.push('brak aktywnego obrazu daily_card/fallback_general');
        }

        if (workflow.workflow_type === 'article' && !hasLinkedPurpose(['blog_article', 'fallback_general'])) {
          issues.push('brak aktywnego obrazu blog_article/fallback_general');
        }

        if (workflow.status === WORKFLOW_STATUS.failed && workflow.last_error) {
          issues.push(`ostatni błąd: ${workflow.last_error}`);
        }

        return issues.map((message) => ({
          workflowId: workflow.id,
          name: workflow.name,
          workflow_type: workflow.workflow_type,
          enabled: workflow.enabled,
          message,
        }));
      });

      const byPurpose = mediaAssets.reduce<Record<string, { total: number; linkedActive: number }>>((acc, asset) => {
        const key = asset.purpose || 'unknown';
        const current = acc[key] ?? { total: 0, linkedActive: 0 };
        current.total += 1;
        if (asset.active && getId(asset.asset)) {
          current.linkedActive += 1;
        }
        acc[key] = current;
        return acc;
      }, {});

      return {
        ok: workflowIssues.length === 0,
        workflows: {
          total: workflows.length,
          enabled: workflows.filter((workflow) => workflow.enabled).length,
          issues: workflowIssues,
        },
        media: {
          total: mediaAssets.length,
          linkedActive: linkedActiveAssets.length,
          byPurpose,
        },
        topics: {
          pending: pendingTopics.length,
          unassignedPending: pendingTopics.filter((topic) => !getId(topic.workflow)).length,
        },
        runs: {
          latestFailed: failedRuns,
        },
      };
    },
  };
};

export default diagnostics;
