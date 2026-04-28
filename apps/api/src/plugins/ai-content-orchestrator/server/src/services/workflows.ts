import {
  DEFAULT_DAILY_REQUEST_LIMIT,
  DEFAULT_DAILY_TOKEN_LIMIT,
  DEFAULT_LOCALE,
  DEFAULT_MAX_COMPLETION_TOKENS,
  DEFAULT_RETRY_BACKOFF_SECONDS,
  DEFAULT_RETRY_MAX,
  DEFAULT_TEMPERATURE,
  DEFAULT_TIMEZONE,
  HOROSCOPE_PERIODS,
  WORKFLOW_STATUS,
  WORKFLOW_UID,
} from '../constants';
import type { NormalizedWorkflowConfig, Strapi, WorkflowRecord, WorkflowUpdatePayload } from '../types';
import { assertValidCron } from '../utils/cron';
import { clampNumber } from '../utils/date-time';
import { isRecord, toSafeErrorMessage } from '../utils/json';
import { getPluginService } from '../utils/plugin';

type EncryptionService = {
  encrypt: (value: string) => string;
  decrypt: (value: string) => string;
};

const getId = (value: unknown): number | null => {
  if (typeof value === 'number') {
    return value;
  }

  if (isRecord(value) && typeof value.id === 'number') {
    return value.id;
  }

  return null;
};

