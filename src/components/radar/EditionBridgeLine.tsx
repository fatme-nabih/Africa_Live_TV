'use client';

import { ArrowRight } from 'lucide-react';
import { useI18n } from '@/i18n/client';
import { formatPlural } from '@/i18n/message';
import { chooseEdition } from '@/lib/edition-client';
import { EDITIONS, type Edition } from '@/lib/editions';
import { usePreferenceOwner } from '@/components/shell/PreferenceOwnerContext';

/**
 * Pont entre éditions (EDI-601) : « {Pays} se raconte surtout en {langue} : {n} dépêches dans l'édition {x} → ».
 * Le geste pose le cookie (et le compte connecté) puis ouvre le Radar du même pays dans l'autre édition.
 */
export default function EditionBridgeLine({ country, countryName, bridge }: { country: string; countryName: string; bridge: { edition: Edition; count: number } }) {
  const { t, edition } = useI18n();
  const owner = usePreferenceOwner();
  const target = EDITIONS[bridge.edition];
  const text = formatPlural(t.radar.feed.bridge, bridge.count, { country: countryName, language: t.radar.feed.bridgeLanguages[bridge.edition] }, edition);
  const [before, after = ''] = text.split('{edition}');
  return (
    <div className="border-b border-line-gold/40 bg-al-gold/[0.05] px-4 py-2 sm:px-5">
      <button
        type="button"
        data-edition-bridge={bridge.edition}
        onClick={() => chooseEdition(bridge.edition, window, { owner, target: `/app/live?country=${encodeURIComponent(country)}` })}
        className="inline-flex min-h-9 items-center gap-1.5 text-start text-xs font-semibold text-al-gold hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-al-gold"
      >
        <span>{before}<bdi lang={target.id} dir={target.dir}>{target.label}</bdi>{after}</span>
        <ArrowRight aria-hidden="true" className="h-3.5 w-3.5 shrink-0 rtl:-scale-x-100" />
      </button>
    </div>
  );
}
