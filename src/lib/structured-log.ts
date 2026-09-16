type LogLevel = 'info' | 'warn' | 'error';
type LogFields = Record<string, string | number | boolean | null | undefined>;

export function structuredLog(level: LogLevel, event: string, fields: LogFields = {}) {
  const entry = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    event,
    ...fields,
  });

  if (level === 'error') console.error(entry);
  else if (level === 'warn') console.warn(entry);
  else console.info(entry);
}
