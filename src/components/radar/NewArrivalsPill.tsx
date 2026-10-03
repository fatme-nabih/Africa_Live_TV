import { ArrowUp } from 'lucide-react';

/**
 * Pastille « 3 nouvelles ↑ » : les dépêches arrivées d'elles-mêmes attendent ici au lieu de repousser ce qu'on lit.
 * Flottante sous la barre haute : elle n'occupe aucune place dans la page, donc ne décale rien.
 */
export default function NewArrivalsPill({ count, onShow }: { count: number; onShow: () => void }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-[calc(0.125rem+3.5rem+0.5rem)] z-30 flex justify-center md:top-[calc(0.125rem+4rem+0.5rem)]"
    >
      {count > 0 && (
        <button
          type="button"
          onClick={onShow}
          className="pointer-events-auto inline-flex min-h-11 items-center gap-2 rounded-pill border border-al-gold bg-surface-1 px-4 text-xs font-bold text-text shadow-lg shadow-black/60 transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-al-gold"
        >
          <ArrowUp aria-hidden="true" className="h-3.5 w-3.5 text-al-gold" />
          {count} nouvelle{count > 1 ? 's' : ''}
        </button>
      )}
    </div>
  );
}
