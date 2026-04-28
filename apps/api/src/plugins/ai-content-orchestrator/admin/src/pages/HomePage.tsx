import { Page, useFetchClient, useNotification } from '@strapi/strapi/admin';
import { Fragment, useEffect, useMemo, useState } from 'react';

import { api } from '../api';
import type {
  DashboardSummary,
  DiagnosticsSummary,
  LlmTrace,
  MediaAsset,
  MediaBulkUpsertItemRequest,
  MediaBulkUpsertResult,
  MediaIdentityPreview,
  MediaLibraryFile,
  MediaLibraryListResult,
  MediaUsage,
  Run,
  RunStep,
  SettingsPayload,
  Topic,
  Workflow,
} from '../types';

type TabKey = 'dashboard' | 'workflows' | 'topics' | 'media' | 'runs' | 'settings';

type WorkflowFormState = {
  name: string;
  enabled: boolean;
  workflow_type: 'horoscope' | 'daily_card' | 'article';
  generate_cron: string;
  publish_cron: string;
  timezone: string;
  locale: string;
  llm_model: string;
  apiToken: string;
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
  horoscope_type_values: string;
  all_signs: boolean;
  article_category: string;
};

type TopicFormState = {
  title: string;
  brief: string;
  image_asset_key: string;
  workflow: string;
  article_category: string;
  scheduled_for: string;
};

type MediaAssetFormState = {
  asset_key: string;
  label: string;
  purpose: 'horoscope_sign' | 'daily_card' | 'blog_article' | 'fallback_general';
  sign_slug: string;
  period_scope: 'any' | 'daily' | 'weekly' | 'monthly';
  keywords: string;
  priority: number;
  active: boolean;
  cooldown_days: number;
  notes: string;
};

type MediaFiltersState = {
  page: number;
  pageSize: number;
  search: string;
  mapped: 'all' | 'mapped' | 'unmapped';
  purpose: 'all' | 'horoscope_sign' | 'daily_card' | 'blog_article' | 'fallback_general';
  sign: string;
  active: 'all' | 'active' | 'inactive';
  sort: 'createdAtDesc' | 'createdAtAsc' | 'nameAsc' | 'nameDesc';
};

type RunFiltersState = {
  status: 'all' | Run['status'];
  workflowName: string;
  fromDate: string;
  toDate: string;
};

const CARD_STYLE: React.CSSProperties = {
  border: '1px solid #dcdce4',
  borderRadius: 10,
  padding: 16,
  background: '#fff',
};

const SECTION_TITLE_STYLE: React.CSSProperties = {
  fontSize: 17,
  fontWeight: 700,
  marginBottom: 12,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: 8,
  border: '1px solid #c8c8d0',
  fontSize: 14,
};

const checkboxRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  fontSize: 14,
};

const initialWorkflowForm = (): WorkflowFormState => ({
  name: '',
  enabled: true,
  workflow_type: 'horoscope',
  generate_cron: '0 23 * * *',
  publish_cron: '0 0 * * *',
  timezone: 'Europe/Warsaw',
  locale: 'pl',
  llm_model: 'openai/gpt-4o-mini',
  apiToken: '',
  prompt_template:
    'Napisz treść dla {{type}} ({{period}}). Data docelowa: {{targetDate}}. Znaki: {{signList}}. Język: polski. Oddaj gotowy JSON.',
  temperature: 0.7,
  max_completion_tokens: 1800,
  retry_max: 3,
  retry_backoff_seconds: 120,
  daily_request_limit: 120,
  daily_token_limit: 250000,
  allow_manual_edit: true,
  auto_publish: true,
  force_regenerate: false,
  topic_mode: 'mixed',
  horoscope_period: 'Dzienny',
  horoscope_type_values: 'Ogólny',
  all_signs: true,
  article_category: '',
});

const initialTopicForm = (): TopicFormState => ({
  title: '',
  brief: '',
  image_asset_key: '',
  workflow: '',
  article_category: '',
  scheduled_for: '',
});

const initialMediaAssetForm = (): MediaAssetFormState => ({
  asset_key: '',
  label: '',
  purpose: 'blog_article',
  sign_slug: '',
  period_scope: 'any',
  keywords: '',
  priority: 0,
  active: true,
  cooldown_days: 3,
  notes: '',
});

const initialMediaFilters = (): MediaFiltersState => ({
  page: 1,
  pageSize: 24,
  search: '',
  mapped: 'all',
  purpose: 'all',
  sign: 'all',
  active: 'all',
  sort: 'createdAtDesc',
});

const initialRunFilters = (): RunFiltersState => ({
  status: 'all',
  workflowName: '',
  fromDate: '',
  toDate: '',
});

const WORKFLOW_STEP_LABELS = ['Basics', 'Schedule', 'Content', 'Controls'] as const;

const STATUS_COLORS: Record<string, { bg: string; border: string; color: string }> = {
  idle: { bg: '#f4f6fb', border: '#d8deec', color: '#41495a' },
  pending: { bg: '#f4f6fb', border: '#d8deec', color: '#41495a' },
  running: { bg: '#eef6ff', border: '#a8d4ff', color: '#07599b' },
  success: { bg: '#edf9f1', border: '#b9e8c7', color: '#116b33' },
  failed: { bg: '#fff0f0', border: '#ffc7c7', color: '#a42020' },
  blocked_budget: { bg: '#fff6e5', border: '#ffd58a', color: '#8a5b00' },
  enabled: { bg: '#edf9f1', border: '#b9e8c7', color: '#116b33' },
  disabled: { bg: '#f4f6fb', border: '#d8deec', color: '#606477' },
};

const pad2 = (value: number): string => String(value).padStart(2, '0');

const stripExtension = (fileName: string): string => fileName.replace(/\.[a-z0-9]+$/i, '');

const toTokens = (fileName: string): string[] => {
  return stripExtension(fileName)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((token) => token.length > 0);
};

const extractNumericHints = (tokens: string[]): number[] => {
  return tokens
    .map((token) => token.match(/\d+/g) ?? [])
    .flat()
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0 && value <= 9999);
};

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const nextOrdinalForPrefix = (existingKeys: Set<string>, prefix: string): number => {
  const pattern = new RegExp(`^${escapeRegExp(prefix)}-(\\d{1,4})(?:-[0-9]+)?$`);
  let max = 0;

  for (const key of existingKeys) {
    const matched = key.match(pattern);
    if (!matched?.[1]) {
      continue;
    }

    const parsed = Number(matched[1]);
    if (Number.isFinite(parsed) && parsed > max) {
      max = parsed;
    }
  }

  return max + 1;
};

const ensureUniqueKey = (existingKeys: Set<string>, candidate: string): string => {
  if (!existingKeys.has(candidate)) {
    return candidate;
  }

  let suffix = 2;
  while (existingKeys.has(`${candidate}-${suffix}`)) {
    suffix += 1;
  }
  return `${candidate}-${suffix}`;
};

const toTitleCase = (value: string): string => {
  return value
    .split(/\s+/)
    .map((token) => {
      if (!token) {
        return token;
      }

      if (/^\d+$/.test(token)) {
        return token;
      }

      if (token.length <= 2) {
        return token.toUpperCase();
      }

      return `${token.slice(0, 1).toUpperCase()}${token.slice(1).toLowerCase()}`;
    })
    .join(' ');
};

const computeGeneratedIdentity = (input: {
  fileName: string;
  purpose: MediaAssetFormState['purpose'];
  signSlug: string;
  periodScope: MediaAssetFormState['period_scope'];
  existingAssetKeys: Set<string>;
}): { asset_key: string; label: string } => {
  const normalizedSign = input.signSlug.trim();
  const tokens = toTokens(input.fileName);
  const numericHints = extractNumericHints(tokens);

  const useHintOrNext = (prefix: string): string => {
    const hinted = numericHints[0];
    const ordinal = hinted ?? nextOrdinalForPrefix(input.existingAssetKeys, prefix);
    return ensureUniqueKey(input.existingAssetKeys, `${prefix}-${pad2(ordinal)}`);
  };

  let assetKey = '';
  if (input.purpose === 'blog_article') {
    assetKey = useHintOrNext('blog-astro');
  } else if (input.purpose === 'daily_card') {
    assetKey = useHintOrNext('daily-card');
  } else if (input.purpose === 'horoscope_sign' && normalizedSign) {
    const normalizedPeriod = input.periodScope === 'any' ? 'daily' : input.periodScope;
    assetKey = useHintOrNext(`horoscope-${normalizedSign}-${normalizedPeriod}`);
  } else {
    assetKey = useHintOrNext('fallback-general');
  }

  const displayName = toTitleCase(
    stripExtension(input.fileName)
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  );
  const safeDisplayName = displayName || 'Asset';

  let label = `Grafika - ${safeDisplayName}`;
  if (input.purpose === 'blog_article') {
    label = `Artykul - ${safeDisplayName}`;
  } else if (input.purpose === 'daily_card') {
    label = `Karta dnia - ${safeDisplayName}`;
  } else if (input.purpose === 'horoscope_sign') {
    const normalizedPeriod = input.periodScope === 'any' ? 'daily' : input.periodScope;
    const signPart = normalizedSign ? ` ${normalizedSign}` : '';
    label = `Horoskop${signPart} ${normalizedPeriod} - ${safeDisplayName}`.replace(/\s+/g, ' ').trim();
  }

  return {
    asset_key: assetKey,
    label,
  };
};

const isRecordValue = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const getRunWorkflowId = (run: Run): number | null => {
  if (typeof run.workflow === 'number') {
    return run.workflow;
  }

  if (isRecordValue(run.workflow) && typeof run.workflow.id === 'number') {
    return run.workflow.id;
  }

  return null;
};

const getRunWorkflowName = (run: Run, workflows: Workflow[]): string => {
  if (isRecordValue(run.workflow) && typeof run.workflow.name === 'string' && run.workflow.name.trim()) {
    return run.workflow.name;
  }

  const workflowId = getRunWorkflowId(run);
  const workflow = workflows.find((item) => item.id === workflowId);
  return workflow?.name ?? (workflowId ? `Workflow #${workflowId}` : 'Unassigned');
};

const isRunStepStatus = (value: unknown): value is RunStep['status'] => {
  return value === 'pending' || value === 'running' || value === 'success' || value === 'failed';
};

const normalizeRunStep = (value: unknown, index: number): RunStep | null => {
  if (!isRecordValue(value)) {
    return null;
  }

  const id = typeof value.id === 'string' && value.id.trim() ? value.id : `step-${index + 1}`;
  const label = typeof value.label === 'string' && value.label.trim() ? value.label : `Step ${index + 1}`;
  const status = isRunStepStatus(value.status) ? value.status : 'pending';

  return {
    id,
    label,
    status,
    message: typeof value.message === 'string' ? value.message : null,
    timestamp: typeof value.timestamp === 'string' ? value.timestamp : null,
    output: value.output,
  };
};

const isTraceMessage = (value: unknown): value is LlmTrace['request']['messages'][number] => {
  return (
    isRecordValue(value) &&
    (value.role === 'system' || value.role === 'user') &&
    typeof value.content === 'string'
  );
};

