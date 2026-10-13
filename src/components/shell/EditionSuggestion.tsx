'use client';

import { Globe2, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { EDITION_COOKIE, EDITION_IDS, EDITIONS, type Edition } from '@/lib/editions';
import { EDITION_PUBLIC_PAGES, withoutEditionPrefix } from '@/lib/edition-routing';
import { chooseEdition, preferredEdition } from '@/lib/edition-client';

export type EditionSuggestionTexts = { text: string; action: string; close: string };

/** Fermeture mémorisée sur cet appareil ; aucune donnée transmise au serveur. */
export const EDITION_SUGGESTION_KEY = 'al_edition_suggestion_dismissed';

/**
 * Suggestion de langue (EDI-503) : sur une page publique, sans cookie d'édition, si le navigateur préfère une autre édition
 * active. Elle propose l'édition dans sa propre langue, ne redirige jamais et se ferme pour de bon. Rien n'est rendu côté
 * serveur : la page statique reste identique pour tous.
 */
export default function EditionSuggestion({ edition, suggestions }: { edition: Edition; suggestions: Partial<Record<Edition, EditionSuggestionTexts>> }) {
  const pathname = usePathname();
  const [target, setTarget] = useState<Edition | null>(null);
  const publicPage = EDITION_PUBLIC_PAGES.includes(withoutEditionPrefix(pathname ?? '/'));

  useEffect(() => {
    if (!publicPage) return;
    if (document.cookie.split(';').some(part => part.trim().startsWith(`${EDITION_COOKIE}=`))) return;
    try { if (localStorage.getItem(EDITION_SUGGESTION_KEY)) return; } catch { /* stockage bloqué : on propose quand même */ }
    const enabled = EDITION_IDS.filter(id => id === edition || suggestions[id]);
    const preferred = preferredEdition(navigator.languages?.length ? navigator.languages : [navigator.language], enabled);
    // Effet de montage : la suggestion dépend du navigateur, jamais rendue côté serveur.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (preferred && preferred !== edition && suggestions[preferred]) setTarget(preferred);
  }, [edition, publicPage, suggestions]);

  if (!target || !publicPage) return null;
  const texts = suggestions[target]!;
  const dismiss = () => {
    try { localStorage.setItem(EDITION_SUGGESTION_KEY, '1'); } catch { /* la fermeture vaut au moins pour cette page */ }
    setTarget(null);
  };
  return (
    <aside lang={target} dir={EDITIONS[target].dir} aria-label={texts.text}
      className="fixed inset-x-3 bottom-3 z-[70] flex items-center gap-3 rounded-card border border-line-gold bg-surface-1/95 p-3 text-sm text-text shadow-2xl backdrop-blur-xl sm:inset-x-auto sm:end-4 sm:bottom-4 sm:max-w-md">
      <Globe2 aria-hidden="true" className="size-5 shrink-0 text-al-gold" />
      <p className="min-w-0 flex-1">{texts.text}</p>
      <button type="button" onClick={() => chooseEdition(target)}
        className="min-h-11 shrink-0 rounded-control bg-al-yellow px-3 text-xs font-bold text-black hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-al-gold">
        {texts.action}
      </button>
      <button type="button" onClick={dismiss} aria-label={texts.close}
        className="inline-flex size-11 shrink-0 items-center justify-center rounded-control text-text-muted hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-al-gold">
        <X aria-hidden="true" className="size-4" />
      </button>
    </aside>
  );
}
