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
  horoscope_period: 'Dzienny' | 'Tygodniowy' | 'Miesięczny';
  horoscope_type_values: string[];
  all_signs: boolean;
  article_category: number | null;
  has_api_token: boolean;
  last_error?: string | null;
  last_generated_at?: string | null;
  last_published_at?: string | null;
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
