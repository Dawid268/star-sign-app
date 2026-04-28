import workflow from "./workflow/schema.json";
import topicQueueItem from "./topic-queue-item/schema.json";
import runLog from "./run-log/schema.json";
import publicationTicket from "./publication-ticket/schema.json";
import usageDaily from "./usage-daily/schema.json";
import mediaAsset from "./media-asset/schema.json";
import mediaUsageLog from "./media-usage-log/schema.json";

export default {
  workflow: { schema: workflow },
  "topic-queue-item": { schema: topicQueueItem },
  "run-log": { schema: runLog },
  "publication-ticket": { schema: publicationTicket },
  "usage-daily": { schema: usageDaily },
  "media-asset": { schema: mediaAsset },
  "media-usage-log": { schema: mediaUsageLog },
};
