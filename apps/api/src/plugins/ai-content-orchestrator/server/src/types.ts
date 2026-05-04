import type { Core } from '@strapi/strapi';

import type {
  DEFAULT_LOCALE,
  DEFAULT_MAX_COMPLETION_TOKENS,
  DEFAULT_RETRY_BACKOFF_SECONDS,
  DEFAULT_RETRY_MAX,
  SOCIAL_CHANNELS,
  DEFAULT_TEMPERATURE,
  DEFAULT_TIMEZONE,
  WORKFLOW_TYPES,
  HOROSCOPE_PERIODS,
} from './constants';

export type Strapi = Core.Strapi;

export type WorkflowType = (typeof WORKFLOW_TYPES)[number];
export type HoroscopePeriod = (typeof HOROSCOPE_PERIODS)[number];

export type RunType = 'generate' | 'publish' | 'manual' | 'backfill';
export type RunStatus = 'running' | 'success' | 'failed' | 'blocked_budget';
export type RunStepStatus = 'pending' | 'running' | 'success' | 'failed';

export type WorkflowStatus = 'idle' | 'running' | 'failed' | 'blocked_budget';
export type SocialPlatform = (typeof SOCIAL_CHANNELS)[number];

export type TopicStatus = 'pending' | 'processing' | 'done' | 'failed';

