import parser from 'cron-parser';

import {
  CONTENT_UIDS,
  DEFAULT_RETRY_BACKOFF_SECONDS,
  DEFAULT_RETRY_MAX,
  MAX_BACKFILL_DAYS,
  PUBLICATION_TICKET_UID,
  RUN_STATUS,
  TICKET_STATUS,
  WORKFLOW_STATUS,
  WORKFLOW_UID,
  ZODIAC_SIGNS_PL,
} from '../constants';
import type {
  ArticlePayload,
  DailyCardPayload,
  HoroscopePayload,
  LlmTraceLog,
  NormalizedWorkflowConfig,
  OpenRouterUsage,
  OpenRouterTrace,
  PublicationTicketRecord,
  RunLogRecord,
  RunStepLog,
  RunStepStatus,
  Strapi,
  TopicQueueItemRecord,
  WorkflowRecord,
} from '../types';
import { getNextOccurrence, isCronDue } from '../utils/cron';
import {
  addDaysToDateString,
  diffDays,
  formatDateInZone,
  getIsoWeekStartDateString,
  getMonthStartDateString,
  toMinuteSlot,
} from '../utils/date-time';
import { getOptionalString, getString, isRecord, toSafeErrorMessage } from '../utils/json';
import { getPluginService } from '../utils/plugin';
import { slugify } from '../utils/slug';

type WorkflowService = {
  getByIdOrThrow: (id: number) => Promise<WorkflowRecord>;
  getById: (id: number) => Promise<WorkflowRecord | null>;
  list: () => Promise<Array<Record<string, unknown>>>;
  normalizeRuntime: (record: WorkflowRecord) => NormalizedWorkflowConfig;
  decryptTokenForRuntime: (record: WorkflowRecord) => Promise<string>;
  setStatus: (id: number, status: WorkflowRecord['status'], lastError?: string | null) => Promise<void>;
  markGenerationSlot: (id: number, slot: string, generatedAt: Date) => Promise<void>;
  markPublishSlot: (id: number, slot: string, publishedAt: Date) => Promise<void>;
};

type RunsService = {
  create: (input: {
    workflowId?: number;
    runType: 'generate' | 'publish' | 'manual' | 'backfill';
    status: 'running' | 'success' | 'failed' | 'blocked_budget';
    startedAt: Date;
    attempts?: number;
    details?: Record<string, unknown>;
    errorMessage?: string;
  }) => Promise<RunLogRecord>;
  complete: (input: {
    runId: number;
    status: 'running' | 'success' | 'failed' | 'blocked_budget';
    errorMessage?: string;
    details?: Record<string, unknown>;
    usage?: OpenRouterUsage;
  }) => Promise<void>;
  updateDetails: (runId: number, details: Record<string, unknown>) => Promise<void>;
};

type TopicsService = {
  takeNextForWorkflow: (workflowId: number, now: Date) => Promise<TopicQueueItemRecord | null>;
  markDone: (id: number, articleId: number) => Promise<void>;
  markFailed: (id: number, errorMessage: string) => Promise<void>;
};

type UsageService = {
  assertBudget: (input: {
    workflowId: number;
    day: string;
    requestLimit: number;
    tokenLimit: number;
  }) => Promise<{ blocked: boolean; usage: { request_count: number; total_tokens: number } }>;
  registerUsage: (workflowId: number, day: string, usage: OpenRouterUsage) => Promise<void>;
};

type OpenRouterService = {
  requestJson: (input: {
    model: string;
    apiToken: string;
    prompt: string;
    schemaDescription: string;
    temperature?: number;
    maxCompletionTokens?: number;
    signal?: AbortSignal;
  }) => Promise<{ payload: unknown; usage: OpenRouterUsage; trace: OpenRouterTrace }>;
};

type LlmTraceLogger = (trace: OpenRouterTrace, meta: { label: string; workflowType: WorkflowRecord['workflow_type'] }) => Promise<void>;

type MediaSelectorService = {
  resolveForArticle: (input: {
    workflowType: 'article' | 'daily_card';
    imageAssetKey?: string | null;
    requiredSignSlug?: string | null;
    contextKey: string;
    now: Date;
    targetDate?: string;
  }) => Promise<{ mediaAssetId: number; mediaAssetKey: string; uploadFileId: number }>;
  registerUsage: (input: {
    mediaAssetId: number;
    workflowId?: number;
    contentUid: string;
    contentEntryId: number;
    contextKey: string;
    targetDate?: string;
  }) => Promise<void>;
};

const sleep = async (ms: number, signal?: AbortSignal): Promise<void> => {
  assertNotAborted(signal);
  await new Promise((resolve) => {
    const timeout = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timeout);
        resolve(undefined);
      },
      { once: true }
    );
  });
  assertNotAborted(signal);
};

const createGenerationSteps = (): RunStepLog[] => [
  { id: 'queued', label: 'Accepted', status: 'success' },
  { id: 'config', label: 'Load runtime config', status: 'pending' },
  { id: 'budget', label: 'Check daily budget', status: 'pending' },
  { id: 'token', label: 'Decrypt model token', status: 'pending' },
  { id: 'generate', label: 'Generate content', status: 'pending' },
  { id: 'usage', label: 'Register usage', status: 'pending' },
  { id: 'finalize', label: 'Finalize workflow', status: 'pending' },
];

const updateStep = (
  steps: RunStepLog[],
  id: string,
  status: RunStepStatus,
  message?: string | null,
  output?: unknown
): RunStepLog[] => {
  const timestamp = new Date().toISOString();

  return steps.map((step) => {
    if (step.id !== id) {
      return step;
    }

    return {
      ...step,
      status,
      message: message ?? step.message,
      timestamp,
      ...(typeof output === 'undefined' ? {} : { output }),
    };
  });
};