const normalizeLlmTrace = (value: unknown, index: number): LlmTrace | null => {
  if (!isRecordValue(value) || !isRecordValue(value.request) || !isRecordValue(value.response)) {
    return null;
  }

  const usage = isRecordValue(value.response.usage) ? value.response.usage : {};
  const messages = Array.isArray(value.request.messages)
    ? value.request.messages.filter(isTraceMessage)
    : [];

  return {
    id: typeof value.id === 'string' && value.id.trim() ? value.id : `llm-${index + 1}`,
    label: typeof value.label === 'string' && value.label.trim() ? value.label : `LLM call ${index + 1}`,
    workflowType:
      value.workflowType === 'horoscope' || value.workflowType === 'daily_card' || value.workflowType === 'article'
        ? value.workflowType
        : undefined,
    createdAt: typeof value.createdAt === 'string' ? value.createdAt : '',
    request: {
      model: typeof value.request.model === 'string' ? value.request.model : '',
      temperature: Number(value.request.temperature ?? 0),
      maxCompletionTokens: Number(value.request.maxCompletionTokens ?? 0),
      prompt: typeof value.request.prompt === 'string' ? value.request.prompt : '',
      schemaDescription: typeof value.request.schemaDescription === 'string' ? value.request.schemaDescription : '',
      messages,
    },
    response: {
      content: typeof value.response.content === 'string' ? value.response.content : '',
      payload: value.response.payload,
      usage: {
        prompt_tokens: Number(usage.prompt_tokens ?? 0),
        completion_tokens: Number(usage.completion_tokens ?? 0),
        total_tokens: Number(usage.total_tokens ?? 0),
      },
    },
  };
};

