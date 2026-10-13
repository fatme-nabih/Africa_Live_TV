import type { Edition } from '@/lib/editions';
import type { WorldRegion } from '@/lib/world-desk-data';

/** Petit dictionnaire serveur des collecteurs, indépendant des dictionnaires d'interface livrés en E3/E4. */
export const feedMessages: Record<Edition, { africa: string; world: string; general: string }> = {
  fr: { africa: 'Afrique · dépêches', world: 'Monde', general: 'généraliste' },
  en: { africa: 'Africa · news', world: 'World', general: 'general news' },
  ar: { africa: 'أفريقيا · أخبار', world: 'العالم', general: 'أخبار عامة' },
};

const regions: Record<Edition, Record<WorldRegion, string>> = {
  // Les clés historiques restent visibles en FR pour conserver le contrat existant.
  fr: { europe: 'europe', ameriques: 'ameriques', 'moyen-orient': 'moyen-orient', 'asie-pacifique': 'asie-pacifique' },
  en: { europe: 'Europe', ameriques: 'Americas', 'moyen-orient': 'Middle East', 'asie-pacifique': 'Asia-Pacific' },
  ar: { europe: 'أوروبا', ameriques: 'الأمريكتان', 'moyen-orient': 'الشرق الأوسط', 'asie-pacifique': 'آسيا والمحيط الهادئ' },
};
export function worldFeedScope(edition: Edition, region: WorldRegion | null): string {
  return feedMessages[edition].world + ' · ' + (region ? regions[edition][region] : feedMessages[edition].general);
}
