export type PolishContentKind = 'article' | 'daily_card' | 'horoscope' | 'social_teaser';

export type PolishContentQualityIssueCode =
  | 'dash_in_user_text'
  | 'double_space'
  | 'space_before_punctuation'
  | 'empty_paragraph'
  | 'markdown_bullet'
  | 'ai_phrase';

export type PolishContentQualityIssue = {
  path: string;
  code: PolishContentQualityIssueCode;
};

export type PolishContentQualityReport = {
  valid: boolean;
  issues: PolishContentQualityIssue[];
};

export const POLISH_STYLE_REPAIR_MAX_ATTEMPTS = 3;

const USER_TEXT_DASH_PATTERN = /[-\u2013\u2014\u2011]/;
const DOUBLE_SPACE_PATTERN = / {2,}/;
const SPACE_BEFORE_PUNCTUATION_PATTERN = /\s+[,.!?;:]/;
const EMPTY_HTML_PARAGRAPH_PATTERN = /<p>(?:\s|&nbsp;|<br\s*\/?>)*<\/p>/i;
const EMPTY_TEXT_PARAGRAPH_PATTERN = /\n\s*\n\s*\n/;
const MARKDOWN_BULLET_PATTERN = /^\s*[-*+]\s+/m;
const AI_PHRASE_PATTERN =
  /\b(jako\s+(ai|model|sztuczna inteligencja)|as\s+an\s+ai|nie\s+mog[eę]\s+jako|nie\s+jestem\s+w\s+stanie)\b/i;
const URL_PATTERN = /https?:\/\/\S+/gi;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const addStringField = (
  fields: Array<{ path: string; value: string }>,
  value: unknown,
  path: string
): void => {
  if (typeof value === 'string') {
    fields.push({ path, value });
  }
};

const collectUserTextFields = (
  kind: PolishContentKind,
  payload: unknown
): Array<{ path: string; value: string }> => {
  const fields: Array<{ path: string; value: string }> = [];

  if (!isRecord(payload)) {
    return fields;
  }

  if (kind === 'horoscope') {
    const items = Array.isArray(payload.items) ? payload.items : [];
    items.forEach((item, index) => {
      if (!isRecord(item)) {
        return;
      }

      addStringField(fields, item.content, `items[${index}].content`);
      addStringField(fields, item.premiumContent, `items[${index}].premiumContent`);
    });
    return fields;
  }

  if (kind === 'social_teaser') {
    addStringField(fields, payload.caption, 'caption');
    const teasers = Array.isArray(payload.teasers) ? payload.teasers : [];
    teasers.forEach((item, index) => {
      if (isRecord(item)) {
        addStringField(fields, item.caption, `teasers[${index}].caption`);
      }
    });
    return fields;
  }

  addStringField(fields, payload.title, 'title');
  addStringField(fields, payload.excerpt, 'excerpt');
  addStringField(fields, payload.content, 'content');
  addStringField(fields, payload.premiumContent, 'premiumContent');

  if (kind === 'daily_card') {
    addStringField(fields, payload.draw_message, 'draw_message');
  }

  return fields;
};

const findFieldIssues = (path: string, value: string): PolishContentQualityIssue[] => {
  const issues: PolishContentQualityIssue[] = [];
  const prose = value.replace(URL_PATTERN, 'URL');

  if (USER_TEXT_DASH_PATTERN.test(prose)) {
    issues.push({ path, code: 'dash_in_user_text' });
  }

  if (DOUBLE_SPACE_PATTERN.test(prose)) {
    issues.push({ path, code: 'double_space' });
  }

  if (SPACE_BEFORE_PUNCTUATION_PATTERN.test(prose)) {
    issues.push({ path, code: 'space_before_punctuation' });
  }

  if (EMPTY_HTML_PARAGRAPH_PATTERN.test(prose) || EMPTY_TEXT_PARAGRAPH_PATTERN.test(prose)) {
    issues.push({ path, code: 'empty_paragraph' });
  }

  if (MARKDOWN_BULLET_PATTERN.test(prose)) {
    issues.push({ path, code: 'markdown_bullet' });
  }

  if (AI_PHRASE_PATTERN.test(prose)) {
    issues.push({ path, code: 'ai_phrase' });
  }

  return issues;
};

export const evaluatePolishContentQuality = (input: {
  kind: PolishContentKind;
  payload: unknown;
}): PolishContentQualityReport => {
  const issues = collectUserTextFields(input.kind, input.payload).flatMap((field) =>
    findFieldIssues(field.path, field.value)
  );

  return {
    valid: issues.length === 0,
    issues,
  };
};

export const formatPolishContentQualityIssues = (
  issues: PolishContentQualityIssue[]
): string => {
  if (issues.length === 0) {
    return 'none';
  }

  return issues.map((issue) => `${issue.path}:${issue.code}`).join(', ');
};

export const assertPolishContentQuality = (input: {
  kind: PolishContentKind;
  payload: unknown;
  label?: string;
}): void => {
  const report = evaluatePolishContentQuality(input);

  if (!report.valid) {
    const label = input.label ? `${input.label}: ` : '';
    throw new Error(
      `${label}quality_failed_polish_style (${formatPolishContentQualityIssues(report.issues)})`
    );
  }
};
