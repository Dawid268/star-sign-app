export type Workflow = {
  id: number;
  name: string;
  enabled: boolean;
  status: 'idle' | 'running' | 'failed' | 'blocked_budget';
  workflow_type: 'horoscope' | 'daily_card' | 'article';
  generate_cron: string;
  publish_cron: string;
  timezone: string;
  locale: string;
  llm_model: string;
  prompt_template: string;
  temperature: number;
  max_completion_tokens: number;
  retry_max: number;
  retry_backoff_seconds: number;
  daily_request_limit: number;
  daily_token_limit: number;
  allow_manual_edit: boolean;
  auto_publish: boolean;
  force_regenerate: boolean;
  topic_mode: 'manual' | 'mixed';
  horoscope_period: 'Dzienny' | 'Tygodniowy' | 'Miesięczny' | 'Roczny';
  horoscope_type_values: string[];
  all_signs: boolean;
  article_category: number | null;
  enabled_channels?: Array<'facebook' | 'instagram' | 'twitter'>;
  fb_page_id?: string | null;
  ig_user_id?: string | null;
  x_api_key?: string | null;
  tt_creator_id?: string | null;
  has_api_token: boolean;
  has_image_gen_token?: boolean;
  has_fb_token?: boolean;
  has_ig_token?: boolean;
  has_x_api_secret?: boolean;
  has_x_access_token?: boolean;
  has_x_access_token_secret?: boolean;
  has_tt_token?: boolean;
  image_gen_model?: string | null;
  last_error?: string | null;
  last_generated_at?: string | null;
  last_published_at?: string | null;
};

export type SocialPlatform = 'facebook' | 'instagram' | 'twitter';

export type SocialTicket = {
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
  workflow?: number | { id: number; name?: string } | null;
  source_run?: number | { id: number } | null;
};

export type SocialConnectionStatus = {
  platform: SocialPlatform;
  status: 'ready' | 'needs_action' | 'blocked' | 'degraded';
  message: string;
  details?: Record<string, unknown>;
};

export type SocialConnectionResult = {
  workflowId: number;
  overall: 'ready' | 'needs_action' | 'blocked' | 'degraded';
  channels: SocialConnectionStatus[];
};

export type SocialDryRunResult = {
  workflowId: number;
  overall: 'ready' | 'needs_action' | 'blocked' | 'degraded';
  channels: Array<SocialConnectionStatus & { renderedCaption: string }>;
};

export type AuditCheck = {
  id: string;
  area: string;
  severity: 'critical' | 'warning';
  status: 'pass' | 'warn' | 'fail';
  message: string;
  details?: Record<string, unknown>;
};

export type AuditFinding = {
  id: string;
  area: string;
  message: string;
  remediation: string;
};

export type AuditReport = {
  decision: 'GO' | 'GO_WITH_WARNINGS' | 'NO_GO';
  strict: boolean;
  generatedAt: string;
  summary: {
    criticalFailures: number;
    warnings: number;
  };
  checks: AuditCheck[];
  failed_flows: string[];
  failed_access_checks: string[];
  critical_findings: AuditFinding[];
  non_critical_findings: AuditFinding[];
};

export type Topic = {
  id: number;
  title: string;
  brief?: string | null;
  image_asset_key?: string | null;
  status: 'pending' | 'processing' | 'done' | 'failed';
  scheduled_for?: string | null;
  processed_at?: string | null;
  error_message?: string | null;
  workflow?: number | null;
  article_category?: number | null;
  generated_article?: number | null;
};

export type Run = {
  id: number;
  run_type: 'generate' | 'publish' | 'manual' | 'backfill';
  status: 'running' | 'success' | 'failed' | 'blocked_budget';
  started_at: string;
  finished_at?: string | null;
  error_message?: string | null;
  attempts?: number;
  details?: Record<string, unknown>;
  usage_prompt_tokens?: number;
  usage_completion_tokens?: number;
  usage_total_tokens?: number;
  workflow?: number | { id: number; name?: string } | null;
};

export type RunStepStatus = 'pending' | 'running' | 'success' | 'failed';

export type RunStep = {
  id: string;
  label: string;
  status: RunStepStatus;
  message?: string | null;
  timestamp?: string | null;
  output?: unknown;
};