const formatDetailValue = (value: unknown): string => {
  if (typeof value === 'undefined' || value === null || value === '') {
    return '-';
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return JSON.stringify(value, null, 2);
};

const formatDateTime = (value?: string | null): string => {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
};

const formatDuration = (startedAt: string, finishedAt?: string | null): string => {
  const start = new Date(startedAt).getTime();
  const end = finishedAt ? new Date(finishedAt).getTime() : Date.now();

  if (Number.isNaN(start) || Number.isNaN(end) || end < start) {
    return '-';
  }

  const seconds = Math.round((end - start) / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}m ${rest}s`;
};

const getRunResultSummary = (run: Run): string => {
  const details = isRecordValue(run.details) ? run.details : {};
  const parts = [
    typeof details.created === 'number' ? `created ${details.created}` : '',
    typeof details.updated === 'number' ? `updated ${details.updated}` : '',
    typeof details.skipped === 'number' ? `skipped ${details.skipped}` : '',
    run.usage_total_tokens ? `tokens ${run.usage_total_tokens}` : '',
  ].filter(Boolean);

  if (run.error_message) {
    return run.error_message;
  }

  return parts.join(' • ') || (run.status === 'running' ? 'In progress' : 'No result payload');
};

const getRunSteps = (run: Run): RunStep[] => {
  const details = isRecordValue(run.details) ? run.details : {};
  const rawSteps = Array.isArray(details.steps) ? details.steps : [];
  const steps = rawSteps
    .map((step, index) => normalizeRunStep(step, index))
    .filter((step): step is RunStep => Boolean(step));

  if (steps.length > 0) {
    return steps;
  }

  const executeStatus: RunStep['status'] =
    run.status === 'running' ? 'running' : run.status === 'success' ? 'success' : 'failed';
  const resultStatus: RunStep['status'] =
    run.status === 'running' ? 'pending' : run.status === 'success' ? 'success' : 'failed';

  return [
    {
      id: 'accepted',
      label: 'Accepted',
      status: 'success',
      timestamp: run.started_at,
      message: `${run.run_type} run created`,
    },
    {
      id: 'execute',
      label: 'Execute workflow',
      status: executeStatus,
      message: run.status === 'running' ? 'Workflow is still running' : getRunResultSummary(run),
    },
    {
      id: 'result',
      label: 'Result',
      status: resultStatus,
      timestamp: run.finished_at ?? null,
      message: getRunResultSummary(run),
    },
  ];
};

const getRunLlmTraces = (run: Run): LlmTrace[] => {
  const details = isRecordValue(run.details) ? run.details : {};
  const rawTraces = Array.isArray(details.llmTraces) ? details.llmTraces : [];

  return rawTraces
    .map((trace, index) => normalizeLlmTrace(trace, index))
    .filter((trace): trace is LlmTrace => Boolean(trace));
};

const HomePage = () => {
  const client = useFetchClient();
  const { toggleNotification } = useNotification();

  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);
  const [mediaUsage, setMediaUsage] = useState<MediaUsage[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [runFilters, setRunFilters] = useState<RunFiltersState>(initialRunFilters());
  const [expandedRunIds, setExpandedRunIds] = useState<number[]>([]);
  const [runningWorkflowIds, setRunningWorkflowIds] = useState<number[]>([]);
  const [settings, setSettings] = useState<SettingsPayload>({ timezone: 'Europe/Warsaw', locale: 'pl' });
  const [diagnostics, setDiagnostics] = useState<DiagnosticsSummary | null>(null);
  const [coverageSummary, setCoverageSummary] = useState<Record<string, unknown> | null>(null);

  const [workflowForm, setWorkflowForm] = useState<WorkflowFormState>(initialWorkflowForm());
  const [editingWorkflowId, setEditingWorkflowId] = useState<number | null>(null);
  const [workflowStep, setWorkflowStep] = useState<number>(0);

  const [topicForm, setTopicForm] = useState<TopicFormState>(initialTopicForm());
  const [mediaAssetForm, setMediaAssetForm] = useState<MediaAssetFormState>(initialMediaAssetForm());
  const [mediaFilters, setMediaFilters] = useState<MediaFiltersState>(initialMediaFilters());
  const [mediaLibrary, setMediaLibrary] = useState<MediaLibraryFile[]>([]);
  const [mediaLibraryPagination, setMediaLibraryPagination] = useState<MediaLibraryListResult['pagination']>({
    page: 1,
    pageSize: 24,
    pageCount: 1,
    total: 0,
  });
  const [mediaLibraryLoading, setMediaLibraryLoading] = useState<boolean>(false);
  const [selectedMediaFileId, setSelectedMediaFileId] = useState<number | null>(null);
  const [identityPreview, setIdentityPreview] = useState<MediaIdentityPreview | null>(null);
  const [bulkSelectedFileIds, setBulkSelectedFileIds] = useState<number[]>([]);
  const [bulkPreview, setBulkPreview] = useState<MediaBulkUpsertResult | null>(null);
  const [topicImageSearch, setTopicImageSearch] = useState<string>('');

  const [backfillStart, setBackfillStart] = useState<string>('');
  const [backfillEnd, setBackfillEnd] = useState<string>('');

  const workflowOptions = useMemo(
    () => workflows.map((workflow) => ({ value: String(workflow.id), label: `#${workflow.id} ${workflow.name}` })),
    [workflows]
  );

  const selectedTopicWorkflow = useMemo(() => {
    if (!topicForm.workflow) {
      return null;
    }
    return workflows.find((item) => String(item.id) === topicForm.workflow) ?? null;
  }, [topicForm.workflow, workflows]);

  const selectedMediaFile = useMemo(
    () => mediaLibrary.find((item) => item.id === selectedMediaFileId) ?? null,
    [mediaLibrary, selectedMediaFileId]
  );

  const generatedMediaIdentity = useMemo(() => {
    if (identityPreview && selectedMediaFile && identityPreview.fileId === selectedMediaFile.id) {
      return {
        asset_key: identityPreview.asset_key,
        label: identityPreview.label,
      };
    }

    if (!selectedMediaFile) {
      return {
        asset_key: mediaAssetForm.asset_key,
        label: mediaAssetForm.label,
      };
    }

    const purpose = mediaAssetForm.purpose;
    const signSlug =
      purpose === 'horoscope_sign'
        ? mediaAssetForm.sign_slug.trim() || selectedMediaFile.mapping?.sign_slug?.trim() || selectedMediaFile.suggestion.sign_slug || ''
        : mediaAssetForm.sign_slug.trim();
    const periodScope = mediaAssetForm.period_scope;

    const existingAssetKeys = new Set(
      mediaAssets
        .map((item) => item.asset_key)
        .filter((key): key is string => typeof key === 'string' && key.trim().length > 0)
    );
    if (selectedMediaFile.mapping?.asset_key) {
      existingAssetKeys.delete(selectedMediaFile.mapping.asset_key);
    }

    return computeGeneratedIdentity({
      fileName: selectedMediaFile.name || `file-${selectedMediaFile.id}`,
      purpose,
      signSlug,
      periodScope,
      existingAssetKeys,
    });
  }, [
    selectedMediaFile,
    identityPreview,
    mediaAssetForm.asset_key,
    mediaAssetForm.label,
    mediaAssetForm.purpose,
    mediaAssetForm.sign_slug,
    mediaAssetForm.period_scope,
    mediaAssets,
  ]);

  const topicPickerAssets = useMemo(() => {
    const search = topicImageSearch.trim().toLowerCase();
    return mediaAssets
      .filter((item) => Boolean(item.asset?.id))
      .filter((item) => item.active !== false)
      .filter((item) => {
        if (!search) {
          return true;
        }

        const haystack = `${item.asset_key} ${item.label} ${item.asset?.name ?? ''}`.toLowerCase();
        return haystack.includes(search);
      })
      .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0) || a.asset_key.localeCompare(b.asset_key))
      .slice(0, 40);
  }, [mediaAssets, topicImageSearch]);

  const signOptions = useMemo(() => {
    const values = new Set<string>();
    mediaAssets.forEach((item) => {
      if (item.sign_slug) {
        values.add(item.sign_slug);
      }
    });
    return ['all', ...Array.from(values).sort((a, b) => a.localeCompare(b))];
  }, [mediaAssets]);

  const filteredRuns = useMemo(() => {
    const workflowSearch = runFilters.workflowName.trim().toLowerCase();

    return runs.filter((run) => {
      if (runFilters.status !== 'all' && run.status !== runFilters.status) {
        return false;
      }

      const startedDay = run.started_at.slice(0, 10);
      if (runFilters.fromDate && startedDay < runFilters.fromDate) {
        return false;
      }

      if (runFilters.toDate && startedDay > runFilters.toDate) {
        return false;
      }

      if (workflowSearch) {
        const workflowName = getRunWorkflowName(run, workflows).toLowerCase();
        const workflowId = getRunWorkflowId(run);
        const searchable = `${workflowName} ${workflowId ?? ''}`;
        return searchable.includes(workflowSearch);
      }

      return true;
    });
  }, [runFilters, runs, workflows]);

  const liveRunCount = useMemo(() => runs.filter((run) => run.status === 'running').length, [runs]);
  const hasLiveActivity = liveRunCount > 0 || workflows.some((workflow) => workflow.status === 'running');

  const showSuccess = (message: string): void => {
    toggleNotification({ type: 'success', message });
  };

  const showError = (message: string): void => {
    toggleNotification({ type: 'danger', message });
  };

  const refreshMonitoringData = async (notifyOnError = false): Promise<void> => {
    try {
      const [summaryData, diagnosticsData, workflowsData, runsData] = await Promise.all([
        api.getDashboard(client),
        api.getDiagnostics(client),
        api.getWorkflows(client),
        api.getRuns(client, { limit: 200 }),
      ]);

      setSummary(summaryData);
      setDiagnostics(diagnosticsData);
      setWorkflows(workflowsData);
      setRuns(runsData);
      setRunningWorkflowIds((prev) =>
        prev.filter(
          (id) =>
            workflowsData.some((workflow) => workflow.id === id && workflow.status === 'running') ||
            runsData.some((run) => getRunWorkflowId(run) === id && run.status === 'running')
        )
      );
    } catch (error) {
      if (notifyOnError) {
        showError(`Nie udało się odświeżyć monitoringu: ${String(error)}`);
      }
    }
  };

  const loadMediaLibrary = async (nextFilters?: Partial<MediaFiltersState>): Promise<MediaLibraryListResult | null> => {
    const mergedFilters: MediaFiltersState = {
      ...mediaFilters,
      ...nextFilters,
    };

    setMediaLibraryLoading(true);
    try {
      const response = await api.getMediaLibraryFiles(client, {
        page: mergedFilters.page,
        pageSize: mergedFilters.pageSize,
        search: mergedFilters.search || undefined,
        mapped: mergedFilters.mapped,
        purpose: mergedFilters.purpose,
        sign: mergedFilters.sign === 'all' ? undefined : mergedFilters.sign,
        active: mergedFilters.active,
        sort: mergedFilters.sort,
      });

      setMediaLibrary(response.items);
      setMediaLibraryPagination(response.pagination);
      setMediaFilters((prev) => ({ ...prev, ...mergedFilters }));

      if (selectedMediaFileId && !response.items.some((item) => item.id === selectedMediaFileId)) {
        setSelectedMediaFileId(response.items[0]?.id ?? null);
      }

      return response;
    } catch (error) {
      showError(`Nie udało się pobrać Media Library: ${String(error)}`);
      return null;
    } finally {
      setMediaLibraryLoading(false);
    }
  };

  const loadAll = async (): Promise<void> => {
    setLoading(true);

    try {
      const [
        summaryData,
        diagnosticsData,
        workflowsData,
        topicsData,
        mediaAssetsData,
        mediaUsageData,
        runsData,
        settingsData,
      ] = await Promise.all([
        api.getDashboard(client),
        api.getDiagnostics(client),
        api.getWorkflows(client),
        api.getTopics(client),
        api.getMediaAssets(client),
        api.getMediaUsage(client, 120),
        api.getRuns(client, { limit: 200 }),
        api.getSettings(client),
      ]);

      setSummary(summaryData);
      setDiagnostics(diagnosticsData);
      setWorkflows(workflowsData);
      setTopics(topicsData);
      setMediaAssets(mediaAssetsData);
      setMediaUsage(mediaUsageData);
      setRuns(runsData);
      setSettings(settingsData);

      await loadMediaLibrary();
    } catch (error) {
      showError(`Nie udało się załadować danych pluginu: ${String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAll();
  }, []);

  useEffect(() => {
    if (activeTab !== 'runs' && activeTab !== 'workflows' && !hasLiveActivity && runningWorkflowIds.length === 0) {
      return undefined;
    }

    const interval = window.setInterval(() => {
      void refreshMonitoringData(false);
    }, 4000);

    return () => {
      window.clearInterval(interval);
    };
  }, [activeTab, hasLiveActivity, runningWorkflowIds.length]);

  useEffect(() => {
    if (!selectedMediaFile) {
      setIdentityPreview(null);
      return;
    }

    let canceled = false;
    void api
      .previewMediaIdentity(client, {
        fileId: selectedMediaFile.id,
        purpose: mediaAssetForm.purpose,
        sign_slug: mediaAssetForm.sign_slug.trim() || selectedMediaFile.suggestion.sign_slug,
        period_scope: mediaAssetForm.period_scope,
        excludeId: selectedMediaFile.mapping?.id ?? null,
      })
      .then((preview) => {
        if (!canceled) {
          setIdentityPreview(preview);
        }
      })
      .catch(() => {
        if (!canceled) {
          setIdentityPreview(null);
        }
      });

    return () => {
      canceled = true;
    };
  }, [
    client,
    selectedMediaFile?.id,
    selectedMediaFile?.mapping?.id,
    mediaAssetForm.purpose,
    mediaAssetForm.sign_slug,
    mediaAssetForm.period_scope,
  ]);

  const resetWorkflowForm = (): void => {
    setWorkflowForm(initialWorkflowForm());
    setEditingWorkflowId(null);
    setWorkflowStep(0);
  };

  const onPickWorkflowToEdit = (workflow: Workflow): void => {
    setEditingWorkflowId(workflow.id);
    setWorkflowStep(0);
    setWorkflowForm({
      name: workflow.name,
      enabled: workflow.enabled,
      workflow_type: workflow.workflow_type,
      generate_cron: workflow.generate_cron,
      publish_cron: workflow.publish_cron,
      timezone: workflow.timezone || 'Europe/Warsaw',
      locale: workflow.locale || 'pl',
      llm_model: workflow.llm_model,
      apiToken: '',
      prompt_template: workflow.prompt_template,
      temperature: workflow.temperature,
      max_completion_tokens: workflow.max_completion_tokens,
      retry_max: workflow.retry_max,
      retry_backoff_seconds: workflow.retry_backoff_seconds,
      daily_request_limit: workflow.daily_request_limit,
      daily_token_limit: workflow.daily_token_limit,
      allow_manual_edit: workflow.allow_manual_edit,
      auto_publish: workflow.auto_publish,
      force_regenerate: workflow.force_regenerate,
      topic_mode: workflow.topic_mode,
      horoscope_period: workflow.horoscope_period,
      horoscope_type_values: (workflow.horoscope_type_values || []).join(', '),
      all_signs: workflow.all_signs,
      article_category: workflow.article_category ? String(workflow.article_category) : '',
    });
  };

  const saveWorkflow = async (): Promise<void> => {
    if (!workflowForm.name.trim()) {
      setWorkflowStep(0);
      showError('Nazwa workflow jest wymagana.');
      return;
    }

    setSaving(true);

    const payload: Record<string, unknown> = {
      name: workflowForm.name.trim(),
      enabled: workflowForm.enabled,
      workflow_type: workflowForm.workflow_type,
      generate_cron: workflowForm.generate_cron,
      publish_cron: workflowForm.publish_cron,
      timezone: workflowForm.timezone,
      locale: workflowForm.locale,
      llm_model: workflowForm.llm_model,
      prompt_template: workflowForm.prompt_template,
      temperature: workflowForm.temperature,
      max_completion_tokens: workflowForm.max_completion_tokens,
      retry_max: workflowForm.retry_max,
      retry_backoff_seconds: workflowForm.retry_backoff_seconds,
      daily_request_limit: workflowForm.daily_request_limit,
      daily_token_limit: workflowForm.daily_token_limit,
      allow_manual_edit: workflowForm.allow_manual_edit,
      auto_publish: workflowForm.auto_publish,
      force_regenerate: workflowForm.force_regenerate,
      topic_mode: workflowForm.topic_mode,
      horoscope_period: workflowForm.horoscope_period,
      horoscope_type_values: workflowForm.horoscope_type_values
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item.length > 0),
      all_signs: workflowForm.all_signs,
      article_category: workflowForm.article_category ? Number(workflowForm.article_category) : null,
    };

    if (workflowForm.apiToken.trim()) {
      payload.apiToken = workflowForm.apiToken.trim();
    }

    try {
      if (editingWorkflowId) {
        await api.updateWorkflow(client, editingWorkflowId, payload);
        showSuccess('Workflow zaktualizowany.');
      } else {
        await api.createWorkflow(client, payload);
        showSuccess('Workflow utworzony.');
      }

      resetWorkflowForm();
      await refreshMonitoringData();
    } catch (error) {
      showError(`Nie udało się zapisać workflow: ${String(error)}`);
    } finally {
      setSaving(false);
    }
  };

  const runNow = async (workflowId: number): Promise<void> => {
    setRunningWorkflowIds((prev) => (prev.includes(workflowId) ? prev : [...prev, workflowId]));
    setWorkflows((prev) =>
      prev.map((workflow) => (workflow.id === workflowId ? { ...workflow, status: 'running', last_error: null } : workflow))
    );

    try {
      await api.runNow(client, workflowId);
      showSuccess(`Workflow #${workflowId} uruchomiony. Monitoring odświeża się w tle.`);
      window.setTimeout(() => {
        void refreshMonitoringData(false);
      }, 700);
      window.setTimeout(() => {
        void refreshMonitoringData(false);
      }, 2500);
    } catch (error) {
      showError(`Run now nie powiódł się: ${String(error)}`);
      setRunningWorkflowIds((prev) => prev.filter((id) => id !== workflowId));
      await refreshMonitoringData();
    }
  };

  const stopWorkflow = async (workflowId: number): Promise<void> => {
    setSaving(true);
    try {
      const result = await api.stopWorkflow(client, workflowId);
      setRunningWorkflowIds((prev) => prev.filter((id) => id !== workflowId));
      setWorkflows((prev) =>
        prev.map((workflow) =>
          workflow.id === workflowId ? { ...workflow, status: 'idle', last_error: 'Zatrzymano ręcznie.' } : workflow
        )
      );
      showSuccess(result.stopped === false ? `Workflow #${workflowId} nie był uruchomiony.` : `Workflow #${workflowId} zatrzymany.`);
      await refreshMonitoringData();
    } catch (error) {
      showError(`Stop workflow nie powiódł się: ${String(error)}`);
      await refreshMonitoringData();
    } finally {
      setSaving(false);
    }
  };

  const deleteWorkflow = async (workflow: Workflow): Promise<void> => {
    if (workflow.status === 'running' || runningWorkflowIds.includes(workflow.id)) {
      showError('Najpierw zatrzymaj workflow, potem usuń.');
      return;
    }

    const confirmed = window.confirm(`Usunąć workflow #${workflow.id} "${workflow.name}"? Tej operacji nie można cofnąć.`);
    if (!confirmed) {
      return;
    }

    setSaving(true);
    try {
      await api.deleteWorkflow(client, workflow.id);
      setWorkflows((prev) => prev.filter((item) => item.id !== workflow.id));
      setRunningWorkflowIds((prev) => prev.filter((id) => id !== workflow.id));
      if (editingWorkflowId === workflow.id) {
        resetWorkflowForm();
      }
      showSuccess(`Workflow #${workflow.id} usunięty.`);
      await refreshMonitoringData();
    } catch (error) {
      showError(`Nie udało się usunąć workflow: ${String(error)}`);
    } finally {
      setSaving(false);
    }
  };

  const runBackfill = async (workflowId: number, dryRun = false): Promise<void> => {
    if (!backfillStart || !backfillEnd) {
      showError('Uzupełnij daty backfill start/end.');
      return;
    }

    setSaving(true);
    try {
      await api.backfill(client, workflowId, {
        startDate: backfillStart,
        endDate: backfillEnd,
        dryRun,
      });
      showSuccess(dryRun ? 'Dry-run backfill zakończony.' : 'Backfill zakończony.');
      await loadAll();
    } catch (error) {
      showError(`Backfill nie powiódł się: ${String(error)}`);
    } finally {
      setSaving(false);
    }
  };

  const createTopic = async (): Promise<void> => {
    if (!topicForm.title.trim()) {
      showError('Tytuł tematu jest wymagany.');
      return;
    }

    if (selectedTopicWorkflow?.workflow_type === 'article' && !topicForm.image_asset_key.trim()) {
      showError('Dla workflow article wybierz obraz z Media Catalog.');
      return;
    }

    setSaving(true);

    try {
      await api.createTopic(client, {
        title: topicForm.title.trim(),
        brief: topicForm.brief.trim() || undefined,
        image_asset_key: topicForm.image_asset_key.trim() || undefined,
        workflow: topicForm.workflow ? Number(topicForm.workflow) : undefined,
        article_category: topicForm.article_category ? Number(topicForm.article_category) : undefined,
        scheduled_for: topicForm.scheduled_for || undefined,
      });

      setTopicForm(initialTopicForm());
      setTopicImageSearch('');
      showSuccess('Temat dodany do kolejki.');
      await loadAll();
    } catch (error) {
      showError(`Nie udało się dodać tematu: ${String(error)}`);
    } finally {
      setSaving(false);
    }
  };

  const retryRun = async (runId: number): Promise<void> => {
    setSaving(true);

    try {
      await api.retryRun(client, runId);
      showSuccess(`Retry run #${runId} uruchomiony.`);
      await loadAll();
    } catch (error) {
      showError(`Retry run nie powiódł się: ${String(error)}`);
    } finally {
      setSaving(false);
    }
  };

  const toggleRunDetails = (runId: number): void => {
    setExpandedRunIds((prev) => (prev.includes(runId) ? prev.filter((id) => id !== runId) : [...prev, runId]));
  };

  const saveSettings = async (): Promise<void> => {
    setSaving(true);

    try {
      await api.updateSettings(client, settings);
      showSuccess('Ustawienia zapisane.');
      await loadAll();
    } catch (error) {
      showError(`Nie udało się zapisać ustawień: ${String(error)}`);
    } finally {
      setSaving(false);
    }
  };

  const resetMediaAssetForm = (): void => {
    setMediaAssetForm(initialMediaAssetForm());
  };

  const mapAssetToForm = (item: MediaAsset): MediaAssetFormState => {
    return {
      asset_key: item.asset_key,
      label: item.label,
      purpose: item.purpose,
      sign_slug: item.sign_slug || '',
      period_scope: item.period_scope || 'any',
      keywords: Array.isArray(item.keywords) ? item.keywords.join(', ') : '',
      priority: item.priority ?? 0,
      active: item.active ?? true,
      cooldown_days: item.cooldown_days ?? 3,
      notes: item.notes || '',
    };
  };

  const mapSuggestionToForm = (item: MediaLibraryFile): MediaAssetFormState => {
    return {
      asset_key: item.suggestion.asset_key,
      label: item.suggestion.label || item.name,
      purpose: item.suggestion.purpose,
      sign_slug: item.suggestion.sign_slug || '',
      period_scope: item.suggestion.period_scope,
      keywords: (item.suggestion.keywords || []).join(', '),
      priority: 0,
      active: true,
      cooldown_days: 3,
      notes: '',
    };
  };

  const refreshMediaCatalogData = async (): Promise<void> => {
    const [mediaAssetsData, mediaUsageData] = await Promise.all([
      api.getMediaAssets(client),
      api.getMediaUsage(client, 120),
    ]);

    setMediaAssets(mediaAssetsData);
    setMediaUsage(mediaUsageData);

    const library = await loadMediaLibrary();
    if (!library || !selectedMediaFileId) {
      return;
    }

    const selected = library.items.find((item) => item.id === selectedMediaFileId);
    if (!selected) {
      return;
    }

    setMediaAssetForm(selected.mapping ? mapAssetToForm(selected.mapping) : mapSuggestionToForm(selected));
  };

  const pickMediaFile = (item: MediaLibraryFile): void => {
    setSelectedMediaFileId(item.id);
    setBulkPreview(null);
    if (item.mapping) {
      setMediaAssetForm(mapAssetToForm(item.mapping));
    } else {
      setMediaAssetForm(mapSuggestionToForm(item));
    }
  };

  const applySuggestionToForm = (): void => {
    if (!selectedMediaFile) {
      showError('Wybierz kafelek zdjęcia.');
      return;
    }

    setMediaAssetForm(mapSuggestionToForm(selectedMediaFile));
  };

  const toggleBulkSelection = (fileId: number): void => {
    setBulkSelectedFileIds((prev) => {
      if (prev.includes(fileId)) {
        return prev.filter((id) => id !== fileId);
      }
      return [...prev, fileId];
    });
  };

  const buildBulkItems = (): MediaBulkUpsertItemRequest[] => {
    const selected = mediaLibrary.filter((item) => bulkSelectedFileIds.includes(item.id));
    return selected.map((item) => ({
      fileId: item.id,
      purpose: item.suggestion.purpose,
      sign_slug: item.suggestion.sign_slug,
      period_scope: item.suggestion.period_scope,
      keywords: item.suggestion.keywords,
      priority: item.mapping?.priority ?? 0,
      active: item.mapping?.active ?? true,
      cooldown_days: item.mapping?.cooldown_days ?? 3,
      notes: item.mapping?.notes ?? null,
    }));
  };

  const previewBulkMapping = async (): Promise<void> => {
    if (bulkSelectedFileIds.length === 0) {
      showError('Zaznacz przynajmniej jeden kafelek.');
      return;
    }

    setSaving(true);
    try {
      const result = await api.bulkUpsertMediaAssets(client, {
        items: buildBulkItems(),
        dryRun: true,
        apply: false,
      });
      setBulkPreview(result);
      showSuccess('Podgląd zmian bulk gotowy.');
    } catch (error) {
      showError(`Podgląd bulk nie powiódł się: ${String(error)}`);
    } finally {
      setSaving(false);
    }
  };

  const applyBulkMapping = async (): Promise<void> => {
    if (bulkSelectedFileIds.length === 0) {
      showError('Zaznacz przynajmniej jeden kafelek.');
      return;
    }

    setSaving(true);
    try {
      const result = await api.bulkUpsertMediaAssets(client, {
        items: buildBulkItems(),
        dryRun: false,
        apply: true,
      });
      setBulkPreview(result);
      showSuccess('Bulk mapowanie zapisane.');
      await refreshMediaCatalogData();
    } catch (error) {
      showError(`Bulk mapowanie nie powiodło się: ${String(error)}`);
    } finally {
      setSaving(false);
    }
  };

  const saveMediaAsset = async (): Promise<void> => {
    if (!selectedMediaFile) {
      showError('Wybierz zdjęcie z kafelka.');
      return;
    }

    const existingMappingId = selectedMediaFile.mapping?.id ?? null;

    setSaving(true);

    const payload: Record<string, unknown> = {
      purpose: mediaAssetForm.purpose,
      sign_slug: mediaAssetForm.sign_slug.trim() || null,
      period_scope: mediaAssetForm.period_scope,
      keywords: mediaAssetForm.keywords
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item.length > 0),
      priority: Number(mediaAssetForm.priority) || 0,
      active: mediaAssetForm.active,
      cooldown_days: Number(mediaAssetForm.cooldown_days) || 3,
      asset: selectedMediaFile.id,
      mapping_source: 'manual',
      mapping_confidence: selectedMediaFile.suggestion.confidence,
      mapping_reasons: selectedMediaFile.suggestion.reasons,
      notes: mediaAssetForm.notes.trim() || null,
    };

    try {
      if (existingMappingId) {
        await api.updateMediaAsset(client, existingMappingId, payload);
        showSuccess('Media asset zaktualizowany.');
      } else {
        await api.createMediaAsset(client, payload);
        showSuccess('Media asset utworzony.');
      }

      await refreshMediaCatalogData();
    } catch (error) {
      showError(`Nie udało się zapisać media asset: ${String(error)}`);
    } finally {
      setSaving(false);
    }
  };

  const goToMediaPage = async (page: number): Promise<void> => {
    await loadMediaLibrary({ page });
  };

  const refreshMediaGrid = async (): Promise<void> => {
    await loadMediaLibrary({ page: 1 });
  };

  const validateCoverage = async (applyWorkflowDisabling = false): Promise<void> => {
    if (applyWorkflowDisabling) {
      const confirmed = window.confirm(
        'To może wyłączyć workflow bez kompletnego pokrycia mediów. Kontynuować?'
      );

      if (!confirmed) {
        return;
      }
    }

    setSaving(true);
    try {
      const result = await api.validateMediaCoverage(client, { applyWorkflowDisabling });
      setCoverageSummary(result);
      showSuccess('Walidacja pokrycia mediów zakończona.');
      await loadAll();
    } catch (error) {
      showError(`Walidacja pokrycia nie powiodła się: ${String(error)}`);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!selectedMediaFile && mediaLibrary[0]) {
      pickMediaFile(mediaLibrary[0]);
    }
  }, [mediaLibrary]);

  if (loading) {
    return <Page.Loading />;
  }

  return (
    <Page.Main>
      <div
        style={{
          padding: 24,
          display: 'grid',
          gap: 18,
          background: 'linear-gradient(180deg, #f9f8ff 0%, #f5f8ff 100%)',
        }}
      >
      <Page.Title>AI Content Orchestrator</Page.Title>

      <section style={{ ...CARD_STYLE, paddingBottom: 10 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {(
            [
              ['dashboard', 'Dashboard'],
              ['workflows', 'Workflows'],
              ['topics', 'Topic Queue'],
              ['media', 'Media Catalog'],
              ['runs', 'Monitoring'],
              ['settings', 'Settings'],
            ] as Array<[TabKey, string]>
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              style={{
                border: '1px solid #d0d0db',
                background: activeTab === key ? '#2b5bd7' : '#fff',
                color: activeTab === key ? '#fff' : '#1f1f29',
                borderRadius: 8,
                padding: '8px 12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              void loadAll();
            }}
            style={{
              border: '1px solid #d0d0db',
              background: '#fff',
              color: '#1f1f29',
              borderRadius: 8,
              padding: '8px 12px',
              fontWeight: 600,
              cursor: 'pointer',
              marginLeft: 'auto',
            }}
          >
            Refresh
          </button>
        </div>
      </section>

      {activeTab === 'dashboard' && (
        <section style={CARD_STYLE}>
          <h2 style={SECTION_TITLE_STYLE}>Status systemu</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            <StatTile label="Workflow total" value={summary?.workflows.total ?? 0} />
            <StatTile label="Workflow enabled" value={summary?.workflows.enabled ?? 0} />
            <StatTile label="Workflow failed" value={summary?.workflows.failed ?? 0} />
            <StatTile label="Topics pending" value={summary?.topics.pending ?? 0} />
            <StatTile label="Runs failed" value={summary?.runs.failed ?? 0} />
            <StatTile label="Tickets scheduled" value={summary?.publications.scheduled ?? 0} />
          </div>
          <div
            style={{
              marginTop: 14,
              border: diagnostics?.ok ? '1px solid #b9e6ca' : '1px solid #ffd4a8',
              background: diagnostics?.ok ? '#f1fbf5' : '#fff8ef',
              borderRadius: 8,
              padding: 12,
            }}
          >
            <strong style={{ fontSize: 13 }}>
              Diagnostyka: {diagnostics?.ok ? 'gotowe do pracy' : 'wymaga uwagi'}
            </strong>
            <div style={{ fontSize: 12, color: '#4f4f60', marginTop: 6 }}>
              Media linked active: {diagnostics?.media.linkedActive ?? 0}/{diagnostics?.media.total ?? 0} • unassigned topics:{' '}
              {diagnostics?.topics.unassignedPending ?? 0}
            </div>
            {diagnostics?.workflows.issues.length ? (
              <ul style={{ margin: '8px 0 0', paddingLeft: 18, fontSize: 12 }}>
                {diagnostics.workflows.issues.slice(0, 8).map((issue) => (
                  <li key={`${issue.workflowId}-${issue.message}`}>
                    #{issue.workflowId} {issue.name}: {issue.message}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </section>
      )}

      {activeTab === 'workflows' && (
        <section style={CARD_STYLE}>
          <h2 style={SECTION_TITLE_STYLE}>Workflows</h2>

          <div style={{ overflowX: 'auto', marginBottom: 16 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
              <thead>
                <tr>
                  <Th>ID</Th>
                  <Th>Name</Th>
                  <Th>Type</Th>
                  <Th>Status</Th>
                  <Th>Enabled</Th>
                  <Th>Generate</Th>
                  <Th>Publish</Th>
                  <Th>Last error</Th>
                  <Th>Actions</Th>
                </tr>
              </thead>
              <tbody>
                {workflows.map((workflow) => (
                  <tr key={workflow.id}>
                    <Td>{workflow.id}</Td>
                    <Td>{workflow.name}</Td>
                    <Td>{workflow.workflow_type}</Td>
                    <Td>
                      <StatusPill status={workflow.status} />
                    </Td>
                    <Td>{workflow.enabled ? 'yes' : 'no'}</Td>
                    <Td>{workflow.generate_cron}</Td>
                    <Td>{workflow.publish_cron}</Td>
                    <Td>{workflow.last_error || '-'}</Td>
                    <Td>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <ActionButton
                          label="Edit"
                          onClick={() => onPickWorkflowToEdit(workflow)}
                          disabled={saving}
                        />
                        <ActionButton
                          label={runningWorkflowIds.includes(workflow.id) || workflow.status === 'running' ? 'Running' : 'Run now'}
                          onClick={() => {
                            void runNow(workflow.id);
                          }}
                          disabled={saving || runningWorkflowIds.includes(workflow.id) || workflow.status === 'running'}
                        />
                        <ActionButton
                          label="Stop"
                          onClick={() => {
                            void stopWorkflow(workflow.id);
                          }}
                          disabled={saving || (!runningWorkflowIds.includes(workflow.id) && workflow.status !== 'running')}
                          tone="danger"
                        />
                        <ActionButton
                          label="Logs"
                          onClick={() => {
                            setRunFilters((prev) => ({ ...prev, workflowName: workflow.name }));
                            setActiveTab('runs');
                          }}
                          disabled={saving}
                        />
                        <ActionButton
                          label="Backfill"
                          onClick={() => {
                            void runBackfill(workflow.id, false);
                          }}
                          disabled={saving}
                        />
                        <ActionButton
                          label="Dry run"
                          onClick={() => {
                            void runBackfill(workflow.id, true);
                          }}
                          disabled={saving}
                        />
                        <ActionButton
                          label="Delete"
                          onClick={() => {
                            void deleteWorkflow(workflow);
                          }}
                          disabled={saving || runningWorkflowIds.includes(workflow.id) || workflow.status === 'running'}
                          tone="danger"
                        />
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div
            style={{
              display: 'flex',
              gap: 8,
              alignItems: 'center',
              flexWrap: 'wrap',
              padding: 12,
              border: '1px solid #e5e5ef',
              borderRadius: 8,
              background: '#fbfcff',
              marginBottom: 16,
            }}
          >
            <Field label="Backfill start">
              <input
                type="date"
                value={backfillStart}
                onChange={(event) => setBackfillStart(event.target.value)}
                style={inputStyle}
              />
            </Field>
            <Field label="Backfill end">
              <input
                type="date"
                value={backfillEnd}
                onChange={(event) => setBackfillEnd(event.target.value)}
                style={inputStyle}
              />
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            <div style={{ display: 'grid', gap: 8, alignContent: 'start' }}>
              {WORKFLOW_STEP_LABELS.map((label, index) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setWorkflowStep(index)}
                  style={{
                    border: workflowStep === index ? '1px solid #2350c4' : '1px solid #d9dce8',
                    background: workflowStep === index ? '#edf3ff' : '#fff',
                    color: workflowStep === index ? '#123e9c' : '#33364a',
                    borderRadius: 8,
                    padding: '10px 12px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontWeight: 700,
                  }}
                >
                  {index + 1}. {label}
                </button>
              ))}
            </div>

            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0, fontSize: 16 }}>
                  {editingWorkflowId ? `Edit workflow #${editingWorkflowId}` : 'Create workflow'}
                </h3>
                <StatusPill status={workflowForm.enabled ? 'enabled' : 'disabled'} />
              </div>

              {workflowStep === 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                  <Field label="Name">
                    <input
                      style={inputStyle}
                      value={workflowForm.name}
                      onChange={(event) => setWorkflowForm((prev) => ({ ...prev, name: event.target.value }))}
                    />
                  </Field>
                  <Field label="Type">
                    <select
                      style={inputStyle}
                      value={workflowForm.workflow_type}
                      onChange={(event) =>
                        setWorkflowForm((prev) => ({
                          ...prev,
                          workflow_type: event.target.value as WorkflowFormState['workflow_type'],
                        }))
                      }
                    >
                      <option value="horoscope">horoscope</option>
                      <option value="daily_card">daily_card</option>
                      <option value="article">article</option>
                    </select>
                  </Field>
                  <Field label="Timezone">
                    <input
                      style={inputStyle}
                      value={workflowForm.timezone}
                      onChange={(event) => setWorkflowForm((prev) => ({ ...prev, timezone: event.target.value }))}
                    />
                  </Field>
                  <Field label="Locale">
                    <input
                      style={inputStyle}
                      value={workflowForm.locale}
                      onChange={(event) => setWorkflowForm((prev) => ({ ...prev, locale: event.target.value }))}
                    />
                  </Field>
                  <Field label="Topic mode">
                    <select
                      style={inputStyle}
                      value={workflowForm.topic_mode}
                      onChange={(event) =>
                        setWorkflowForm((prev) => ({
                          ...prev,
                          topic_mode: event.target.value as WorkflowFormState['topic_mode'],
                        }))
                      }
                    >
                      <option value="mixed">mixed</option>
                      <option value="manual">manual</option>
                    </select>
                  </Field>
                  <label style={{ ...checkboxRowStyle, alignSelf: 'end', minHeight: 38 }}>
                    <input
                      type="checkbox"
                      checked={workflowForm.enabled}
                      onChange={(event) => setWorkflowForm((prev) => ({ ...prev, enabled: event.target.checked }))}
                    />
                    enabled
                  </label>
                </div>
              )}

              {workflowStep === 1 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
                  <Field label="Generate cron">
                    <input
                      style={inputStyle}
                      value={workflowForm.generate_cron}
                      onChange={(event) => setWorkflowForm((prev) => ({ ...prev, generate_cron: event.target.value }))}
                    />
                  </Field>
                  <Field label="Publish cron">
                    <input
                      style={inputStyle}
                      value={workflowForm.publish_cron}
                      onChange={(event) => setWorkflowForm((prev) => ({ ...prev, publish_cron: event.target.value }))}
                    />
                  </Field>
                </div>
              )}

              {workflowStep === 2 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
                  <Field label="Model">
                    <input
                      style={inputStyle}
                      value={workflowForm.llm_model}
                      onChange={(event) => setWorkflowForm((prev) => ({ ...prev, llm_model: event.target.value }))}
                    />
                  </Field>
                  <Field label={editingWorkflowId ? 'New API token (optional)' : 'API token'}>
                    <input
                      type="password"
                      style={inputStyle}
                      value={workflowForm.apiToken}
                      onChange={(event) => setWorkflowForm((prev) => ({ ...prev, apiToken: event.target.value }))}
                    />
                  </Field>
                  {workflowForm.workflow_type === 'horoscope' ? (
                    <>
                      <Field label="Horoscope period">
                        <select
                          style={inputStyle}
                          value={workflowForm.horoscope_period}
                          onChange={(event) =>
                            setWorkflowForm((prev) => ({
                              ...prev,
                              horoscope_period: event.target.value as WorkflowFormState['horoscope_period'],
                            }))
                          }
                        >
                          <option value="Dzienny">Dzienny</option>
                          <option value="Tygodniowy">Tygodniowy</option>
                          <option value="Miesięczny">Miesięczny</option>
                        </select>
                      </Field>
                      <Field label="Horoscope types">
                        <input
                          style={inputStyle}
                          value={workflowForm.horoscope_type_values}
                          onChange={(event) =>
                            setWorkflowForm((prev) => ({ ...prev, horoscope_type_values: event.target.value }))
                          }
                        />
                      </Field>
                    </>
                  ) : null}
                  {workflowForm.workflow_type === 'article' ? (
                    <Field label="Article category ID">
                      <input
                        style={inputStyle}
                        value={workflowForm.article_category}
                        onChange={(event) =>
                          setWorkflowForm((prev) => ({ ...prev, article_category: event.target.value }))
                        }
                      />
                    </Field>
                  ) : null}
                  <div style={{ gridColumn: '1 / -1' }}>
                    <Field label="Prompt template">
                      <textarea
                        style={{ ...inputStyle, minHeight: 160 }}
                        value={workflowForm.prompt_template}
                        onChange={(event) =>
                          setWorkflowForm((prev) => ({ ...prev, prompt_template: event.target.value }))
                        }
                      />
                    </Field>
                  </div>
                </div>
              )}

              {workflowStep === 3 && (
                <div style={{ display: 'grid', gap: 12 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>
                    <Field label="Temperature">
                      <input
                        type="number"
                        style={inputStyle}
                        value={workflowForm.temperature}
                        onChange={(event) =>
                          setWorkflowForm((prev) => ({ ...prev, temperature: Number(event.target.value) }))
                        }
                      />
                    </Field>
                    <Field label="Max completion tokens">
                      <input
                        type="number"
                        style={inputStyle}
                        value={workflowForm.max_completion_tokens}
                        onChange={(event) =>
                          setWorkflowForm((prev) => ({ ...prev, max_completion_tokens: Number(event.target.value) }))
                        }
                      />
                    </Field>
                    <Field label="Retry max">
                      <input
                        type="number"
                        style={inputStyle}
                        value={workflowForm.retry_max}
                        onChange={(event) =>
                          setWorkflowForm((prev) => ({ ...prev, retry_max: Number(event.target.value) }))
                        }
                      />
                    </Field>
                    <Field label="Retry backoff (sec)">
                      <input
                        type="number"
                        style={inputStyle}
                        value={workflowForm.retry_backoff_seconds}
                        onChange={(event) =>
                          setWorkflowForm((prev) => ({ ...prev, retry_backoff_seconds: Number(event.target.value) }))
                        }
                      />
                    </Field>
                    <Field label="Daily request limit">
                      <input
                        type="number"
                        style={inputStyle}
                        value={workflowForm.daily_request_limit}
                        onChange={(event) =>
                          setWorkflowForm((prev) => ({ ...prev, daily_request_limit: Number(event.target.value) }))
                        }
                      />
                    </Field>
                    <Field label="Daily token limit">
                      <input
                        type="number"
                        style={inputStyle}
                        value={workflowForm.daily_token_limit}
                        onChange={(event) =>
                          setWorkflowForm((prev) => ({ ...prev, daily_token_limit: Number(event.target.value) }))
                        }
                      />
                    </Field>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 8 }}>
                    <label style={checkboxRowStyle}>
                      <input
                        type="checkbox"
                        checked={workflowForm.auto_publish}
                        onChange={(event) => setWorkflowForm((prev) => ({ ...prev, auto_publish: event.target.checked }))}
                      />
                      auto publish
                    </label>
                    <label style={checkboxRowStyle}>
                      <input
                        type="checkbox"
                        checked={workflowForm.force_regenerate}
                        onChange={(event) =>
                          setWorkflowForm((prev) => ({ ...prev, force_regenerate: event.target.checked }))
                        }
                      />
                      force regenerate live
                    </label>
                    <label style={checkboxRowStyle}>
                      <input
                        type="checkbox"
                        checked={workflowForm.allow_manual_edit}
                        onChange={(event) =>
                          setWorkflowForm((prev) => ({ ...prev, allow_manual_edit: event.target.checked }))
                        }
                      />
                      allow manual edit
                    </label>
                    <label style={checkboxRowStyle}>
                      <input
                        type="checkbox"
                        checked={workflowForm.all_signs}
                        onChange={(event) => setWorkflowForm((prev) => ({ ...prev, all_signs: event.target.checked }))}
                      />
                      all zodiac signs
                    </label>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  disabled={workflowStep === 0 || saving}
                  style={secondaryButtonStyle}
                  onClick={() => setWorkflowStep((prev) => Math.max(0, prev - 1))}
                >
                  Previous
                </button>
                {workflowStep < WORKFLOW_STEP_LABELS.length - 1 ? (
                  <button
                    type="button"
                    disabled={saving}
                    style={primaryButtonStyle}
                    onClick={() => setWorkflowStep((prev) => Math.min(WORKFLOW_STEP_LABELS.length - 1, prev + 1))}
                  >
                    Next
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      void saveWorkflow();
                    }}
                    disabled={saving}
                    style={primaryButtonStyle}
                  >
                    {editingWorkflowId ? 'Update workflow' : 'Create workflow'}
                  </button>
                )}
                <button type="button" onClick={resetWorkflowForm} disabled={saving} style={secondaryButtonStyle}>
                  Reset
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {activeTab === 'topics' && (
        <section style={CARD_STYLE}>
          <h2 style={SECTION_TITLE_STYLE}>Topic Queue</h2>

          <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
            <Field label="Title">
              <input
                style={inputStyle}
                value={topicForm.title}
                onChange={(event) => setTopicForm((prev) => ({ ...prev, title: event.target.value }))}
              />
            </Field>
            <Field label="Brief">
              <input
                style={inputStyle}
                value={topicForm.brief}
                onChange={(event) => setTopicForm((prev) => ({ ...prev, brief: event.target.value }))}
              />
            </Field>
            <Field label="Workflow ID">
              <input
                style={inputStyle}
                value={topicForm.workflow}
                onChange={(event) => setTopicForm((prev) => ({ ...prev, workflow: event.target.value }))}
                list="aico-workflow-list"
              />
              <datalist id="aico-workflow-list">
                {workflowOptions.map((option) => (
                  <option key={option.value} value={option.value} label={option.label} />
                ))}
              </datalist>
            </Field>
            <Field label="Article category ID">
              <input
                style={inputStyle}
                value={topicForm.article_category}
                onChange={(event) => setTopicForm((prev) => ({ ...prev, article_category: event.target.value }))}
              />
            </Field>
            <Field label="Scheduled for (ISO datetime)">
              <input
                style={inputStyle}
                value={topicForm.scheduled_for}
                onChange={(event) => setTopicForm((prev) => ({ ...prev, scheduled_for: event.target.value }))}
                placeholder="2026-04-29T08:00:00.000Z"
              />
            </Field>
            <Field label="Image asset key (required for article workflow)">
              <div style={{ display: 'grid', gap: 8 }}>
                <input
                  style={inputStyle}
                  value={topicImageSearch}
                  onChange={(event) => setTopicImageSearch(event.target.value)}
                  placeholder="Szukaj po asset_key / label / nazwie pliku"
                />
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, color: '#6b6b7d' }}>
                    Wybrany klucz: <strong>{topicForm.image_asset_key || '-'}</strong>
                  </span>
                  {topicForm.image_asset_key ? (
                    <button
                      type="button"
                      style={secondaryButtonStyle}
                      onClick={() => setTopicForm((prev) => ({ ...prev, image_asset_key: '' }))}
                    >
                      Wyczyść wybór
                    </button>
                  ) : null}
                </div>
                <div
                  style={{
                    border: '1px solid #e5e5f0',
                    borderRadius: 8,
                    padding: 8,
                    maxHeight: 220,
                    overflowY: 'auto',
                    background: '#fcfcff',
                    display: 'grid',
                    gap: 6,
                  }}
                >
                  {topicPickerAssets.length === 0 ? (
                    <span style={{ fontSize: 12, color: '#6b6b7d' }}>
                      Brak wyników. Dodaj mapowania w Media Catalog.
                    </span>
                  ) : (
                    topicPickerAssets.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        style={{
                          border: topicForm.image_asset_key === item.asset_key ? '1px solid #2350c4' : '1px solid #d8d8e5',
                          borderRadius: 8,
                          padding: 6,
                          background: topicForm.image_asset_key === item.asset_key ? '#eef3ff' : '#fff',
                          textAlign: 'left',
                          display: 'grid',
                          gap: 4,
                          cursor: 'pointer',
                        }}
                        onClick={() => {
                          setTopicForm((prev) => ({ ...prev, image_asset_key: item.asset_key }));
                        }}
                      >
                        {item.asset?.url ? (
                          <img
                            src={item.asset.url}
                            alt={item.label}
                            style={{ width: '100%', height: 56, objectFit: 'cover', borderRadius: 6, background: '#f4f4fa' }}
                          />
                        ) : null}
                        <strong style={{ fontSize: 12 }}>{item.asset_key}</strong>
                        <span style={{ fontSize: 11, color: '#666' }}>{item.label}</span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </Field>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button
              type="button"
              disabled={saving}
              style={primaryButtonStyle}
              onClick={() => {
                void createTopic();
              }}
            >
              Add topic
            </button>
            <span style={{ fontSize: 12, color: '#666', alignSelf: 'center' }}>
              Typ workflow: {selectedTopicWorkflow?.workflow_type ?? '-'}
            </span>
          </div>

          <div style={{ marginTop: 16, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 780 }}>
              <thead>
                <tr>
                  <Th>ID</Th>
                  <Th>Title</Th>
                  <Th>Status</Th>
                  <Th>Workflow</Th>
                  <Th>Image key</Th>
                  <Th>Scheduled</Th>
                  <Th>Error</Th>
                </tr>
              </thead>
              <tbody>
                {topics.map((topic) => (
                  <tr key={topic.id}>
                    <Td>{topic.id}</Td>
                    <Td>{topic.title}</Td>
                    <Td>{topic.status}</Td>
                    <Td>{topic.workflow ?? '-'}</Td>
                    <Td>{topic.image_asset_key ?? '-'}</Td>
                    <Td>{topic.scheduled_for ?? '-'}</Td>
                    <Td>{topic.error_message ?? '-'}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeTab === 'media' && (
        <section style={CARD_STYLE}>
          <h2 style={SECTION_TITLE_STYLE}>Media Catalog</h2>

          <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              disabled={saving}
              style={secondaryButtonStyle}
              onClick={() => {
                void validateCoverage(false);
              }}
            >
              Validate coverage
            </button>
            <button
              type="button"
              disabled={saving}
              style={secondaryButtonStyle}
              onClick={() => {
                void validateCoverage(true);
              }}
            >
              Validate + disable workflows
            </button>
            <button
              type="button"
              disabled={mediaLibraryLoading}
              style={secondaryButtonStyle}
              onClick={() => {
                void refreshMediaGrid();
              }}
            >
              Refresh grid
            </button>
          </div>

          {coverageSummary ? (
            <pre
              style={{
                background: '#f6f6fc',
                border: '1px solid #e3e3ef',
                padding: 10,
                borderRadius: 8,
                fontSize: 12,
                overflowX: 'auto',
                marginBottom: 16,
              }}
            >
              {JSON.stringify(coverageSummary, null, 2)}
            </pre>
          ) : null}

          <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', marginBottom: 12 }}>
            <Field label="Search">
              <input
                style={inputStyle}
                value={mediaFilters.search}
                onChange={(event) =>
                  setMediaFilters((prev) => ({ ...prev, search: event.target.value }))
                }
                placeholder="name / key / label"
              />
            </Field>
            <Field label="Mapped">
              <select
                style={inputStyle}
                value={mediaFilters.mapped}
                onChange={(event) =>
                  setMediaFilters((prev) => ({
                    ...prev,
                    mapped: event.target.value as MediaFiltersState['mapped'],
                  }))
                }
              >
                <option value="all">all</option>
                <option value="mapped">mapped</option>
                <option value="unmapped">unmapped</option>
              </select>
            </Field>
            <Field label="Purpose">
              <select
                style={inputStyle}
                value={mediaFilters.purpose}
                onChange={(event) =>
                  setMediaFilters((prev) => ({
                    ...prev,
                    purpose: event.target.value as MediaFiltersState['purpose'],
                  }))
                }
              >
                <option value="all">all</option>
                <option value="blog_article">blog_article</option>
                <option value="daily_card">daily_card</option>
                <option value="horoscope_sign">horoscope_sign</option>
                <option value="fallback_general">fallback_general</option>
              </select>
            </Field>
            <Field label="Sign">
              <select
                style={inputStyle}
                value={mediaFilters.sign}
                onChange={(event) => setMediaFilters((prev) => ({ ...prev, sign: event.target.value }))}
              >
                {signOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Active">
              <select
                style={inputStyle}
                value={mediaFilters.active}
                onChange={(event) =>
                  setMediaFilters((prev) => ({
                    ...prev,
                    active: event.target.value as MediaFiltersState['active'],
                  }))
                }
              >
                <option value="all">all</option>
                <option value="active">active</option>
                <option value="inactive">inactive</option>
              </select>
            </Field>
            <Field label="Sort">
              <select
                style={inputStyle}
                onChange={(event) =>
                  setMediaFilters((prev) => ({ ...prev, sort: event.target.value as MediaFiltersState['sort'] }))
                }
                value={mediaFilters.sort}
              >
                <option value="createdAtDesc">createdAt desc</option>
                <option value="createdAtAsc">createdAt asc</option>
                <option value="nameAsc">name asc</option>
                <option value="nameDesc">name desc</option>
              </select>
            </Field>
            <div style={{ display: 'flex', alignItems: 'end' }}>
              <button
                type="button"
                style={primaryButtonStyle}
                onClick={() => {
                  void loadMediaLibrary({ page: 1 });
                }}
                disabled={mediaLibraryLoading}
              >
                Zastosuj filtry
              </button>
            </div>
          </div>

          {mediaLibrary.length === 0 && !mediaLibraryLoading ? (
            <div
              style={{
                border: '1px dashed #cfd3e6',
                borderRadius: 10,
                padding: 16,
                background: '#fafbff',
                marginBottom: 14,
              }}
            >
              <strong>Brak plików w Media Library.</strong>
              <p style={{ marginTop: 8, marginBottom: 8, fontSize: 13, color: '#4a4a5f' }}>
                1) Dodaj obrazy w panelu Upload. 2) Wróć tutaj i kliknij Refresh grid. 3) Kliknij kafelek i zapisz mapowanie.
              </p>
              <a href="/admin/plugins/upload" style={{ fontSize: 13 }}>
                Otwórz Media Library
              </a>
            </div>
          ) : null}

          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 12 }}>
            <div style={{ border: '1px solid #e6e6f1', borderRadius: 10, padding: 10, minHeight: 460 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
                <strong style={{ fontSize: 13 }}>
                  Kafelki ({mediaLibraryPagination.total})
                </strong>
                <span style={{ fontSize: 12, color: '#666' }}>
                  Bulk zaznaczonych: {bulkSelectedFileIds.length}
                </span>
              </div>
              {mediaLibraryLoading ? (
                <span style={{ fontSize: 12, color: '#666' }}>Ładowanie...</span>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                    gap: 10,
                  }}
                >
                  {mediaLibrary.map((item) => {
                    const isSelected = selectedMediaFileId === item.id;
                    const isBulkSelected = bulkSelectedFileIds.includes(item.id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => pickMediaFile(item)}
                        style={{
                          border: isSelected ? '2px solid #2b5bd7' : '1px solid #d8d8e5',
                          borderRadius: 10,
                          padding: 8,
                          background: '#fff',
                          textAlign: 'left',
                          cursor: 'pointer',
                          display: 'grid',
                          gap: 6,
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <input
                            type="checkbox"
                            checked={isBulkSelected}
                            onChange={(event) => {
                              event.stopPropagation();
                              toggleBulkSelection(item.id);
                            }}
                          />
                          <span
                            style={{
                              fontSize: 11,
                              color: item.mapping ? '#0f7337' : '#8c5a00',
                              background: item.mapping ? '#e8f7ef' : '#fff6e6',
                              borderRadius: 99,
                              padding: '2px 6px',
                            }}
                          >
                            {item.mapping ? 'mapped' : 'unmapped'}
                          </span>
                        </div>
                        {item.url ? (
                          <img
                            src={item.url}
                            alt={item.name}
                            style={{ width: '100%', height: 90, objectFit: 'cover', borderRadius: 8, background: '#f4f4fa' }}
                          />
                        ) : (
                          <div style={{ width: '100%', height: 90, borderRadius: 8, background: '#f4f4fa' }} />
                        )}
                        <strong style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.name}
                        </strong>
                        <span style={{ fontSize: 11, color: '#555' }}>
                          {item.mapping?.asset_key ?? item.suggestion.asset_key}
                        </span>
                        <span style={{ fontSize: 11, color: '#555' }}>
                          {(item.mapping?.purpose ?? item.suggestion.purpose) + (item.mapping?.sign_slug ? ` / ${item.mapping.sign_slug}` : '')}
                        </span>
                        <span style={{ fontSize: 11, color: '#777' }}>
                          {item.mapping?.mapping_source ?? 'suggestion'} • conf {item.mapping?.mapping_confidence ?? item.suggestion.confidence}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  style={secondaryButtonStyle}
                  disabled={mediaLibraryPagination.page <= 1 || mediaLibraryLoading}
                  onClick={() => {
                    void goToMediaPage(mediaLibraryPagination.page - 1);
                  }}
                >
                  Previous
                </button>
                <button
                  type="button"
                  style={secondaryButtonStyle}
                  disabled={mediaLibraryPagination.page >= mediaLibraryPagination.pageCount || mediaLibraryLoading}
                  onClick={() => {
                    void goToMediaPage(mediaLibraryPagination.page + 1);
                  }}
                >
                  Next
                </button>
                <span style={{ fontSize: 12, color: '#666' }}>
                  Page {mediaLibraryPagination.page} / {mediaLibraryPagination.pageCount}
                </span>
              </div>
            </div>

            <div style={{ border: '1px solid #e6e6f1', borderRadius: 10, padding: 10, minHeight: 460 }}>
              <strong style={{ fontSize: 13 }}>Szczegóły i mapowanie</strong>
              {selectedMediaFile ? (
                <div style={{ display: 'grid', gap: 10, marginTop: 10 }}>
                  <div style={{ fontSize: 12, color: '#666' }}>
                    Plik #{selectedMediaFile.id} • {selectedMediaFile.name}
                  </div>
                  <div style={{ fontSize: 12, color: '#666' }}>
                    URL: {selectedMediaFile.url || '-'}
                  </div>
                  <div style={{ display: 'grid', gap: 8, gridTemplateColumns: '1fr 1fr' }}>
                    <Field label="Asset key">
                      <input
                        style={inputStyle}
                        value={generatedMediaIdentity.asset_key}
                        readOnly
                      />
                    </Field>
                    <Field label="Label">
                      <input
                        style={inputStyle}
                        value={generatedMediaIdentity.label}
                        readOnly
                      />
                    </Field>
                    <div style={{ gridColumn: '1 / -1', fontSize: 11, color: '#666' }}>
                      asset_key i label sa generowane przez backend z nazwy pliku oraz purpose.
                    </div>
                    <Field label="Purpose">
                      <select
                        style={inputStyle}
                        value={mediaAssetForm.purpose}
                        onChange={(event) => {
                          const purpose = event.target.value as MediaAssetFormState['purpose'];
                          const fallbackSign =
                            purpose === 'horoscope_sign'
                              ? mediaAssetForm.sign_slug.trim() ||
                                selectedMediaFile.mapping?.sign_slug?.trim() ||
                                selectedMediaFile.suggestion.sign_slug ||
                                ''
                              : mediaAssetForm.sign_slug;
                          setMediaAssetForm((prev) => ({ ...prev, purpose, sign_slug: fallbackSign }));
                        }}
                      >
                        <option value="blog_article">blog_article</option>
                        <option value="daily_card">daily_card</option>
                        <option value="horoscope_sign">horoscope_sign</option>
                        <option value="fallback_general">fallback_general</option>
                      </select>
                    </Field>
                    <Field label="Sign slug">
                      <input
                        style={inputStyle}
                        value={mediaAssetForm.sign_slug}
                        onChange={(event) => {
                          const sign_slug = event.target.value;
                          setMediaAssetForm((prev) => ({ ...prev, sign_slug }));
                        }}
                      />
                    </Field>
                    <Field label="Period scope">
                      <select
                        style={inputStyle}
                        value={mediaAssetForm.period_scope}
                        onChange={(event) => {
                          const period_scope = event.target.value as MediaAssetFormState['period_scope'];
                          setMediaAssetForm((prev) => ({ ...prev, period_scope }));
                        }}
                      >
                        <option value="any">any</option>
                        <option value="daily">daily</option>
                        <option value="weekly">weekly</option>
                        <option value="monthly">monthly</option>
                      </select>
                    </Field>
                    <Field label="Keywords">
                      <input
                        style={inputStyle}
                        value={mediaAssetForm.keywords}
                        onChange={(event) =>
                          setMediaAssetForm((prev) => ({ ...prev, keywords: event.target.value }))
                        }
                      />
                    </Field>
                    <Field label="Priority">
                      <input
                        type="number"
                        style={inputStyle}
                        value={mediaAssetForm.priority}
                        onChange={(event) =>
                          setMediaAssetForm((prev) => ({ ...prev, priority: Number(event.target.value) }))
                        }
                      />
                    </Field>
                    <Field label="Cooldown days">
                      <input
                        type="number"
                        style={inputStyle}
                        value={mediaAssetForm.cooldown_days}
                        onChange={(event) =>
                          setMediaAssetForm((prev) => ({ ...prev, cooldown_days: Number(event.target.value) }))
                        }
                      />
                    </Field>
                    <Field label="Notes">
                      <input
                        style={inputStyle}
                        value={mediaAssetForm.notes}
                        onChange={(event) =>
                          setMediaAssetForm((prev) => ({ ...prev, notes: event.target.value }))
                        }
                      />
                    </Field>
                    <label style={checkboxRowStyle}>
                      <input
                        type="checkbox"
                        checked={mediaAssetForm.active}
                        onChange={(event) =>
                          setMediaAssetForm((prev) => ({ ...prev, active: event.target.checked }))
                        }
                      />
                      active
                    </label>
                  </div>

                  <div style={{ border: '1px solid #e6e6f1', borderRadius: 8, padding: 8, background: '#f8f9ff' }}>
                    <strong style={{ fontSize: 12 }}>Podpowiedzi</strong>
                    <div style={{ fontSize: 12, marginTop: 6 }}>
                      confidence: {selectedMediaFile.suggestion.confidence}
                    </div>
                    <div style={{ fontSize: 12, marginTop: 6 }}>
                      mapping source: {selectedMediaFile.mapping?.mapping_source ?? 'new suggestion'}
                    </div>
                    <div style={{ fontSize: 12, marginTop: 6 }}>
                      {selectedMediaFile.suggestion.reasons.join(' • ')}
                    </div>
                    <button
                      type="button"
                      style={{ ...secondaryButtonStyle, marginTop: 8 }}
                      onClick={applySuggestionToForm}
                    >
                      Zastosuj podpowiedzi
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      style={primaryButtonStyle}
                      disabled={saving}
                      onClick={() => {
                        void saveMediaAsset();
                      }}
                    >
                      {selectedMediaFile.mapping ? 'Update mapping' : 'Create mapping'}
                    </button>
                    <button type="button" style={secondaryButtonStyle} onClick={resetMediaAssetForm}>
                      Reset form
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: 12, color: '#666', marginTop: 10 }}>
                  Wybierz kafelek po lewej stronie.
                </div>
              )}
            </div>
          </div>

          <div style={{ border: '1px solid #e6e6f1', borderRadius: 10, padding: 10, marginTop: 12 }}>
            <strong style={{ fontSize: 13 }}>Bulk mapowanie</strong>
            <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                style={secondaryButtonStyle}
                disabled={saving}
                onClick={() => {
                  void previewBulkMapping();
                }}
              >
                Preview bulk
              </button>
              <button
                type="button"
                style={primaryButtonStyle}
                disabled={saving}
                onClick={() => {
                  void applyBulkMapping();
                }}
              >
                Apply bulk
              </button>
            </div>
            {bulkPreview ? (
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 12, color: '#555', marginBottom: 6 }}>
                  total: {bulkPreview.summary.total} • create: {bulkPreview.summary.previewCreate} • update:{' '}
                  {bulkPreview.summary.previewUpdate} • applied create: {bulkPreview.summary.appliedCreate} • applied update:{' '}
                  {bulkPreview.summary.appliedUpdate} • errors: {bulkPreview.summary.errors}
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
                    <thead>
                      <tr>
                        <Th>File ID</Th>
                        <Th>Status</Th>
                        <Th>Action</Th>
                        <Th>Asset key</Th>
                        <Th>Error</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {bulkPreview.items.map((row, index) => {
                        const payload = (row.payload as Record<string, unknown> | undefined) ?? undefined;
                        return (
                          <tr key={`${String(row.fileId ?? 'x')}-${index}`}>
                            <Td>{String(row.fileId ?? '-')}</Td>
                            <Td>{String(row.status ?? '-')}</Td>
                            <Td>{String(row.action ?? '-')}</Td>
                            <Td>{String(row.asset_key ?? payload?.asset_key ?? '-')}</Td>
                            <Td>{String(row.error ?? '-')}</Td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </div>

          <h3 style={{ ...SECTION_TITLE_STYLE, marginTop: 18 }}>Media Usage (latest)</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
              <thead>
                <tr>
                  <Th>ID</Th>
                  <Th>Media asset</Th>
                  <Th>Workflow</Th>
                  <Th>Content UID</Th>
                  <Th>Entry ID</Th>
                  <Th>Context</Th>
                  <Th>Used at</Th>
                </tr>
              </thead>
              <tbody>
                {mediaUsage.map((item) => (
                  <tr key={item.id}>
                    <Td>{item.id}</Td>
                    <Td>{item.media_asset ?? '-'}</Td>
                    <Td>{item.workflow ?? '-'}</Td>
                    <Td>{item.content_uid}</Td>
                    <Td>{item.content_entry_id}</Td>
                    <Td>{item.context_key}</Td>
                    <Td>{item.used_at}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeTab === 'runs' && (
        <section style={CARD_STYLE}>
          <h2 style={SECTION_TITLE_STYLE}>Workflow Monitoring</h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 12 }}>
            <StatTile label="Live runs" value={liveRunCount} />
            <StatTile label="Visible runs" value={filteredRuns.length} />
            <StatTile label="Failed total" value={summary?.runs.failed ?? 0} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 14 }}>
            <Field label="Status">
              <select
                style={inputStyle}
                value={runFilters.status}
                onChange={(event) =>
                  setRunFilters((prev) => ({ ...prev, status: event.target.value as RunFiltersState['status'] }))
                }
              >
                <option value="all">all</option>
                <option value="running">running</option>
                <option value="success">success</option>
                <option value="failed">failed</option>
                <option value="blocked_budget">blocked_budget</option>
              </select>
            </Field>
            <Field label="Workflow name">
              <input
                style={inputStyle}
                value={runFilters.workflowName}
                onChange={(event) => setRunFilters((prev) => ({ ...prev, workflowName: event.target.value }))}
              />
            </Field>
            <Field label="From">
              <input
                type="date"
                style={inputStyle}
                value={runFilters.fromDate}
                onChange={(event) => setRunFilters((prev) => ({ ...prev, fromDate: event.target.value }))}
              />
            </Field>
            <Field label="To">
              <input
                type="date"
                style={inputStyle}
                value={runFilters.toDate}
                onChange={(event) => setRunFilters((prev) => ({ ...prev, toDate: event.target.value }))}
              />
            </Field>
            <div style={{ display: 'flex', alignItems: 'end', gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                style={secondaryButtonStyle}
                onClick={() => setRunFilters(initialRunFilters())}
              >
                Clear
              </button>
              <button
                type="button"
                style={primaryButtonStyle}
                onClick={() => {
                  void refreshMonitoringData(true);
                }}
              >
                Refresh
              </button>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 980 }}>
              <thead>
                <tr>
                  <Th />
                  <Th>ID</Th>
                  <Th>Workflow</Th>
                  <Th>Type</Th>
                  <Th>Status</Th>
                  <Th>Started</Th>
                  <Th>Duration</Th>
                  <Th>Result</Th>
                  <Th>Action</Th>
                </tr>
              </thead>
              <tbody>
                {filteredRuns.map((run) => {
                  const isExpanded = expandedRunIds.includes(run.id);
                  const steps = getRunSteps(run);
                  const llmTraces = getRunLlmTraces(run);
                  return (
                    <Fragment key={run.id}>
                      <tr>
                        <Td>
                          <button
                            type="button"
                            onClick={() => toggleRunDetails(run.id)}
                            style={{
                              ...secondaryButtonStyle,
                              minWidth: 34,
                              padding: '4px 8px',
                            }}
                            aria-expanded={isExpanded}
                          >
                            {isExpanded ? '-' : '+'}
                          </button>
                        </Td>
                        <Td>{run.id}</Td>
                        <Td>{getRunWorkflowName(run, workflows)}</Td>
                        <Td>{run.run_type}</Td>
                        <Td>
                          <StatusPill status={run.status} />
                        </Td>
                        <Td>{formatDateTime(run.started_at)}</Td>
                        <Td>{formatDuration(run.started_at, run.finished_at)}</Td>
                        <Td>{getRunResultSummary(run)}</Td>
                        <Td>
                          <ActionButton
                            label="Retry"
                            disabled={saving || run.status === 'running'}
                            onClick={() => {
                              void retryRun(run.id);
                            }}
                          />
                        </Td>
                      </tr>
                      {isExpanded ? (
                        <tr>
                          <td
                            colSpan={9}
                            style={{
                              padding: 12,
                              borderBottom: '1px solid #e8eaf3',
                              background: '#fbfcff',
                            }}
                          >
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 12 }}>
                              <div style={{ overflowX: 'auto' }}>
                                <strong style={{ fontSize: 13 }}>Steps</strong>
                                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8, minWidth: 560 }}>
                                  <thead>
                                    <tr>
                                      <Th>Status</Th>
                                      <Th>Step</Th>
                                      <Th>Message</Th>
                                      <Th>Output</Th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {steps.map((step) => (
                                      <tr key={step.id}>
                                        <Td>
                                          <StatusPill status={step.status} />
                                        </Td>
                                        <Td>{step.label}</Td>
                                        <Td>{step.message || '-'}</Td>
                                        <Td>
                                          <code style={{ whiteSpace: 'pre-wrap', fontSize: 11 }}>
                                            {formatDetailValue(step.output)}
                                          </code>
                                        </Td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                              <div>
                                <strong style={{ fontSize: 13 }}>Details</strong>
                                <div
                                  style={{
                                    display: 'grid',
                                    gap: 6,
                                    fontSize: 12,
                                    color: '#3a3d4f',
                                    marginTop: 8,
                                    marginBottom: 8,
                                  }}
                                >
                                  <span>Started: {formatDateTime(run.started_at)}</span>
                                  <span>Finished: {formatDateTime(run.finished_at)}</span>
                                  <span>Prompt tokens: {run.usage_prompt_tokens ?? 0}</span>
                                  <span>Completion tokens: {run.usage_completion_tokens ?? 0}</span>
                                </div>
                                <strong style={{ fontSize: 13 }}>LLM trace</strong>
                                {llmTraces.length === 0 ? (
                                  <div style={{ marginTop: 8, marginBottom: 10, color: '#606477', fontSize: 12 }}>
                                    Brak zapisanego promptu/odpowiedzi dla tego runa.
                                  </div>
                                ) : (
                                  <div style={{ display: 'grid', gap: 10, marginTop: 8, marginBottom: 10 }}>
                                    {llmTraces.map((trace) => (
                                      <details
                                        key={trace.id}
                                        open={llmTraces.length === 1}
                                        style={{
                                          border: '1px solid #dfe3ef',
                                          borderRadius: 8,
                                          background: '#fff',
                                          padding: 10,
                                        }}
                                      >
                                        <summary style={{ cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                                          {trace.label} • {trace.request.model} • {formatDateTime(trace.createdAt)}
                                        </summary>
                                        <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
                                          <div style={{ fontSize: 12, color: '#4c5265' }}>
                                            temp {trace.request.temperature} • max {trace.request.maxCompletionTokens} • tokens{' '}
                                            {trace.response.usage.total_tokens}
                                          </div>
                                          <Field label="Prompt">
                                            <textarea
                                              readOnly
                                              style={{ ...inputStyle, minHeight: 140, fontFamily: 'monospace', fontSize: 12 }}
                                              value={trace.request.prompt}
                                            />
                                          </Field>
                                          <Field label="Messages sent to OpenRouter">
                                            <textarea
                                              readOnly
                                              style={{ ...inputStyle, minHeight: 180, fontFamily: 'monospace', fontSize: 12 }}
                                              value={JSON.stringify(trace.request.messages, null, 2)}
                                            />
                                          </Field>
                                          <Field label="Raw response content">
                                            <textarea
                                              readOnly
                                              style={{ ...inputStyle, minHeight: 160, fontFamily: 'monospace', fontSize: 12 }}
                                              value={trace.response.content}
                                            />
                                          </Field>
                                          <Field label="Parsed response JSON">
                                            <textarea
                                              readOnly
                                              style={{ ...inputStyle, minHeight: 160, fontFamily: 'monospace', fontSize: 12 }}
                                              value={formatDetailValue(trace.response.payload)}
                                            />
                                          </Field>
                                        </div>
                                      </details>
                                    ))}
                                  </div>
                                )}
                                <strong style={{ fontSize: 13 }}>Raw details</strong>
                                <pre
                                  style={{
                                    background: '#f3f5fb',
                                    border: '1px solid #e0e4ef',
                                    borderRadius: 8,
                                    padding: 10,
                                    fontSize: 11,
                                    overflowX: 'auto',
                                    maxHeight: 260,
                                  }}
                                >
                                  {JSON.stringify(run.details ?? {}, null, 2)}
                                </pre>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
            {filteredRuns.length === 0 ? (
              <div style={{ padding: 14, color: '#606477', fontSize: 13 }}>Brak uruchomień dla wybranych filtrów.</div>
            ) : null}
          </div>
        </section>
      )}

      {activeTab === 'settings' && (
        <section style={CARD_STYLE}>
          <h2 style={SECTION_TITLE_STYLE}>Settings</h2>
          <div style={{ display: 'grid', gap: 8, maxWidth: 500 }}>
            <Field label="Timezone">
              <input
                style={inputStyle}
                value={settings.timezone}
                onChange={(event) => setSettings((prev) => ({ ...prev, timezone: event.target.value }))}
              />
            </Field>
            <Field label="Locale">
              <input
                style={inputStyle}
                value={settings.locale}
                onChange={(event) => setSettings((prev) => ({ ...prev, locale: event.target.value }))}
              />
            </Field>
          </div>
          <div style={{ marginTop: 12 }}>
            <button
              type="button"
              disabled={saving}
              style={primaryButtonStyle}
              onClick={() => {
                void saveSettings();
              }}
            >
              Save settings
            </button>
          </div>
        </section>
      )}
      </div>
    </Page.Main>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => {
  return (
    <label style={{ display: 'grid', gap: 6, fontSize: 13, color: '#47475a' }}>
      <span>{label}</span>
      {children}
    </label>
  );
};

const StatusPill = ({ status }: { status: string }) => {
  const colors = STATUS_COLORS[status] ?? STATUS_COLORS.idle;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 24,
        padding: '3px 8px',
        borderRadius: 999,
        border: `1px solid ${colors.border}`,
        background: colors.bg,
        color: colors.color,
        fontSize: 12,
        fontWeight: 700,
        whiteSpace: 'nowrap',
      }}
    >
      {status}
    </span>
  );
};

const StatTile = ({ label, value }: { label: string; value: number }) => (
  <div
    style={{
      borderRadius: 10,
      border: '1px solid #e3e3ef',
      padding: 12,
      background: '#fafafe',
      display: 'grid',
      gap: 4,
    }}
  >
    <span style={{ fontSize: 12, color: '#67677b' }}>{label}</span>
    <strong style={{ fontSize: 24, color: '#1f1f29' }}>{value}</strong>
  </div>
);

const Th = ({ children }: { children?: React.ReactNode }) => (
  <th
    style={{
      textAlign: 'left',
      padding: '8px 8px',
      fontSize: 12,
      color: '#646477',
      borderBottom: '1px solid #e3e3ef',
      whiteSpace: 'nowrap',
    }}
  >
    {children}
  </th>
);

const Td = ({ children }: { children: React.ReactNode }) => (
  <td
    style={{
      padding: '8px 8px',
      fontSize: 13,
      color: '#20202d',
      borderBottom: '1px solid #f0f0f6',
      verticalAlign: 'top',
    }}
  >
    {children}
  </td>
);

const ActionButton = ({
  label,
  onClick,
  disabled,
  tone = 'default',
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: 'default' | 'danger';
}) => (
  <button type="button" disabled={disabled} onClick={onClick} style={tone === 'danger' ? dangerButtonStyle : secondaryButtonStyle}>
    {label}
  </button>
);

const primaryButtonStyle: React.CSSProperties = {
  border: '1px solid #2350c4',
  background: '#2b5bd7',
  color: '#fff',
  borderRadius: 8,
  padding: '8px 12px',
  cursor: 'pointer',
  fontWeight: 600,
};

const secondaryButtonStyle: React.CSSProperties = {
  border: '1px solid #d0d0db',
  background: '#fff',
  color: '#1f1f29',
  borderRadius: 8,
  padding: '6px 10px',
  cursor: 'pointer',
  fontWeight: 600,
};

const dangerButtonStyle: React.CSSProperties = {
  border: '1px solid #e3a2a2',
  background: '#fff7f7',
  color: '#9a1b1b',
  borderRadius: 8,
  padding: '6px 10px',
  cursor: 'pointer',
  fontWeight: 600,
};

export { HomePage };
