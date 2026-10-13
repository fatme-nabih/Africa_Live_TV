import type { Edition } from './editions';
import { COUNTRY_KEYWORDS as FR } from './country-lexicon/fr';
import { COUNTRY_KEYWORDS as EN } from './country-lexicon/en';
import { COUNTRY_KEYWORDS as AR } from './country-lexicon/ar';
import { normalizeText, textWords, wordMatches } from './text-normalize';
const COUNTRY_KEYWORDS = FR;
function detectFrenchCountry(text: string, defaultCountry: string | null = null): string | null {
  const normalized = normalizeText(text);

  const matches: { code:string; words:number; length:number; index:number }[] = [];
  for (const [code, keywords] of Object.entries(COUNTRY_KEYWORDS)) {
    for (const keyword of keywords) {
      // Look for whole words or clear boundary matches
      const alias = normalizeText(keyword);
      const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i');
      const match = regex.exec(normalized);
      if (match) matches.push({ code,words:alias.split(' ').length,length:alias.length,index:match.index });
    }
  }

  // Specific phrases, then longer aliases, then earliest mention, then ISO code.
  matches.sort((a,b) => b.words-a.words || b.length-a.length || a.index-b.index || a.code.localeCompare(b.code));
  return matches[0]?.code ?? defaultCountry;
}

type Alias = { code: string; words: string[]; length: number };
const lexicons: Record<'en' | 'ar', Alias[]> = Object.fromEntries((['en', 'ar'] as const).map(edition =>
  [edition, Object.entries(edition === 'en' ? EN : AR).flatMap(([code, aliases]) => aliases.map(alias =>
    ({ code, words: textWords(alias, edition), length: normalizeText(alias, edition).length })))
    .sort((a, b) => b.words.length - a.words.length || b.length - a.length || a.code.localeCompare(b.code))])) as Record<'en' | 'ar', Alias[]>;

/** Retire des expressions ambiguës entières, jamais des sous-chaînes de noms propres. */
function shield(text: string, edition: Edition): string {
  if (edition === 'en') return text.replace(/\bPapua New Guinea\b/gi, 'outside').replace(/\bGulf of Guinea\b/gi, 'gulf')
    .replace(/\bChad\s+(?:Michael|Smith|Johnson|Murray|[A-Z][a-z]+\s+[A-Z][a-z]+)\b/g, 'person');
  return normalizeText(text, 'ar')
    .replace(/(?:المغرب العربي|دول المغرب|بلدان المغرب|اتحاد المغرب)/g, 'منطقه')
    .replace(/(?:اذان|صلاه|صلاة|وقت|موعد|صلاة)\s+(?:اذان\s+)?المغرب/g, 'عباده')
    .replace(/المغرب(?:\s+الرياضي|\s+التطواني|\s+الفاسي)/g, 'نادي')
    .replace(/الرباط\s+الصليبي/g, 'اصابه')
    .replace(/(?:الشؤون|القطاع|الوضع|النظام|العام|الاستقرار|الدعم|التقرير|المركز|الموقف|التمويل)\s+المالي/g, 'اقتصاد');
}

export function foreignCountryMentions(text: string, edition: 'en' | 'ar'): string[] {
  const words = textWords(shield(text, edition), edition), consumed = new Set<number>(), countries: string[] = [];
  for (const alias of lexicons[edition]) {
    for (let i = 0; i <= words.length - alias.words.length; i++) {
      if (alias.words.every((word, j) => !consumed.has(i + j) && wordMatches(words[i + j], word, edition))) {
        if (!countries.includes(alias.code)) countries.push(alias.code);
        alias.words.forEach((_, j) => consumed.add(i + j));
      }
    }
  }
  return countries;
}

export function detectCountryCode(text: string, defaultCountry: string | null = null, edition: Edition = 'fr'): string | null {
  return edition === 'fr' ? detectFrenchCountry(text, defaultCountry) : foreignCountryMentions(text, edition)[0] ?? defaultCountry;
}