const workflows = ({ strapi }: { strapi: Strapi }) => {
  const entityService = strapi.entityService as any;

  return ({
  async list(): Promise<Array<Record<string, unknown>>> {
    const records = (await entityService.findMany(WORKFLOW_UID, {
      sort: { id: 'asc' },
      populate: ['article_category'],
    })) as WorkflowRecord[];

    return records.map((record) => this.serialize(record));
  },

  async getById(id: number): Promise<WorkflowRecord | null> {
    const record = (await entityService.findOne(WORKFLOW_UID, id, {
      populate: ['article_category'],
    })) as WorkflowRecord | null;

    return record;
  },

  async getByIdOrThrow(id: number): Promise<WorkflowRecord> {
    const record = await this.getById(id);

    if (!record) {
      throw new Error(`Workflow #${id} nie istnieje.`);
    }

    return record;
  },

  async create(payload: WorkflowUpdatePayload): Promise<Record<string, unknown>> {
    this.validateInput(payload, true);

    const tokenEncrypted = this.resolveEncryptedToken(payload, null);

    const data = this.mapPayloadToEntity(payload, tokenEncrypted);

    const created = (await entityService.create(WORKFLOW_UID, {
      data,
      populate: ['article_category'],
    })) as WorkflowRecord;

    return this.serialize(created);
  },

  async update(id: number, payload: WorkflowUpdatePayload): Promise<Record<string, unknown>> {
    const current = await this.getByIdOrThrow(id);

    this.validateInput(payload, false, current);

    const tokenEncrypted = this.resolveEncryptedToken(payload, current.llm_api_token_encrypted ?? null);

    const data = this.mapPayloadToEntity(payload, tokenEncrypted);

    const updated = (await entityService.update(WORKFLOW_UID, id, {
      data,
      populate: ['article_category'],
    })) as WorkflowRecord;

    return this.serialize(updated);
  },

  async remove(id: number): Promise<Record<string, unknown>> {
    const current = await this.getByIdOrThrow(id);

    if (current.status === WORKFLOW_STATUS.running) {
      throw new Error('Najpierw zatrzymaj workflow, potem usuń.');
    }

    const deleted = (await entityService.delete(WORKFLOW_UID, id, {
      populate: ['article_category'],
    })) as WorkflowRecord;

    return this.serialize(deleted ?? current);
  },

  async setStatus(id: number, status: WorkflowRecord['status'], lastError?: string | null): Promise<void> {
    await entityService.update(WORKFLOW_UID, id, {
      data: {
        status,
        last_error: lastError ?? null,
      },
    });
  },

  async markGenerationSlot(id: number, slot: string, generatedAt: Date): Promise<void> {
    await entityService.update(WORKFLOW_UID, id, {
      data: {
        last_generation_slot: slot,
        last_generated_at: generatedAt,
      },
    });
  },

  async markPublishSlot(id: number, slot: string, publishedAt: Date): Promise<void> {
    await entityService.update(WORKFLOW_UID, id, {
      data: {
        last_publish_slot: slot,
        last_published_at: publishedAt,
      },
    });
  },

  serialize(record: WorkflowRecord): Record<string, unknown> {
    const safe: Record<string, unknown> = { ...record };
    delete safe.llm_api_token_encrypted;

    return {
      ...safe,
      has_api_token: Boolean(record.llm_api_token_encrypted),
      article_category: getId(record.article_category),
    };
  },

  normalizeRuntime(record: WorkflowRecord): NormalizedWorkflowConfig {
    const timezone = record.timezone || DEFAULT_TIMEZONE;
    const locale = record.locale || DEFAULT_LOCALE;

    const encryptedToken = record.llm_api_token_encrypted?.trim() || '';

    if (!encryptedToken) {
      throw new Error(`Workflow "${record.name}" nie ma ustawionego tokena LLM.`);
    }

    const workflowType = record.workflow_type;

    if (!workflowType) {
      throw new Error(`Workflow "${record.name}" nie ma typu workflow.`);
    }

    const horoscopePeriod = record.horoscope_period ?? 'Dzienny';

    if (!HOROSCOPE_PERIODS.includes(horoscopePeriod)) {
      throw new Error(`Workflow "${record.name}" ma niepoprawny okres horoskopu.`);
    }

    return {
      id: record.id,
      name: record.name,
      enabled: Boolean(record.enabled),
      status: (record.status || WORKFLOW_STATUS.idle) as NormalizedWorkflowConfig['status'],
      workflowType,
      generateCron: record.generate_cron,
      publishCron: record.publish_cron,
      timezone,
      locale,
      llmModel: record.llm_model,
      llmTokenEncrypted: encryptedToken,
      promptTemplate: record.prompt_template,
      temperature: clampNumber(record.temperature ?? DEFAULT_TEMPERATURE, 0, 2),
      maxCompletionTokens: Math.max(128, Math.min(8_000, Number(record.max_completion_tokens ?? DEFAULT_MAX_COMPLETION_TOKENS))),
      retryMax: Math.max(1, Math.min(10, Number(record.retry_max ?? DEFAULT_RETRY_MAX))),
      retryBackoffSeconds: Math.max(
        15,
        Math.min(3600, Number(record.retry_backoff_seconds ?? DEFAULT_RETRY_BACKOFF_SECONDS))
      ),
      dailyRequestLimit: Math.max(1, Number(record.daily_request_limit ?? DEFAULT_DAILY_REQUEST_LIMIT)),
      dailyTokenLimit: Math.max(1000, Number(record.daily_token_limit ?? DEFAULT_DAILY_TOKEN_LIMIT)),
      allowManualEdit: record.allow_manual_edit ?? true,
      autoPublish: record.auto_publish ?? true,
      forceRegenerate: record.force_regenerate ?? false,
      topicMode: record.topic_mode === 'manual' ? 'manual' : 'mixed',
      horoscopePeriod,
      horoscopeTypeValues: this.normalizeHoroscopeTypes(record.horoscope_type_values),
      allSigns: record.all_signs ?? true,
      articleCategoryId: getId(record.article_category),
      lastGenerationSlot: record.last_generation_slot ?? null,
      lastPublishSlot: record.last_publish_slot ?? null,
    };
  },

  normalizeHoroscopeTypes(raw: WorkflowRecord['horoscope_type_values']): string[] {
    if (!Array.isArray(raw)) {
      return ['Ogólny'];
    }

    const values = raw
      .filter((value) => typeof value === 'string')
      .map((value) => value.trim())
      .filter((value) => value.length > 0);

    return values.length > 0 ? values : ['Ogólny'];
  },

  validateInput(payload: WorkflowUpdatePayload, isCreate: boolean, current?: WorkflowRecord): void {
    const timezone = payload.timezone ?? current?.timezone ?? DEFAULT_TIMEZONE;

    if (payload.generate_cron) {
      assertValidCron(payload.generate_cron, timezone);
    }

    if (payload.publish_cron) {
      assertValidCron(payload.publish_cron, timezone);
    }

    const currentGenerateCron = payload.generate_cron ?? current?.generate_cron;
    const currentPublishCron = payload.publish_cron ?? current?.publish_cron;

    if (isCreate && (!currentGenerateCron || !currentPublishCron)) {
      throw new Error('Workflow musi mieć oba harmonogramy: generateCron i publishCron.');
    }

    const requestedEnabled = payload.enabled ?? current?.enabled ?? true;
    const hasToken = Boolean(payload.apiToken?.trim() || current?.llm_api_token_encrypted?.trim());

    if (requestedEnabled && !hasToken) {
      throw new Error('Workflow bez tokena OpenRouter może być zapisany tylko jako wyłączony draft.');
    }

    if (payload.workflow_type && !['horoscope', 'daily_card', 'article'].includes(payload.workflow_type)) {
      throw new Error('Nieobsługiwany workflow_type.');
    }

    if (['article', 'daily_card'].includes(payload.workflow_type ?? current?.workflow_type ?? '')) {
      const categoryId = getId(payload.article_category ?? current?.article_category);
      if (!categoryId) {
        throw new Error('Workflow typu article/daily_card wymaga ustawionej kategorii.');
      }
    }
  },

  resolveEncryptedToken(payload: WorkflowUpdatePayload, existingEncrypted: string | null): string | null {
    const encryptionService = getPluginService<EncryptionService>(strapi, 'encryption');

    const inputToken = payload.apiToken?.trim();

    if (inputToken) {
      return encryptionService.encrypt(inputToken);
    }

    if (existingEncrypted) {
      return existingEncrypted;
    }

    if (payload.enabled === false) {
      return null;
    }

    throw new Error('Brak tokena OpenRouter dla workflow.');
  },

  mapPayloadToEntity(payload: WorkflowUpdatePayload, tokenEncrypted: string | null): Record<string, unknown> {
    const data: Record<string, unknown> = {
      llm_api_token_encrypted: tokenEncrypted,
    };

    const copy = <K extends keyof WorkflowUpdatePayload>(key: K): void => {
      if (typeof payload[key] !== 'undefined') {
        data[key] = payload[key] as unknown;
      }
    };

    copy('name');
    copy('enabled');
    copy('workflow_type');
    copy('generate_cron');
    copy('publish_cron');
    copy('timezone');
    copy('locale');
    copy('llm_model');
    copy('prompt_template');
    copy('temperature');
    copy('max_completion_tokens');
    copy('retry_max');
    copy('retry_backoff_seconds');
    copy('daily_request_limit');
    copy('daily_token_limit');
    copy('allow_manual_edit');
    copy('auto_publish');
    copy('force_regenerate');
    copy('topic_mode');
    copy('horoscope_period');
    copy('horoscope_type_values');
    copy('all_signs');

    if (typeof payload.article_category !== 'undefined') {
      data.article_category = getId(payload.article_category);
    }

    if (!data.status) {
      data.status = WORKFLOW_STATUS.idle;
    }

    return data;
  },

  async decryptTokenForRuntime(record: WorkflowRecord): Promise<string> {
    const encryptionService = getPluginService<EncryptionService>(strapi, 'encryption');

    const encrypted = record.llm_api_token_encrypted?.trim();

    if (!encrypted) {
      throw new Error(`Workflow "${record.name}" nie ma tokena.`);
    }

    try {
      return encryptionService.decrypt(encrypted);
    } catch (error) {
      throw new Error(`Nie udało się odszyfrować tokena workflow "${record.name}": ${toSafeErrorMessage(error)}`);
    }
  },
  });
};

export default workflows;