export type LlmTrace = {
  id: string;
  label: string;
  workflowType?: Workflow['workflow_type'];
  createdAt: string;
  request: {
    model: string;
    temperature: number;
    maxCompletionTokens: number;
    prompt: string;
    schemaDescription: string;
    messages: Array<{ role: 'system' | 'user'; content: string }>;
  };
  response: {
    content: string;
    payload: unknown;
    usage: {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
    };
  };
};

export type DashboardSummary = {
  workflows: {
    total: number;
    enabled: number;
    failed: number;
  };
  runs: {
    failed: number;
    latest: Run[];
  };
  topics: {
    pending: number;
    failed: number;
  };
  publications: {
    scheduled: number;
    failed: number;
  };
  social: {
    scheduled: number;
    failed: number;
    published: number;
  };
};

export type DiagnosticsSummary = {
  ok: boolean;
  workflows: {
    total: number;
    enabled: number;
    issues: Array<{
      workflowId: number;
      name: string;
      workflow_type: string;
      enabled: boolean;
      message: string;
    }>;
  };
  media: {
    total: number;
    linkedActive: number;
    byPurpose: Record<string, { total: number; linkedActive: number }>;
  };
  topics: {
    pending: number;
    unassignedPending: number;
  };
  runs: {
    latestFailed: Run[];
  };
};

export type SettingsPayload = {
  timezone: string;
  locale: string;
  image_gen_model?: string;
  imageGenApiToken?: string;
  has_image_gen_token?: boolean;
};

export type MediaAsset = {
  id: number;
  asset_key: string;
  label: string;
  purpose: 'horoscope_sign' | 'daily_card' | 'blog_article' | 'fallback_general';
  sign_slug?: string | null;
  period_scope?: 'any' | 'daily' | 'weekly' | 'monthly' | null;
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
  asset?: {
    id: number;
    name?: string;
    url?: string;
    mime?: string;
    width?: number;
    height?: number;
    createdAt?: string;
  } | null;
};

export type MediaUsage = {
  id: number;
  content_uid: string;
  content_entry_id: number;
  context_key: string;
  used_at: string;
  target_date?: string | null;
  workflow?: number | null;
  media_asset?: number | null;
};

export type ApiEnvelope<T> = {
  data: T;
};

export type PaginationResult = {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
};

export type MediaMappingSuggestion = {
  asset_key: string;
  label: string;
  purpose: 'horoscope_sign' | 'daily_card' | 'blog_article' | 'fallback_general';
  sign_slug: string | null;
  period_scope: 'any' | 'daily' | 'weekly' | 'monthly';
  keywords: string[];
  confidence: number;
  reasons: string[];
};

export type MediaIdentityPreview = {
  fileId: number;
  asset_key: string;
  label: string;
  purpose: 'horoscope_sign' | 'daily_card' | 'blog_article' | 'fallback_general';
  sign_slug: string | null;
  period_scope: 'any' | 'daily' | 'weekly' | 'monthly';
};

export type MediaLibraryFile = {
  id: number;
  name: string;
  url: string;
  mime: string;
  width?: number | null;
  height?: number | null;
  createdAt?: string | null;
  formats?: Record<string, unknown> | null;
  mapping: MediaAsset | null;
  suggestion: MediaMappingSuggestion;
};

export type MediaLibraryListResult = {
  items: MediaLibraryFile[];
  pagination: PaginationResult;
};

export type MediaBulkUpsertItemRequest = {
  fileId: number;
  asset_key?: string;
  label?: string;
  purpose?: 'horoscope_sign' | 'daily_card' | 'blog_article' | 'fallback_general';
  sign_slug?: string | null;
  period_scope?: 'any' | 'daily' | 'weekly' | 'monthly';
  keywords?: string[] | string;
  priority?: number;
  active?: boolean;
  cooldown_days?: number;
  notes?: string | null;
};

export type MediaBulkUpsertResult = {
  dryRun: boolean;
  apply: boolean;
  summary: {
    total: number;
    previewCreate: number;
    previewUpdate: number;
    appliedCreate: number;
    appliedUpdate: number;
    errors: number;
  };
  items: Array<Record<string, unknown>>;
};
