export const parseFirstJsonObject = (raw: string): unknown => {
  const trimmed = raw.trim();

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return JSON.parse(trimmed);
  }

  const firstCurly = trimmed.indexOf('{');
  const lastCurly = trimmed.lastIndexOf('}');

  if (firstCurly >= 0 && lastCurly > firstCurly) {
    return JSON.parse(trimmed.slice(firstCurly, lastCurly + 1));
  }

  const firstSquare = trimmed.indexOf('[');
  const lastSquare = trimmed.lastIndexOf(']');

  if (firstSquare >= 0 && lastSquare > firstSquare) {
    return JSON.parse(trimmed.slice(firstSquare, lastSquare + 1));
  }

  throw new Error('Brak poprawnego JSON w odpowiedzi modelu.');
};

export const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

export const getString = (value: unknown, fieldName: string): string => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Pole "${fieldName}" musi być niepustym stringiem.`);
  }

  return value.trim();
};

export const getOptionalString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export const toSafeErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
};
