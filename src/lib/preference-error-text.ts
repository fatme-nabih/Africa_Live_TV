import type { Dictionary } from '@/i18n/dictionary';

/** Stored preferences stay shared across editions; translate their known status sentences only for display. */
export function preferenceErrorText(message: string, copy: Dictionary['shell']['preferenceErrors']['copy']) {
  let text = message;
  for (const [source, translated] of Object.entries(copy)) text = text.replace(source, () => translated);
  return text;
}
