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
  return <section aria-label="Disponibilité des sources" className="mb-3 rounded-xl border border-white/10 bg-[#0b100e] px-3 py-2 text-xs text-zinc-300">
    <p role="status" aria-live="polite" aria-atomic="true" className="font-semibold">{summary}</p>
    <details className="mt-1">
      <summary className="cursor-pointer rounded py-1 font-medium text-emerald-200 focus-visible:outline-2 focus-visible:outline-emerald-300">Disponibilité et fraîcheur par source</summary>
      <p className="my-2 text-zinc-400">La fraîcheur suit l’expiration propre à chaque fournisseur. Une collecte récente ne rajeunit pas la date d’une observation ou d’une séance. Les couches cartographiques se chargent à la demande.</p>
      <div className="max-w-full overflow-x-auto rounded border border-white/10" tabIndex={0} aria-label="Tableau des sources, défilement horizontal possible">
        <table className="w-full min-w-[680px] text-left text-[11px]">
          <caption className="sr-only">État, périmètre et dates de chaque source Radar</caption>
          <thead className="bg-white/5"><tr>{['Fournisseur / périmètre', 'État', 'Dernier succès', 'Date des données', 'Cache expire', 'Résultats'].map(label => <th key={label} scope="col" className="p-2">{label}</th>)}</tr></thead>
          <tbody>{sources.map((source, index) => <tr key={`${source.provider}:${source.scope}:${index}`} className="border-t border-white/10">
            <th scope="row" className="p-2 font-medium">{source.provider}<span className="block font-normal text-zinc-400">{source.scope}</span></th>
            <td className="p-2 font-semibold text-amber-100">{sourceStatusText(effectiveSourceStatus(source, now))}</td>
            <td className="p-2">{formatRadarDate(source.lastSuccessAt)}</td><td className="p-2">{formatRadarDate(source.dataAt)}</td><td className="p-2">{formatRadarDate(source.cacheExpiresAt)}</td>
            <td className="p-2">{source.count ?? '—'}{source.limit !== undefined ? ` / limite ${source.limit}` : ''}</td>
          </tr>)}</tbody>
        </table>
      </div>
    </details>
  </section>;
}
