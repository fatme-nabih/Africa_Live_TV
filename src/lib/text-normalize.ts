import type { Edition } from './editions';

/** Normalisation commune, sans modifier les titres publiés ni les liens. */
export function normalizeText(text: string, edition: Edition = 'fr'): string {
  let result = text.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/['’‘ʼ`\u2010-\u2015\u2212-]/g, ' ');
  if (edition === 'ar') result = result.replace(/[\u064b-\u065f\u0670\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
    .replace(/[٠-٩۰-۹]/g, c => String(c.charCodeAt(0) - (c <= '٩' ? 0x660 : 0x6f0)));
  return result.replace(/\s+/g, ' ').trim();
}
export function textWords(text: string, edition: Edition = 'fr'): string[] {
  return normalizeText(text, edition).replace(/[^\p{L}\p{N}]+/gu, ' ').trim().split(/\s+/).filter(Boolean);
}
export function arabicWordForms(word: string): string[] {
  const forms = new Set([word]);
  for (const prefix of ['وال', 'بال', 'فال', 'كال', 'لل', 'ال', 'وبال', 'فبال', 'و', 'ف', 'ب', 'ل', 'ك']) {
    if (word.startsWith(prefix) && word.length - prefix.length >= 2) forms.add(word.slice(prefix.length));
  }
  // Une conjonction peut précéder une préposition : وبالجزائر / ولليبيا.
  if (/^[وف]/.test(word)) for (const form of arabicWordFormsWithoutConjunction(word.slice(1))) forms.add(form);
  return [...forms];
}
function arabicWordFormsWithoutConjunction(word: string): string[] {
  return ['بال', 'لل', 'ال', 'ب', 'ل', 'ك'].flatMap(prefix => word.startsWith(prefix) && word.length - prefix.length >= 2 ? [word.slice(prefix.length)] : []);
}
export function wordMatches(word: string, alias: string, edition: Edition): boolean {
  if (edition !== 'ar') return word === alias;
  const root = alias.startsWith('ال') && alias.length > 3 ? alias.slice(2) : alias;
  return arabicWordForms(word).includes(root) || word === alias;
}
export function phraseAt(words: readonly string[], alias: readonly string[], edition: Edition): number {
  for (let i = 0; i <= words.length - alias.length; i++) {
    if (alias.every((word, j) => wordMatches(words[i + j], word, edition))) return i;
  }
  return -1;
}
