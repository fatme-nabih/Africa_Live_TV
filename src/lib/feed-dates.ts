import { normalizeRadarDate } from './radar-data';
import type { FeedDateOptions } from './feeds/types';

const months = [
  ['يناير', 'جانفي', 'كانون الثاني'], ['فبراير', 'فيفري', 'شباط'], ['مارس', 'آذار'],
  ['أبريل', 'ابريل', 'أفريل', 'افريل', 'نيسان'], ['مايو', 'ماي', 'أيار', 'ايار'], ['يونيو', 'جوان', 'حزيران'],
  ['يوليو', 'جويلية', 'تموز'], ['أغسطس', 'اغسطس', 'أوت', 'اوت', 'آب'], ['سبتمبر', 'أيلول', 'ايلول'],
  ['أكتوبر', 'اكتوبر', 'تشرين الأول', 'تشرين الاول'], ['نوفمبر', 'تشرين الثاني'], ['ديسمبر', 'كانون الأول', 'كانون الاول'],
];
const monthIds = new Map(months.flatMap((names, index) => names.map(name => [name, index + 1] as const)));
type Parts = [number, number, number, number, number, number];

/** Convertit une horloge locale avec les règles ICU du fuseau à cette date (heure d'été comprise). */
function localUtc(parts: Parts, zone: string): string | null {
  const [year, month, day, hour, minute, second] = parts;
  const local = Date.UTC(year, month - 1, day, hour, minute, second);
  const date = new Date(local);
  if (year < 1900 || year > 9999 || date.getUTCFullYear() !== year || date.getUTCMonth() + 1 !== month || date.getUTCDate() !== day || hour > 23 || minute > 59 || second > 59) return null;
  try {
    const formatter = new Intl.DateTimeFormat('en-GB-u-nu-latn', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
    let utc = local;
    for (let i = 0; i < 4; i++) {
      const wall = Object.fromEntries(formatter.formatToParts(utc).map(p => [p.type, p.value]));
      const shown = Date.UTC(+wall.year, +wall.month - 1, +wall.day, +wall.hour, +wall.minute, +wall.second);
      const next = utc + local - shown;
      if (next === utc) return new Date(utc).toISOString();
      utc = next;
    }
    // Horloge inexistante lors du passage à l'heure d'été : aucune date inventée.
    return null;
  } catch { return null; }
}
const hour12 = (hour: number, pm: boolean) => hour >= 1 && hour <= 12 ? hour % 12 + (pm ? 12 : 0) : NaN;

export function parseFeedDate(raw: string | null, options: FeedDateOptions = {}): string | null {
  if (!raw) return null;
  const text = raw.trim().replace(/[٠-٩۰-۹]/g, c => String(c.charCodeAt(0) - (c <= '٩' ? 0x660 : 0x6f0)));
  let parts: Parts | null = null;
  if (options.dateFormat === 'arabic-long') {
    const match = /(\d{1,2})\s+(.+?)\s+(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([صم])$/.exec(text);
    if (match) parts = [+match[3], monthIds.get(match[2]) ?? 0, +match[1], hour12(+match[4], match[7] === 'م'), +match[5], +(match[6] ?? 0)];
  } else if (options.dateFormat === 'us-12h') {
    const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)$/i.exec(text);
    if (match) parts = [+match[3], +match[1], +match[2], hour12(+match[4], match[7].toUpperCase() === 'PM'), +match[5], +(match[6] ?? 0)];
  } else if (options.dateFormat === 'hm-pipe-dmy') {
    const match = /^(\d{1,2}):(\d{2})\s*\|\s*(\d{2})-(\d{2})-(\d{4})$/.exec(text);
    if (match) parts = [+match[5], +match[4], +match[3], +match[1], +match[2], 0];
  } else if (options.wallClockTimeZone || (options.timeZone && !/(?:Z|GMT|UTC|[+-]\d{2}:?\d{2})\s*$/i.test(text))) {
    // RFC anglais ou ISO : lire les composantes telles qu'écrites, sans appliquer le décalage mensonger.
    const wall = text.replace(/\s*(?:Z|GMT|UTC|[+-]\d{2}:?\d{2})\s*$/i, '');
    const parsed = normalizeRadarDate(wall + (/T/.test(wall) ? 'Z' : ' GMT'));
    if (parsed) { const d = new Date(parsed); parts = [d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds()]; }
  } else return normalizeRadarDate(text);
  return parts ? localUtc(parts, options.wallClockTimeZone ?? options.timeZone ?? 'UTC') : null;
}

/** Garde propre aux flux RSS : une petite avance d'horloge ne fait plus disparaître la dépêche. */
export function clampFeedClockLead(date: string | null, collectedAt: number): string | null {
  if (!date) return null;
  const lead = Date.parse(date) - collectedAt;
  return lead > 0 && lead <= 3 * 3_600_000 ? new Date(collectedAt).toISOString() : date;
}
