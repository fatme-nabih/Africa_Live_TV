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
  return <section aria-label="Disponibilité des sources" className="mb-4 rounded-2xl border border-white/[0.08] bg-black/40 px-4 py-3 text-xs text-zinc-300 shadow-xl backdrop-blur-xl">
    <p role="status" aria-live="polite" aria-atomic="true" className="font-semibold text-zinc-200">{summary}</p>
    <details className="mt-1">
      <summary className="cursor-pointer rounded-lg py-1 font-semibold text-amber-300 hover:text-amber-200 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400">Disponibilité et fraîcheur par source</summary>
      <p className="my-2 text-zinc-400">La fraîcheur suit l’expiration propre à chaque fournisseur. Une collecte récente ne rajeunit pas la date d’une observation ou d’une séance. Les couches cartographiques se chargent à la demande.</p>
      <div className="max-w-full overflow-x-auto rounded-xl border border-white/[0.08] bg-black/30" tabIndex={0} aria-label="Tableau des sources, défilement horizontal possible">
        <table className="w-full min-w-[680px] text-left text-[11px]">
          <caption className="sr-only">État, périmètre et dates de chaque source Radar</caption>
          <thead className="bg-white/[0.04] text-zinc-400 border-b border-white/[0.06]"><tr>{['Fournisseur / périmètre', 'État', 'Dernier succès', 'Date des données', 'Cache expire', 'Résultats'].map(label => <th key={label} scope="col" className="p-2.5 font-bold">{label}</th>)}</tr></thead>
          <tbody className="divide-y divide-white/[0.05]">{sources.map((source, index) => <tr key={`${source.provider}:${source.scope}:${index}`} className="hover:bg-white/[0.02] transition">
            <th scope="row" className="p-2.5 font-medium text-zinc-200">{source.provider}<span className="block font-normal text-zinc-500">{source.scope}</span></th>
            <td className="p-2.5 font-semibold text-amber-300">{sourceStatusText(effectiveSourceStatus(source, now))}</td>
            <td className="p-2.5 text-zinc-300">{formatRadarDate(source.lastSuccessAt)}</td><td className="p-2.5 text-zinc-300">{formatRadarDate(source.dataAt)}</td><td className="p-2.5 text-zinc-300">{formatRadarDate(source.cacheExpiresAt)}</td>
            <td className="p-2.5 font-mono text-zinc-300">{source.count ?? '—'}{source.limit !== undefined ? ` / limite ${source.limit}` : ''}</td>
          </tr>)}</tbody>
        </table>
      </div>
    </details>
  </section>;
}
