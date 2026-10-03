import { cn } from '@/components/ui';
import { formatRadarDate, type temporalWindow } from '@/lib/radar-data';
import { coverage, effectiveSourceStatus, sourceStatusText, type RadarSourceRow } from '@/lib/radar-workspace';

const DOT: Record<ReturnType<typeof coverage>['level'], string> = {
  ok: 'bg-al-green',
  loading: 'bg-text-muted',
  degraded: 'bg-al-gold',
  down: 'bg-al-red',
};

/** Sources et fraîcheur : l'état d'ensemble en une phrase, le détail par source et la façon de lire le Radar. */
export default function RadarSourcesPanel({
  className = '',
  sources,
  now,
  window: radarWindow,
  asOf,
}: {
  className?: string;
  sources: RadarSourceRow[];
  now: number;
  window: ReturnType<typeof temporalWindow>['window'];
  asOf: number;
}) {
  const { level, text } = coverage(sources, now);
  return (
    <section id="radar-sources" aria-label="Sources et fraîcheur" className={`scroll-mt-20 rounded-card border border-line bg-surface-1 p-4 text-xs text-text sm:p-5 ${className}`}>
      <h2 className="font-display text-base font-bold text-text">Sources et fraîcheur</h2>
      <p role="status" aria-live="polite" aria-atomic="true" className="mt-2 flex items-center gap-2 text-sm font-semibold text-text">
        <span aria-hidden="true" className={cn('size-2 shrink-0 rounded-full', DOT[level])} />
        {text}
      </p>

      <details className="mt-3">
        <summary className="min-h-9 cursor-pointer rounded-lg py-1.5 font-semibold text-al-gold transition hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-al-gold">Détail par source</summary>
        <p className="my-2 text-text-muted">Chaque source a sa propre durée de validité : une mise à jour récente ne rajeunit pas la date d’une observation météo ou d’une séance de marché.</p>
        <div className="max-w-full overflow-x-auto rounded-control border border-line" tabIndex={0} aria-label="Tableau des sources, défilement horizontal possible">
          <table className="w-full min-w-[680px] text-left text-xs">
            <caption className="sr-only">État, périmètre et dates de chaque source du Radar</caption>
            <thead className="border-b border-line bg-surface-2 text-text-muted">
              <tr>{['Source', 'État', 'Dernière mise à jour', 'Date des données', 'Valable jusqu’à', 'Résultats'].map(label => <th key={label} scope="col" className="p-2.5 font-bold">{label}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-line">
              {sources.map((source, index) => (
                <tr key={`${source.provider}:${source.scope}:${index}`} className="transition hover:bg-surface-2/50">
                  <th scope="row" className="p-2.5 font-medium text-text">{source.provider}<span className="block font-normal text-text-muted">{source.scope}</span></th>
                  <td className="p-2.5 font-semibold text-al-gold">{sourceStatusText(effectiveSourceStatus(source, now))}</td>
                  <td className="p-2.5 text-text">{formatRadarDate(source.lastSuccessAt)}</td>
                  <td className="p-2.5 text-text">{formatRadarDate(source.dataAt)}</td>
                  <td className="p-2.5 text-text">{formatRadarDate(source.cacheExpiresAt)}</td>
                  <td className="p-2.5 font-mono text-text">{source.count ?? '—'}{source.limit !== undefined ? ` / ${source.limit} max` : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      <details className="mt-2">
        <summary className="min-h-9 cursor-pointer rounded-lg py-1.5 font-semibold text-al-gold transition hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-al-gold">Comment lire le radar</summary>
        <div className="mt-2 space-y-2.5 leading-5 text-text-muted">
          <p><strong className="text-text">Fenêtre.</strong> {asOf ? <>Les dépêches des dernières 24 heures, du {formatRadarDate(radarWindow.from)} au {formatRadarDate(radarWindow.asOf)}.</> : 'Les dépêches des dernières 24 heures (chargement en cours).'}</p>
          <p><strong className="text-text">Origine.</strong> Chaque titre vient de la rédaction qui le publie. Le pays est celui du sujet quand on peut l’identifier, sinon celui de la rédaction.</p>
          <p><strong className="text-text">Chaînes de télévision.</strong> Celles que nous référençons pour chaque pays ; la lecture est vérifiée à l’ouverture et certaines s’ouvrent avec VLC.</p>
          <p><strong className="text-text">Veille, pas alerte officielle.</strong> Le nombre de dépêches ne mesure ni la gravité ni la véracité d’une situation.</p>
        </div>
      </details>
    </section>
  );
}
