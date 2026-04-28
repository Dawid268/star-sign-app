import parser from 'cron-parser';

import { CRON_DUE_WINDOW_MS } from '../constants';
import { isWithinMs, toMinuteSlot } from './date-time';

export const assertValidCron = (expression: string, timezone: string): void => {
  parser.parseExpression(expression, {
    currentDate: new Date(),
    tz: timezone,
  });
};

export const getPreviousOccurrenceInclusive = (
  expression: string,
  currentDate: Date,
  timezone: string
): Date => {
  const interval = parser.parseExpression(expression, {
    currentDate: new Date(currentDate.getTime() + 1_000),
    tz: timezone,
  });

  return interval.prev().toDate();
};

export const getNextOccurrence = (
  expression: string,
  currentDate: Date,
  timezone: string
): Date => {
  const interval = parser.parseExpression(expression, {
    currentDate,
    tz: timezone,
  });

  return interval.next().toDate();
};

export const isCronDue = (
  expression: string,
  timezone: string,
  now: Date,
  lastSlot: string | null | undefined,
  dueWindowMs = CRON_DUE_WINDOW_MS
): { due: boolean; slotDate: Date; slotKey: string } => {
  const slotDate = getPreviousOccurrenceInclusive(expression, now, timezone);
  const slotKey = toMinuteSlot(slotDate);

  if (lastSlot && lastSlot === slotKey) {
    return { due: false, slotDate, slotKey };
  }

  const due = isWithinMs(slotDate, now, dueWindowMs);

  return { due, slotDate, slotKey };
};
