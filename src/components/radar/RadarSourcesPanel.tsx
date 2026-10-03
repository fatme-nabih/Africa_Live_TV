'use client';

import { useEffect, useState } from 'react';
import { formatRadarDate } from '@/lib/radar-data';
import { coverageSummary, effectiveSourceStatus, sourceStatusText, type RadarSourceRow } from '@/lib/radar-workspace';

export default function RadarSourcesPanel({ sources }: { sources: RadarSourceRow[] }) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const interval = window.setInterval(tick, 60_000);
    return () => window.clearInterval(interval);
  }, []);
  const summary = coverageSummary(sources, now);
  return <section aria-label="Disponibilité des sources" className="mb-3 rounded-2xl border border-line bg-surface-1/80 px-3 py-2 text-xs text-text shadow-xl sm:mb-4 sm:px-4 sm:py-3">
    <p role="status" aria-live="polite" aria-atomic="true" className="font-semibold text-text">{summary}</p>
    <details className="mt-1">
      <summary className="cursor-pointer rounded-lg py-1 font-semibold text-al-gold hover:text-text transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-al-gold">Disponibilité et fraîcheur par source</summary>
      <p className="my-2 text-text-muted">La fraîcheur suit l’expiration propre à chaque fournisseur. Une collecte récente ne rajeunit pas la date d’une observation ou d’une séance. Les couches cartographiques se chargent à la demande.</p>
      <div className="max-w-full overflow-x-auto rounded-xl border border-line bg-surface-1/80" tabIndex={0} aria-label="Tableau des sources, défilement horizontal possible">
        <table className="w-full min-w-[680px] text-left text-xs">
          <caption className="sr-only">État, périmètre et dates de chaque source Radar</caption>
          <thead className="bg-white/[0.04] text-text-muted border-b border-line"><tr>{['Fournisseur / périmètre', 'État', 'Dernier succès', 'Date des données', 'Cache expire', 'Résultats'].map(label => <th key={label} scope="col" className="p-2.5 font-bold">{label}</th>)}</tr></thead>
          <tbody className="divide-y divide-white/[0.05]">{sources.map((source, index) => <tr key={`${source.provider}:${source.scope}:${index}`} className="hover:bg-white/[0.02] transition">
            <th scope="row" className="p-2.5 font-medium text-text">{source.provider}<span className="block font-normal text-text-muted">{source.scope}</span></th>
            <td className="p-2.5 font-semibold text-al-gold">{sourceStatusText(effectiveSourceStatus(source, now))}</td>
            <td className="p-2.5 text-text">{formatRadarDate(source.lastSuccessAt)}</td><td className="p-2.5 text-text">{formatRadarDate(source.dataAt)}</td><td className="p-2.5 text-text">{formatRadarDate(source.cacheExpiresAt)}</td>
            <td className="p-2.5 font-mono text-text">{source.count ?? '—'}{source.limit !== undefined ? ` / limite ${source.limit}` : ''}</td>
          </tr>)}</tbody>
        </table>
      </div>
    </details>
  </section>;
}