const normalizeName = (value: string): string => {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

const parseDateString = (value: string): { year: number; month: number; day: number } => {
  const [year, month, day] = value.split('-').map((v) => Number(v));

  if (!year || !month || !day) {
    throw new Error(`Niepoprawny format daty: ${value}. Oczekiwano YYYY-MM-DD.`);
  }

  return { year, month, day };
};

const resolveId = (value: unknown): number | null => {
  if (typeof value === 'number') {
    return value;
  }

  if (value && typeof value === 'object' && 'id' in value && typeof (value as { id: unknown }).id === 'number') {
    return (value as { id: number }).id;
  }

  return null;
};

const assertNotAborted = (signal?: AbortSignal): void => {
  if (signal?.aborted) {
    throw new Error('Workflow zatrzymany ręcznie.');
  }
};

const orchestrator = ({ strapi }: { strapi: Strapi }) => {
  const inProgress = new Set<number>();
  const abortControllers = new Map<number, AbortController>();
  const entityService = strapi.entityService as any;

  const workflowsService = (): WorkflowService => getPluginService<WorkflowService>(strapi, 'workflows');
  const runsService = (): RunsService => getPluginService<RunsService>(strapi, 'runs');
  const topicsService = (): TopicsService => getPluginService<TopicsService>(strapi, 'topics');
  const usageService = (): UsageService => getPluginService<UsageService>(strapi, 'usage');
  const llmService = (): OpenRouterService => getPluginService<OpenRouterService>(strapi, 'open-router');
  const mediaSelectorService = (): MediaSelectorService =>
    getPluginService<MediaSelectorService>(strapi, 'media-selector');

  const api = {
    async tick(): Promise<void> {
      const now = new Date();

      await this.processGenerationTick(now);
      await this.processPublicationTick(now);
    },

    async runNow(workflowId: number, reason = 'manual'): Promise<Record<string, unknown>> {
      const workflow = await workflowsService().getByIdOrThrow(workflowId);

      const result = await this.executeGeneration(workflow, {
        runType: 'manual',
        reason,
        now: new Date(),
      });

      return result;
    },

    async stop(workflowId: number): Promise<Record<string, unknown>> {
      const controller = abortControllers.get(workflowId);

      if (!inProgress.has(workflowId) || !controller) {
        return {
          workflowId,
          stopped: false,
          reason: 'Workflow nie jest aktualnie uruchomiony',
        };
      }

      controller.abort();
      await workflowsService().setStatus(workflowId, WORKFLOW_STATUS.idle, 'Zatrzymano ręcznie.');

      return {
        workflowId,
        stopped: true,
      };
    },

    async backfill(workflowId: number, payload: { startDate: string; endDate: string; dryRun?: boolean }): Promise<Record<string, unknown>> {
      const workflow = await workflowsService().getByIdOrThrow(workflowId);
      const normalized = workflowsService().normalizeRuntime(workflow);

      const start = payload.startDate;
      const end = payload.endDate;
      const rangeDays = diffDays(start, end);

      if (rangeDays < 0) {
        throw new Error('Data końca backfillu musi być >= daty startu.');
      }

      if (rangeDays + 1 > MAX_BACKFILL_DAYS) {
        throw new Error(`Zakres backfillu jest zbyt duży. Maksymalnie ${MAX_BACKFILL_DAYS} dni.`);
      }

      const summary = {
        workflowId,
        timezone: normalized.timezone,
        startDate: start,
        endDate: end,
        processed: 0,
        succeeded: 0,
        failed: 0,
        dryRun: Boolean(payload.dryRun),
        errors: [] as string[],
      };

      let cursor = start;

      for (let i = 0; i <= rangeDays; i += 1) {
        const publishDate = this.getPublishDateForLocalDay(normalized.publishCron, cursor, normalized.timezone);

        if (payload.dryRun) {
          summary.processed += 1;
          summary.succeeded += 1;
          cursor = addDaysToDateString(cursor, 1);
          continue;
        }

        try {
          await this.executeGeneration(workflow, {
            runType: 'backfill',
            reason: `backfill:${cursor}`,
            now: new Date(),
            forcedPublishAt: publishDate,
            skipSlotMutation: true,
          });
          summary.processed += 1;
          summary.succeeded += 1;
        } catch (error) {
          summary.processed += 1;
          summary.failed += 1;
          summary.errors.push(`${cursor}: ${toSafeErrorMessage(error)}`);
        }

        cursor = addDaysToDateString(cursor, 1);
      }

      return summary;
    },

    async processGenerationTick(now: Date): Promise<void> {
      const workflows = (await entityService.findMany(WORKFLOW_UID, {
        filters: { enabled: true },
        sort: { id: 'asc' },
        populate: ['article_category'],
      })) as WorkflowRecord[];

      for (const workflow of workflows) {
        try {
          const config = workflowsService().normalizeRuntime(workflow);

          const due = isCronDue(
            config.generateCron,
            config.timezone,
            now,
            workflow.last_generation_slot ?? config.lastGenerationSlot
          );

          if (!due.due) {
            continue;
          }

          await this.executeGeneration(workflow, {
            runType: 'generate',
            reason: 'cron-generate',
            now,
            generationSlotKey: due.slotKey,
          });
        } catch (error) {
          strapi.log.error(`[aico] generation tick failed for workflow #${workflow.id}: ${toSafeErrorMessage(error)}`);
        }
      }
    },

    async processPublicationTick(now: Date): Promise<void> {
      const dueTickets = (await entityService.findMany(PUBLICATION_TICKET_UID, {
        filters: {
          status: TICKET_STATUS.scheduled,
          target_publish_at: { $lte: now.toISOString() },
        },
        populate: ['workflow'],
        sort: { target_publish_at: 'asc' },
        limit: 100,
      })) as PublicationTicketRecord[];

      if (dueTickets.length === 0) {
        return;
      }

      const run = await runsService().create({
        workflowId: resolveId(dueTickets[0]?.workflow) ?? undefined,
        runType: 'publish',
        status: RUN_STATUS.running,
        startedAt: now,
        details: {
          tickets: dueTickets.length,
        },
      });

      let publishedCount = 0;
      let rescheduledCount = 0;
      let failedCount = 0;

      for (const ticket of dueTickets) {
        try {
          const result = await this.publishTicket(ticket, now);
          if (result === 'published') {
            publishedCount += 1;
          } else if (result === 'rescheduled') {
            rescheduledCount += 1;
          } else {
            failedCount += 1;
          }
        } catch (error) {
          failedCount += 1;
          strapi.log.error(`[aico] publish ticket #${ticket.id} failed: ${toSafeErrorMessage(error)}`);
        }
      }

      const notPublishedCount = rescheduledCount + failedCount;

      await runsService().complete({
        runId: run.id,
        status: notPublishedCount === 0 ? RUN_STATUS.success : RUN_STATUS.failed,
        details: {
          published: publishedCount,
          rescheduled: rescheduledCount,
          failed: failedCount,
          tickets: dueTickets.length,
        },
        errorMessage:
          notPublishedCount === 0
            ? undefined
            : `${rescheduledCount} ticket(s) rescheduled, ${failedCount} ticket(s) failed`,
      });
    },

    async publishTicket(ticket: PublicationTicketRecord, now: Date): Promise<'published' | 'rescheduled' | 'failed'> {
      const workflowId = resolveId(ticket.workflow);
      const workflow = workflowId ? await workflowsService().getById(workflowId) : null;
      const retryMax = Math.max(1, Math.min(10, Number(workflow?.retry_max ?? DEFAULT_RETRY_MAX)));
      const backoff = Math.max(15, Math.min(3600, Number(workflow?.retry_backoff_seconds ?? DEFAULT_RETRY_BACKOFF_SECONDS)));

      try {
        const entry = await entityService.findOne(ticket.content_uid, ticket.content_entry_id);

        if (!entry) {
          throw new Error(`Brak wpisu docelowego ${ticket.content_uid}#${ticket.content_entry_id}`);
        }

        const publishedAt = (entry as { publishedAt?: string | null }).publishedAt;

        if (!publishedAt) {
          await entityService.update(ticket.content_uid, ticket.content_entry_id, {
            data: {
              publishedAt: now,
            },
          });
        }

        await entityService.update(PUBLICATION_TICKET_UID, ticket.id, {
          data: {
            status: TICKET_STATUS.published,
            published_on: now,
            last_error: null,
          },
        });

        if (workflow) {
          await workflowsService().markPublishSlot(workflow.id, toMinuteSlot(now), now);
        }

        return 'published';
      } catch (error) {
        const retries = Number(ticket.retries ?? 0);
        const message = toSafeErrorMessage(error);

        if (retries + 1 < retryMax) {
          const delayMs = backoff * 1000 * Math.pow(2, retries);
          const retryAt = new Date(now.getTime() + delayMs);

          await entityService.update(PUBLICATION_TICKET_UID, ticket.id, {
            data: {
              retries: retries + 1,
              target_publish_at: retryAt,
              status: TICKET_STATUS.scheduled,
              last_error: message,
            },
          });

          return 'rescheduled';
        }

        await entityService.update(PUBLICATION_TICKET_UID, ticket.id, {
          data: {
            retries: retries + 1,
            status: TICKET_STATUS.failed,
            last_error: message,
          },
        });

        if (workflow) {
          await workflowsService().setStatus(workflow.id, WORKFLOW_STATUS.failed, message);
        }

        return 'failed';
      }
    },

    async executeGeneration(
      workflow: WorkflowRecord,
      options: {
        runType: 'generate' | 'manual' | 'backfill';
        reason: string;
        now: Date;
        generationSlotKey?: string;
        forcedPublishAt?: Date;
        skipSlotMutation?: boolean;
      }
    ): Promise<Record<string, unknown>> {
      const workflowId = workflow.id;

      if (inProgress.has(workflowId)) {
        return {
          workflowId,
          skipped: true,
          reason: 'Workflow już jest wykonywany',
        };
      }

      inProgress.add(workflowId);
      const abortController = new AbortController();
      abortControllers.set(workflowId, abortController);

      const startedAt = new Date();
      const runDetailsBase: Record<string, unknown> = {
        reason: options.reason,
        generationSlot: options.generationSlotKey,
        forcedPublishAt: options.forcedPublishAt?.toISOString(),
      };
      let steps = updateStep(createGenerationSteps(), 'queued', 'success', 'Run request accepted');
      let llmTraces: LlmTraceLog[] = [];
      let activeStepId = 'queued';
      const run = await runsService().create({
        workflowId,
        runType: options.runType,
        status: RUN_STATUS.running,
        startedAt,
        details: {
          ...runDetailsBase,
          steps,
          llmTraces,
        },
      });

      const setRunStep = async (
        stepId: string,
        status: RunStepStatus,
        message?: string | null,
        output?: unknown
      ): Promise<void> => {
        activeStepId = stepId;
        steps = updateStep(steps, stepId, status, message, output);
        await runsService().updateDetails(run.id, {
          ...runDetailsBase,
          steps,
        });
      };

      const logLlmTrace: LlmTraceLogger = async (trace, meta) => {
        const nextTrace: LlmTraceLog = {
          ...trace,
          id: `${run.id}-${llmTraces.length + 1}`,
          label: meta.label,
          workflowType: meta.workflowType,
          createdAt: new Date().toISOString(),
        };

        llmTraces = [...llmTraces, nextTrace];
        await runsService().updateDetails(run.id, {
          ...runDetailsBase,
          steps,
          llmTraces,
        });
      };

      try {
        assertNotAborted(abortController.signal);
        await setRunStep('config', 'running', 'Loading workflow runtime');
        const config = workflowsService().normalizeRuntime(workflow);
        await setRunStep('config', 'success', `Runtime ready for ${config.workflowType}`, {
          timezone: config.timezone,
          locale: config.locale,
          publishCron: config.publishCron,
        });

        await workflowsService().setStatus(workflowId, WORKFLOW_STATUS.running, null);

        assertNotAborted(abortController.signal);
        const localDay = formatDateInZone(options.now, config.timezone);
        await setRunStep('budget', 'running', `Checking limits for ${localDay}`);
        const budgetState = await usageService().assertBudget({
          workflowId,
          day: localDay,
          requestLimit: config.dailyRequestLimit,
          tokenLimit: config.dailyTokenLimit,
        });

        assertNotAborted(abortController.signal);
        if (budgetState.blocked) {
          await workflowsService().setStatus(workflowId, WORKFLOW_STATUS.blockedBudget, 'Przekroczony budżet dzienny');
          await setRunStep('budget', 'failed', 'Daily request/token budget exceeded', {
            localDay,
            requestCount: budgetState.usage.request_count,
            totalTokens: budgetState.usage.total_tokens,
          });
          await setRunStep('finalize', 'failed', 'Workflow stopped on budget guard');

          await runsService().complete({
            runId: run.id,
            status: RUN_STATUS.blockedBudget,
            errorMessage: 'Przekroczony budżet dzienny (request/token limit).',
            details: {
              ...runDetailsBase,
              steps,
              llmTraces,
              localDay,
              requestCount: budgetState.usage.request_count,
              totalTokens: budgetState.usage.total_tokens,
            },
          });

          return {
            workflowId,
            blocked: true,
            reason: 'budget',
          };
        }

        await setRunStep('budget', 'success', 'Budget available', {
          localDay,
          requestCount: budgetState.usage.request_count,
          totalTokens: budgetState.usage.total_tokens,
        });
        assertNotAborted(abortController.signal);
        await setRunStep('token', 'running', 'Decrypting model API token');
        const apiToken = await workflowsService().decryptTokenForRuntime(workflow);
        await setRunStep('token', 'success', 'Model API token ready');

        const publishAt =
          options.forcedPublishAt ?? getNextOccurrence(config.publishCron, new Date(options.now.getTime() + 1_000), config.timezone);

        await setRunStep('generate', 'running', `Generating ${config.workflowType} content`, {
          publishAt: publishAt.toISOString(),
        });
        const runResult = await this.generateWithRetries({
          workflow,
          config,
          apiToken,
          publishAt,
          now: options.now,
          onLlmTrace: logLlmTrace,
          abortSignal: abortController.signal,
        });
        assertNotAborted(abortController.signal);
        await setRunStep('generate', 'success', 'Content generated', {
          created: runResult.created,
          updated: runResult.updated,
          skipped: runResult.skipped,
          publishAt: publishAt.toISOString(),
        });

        if (!options.skipSlotMutation && options.generationSlotKey) {
          await workflowsService().markGenerationSlot(workflowId, options.generationSlotKey, options.now);
        }

        await setRunStep('usage', 'running', 'Registering token usage');
        await usageService().registerUsage(workflowId, localDay, runResult.usage);
        await setRunStep('usage', 'success', 'Usage registered', runResult.usage);

        await workflowsService().setStatus(workflowId, WORKFLOW_STATUS.idle, null);
        await setRunStep('finalize', 'success', 'Workflow returned to idle');

        await runsService().complete({
          runId: run.id,
          status: RUN_STATUS.success,
          usage: runResult.usage,
          details: {
            ...runDetailsBase,
            steps,
            llmTraces,
            publishAt: publishAt.toISOString(),
            created: runResult.created,
            updated: runResult.updated,
            skipped: runResult.skipped,
            workflowType: config.workflowType,
          },
        });

        return {
          workflowId,
          publishAt: publishAt.toISOString(),
          ...runResult,
        };
      } catch (error) {
        const wasStopped = abortController.signal.aborted;
        const message = wasStopped ? 'Workflow zatrzymany ręcznie.' : toSafeErrorMessage(error);

        await workflowsService().setStatus(workflowId, wasStopped ? WORKFLOW_STATUS.idle : WORKFLOW_STATUS.failed, message);
        steps = updateStep(steps, activeStepId, 'failed', message);
        steps = updateStep(steps, 'finalize', 'failed', wasStopped ? 'Workflow stopped manually' : 'Workflow failed');
        await runsService().updateDetails(run.id, {
          ...runDetailsBase,
          steps,
          llmTraces,
        });

        await runsService().complete({
          runId: run.id,
          status: RUN_STATUS.failed,
          errorMessage: message,
          details: {
            ...runDetailsBase,
            steps,
            llmTraces,
            stopped: wasStopped,
          },
        });

        throw error;
      } finally {
        inProgress.delete(workflowId);
        abortControllers.delete(workflowId);
      }
    },

    async generateWithRetries(input: {
      workflow: WorkflowRecord;
      config: NormalizedWorkflowConfig;
      apiToken: string;
      publishAt: Date;
      now: Date;
      onLlmTrace?: LlmTraceLogger;
      abortSignal?: AbortSignal;
    }): Promise<{ created: number; updated: number; skipped: number; usage: OpenRouterUsage }> {
      let lastError: Error | null = null;

      for (let attempt = 1; attempt <= input.config.retryMax; attempt += 1) {
        try {
          assertNotAborted(input.abortSignal);
          if (input.config.workflowType === 'horoscope') {
            return await this.generateHoroscopeBatch(
              input.workflow,
              input.config,
              input.apiToken,
              input.publishAt,
              input.onLlmTrace,
              input.abortSignal
            );
          }

          if (input.config.workflowType === 'daily_card') {
            return await this.generateDailyCard(
              input.workflow,
              input.config,
              input.apiToken,
              input.publishAt,
              input.onLlmTrace,
              input.abortSignal
            );
          }

          if (input.config.workflowType === 'article') {
            return await this.generateArticleFromQueue(
              input.workflow,
              input.config,
              input.apiToken,
              input.publishAt,
              input.now,
              input.onLlmTrace,
              input.abortSignal
            );
          }

          throw new Error(`Nieobsługiwany workflow type: ${input.config.workflowType}`);
        } catch (error) {
          if (input.abortSignal?.aborted) {
            throw new Error('Workflow zatrzymany ręcznie.');
          }

          lastError = error instanceof Error ? error : new Error(String(error));

          if (attempt >= input.config.retryMax) {
            break;
          }

          const backoffMs = input.config.retryBackoffSeconds * 1000 * Math.pow(2, attempt - 1);
          assertNotAborted(input.abortSignal);
          await sleep(backoffMs, input.abortSignal);
        }
      }

      throw lastError ?? new Error('Generacja nie powiodła się.');
    },

    async generateHoroscopeBatch(
      workflow: WorkflowRecord,
      config: NormalizedWorkflowConfig,
      apiToken: string,
      publishAt: Date,
      onLlmTrace?: LlmTraceLogger,
      abortSignal?: AbortSignal
    ): Promise<{ created: number; updated: number; skipped: number; usage: OpenRouterUsage }> {
      const signs = await this.fetchZodiacSigns();

      if (signs.length === 0) {
        throw new Error('Brak znaków zodiaku w bazie.');
      }

      const targetDate = this.resolveHoroscopeDateAnchor(config.horoscopePeriod, publishAt, config.timezone);
      const usageAcc = {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
      };

      let created = 0;
      let updated = 0;
      let skipped = 0;

      for (const horoscopeType of config.horoscopeTypeValues) {
        const context = {
          targetDate,
          period: config.horoscopePeriod,
          type: horoscopeType,
          signList: signs.map((sign) => sign.name).join(', '),
          locale: config.locale,
          category: '',
          topicBrief: '',
        };

        const prompt = this.renderPrompt(config.promptTemplate, context);

        const schema =
          '{"items":[{"sign":"string","content":"string","type":"string opcjonalny"}]}';

        const llmResponse = await llmService().requestJson({
          model: config.llmModel,
          apiToken,
          prompt,
          schemaDescription: schema,
          temperature: config.temperature,
          maxCompletionTokens: config.maxCompletionTokens,
          signal: abortSignal,
        });
        assertNotAborted(abortSignal);

        usageAcc.prompt_tokens += llmResponse.usage.prompt_tokens;
        usageAcc.completion_tokens += llmResponse.usage.completion_tokens;
        usageAcc.total_tokens += llmResponse.usage.total_tokens;

        await onLlmTrace?.(llmResponse.trace, {
          label: `Horoscope ${config.horoscopePeriod} / ${horoscopeType}`,
          workflowType: config.workflowType,
        });

        const payload = this.validateHoroscopePayload(llmResponse.payload, horoscopeType);

        for (const item of payload.items) {
          const normalizedSign = normalizeName(item.sign);
          const sign = signs.find((candidate) => normalizeName(candidate.name) === normalizedSign);

          if (!sign) {
            skipped += 1;
            continue;
          }

          const businessKey = `horoscope:${config.horoscopePeriod}:${horoscopeType}:${targetDate}:${sign.id}`;

          const result = await this.upsertHoroscope({
            workflow,
            config,
            signId: sign.id,
            content: item.content,
            targetDate,
            horoscopeType,
            businessKey,
            publishAt,
          });

          created += result.created;
          updated += result.updated;
          skipped += result.skipped;
        }
      }

      return {
        created,
        updated,
        skipped,
        usage: usageAcc,
      };
    },

    async generateDailyCard(
      workflow: WorkflowRecord,
      config: NormalizedWorkflowConfig,
      apiToken: string,
      publishAt: Date,
      onLlmTrace?: LlmTraceLogger,
      abortSignal?: AbortSignal
    ): Promise<{ created: number; updated: number; skipped: number; usage: OpenRouterUsage }> {
      const cards = await this.fetchTarotCards();

      if (cards.length === 0) {
        throw new Error('Brak kart tarota w bazie.');
      }

      const card = cards[Math.floor(Math.random() * cards.length)];
      const targetDate = formatDateInZone(publishAt, config.timezone);

      const context = {
        targetDate,
        period: 'Dzienny',
        type: 'Karta dnia',
        signList: '',
        locale: config.locale,
        category: '',
        topicBrief: '',
        cardName: card.name,
        cardDescription: card.description ?? '',
        cardMeaningUpright: card.meaning_upright ?? '',
        cardMeaningReversed: card.meaning_reversed ?? '',
      };

      const prompt = this.renderPrompt(config.promptTemplate, context);
      const schema =
        '{"title":"string","excerpt":"string","content":"string","draw_message":"string","slug":"string opcjonalny"}';

      const llmResponse = await llmService().requestJson({
        model: config.llmModel,
        apiToken,
        prompt,
        schemaDescription: schema,
        temperature: config.temperature,
        maxCompletionTokens: config.maxCompletionTokens,
        signal: abortSignal,
      });
      assertNotAborted(abortSignal);

      await onLlmTrace?.(llmResponse.trace, {
        label: `Daily card / ${targetDate}`,
        workflowType: config.workflowType,
      });

      const payload = this.validateDailyCardPayload(llmResponse.payload);

      await this.upsertDailyDraw(targetDate, card.id, payload.draw_message);

      const articleBusinessKey = `daily-card:article:${targetDate}`;
      const upsertResult = await this.upsertArticleDraft({
        workflow,
        config,
        payload,
        workflowType: 'daily_card',
        publishAt,
        businessKey: articleBusinessKey,
        explicitSlug: payload.slug || `karta-dnia-${targetDate}`,
        categoryId: config.articleCategoryId,
        imageContextKey: `daily-card:${workflow.id}`,
        targetDate,
      });

      return {
        created: upsertResult.created,
        updated: upsertResult.updated,
        skipped: upsertResult.skipped,
        usage: llmResponse.usage,
      };
    },

    async generateArticleFromQueue(
      workflow: WorkflowRecord,
      config: NormalizedWorkflowConfig,
      apiToken: string,
      publishAt: Date,
      now: Date,
      onLlmTrace?: LlmTraceLogger,
      abortSignal?: AbortSignal
    ): Promise<{ created: number; updated: number; skipped: number; usage: OpenRouterUsage }> {
      const topic = await topicsService().takeNextForWorkflow(workflow.id, now);

      if (!topic) {
        return {
          created: 0,
          updated: 0,
          skipped: 1,
          usage: {
            prompt_tokens: 0,
            completion_tokens: 0,
            total_tokens: 0,
          },
        };
      }

      try {
        const targetDate = formatDateInZone(publishAt, config.timezone);
        const categoryId = resolveId(topic.article_category) ?? config.articleCategoryId;

        if (!categoryId) {
          throw new Error('Workflow article wymaga kategorii (workflow lub topic item).');
        }

        const imageAssetKey = topic.image_asset_key?.trim();
        if (!imageAssetKey) {
          throw new Error('Topic queue dla workflow article wymaga image_asset_key.');
        }

        const context = {
          targetDate,
          period: 'Dzienny',
          type: 'Artykuł blogowy',
          signList: ZODIAC_SIGNS_PL.join(', '),
          locale: config.locale,
          category: String(categoryId),
          topicBrief: topic.brief ?? topic.title,
          topicTitle: topic.title,
        };

        const prompt = this.renderPrompt(config.promptTemplate, context);

        const schema =
          '{"title":"string","excerpt":"string","content":"string","author":"string opcjonalny","read_time_minutes":"number opcjonalny","slug":"string opcjonalny"}';

        const llmResponse = await llmService().requestJson({
          model: config.llmModel,
          apiToken,
          prompt,
          schemaDescription: schema,
          temperature: config.temperature,
          maxCompletionTokens: config.maxCompletionTokens,
          signal: abortSignal,
        });
        assertNotAborted(abortSignal);

        await onLlmTrace?.(llmResponse.trace, {
          label: `Article topic #${topic.id} / ${topic.title}`,
          workflowType: config.workflowType,
        });

        const payload = this.validateArticlePayload(llmResponse.payload);

        const businessKey = `article:topic:${topic.id}:${targetDate}`;

        const result = await this.upsertArticleDraft({
          workflow,
          config,
          payload,
          workflowType: 'article',
          publishAt,
          businessKey,
          explicitSlug: payload.slug,
          categoryId,
          imageAssetKey,
          imageContextKey: `article:${workflow.id}:category:${categoryId}`,
          targetDate,
        });

        if (result.articleId) {
          await topicsService().markDone(topic.id, result.articleId);
        }

        return {
          created: result.created,
          updated: result.updated,
          skipped: result.skipped,
          usage: llmResponse.usage,
        };
      } catch (error) {
        await topicsService().markFailed(topic.id, toSafeErrorMessage(error));
        throw error;
      }
    },

    async upsertHoroscope(input: {
      workflow: WorkflowRecord;
      config: NormalizedWorkflowConfig;
      signId: number;
      content: string;
      targetDate: string;
      horoscopeType: string;
      businessKey: string;
      publishAt: Date;
    }): Promise<{ created: number; updated: number; skipped: number }> {
      const existingTicket = await this.findTicketByBusinessKey(input.businessKey);

      let existingId = existingTicket?.content_entry_id ?? null;

      if (!existingId) {
        const existing = (await entityService.findMany(CONTENT_UIDS.horoscope, {
          filters: {
            period: input.config.horoscopePeriod,
            type: input.horoscopeType,
            date: input.targetDate,
            zodiac_sign: input.signId,
          },
          limit: 1,
        })) as Array<{ id: number; publishedAt?: string | null }>;

        existingId = existing[0]?.id ?? null;
      }

      if (existingId) {
        const existingEntry = (await entityService.findOne(CONTENT_UIDS.horoscope, existingId)) as {
          id: number;
          publishedAt?: string | null;
        } | null;

        if (!existingEntry) {
          existingId = null;
        } else if (existingEntry.publishedAt && !input.config.forceRegenerate) {
          return { created: 0, updated: 0, skipped: 1 };
        } else {
          await entityService.update(CONTENT_UIDS.horoscope, existingId, {
            data: {
              period: input.config.horoscopePeriod,
              type: input.horoscopeType,
              date: input.targetDate,
              content: input.content,
              zodiac_sign: input.signId,
            },
          });

          if (input.config.autoPublish && !existingEntry.publishedAt) {
            await this.upsertPublicationTicket({
              businessKey: input.businessKey,
              workflowId: input.workflow.id,
              contentUid: CONTENT_UIDS.horoscope,
              contentEntryId: existingId,
              targetPublishAt: input.publishAt,
            });
          }

          return { created: 0, updated: 1, skipped: 0 };
        }
      }

      const created = (await entityService.create(CONTENT_UIDS.horoscope, {
        data: {
          period: input.config.horoscopePeriod,
          type: input.horoscopeType,
          date: input.targetDate,
          content: input.content,
          zodiac_sign: input.signId,
        },
      })) as { id: number };

      if (input.config.autoPublish) {
        await this.upsertPublicationTicket({
          businessKey: input.businessKey,
          workflowId: input.workflow.id,
          contentUid: CONTENT_UIDS.horoscope,
          contentEntryId: created.id,
          targetPublishAt: input.publishAt,
        });
      }

      return { created: 1, updated: 0, skipped: 0 };
    },

    async upsertArticleDraft(input: {
      workflow: WorkflowRecord;
      config: NormalizedWorkflowConfig;
      payload: ArticlePayload | DailyCardPayload;
      workflowType: 'article' | 'daily_card';
      publishAt: Date;
      businessKey: string;
      explicitSlug?: string;
      categoryId: number | null;
      imageAssetKey?: string | null;
      imageContextKey: string;
      targetDate: string;
      requiredSignSlug?: string | null;
    }): Promise<{ created: number; updated: number; skipped: number; articleId?: number }> {
      if (!input.categoryId) {
        throw new Error('Brak kategorii artykułu.');
      }

      const existingTicket = await this.findTicketByBusinessKey(input.businessKey);
      let existingId = existingTicket?.content_entry_id ?? null;

      if (!existingId && input.explicitSlug) {
        const sameSlug = (await entityService.findMany(CONTENT_UIDS.article, {
          filters: {
            slug: slugify(input.explicitSlug),
          },
          limit: 1,
        })) as Array<{ id: number }>;

        existingId = sameSlug[0]?.id ?? null;
      }

      if (existingId) {
        const existing = (await entityService.findOne(CONTENT_UIDS.article, existingId)) as {
          id: number;
          publishedAt?: string | null;
        } | null;

        if (!existing) {
          existingId = null;
        } else if (existing.publishedAt && !input.config.forceRegenerate) {
          return { created: 0, updated: 0, skipped: 1, articleId: existing.id };
        } else {
          const imageSelection = await mediaSelectorService().resolveForArticle({
            workflowType: input.workflowType,
            imageAssetKey: input.imageAssetKey,
            requiredSignSlug: input.requiredSignSlug ?? null,
            contextKey: input.imageContextKey,
            now: new Date(),
            targetDate: input.targetDate,
          });

          const slug = await this.ensureUniqueArticleSlug(
            input.explicitSlug || input.payload.slug || slugify(input.payload.title),
            existing.id
          );

          await entityService.update(CONTENT_UIDS.article, existing.id, {
            data: {
              title: input.payload.title,
              excerpt: input.payload.excerpt,
              content: input.payload.content,
              slug,
              category: input.categoryId,
              image: imageSelection.uploadFileId,
              author: input.payload.author ?? 'AI Orchestrator',
              read_time_minutes:
                typeof input.payload.read_time_minutes === 'number'
                  ? Math.max(1, Math.min(60, Math.floor(input.payload.read_time_minutes)))
                  : 4,
            },
          });

          await mediaSelectorService().registerUsage({
            mediaAssetId: imageSelection.mediaAssetId,
            workflowId: input.workflow.id,
            contentUid: CONTENT_UIDS.article,
            contentEntryId: existing.id,
            contextKey: input.imageContextKey,
            targetDate: input.targetDate,
          });

          if (input.config.autoPublish && !existing.publishedAt) {
            await this.upsertPublicationTicket({
              businessKey: input.businessKey,
              workflowId: input.workflow.id,
              contentUid: CONTENT_UIDS.article,
              contentEntryId: existing.id,
              targetPublishAt: input.publishAt,
            });
          }

          return { created: 0, updated: 1, skipped: 0, articleId: existing.id };
        }
      }

      const slug = await this.ensureUniqueArticleSlug(input.explicitSlug || input.payload.slug || slugify(input.payload.title));
      const imageSelection = await mediaSelectorService().resolveForArticle({
        workflowType: input.workflowType,
        imageAssetKey: input.imageAssetKey,
        requiredSignSlug: input.requiredSignSlug ?? null,
        contextKey: input.imageContextKey,
        now: new Date(),
        targetDate: input.targetDate,
      });

      const created = (await entityService.create(CONTENT_UIDS.article, {
        data: {
          title: input.payload.title,
          excerpt: input.payload.excerpt,
          content: input.payload.content,
          slug,
          category: input.categoryId,
          image: imageSelection.uploadFileId,
          author: input.payload.author ?? 'AI Orchestrator',
          read_time_minutes:
            typeof input.payload.read_time_minutes === 'number'
              ? Math.max(1, Math.min(60, Math.floor(input.payload.read_time_minutes)))
              : 4,
        },
      })) as { id: number };

      await mediaSelectorService().registerUsage({
        mediaAssetId: imageSelection.mediaAssetId,
        workflowId: input.workflow.id,
        contentUid: CONTENT_UIDS.article,
        contentEntryId: created.id,
        contextKey: input.imageContextKey,
        targetDate: input.targetDate,
      });

      if (input.config.autoPublish) {
        await this.upsertPublicationTicket({
          businessKey: input.businessKey,
          workflowId: input.workflow.id,
          contentUid: CONTENT_UIDS.article,
          contentEntryId: created.id,
          targetPublishAt: input.publishAt,
        });
      }

      return { created: 1, updated: 0, skipped: 0, articleId: created.id };
    },

    async ensureUniqueArticleSlug(base: string, currentId?: number): Promise<string> {
      const normalizedBase = slugify(base);

      const isAvailable = async (slug: string): Promise<boolean> => {
        const existing = (await entityService.findMany(CONTENT_UIDS.article, {
          filters: { slug },
          limit: 1,
        })) as Array<{ id: number }>;

        if (!existing[0]) {
          return true;
        }

        return Boolean(currentId && existing[0].id === currentId);
      };

      if (await isAvailable(normalizedBase)) {
        return normalizedBase;
      }

      for (let i = 2; i < 500; i += 1) {
        const candidate = `${normalizedBase}-${i}`;
        if (await isAvailable(candidate)) {
          return candidate;
        }
      }

      return `${normalizedBase}-${Date.now()}`;
    },

    async upsertDailyDraw(targetDate: string, cardId: number, message: string): Promise<void> {
      const existing = (await entityService.findMany(CONTENT_UIDS.dailyTarotDraw, {
        filters: {
          draw_date: targetDate,
        },
        limit: 1,
      })) as Array<{ id: number }>;

      if (existing[0]) {
        await entityService.update(CONTENT_UIDS.dailyTarotDraw, existing[0].id, {
          data: {
            draw_date: targetDate,
            card: cardId,
            message,
          },
        });

        return;
      }

      await entityService.create(CONTENT_UIDS.dailyTarotDraw, {
        data: {
          draw_date: targetDate,
          card: cardId,
          message,
        },
      });
    },

    async upsertPublicationTicket(input: {
      businessKey: string;
      workflowId: number;
      contentUid: string;
      contentEntryId: number;
      targetPublishAt: Date;
    }): Promise<void> {
      const existing = await this.findTicketByBusinessKey(input.businessKey);

      if (existing) {
        await entityService.update(PUBLICATION_TICKET_UID, existing.id, {
          data: {
            workflow: input.workflowId,
            content_uid: input.contentUid,
            content_entry_id: input.contentEntryId,
            target_publish_at: input.targetPublishAt,
            status: TICKET_STATUS.scheduled,
            last_error: null,
          },
        });

        return;
      }

      await entityService.create(PUBLICATION_TICKET_UID, {
        data: {
          workflow: input.workflowId,
          business_key: input.businessKey,
          content_uid: input.contentUid,
          content_entry_id: input.contentEntryId,
          target_publish_at: input.targetPublishAt,
          status: TICKET_STATUS.scheduled,
          retries: 0,
        },
      });
    },

    async findTicketByBusinessKey(businessKey: string): Promise<PublicationTicketRecord | null> {
      const rows = (await entityService.findMany(PUBLICATION_TICKET_UID, {
        filters: {
          business_key: businessKey,
        },
        limit: 1,
      })) as PublicationTicketRecord[];

      return rows[0] ?? null;
    },

    resolveHoroscopeDateAnchor(period: NormalizedWorkflowConfig['horoscopePeriod'], publishAt: Date, timezone: string): string {
      if (period === 'Dzienny') {
        return formatDateInZone(publishAt, timezone);
      }

      if (period === 'Tygodniowy') {
        return getIsoWeekStartDateString(publishAt, timezone);
      }

      return getMonthStartDateString(publishAt, timezone);
    },

    renderPrompt(template: string, context: Record<string, string>): string {
      return template.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_match, key: string) => {
        return context[key] ?? '';
      });
    },

    validateHoroscopePayload(payload: unknown, fallbackType: string): HoroscopePayload {
      if (!isRecord(payload) || !Array.isArray(payload.items)) {
        throw new Error('Horoscope payload musi mieć format { items: [...] }.');
      }

      const items = payload.items
        .map((item) => {
          if (!isRecord(item)) {
            return null;
          }

          const sign = getString(item.sign, 'items[].sign');
          const content = getString(item.content, 'items[].content');
          const type = getOptionalString(item.type) ?? fallbackType;

          return {
            sign,
            content,
            type,
          };
        })
        .filter((item): item is { sign: string; content: string; type: string } => item !== null);

      if (items.length === 0) {
        throw new Error('Horoscope payload nie zawiera elementów.');
      }

      return { items };
    },

    validateArticlePayload(payload: unknown): ArticlePayload {
      if (!isRecord(payload)) {
        throw new Error('Article payload musi być obiektem JSON.');
      }

      return {
        title: getString(payload.title, 'title'),
        excerpt: getString(payload.excerpt, 'excerpt'),
        content: getString(payload.content, 'content'),
        slug: getOptionalString(payload.slug),
        author: getOptionalString(payload.author),
        read_time_minutes:
          typeof payload.read_time_minutes === 'number'
            ? Math.max(1, Math.min(60, Math.floor(payload.read_time_minutes)))
            : undefined,
      };
    },

    validateDailyCardPayload(payload: unknown): DailyCardPayload {
      if (!isRecord(payload)) {
        throw new Error('Daily card payload musi być obiektem JSON.');
      }

      return {
        title: getString(payload.title, 'title'),
        excerpt: getString(payload.excerpt, 'excerpt'),
        content: getString(payload.content, 'content'),
        draw_message: getString(payload.draw_message, 'draw_message'),
        slug: getOptionalString(payload.slug),
      };
    },

    async fetchZodiacSigns(): Promise<Array<{ id: number; name: string }>> {
      const rows = (await entityService.findMany(CONTENT_UIDS.zodiacSign, {
        fields: ['id', 'name'],
        sort: { id: 'asc' },
        limit: 100,
      })) as Array<{ id: number; name: string }>;

      return rows;
    },

    async fetchTarotCards(): Promise<
      Array<{
        id: number;
        name: string;
        arcana?: string | null;
        description?: string | null;
        meaning_upright?: string | null;
        meaning_reversed?: string | null;
      }>
    > {
      const rows = (await entityService.findMany(CONTENT_UIDS.tarotCard, {
        fields: ['id', 'name', 'arcana', 'description', 'meaning_upright', 'meaning_reversed'],
        limit: 200,
        sort: { id: 'asc' },
      })) as Array<{
        id: number;
        name: string;
        arcana?: string | null;
        description?: string | null;
        meaning_upright?: string | null;
        meaning_reversed?: string | null;
      }>;

      return rows;
    },

    getPublishDateForLocalDay(cronExpression: string, localDate: string, timezone: string): Date {
      const { year, month, day } = parseDateString(localDate);
      const localNoonUtc = Date.UTC(year, month - 1, day, 12, 0, 0);
      const start = new Date(localNoonUtc - 48 * 60 * 60 * 1000);
      const end = new Date(localNoonUtc + 48 * 60 * 60 * 1000);

      const interval = parser.parseExpression(cronExpression, {
        currentDate: start,
        endDate: end,
        tz: timezone,
      });

      try {
        for (let i = 0; i < 100; i += 1) {
          const candidate = interval.next().toDate();
          if (formatDateInZone(candidate, timezone) === localDate) {
            return candidate;
          }
        }
      } catch {
        // Fall through to the clearer domain error below.
      }

      throw new Error(`Cron publish nie ma wystąpienia dla lokalnej daty ${localDate} (${timezone}).`);
    },
  };

  return api;
};

export default orchestrator;
