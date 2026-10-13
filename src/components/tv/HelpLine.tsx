'use client';
import { useI18n } from '@/i18n/client';

import { ChevronDown, ExternalLink, MonitorPlay, X } from 'lucide-react';
import { useId, useState } from 'react';

const VLC_DOWNLOAD_URL = 'https://www.videolan.org/vlc/';

/** Ligne d'aide unique et repliable : remplace le bandeau VLC et l'encart « Prêt pour le direct ». */
export default function HelpLine({ onDismiss }: { onDismiss: () => void }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const detailsId = useId();
  return (
    <section aria-label={t.tv.copy["Aide à la lecture"]} className="relative z-10 border-b border-line bg-surface-1/60">
      <div className="mx-auto flex w-full max-w-7xl items-center gap-1 px-3 sm:gap-2 sm:px-6">
        <MonitorPlay aria-hidden="true" className="size-4 shrink-0 text-al-gold" />
        <p className="min-w-0 flex-1 truncate py-2 ps-1 text-xs font-semibold text-text sm:text-sm">{t.tv.copy["Certaines chaînes s’ouvrent avec VLC."]}</p>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={detailsId}
          onClick={() => setOpen(value => !value)}
          className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-control px-2 text-xs font-semibold text-al-gold transition-colors hover:text-text"
        >
          <span className="hidden sm:inline">{open ? t.tv.copy["Moins"] : t.tv.copy["En savoir plus"]}</span>
          <span className="sm:hidden">{t.tv.copy["Détails"]}</span>
          <ChevronDown aria-hidden="true" className={`size-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        <a
          href={VLC_DOWNLOAD_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="hidden min-h-11 shrink-0 items-center gap-1.5 rounded-control px-3 text-xs font-bold text-al-gold transition-colors hover:text-text sm:inline-flex"
        >
          <span>{t.tv.copy["Obtenir VLC"]}</span>
          <ExternalLink aria-hidden="true" className="rtl:-scale-x-100 size-3" />
        </a>
        <button
          type="button"
          onClick={onDismiss}
          title={t.tv.copy["Masquer"]}
          aria-label={t.tv.copy["Masquer le rappel VLC"]}
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-control text-text-muted transition-colors hover:text-text"
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      </div>
      {open && (
        <div id={detailsId} className="mx-auto max-w-7xl px-3 pb-3 text-xs leading-relaxed text-text-muted sm:px-6 sm:text-sm">
          <p>
            {t.tv.copy["Africa Live lit d’abord la chaîne dans votre navigateur. Quand un format l’exige, la chaîne est proposée dans VLC, un lecteur gratuit. Rien n’est lancé sans que vous ayez choisi une chaîne."]}</p>
          <a
            href={VLC_DOWNLOAD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex min-h-11 items-center gap-1.5 font-bold text-al-gold hover:text-text sm:hidden"
          >
            {t.tv.copy["Obtenir VLC "]}<ExternalLink aria-hidden="true" className="rtl:-scale-x-100 size-3" />
          </a>
        </div>
      )}
    </section>
  );
}