export type WorkflowRecord = {
  id: number;
  name: string;
  enabled: boolean;
  status: WorkflowStatus;
  workflow_type: WorkflowType;
  generate_cron: string;
  publish_cron: string;
  timezone?: string;
  locale?: string;
  llm_model: string;
  llm_api_token_encrypted?: string | null;
  image_gen_model?: string;
  image_gen_api_token_encrypted?: string | null;
  prompt_template: string;
  temperature?: number;
  max_completion_tokens?: number;
  retry_max?: number;
  retry_backoff_seconds?: number;
  daily_request_limit?: number;
  daily_token_limit?: number;
  allow_manual_edit?: boolean;
  auto_publish?: boolean;
  force_regenerate?: boolean;
  topic_mode?: 'manual' | 'mixed';
  horoscope_period?: HoroscopePeriod;
  horoscope_type_values?: string[] | null;
  all_signs?: boolean;
  article_category?: number | { id: number } | null;
  last_generated_at?: string | Date | null;
  last_published_at?: string | Date | null;
  last_generation_slot?: string | null;
  last_publish_slot?: string | null;
  last_error?: string | null;
  enabled_channels?: SocialPlatform[] | null;
  fb_page_id?: string | null;
  fb_access_token_encrypted?: string | null;
  ig_user_id?: string | null;
  ig_access_token_encrypted?: string | null;
  x_api_key?: string | null;
  x_api_secret_encrypted?: string | null;
  x_access_token_encrypted?: string | null;
  x_access_token_secret_encrypted?: string | null;
  tt_creator_id?: string | null;
  tt_access_token_encrypted?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type TopicQueueItemRecord = {
  id: number;
  title: string;
  brief?: string | null;
  image_asset_key?: string | null;
  status: TopicStatus;
  scheduled_for?: string | null;
  processed_at?: string | null;
  error_message?: string | null;
  metadata?: Record<string, unknown> | null;
  workflow?: number | { id: number } | null;
  article_category?: number | { id: number } | null;
  generated_article?: number | { id: number } | null;
  createdAt?: string;
  updatedAt?: string;
};

export type MediaPurpose =
  | 'horoscope_sign'
  | 'daily_card'
  | 'blog_article'
  | 'zodiac_profile'
  | 'fallback_general';
export type MediaPeriodScope = 'any' | 'daily' | 'weekly' | 'monthly';

export type MediaAssetRecord = {
  id: number;
  asset_key: string;
  label: string;
  purpose: MediaPurpose;
  sign_slug?: string | null;
  period_scope?: MediaPeriodScope | null;
  keywords?: string[] | null;
  priority?: number;
  active?: boolean;
  cooldown_days?: number;
  last_used_at?: string | null;
  use_count?: number;
  mapping_source?: 'manual' | 'suggestion' | 'bulk_suggestion' | 'seed' | null;
  mapping_confidence?: number | null;
  mapping_reasons?: string[] | null;
  notes?: string | null;
  asset?:
    | number
    | {
        id: number;
        url?: string;
        name?: string;
        mime?: string;
        width?: number;
        height?: number;
        createdAt?: string;
        formats?: Record<string, unknown>;
      }
    | null;
  createdAt?: string;
  updatedAt?: string;
};

export type MediaUsageLogRecord = {
  id: number;
  content_uid: string;
  content_entry_id: number;
  context_key: string;
  used_at: string;
  target_date?: string | null;
  workflow?: number | { id: number } | null;
  media_asset?: number | { id: number; asset_key?: string } | null;
  createdAt?: string;
  updatedAt?: string;
};

export type RunLogRecord = {
  id: number;
  run_type: RunType;
  status: RunStatus;
  started_at: string;
  finished_at?: string | null;
  attempts?: number;
  error_message?: string | null;
  details?: Record<string, unknown> | null;
  usage_prompt_tokens?: number;
  usage_completion_tokens?: number;
  usage_total_tokens?: number;
  workflow?: number | { id: number } | null;
  createdAt?: string;
  updatedAt?: string;
};

export type RunStepLog = {
  id: string;
  label: string;
  status: RunStepStatus;
  message?: string | null;
  timestamp?: string | null;
  output?: unknown;
};

export type PublicationTicketRecord = {
  id: number;
  status: 'scheduled' | 'published' | 'failed' | 'canceled';
  business_key: string;
  content_uid: string;
  content_entry_id: number;
  target_publish_at: string;
  published_on?: string | null;
  retries?: number;
  last_error?: string | null;
  payload?: Record<string, unknown> | null;
  workflow?: number | { id: number } | null;
  source_run?: number | { id: number } | null;
  createdAt?: string;
  updatedAt?: string;
};

export type SocialPostTicketRecord = {
  id: number;
  platform: SocialPlatform;
  status: 'pending' | 'scheduled' | 'published' | 'failed' | 'canceled';
  caption: string;
  media_url?: string | null;
  target_url?: string | null;
  scheduled_at: string;
  published_on?: string | null;
  last_error?: string | null;
  attempt_count?: number;
  next_attempt_at?: string | null;
  provider_post_id?: string | null;
  blocked_reason?: string | null;
  idempotency_key?: string | null;
  provider_payload?: Record<string, unknown> | null;
  workflow?: number | { id: number } | null;
  source_run?: number | { id: number } | null;
  related_content_uid?: string | null;
  related_content_id?: number | null;
  createdAt?: string;
  updatedAt?: string;
};

export type UsageDailyRecord = {
  id: number;
  day: string;
  unique_key: string;
  status: 'ok' | 'blocked_budget';
  request_count: number;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  workflow?: number | { id: number } | null;
  createdAt?: string;
  updatedAt?: string;
};

export type OpenRouterUsage = {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
};

export type LlmTraceMessage = {
  role: 'system' | 'user';
  content: string;
};

export type OpenRouterTrace = {
  request: {
    model: string;
    temperature: number;
    maxCompletionTokens: number;
    prompt: string;
    schemaDescription: string;
    messages: LlmTraceMessage[];
  };
  response: {
    content: string;
    payload: unknown;
    usage: OpenRouterUsage;
  };
};

export type LlmTraceLog = OpenRouterTrace & {
  id: string;
  label: string;
  workflowType?: WorkflowType;
  createdAt: string;
};

export type HoroscopeItem = {
  sign: string;
  title?: string;
  content: string;
  premiumContent?: string | null;
  type?: string;
};

export type HoroscopePayload = {
  items: HoroscopeItem[];
};

export type ArticlePayload = {
  title: string;
  slug?: string;
  excerpt: string;
  content: string;
  premiumContent?: string | null;
  isPremium?: boolean;
  author?: string;
  read_time_minutes?: number;
};

export type DailyCardPayload = {
  title: string;
  slug?: string;
  excerpt: string;
  content: string;
  premiumContent: string;
  isPremium?: boolean;
  draw_message: string;
  author?: string;
  read_time_minutes?: number;
};

export type GeneratePayload = HoroscopePayload | ArticlePayload | DailyCardPayload;

export type NormalizedWorkflowConfig = {
  id: number;
  name: string;
  enabled: boolean;
  status: WorkflowStatus;
  workflowType: WorkflowType;
  generateCron: string;
  publishCron: string;
  timezone: string;
  locale: string;
  llmModel: string;
  llmTokenEncrypted: string;
  imageGenModel: string;
  imageGenTokenEncrypted?: string | null;
  promptTemplate: string;
  temperature: number;
  maxCompletionTokens: number;
  retryMax: number;
  retryBackoffSeconds: number;
  dailyRequestLimit: number;
  dailyTokenLimit: number;
  allowManualEdit: boolean;
  autoPublish: boolean;
  forceRegenerate: boolean;
  topicMode: 'manual' | 'mixed';
  horoscopePeriod: HoroscopePeriod;
  horoscopeTypeValues: string[];
  allSigns: boolean;
  articleCategoryId: number | null;
  lastGenerationSlot: string | null;
  lastPublishSlot: string | null;
  enabledChannels: SocialPlatform[];
  fbPageId?: string | null;
  fbTokenEncrypted?: string | null;
  igUserId?: string | null;
  igTokenEncrypted?: string | null;
  xApiKey?: string | null;
  xApiSecretEncrypted?: string | null;
  xAccessTokenEncrypted?: string | null;
  xAccessTokenSecretEncrypted?: string | null;
  ttCreatorId?: string | null;
  ttTokenEncrypted?: string | null;
};

export type CreateRunInput = {
  workflowId?: number;
  runType: RunType;
  status: RunStatus;
  startedAt: Date;
  attempts?: number;
  details?: Record<string, unknown>;
  errorMessage?: string;
};

export type CompleteRunInput = {
  runId: number;
  status: RunStatus;
  errorMessage?: string;
  details?: Record<string, unknown>;
  usage?: OpenRouterUsage;
};

export type WorkflowUpdatePayload = Partial<
  Pick<
    WorkflowRecord,
    | 'name'
    | 'enabled'
    | 'workflow_type'
    | 'generate_cron'
    | 'publish_cron'
    | 'timezone'
    | 'locale'
    | 'llm_model'
    | 'prompt_template'
    | 'temperature'
    | 'max_completion_tokens'
    | 'retry_max'
    | 'retry_backoff_seconds'
    | 'daily_request_limit'
    | 'daily_token_limit'
    | 'all_signs'
    | 'article_category'
    | 'image_gen_model'
    | 'enabled_channels'
    | 'allow_manual_edit'
    | 'auto_publish'
    | 'force_regenerate'
    | 'topic_mode'
    | 'horoscope_period'
    | 'horoscope_type_values'
    | 'fb_page_id'
    | 'ig_user_id'
    | 'x_api_key'
    | 'tt_creator_id'
  >
> & {
  apiToken?: string;
  imageGenApiToken?: string;
  fbAccessToken?: string;
  igAccessToken?: string;
  xApiSecret?: string;
  xAccessToken?: string;
  xAccessTokenSecret?: string;
  ttAccessToken?: string;
};

export type BackfillPayload = {
  startDate: string;
  endDate: string;
  dryRun?: boolean;
};

export type RuntimeDefaults = {
  timezone: typeof DEFAULT_TIMEZONE;
  locale: typeof DEFAULT_LOCALE;
  temperature: typeof DEFAULT_TEMPERATURE;
  maxCompletionTokens: typeof DEFAULT_MAX_COMPLETION_TOKENS;
  retryMax: typeof DEFAULT_RETRY_MAX;
  retryBackoffSeconds: typeof DEFAULT_RETRY_BACKOFF_SECONDS;
};
