import type { OpenRouterTrace, RunLogRecord, SocialPostTicketRecord } from '../types';

const REDACTED = '[REDACTED]';
const MAX_STRING_LENGTH = 600;
const MAX_ARRAY_ITEMS = 20;
const MAX_OBJECT_KEYS = 50;
const MAX_DEPTH = 5;
const SENSITIVE_KEY_PATTERN =
  /(token|secret|password|credential|authorization|cookie|api[_-]?key|access[_-]?token|refresh[_-]?token|client[_-]?secret|bearer|prompt|messages|raw|response|payload)/i;
const SENSITIVE_VALUE_PATTERN =
  /(bearer\s+[a-z0-9._~+/=-]+|sk-[a-z0-9_-]{8,}|token[=:]\s*[a-z0-9._~+/=-]+|authorization[=:]\s*[a-z0-9._~+/=-]+)/i;

type RedactedJson =
  | null
  | boolean
  | number
  | string
  | RedactedJson[]
  | { [key: string]: RedactedJson };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Date);

const truncate = (value: string): string => {
  if (value.length <= MAX_STRING_LENGTH) {
    return value;
  }

  return `${value.slice(0, MAX_STRING_LENGTH)}...[TRUNCATED chars=${value.length}]`;
};

const describeValue = (value: unknown): string => {
  if (value === null) {
    return 'null';
  }

  if (Array.isArray(value)) {
    return `array(${value.length})`;
  }

  return typeof value;
};

const redactValue = (
  value: unknown,
  key: string | null,
  depth: number,
  seen: WeakSet<object>
): RedactedJson => {
  if (key && SENSITIVE_KEY_PATTERN.test(key)) {
    return REDACTED;
  }

  if (value === null) {
    return null;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'string') {
    if (SENSITIVE_VALUE_PATTERN.test(value)) {
      return REDACTED;
    }

    return truncate(value);
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    if (depth >= MAX_DEPTH) {
      return `[TRUNCATED_ARRAY items=${value.length}]`;
    }

    return value
      .slice(0, MAX_ARRAY_ITEMS)
      .map((item) => redactValue(item, null, depth + 1, seen));
  }

  if (!isRecord(value)) {
    return describeValue(value);
  }

  if (seen.has(value)) {
    return '[CIRCULAR]';
  }

  if (depth >= MAX_DEPTH) {
    return `[TRUNCATED_OBJECT keys=${Object.keys(value).length}]`;
  }

  seen.add(value);

  const redacted: Record<string, RedactedJson> = {};
  for (const [entryKey, entryValue] of Object.entries(value).slice(0, MAX_OBJECT_KEYS)) {
    redacted[entryKey] = redactValue(entryValue, entryKey, depth + 1, seen);
  }

  seen.delete(value);
  return redacted;
};

const summarizeText = (label: string, value: string): string =>
  `${REDACTED}:${label} chars=${value.length}`;

const summarizePayload = (payload: unknown): Record<string, unknown> => {
  if (isRecord(payload)) {
    return {
      redacted: true,
      type: 'object',
      keys: Object.keys(payload).slice(0, MAX_ARRAY_ITEMS),
    };
  }

  if (Array.isArray(payload)) {
    return {
      redacted: true,
      type: 'array',
      length: payload.length,
    };
  }

  return {
    redacted: true,
    type: describeValue(payload),
  };
};

export const shouldStoreRawLlmTrace = (): boolean => false;

export const sanitizeLlmTraceForStorage = (
  trace: OpenRouterTrace,
  input: { storeRaw?: boolean } = {}
): OpenRouterTrace => {
  if (input.storeRaw) {
    return trace;
  }

  return {
    redacted: true,
    redactionReason: 'aico_llm_trace_storage_policy',
    request: {
      model: trace.request.model,
      temperature: trace.request.temperature,
      maxCompletionTokens: trace.request.maxCompletionTokens,
      prompt: summarizeText('prompt', trace.request.prompt),
      schemaDescription: summarizeText('schemaDescription', trace.request.schemaDescription),
      messages: trace.request.messages.map((message) => ({
        role: message.role,
        content: summarizeText(`message.${message.role}`, message.content),
      })),
    },
    response: {
      content: summarizeText('response.content', trace.response.content),
      payload: summarizePayload(trace.response.payload),
      usage: trace.response.usage,
    },
  };
};

export const redactProviderPayload = (payload: unknown): Record<string, unknown> | null => {
  if (payload === null || payload === undefined) {
    return null;
  }

  const redacted = redactValue(payload, null, 0, new WeakSet<object>());

  if (isRecord(redacted)) {
    return redacted;
  }

  return { value: redacted };
};

export const sanitizeRunDetailsForStorage = (
  details: Record<string, unknown>
): Record<string, unknown> => {
  const traces = Array.isArray(details.llmTraces) ? details.llmTraces : null;

  if (!traces) {
    return details;
  }

  return {
    ...details,
    llmTraces: traces.map((trace) => {
      if (!isRecord(trace) || !isRecord(trace.request) || !isRecord(trace.response)) {
        return redactProviderPayload(trace) ?? { redacted: true };
      }

      const sanitized = sanitizeLlmTraceForStorage(trace as unknown as OpenRouterTrace, {
        storeRaw: false,
      });

      return {
        ...sanitized,
        id: typeof trace.id === 'string' ? trace.id : undefined,
        label: typeof trace.label === 'string' ? trace.label : 'LLM call',
        workflowType: typeof trace.workflowType === 'string' ? trace.workflowType : undefined,
        createdAt: typeof trace.createdAt === 'string' ? trace.createdAt : undefined,
      };
    }),
  };
};

export const sanitizeRunRecordForAdmin = (run: RunLogRecord): RunLogRecord => {
  if (!isRecord(run.details)) {
    return run;
  }

  return {
    ...run,
    details: sanitizeRunDetailsForStorage(run.details),
  };
};

export const sanitizeSocialTicketForAdmin = (
  ticket: SocialPostTicketRecord
): SocialPostTicketRecord => {
  const sanitized = { ...ticket };
  delete sanitized.provider_payload;

  return sanitized;
};
