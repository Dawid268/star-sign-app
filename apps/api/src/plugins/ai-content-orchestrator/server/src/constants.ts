export const PLUGIN_ID = 'ai-content-orchestrator';

export const WORKFLOW_UID = `plugin::${PLUGIN_ID}.workflow`;
export const TOPIC_QUEUE_UID = `plugin::${PLUGIN_ID}.topic-queue-item`;
export const RUN_LOG_UID = `plugin::${PLUGIN_ID}.run-log`;
export const PUBLICATION_TICKET_UID = `plugin::${PLUGIN_ID}.publication-ticket`;
export const SOCIAL_POST_TICKET_UID = `plugin::${PLUGIN_ID}.social-post-ticket`;
export const USAGE_DAILY_UID = `plugin::${PLUGIN_ID}.usage-daily`;
export const MEDIA_ASSET_UID = `plugin::${PLUGIN_ID}.media-asset`;
export const MEDIA_USAGE_LOG_UID = `plugin::${PLUGIN_ID}.media-usage-log`;

export const CONTENT_UIDS = {
  horoscope: 'api::horoscope.horoscope',
  article: 'api::article.article',
  tarotCard: 'api::tarot-card.tarot-card',
  dailyTarotDraw: 'api::daily-tarot-draw.daily-tarot-draw',
  zodiacSign: 'api::zodiac-sign.zodiac-sign',
  category: 'api::category.category',
} as const;

export const DEFAULT_TIMEZONE = 'Europe/Warsaw';
export const DEFAULT_LOCALE = 'pl';

export const CRON_TICK_RULE = '* * * * *';
export const CRON_DUE_WINDOW_MS = 90_000;

export const DEFAULT_RETRY_MAX = 3;
export const DEFAULT_RETRY_BACKOFF_SECONDS = 120;
export const DEFAULT_DAILY_REQUEST_LIMIT = 120;
export const DEFAULT_DAILY_TOKEN_LIMIT = 250_000;

export const DEFAULT_TEMPERATURE = 0.7;
export const DEFAULT_MAX_COMPLETION_TOKENS = 1800;

export const MAX_BACKFILL_DAYS = 120;

export const OPENROUTER_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

export const ZODIAC_SIGNS_PL = [
  'Baran',
  'Byk',
  'Bliźnięta',
  'Rak',
  'Lew',
  'Panna',
  'Waga',
  'Skorpion',
  'Strzelec',
  'Koziorożec',
  'Wodnik',
  'Ryby',
] as const;

export const WORKFLOW_TYPES = ['horoscope', 'daily_card', 'article'] as const;
export const RUN_TYPES = ['generate', 'publish', 'manual', 'backfill'] as const;
export const SOCIAL_CHANNELS = ['facebook', 'instagram', 'twitter'] as const;

export const HOROSCOPE_PERIODS = ['Dzienny', 'Tygodniowy', 'Miesięczny', 'Roczny'] as const;

export const RBAC_ACTIONS = {
  read: `plugin::${PLUGIN_ID}.read`,
  manageWorkflows: `plugin::${PLUGIN_ID}.manage-workflows`,
  manageSocial: `plugin::${PLUGIN_ID}.manage-social`,
  runAudit: `plugin::${PLUGIN_ID}.run-audit`,
  run: `plugin::${PLUGIN_ID}.run`,
  backfill: `plugin::${PLUGIN_ID}.backfill`,
  manageTopics: `plugin::${PLUGIN_ID}.manage-topics`,
  viewRuns: `plugin::${PLUGIN_ID}.view-runs`,
  manageMedia: `plugin::${PLUGIN_ID}.manage-media`,
  viewMediaUsage: `plugin::${PLUGIN_ID}.view-media-usage`,
} as const;

export const TICKET_STATUS = {
  scheduled: 'scheduled',
  published: 'published',
  failed: 'failed',
  canceled: 'canceled',
} as const;

export const WORKFLOW_STATUS = {
  idle: 'idle',
  running: 'running',
  failed: 'failed',
  blockedBudget: 'blocked_budget',
} as const;

export const RUN_STATUS = {
  running: 'running',
  success: 'success',
  failed: 'failed',
  blockedBudget: 'blocked_budget',
} as const;

export const TOPIC_STATUS = {
  pending: 'pending',
  processing: 'processing',
  done: 'done',
  failed: 'failed',
} as const;
