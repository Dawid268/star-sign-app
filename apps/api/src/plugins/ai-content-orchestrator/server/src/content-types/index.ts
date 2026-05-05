import workflow from './workflow/schema.json';
import topicQueueItem from './topic-queue-item/schema.json';
import runLog from './run-log/schema.json';
import publicationTicket from './publication-ticket/schema.json';
import socialPostTicket from './social-post-ticket/schema.json';
import usageDaily from './usage-daily/schema.json';
import mediaAsset from './media-asset/schema.json';
import mediaUsageLog from './media-usage-log/schema.json';
import contentPlanItem from './content-plan-item/schema.json';
import contentPerformanceSnapshot from './content-performance-snapshot/schema.json';
import editorialMemory from './editorial-memory/schema.json';
import homepageRecommendation from './homepage-recommendation/schema.json';
import auditEvent from './audit-event/schema.json';
import runtimeLock from './runtime-lock/schema.json';

export default {
  workflow: { schema: workflow },
  'topic-queue-item': { schema: topicQueueItem },
  'run-log': { schema: runLog },
  'publication-ticket': { schema: publicationTicket },
  'social-post-ticket': { schema: socialPostTicket },
  'usage-daily': { schema: usageDaily },
  'media-asset': { schema: mediaAsset },
  'media-usage-log': { schema: mediaUsageLog },
  'content-plan-item': { schema: contentPlanItem },
  'content-performance-snapshot': { schema: contentPerformanceSnapshot },
  'editorial-memory': { schema: editorialMemory },
  'homepage-recommendation': { schema: homepageRecommendation },
  'audit-event': { schema: auditEvent },
  'runtime-lock': { schema: runtimeLock },
};
