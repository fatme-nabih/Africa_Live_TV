'use client';

import { Globe2 } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { useI18n } from '@/i18n/client';
import { EDITIONS, type Edition } from '@/lib/editions';
import { chooseEdition } from '@/lib/edition-client';
import { horizontalStep, isRtl } from '@/lib/direction';
import { usePreferenceOwner } from './PreferenceOwnerContext';

/** Changement explicite : cookie (et compte connecté, EDI-603) puis navigation complète pour reconstruire le document de l'édition. */
export default function EditionSwitcher({ inline = false }: { inline?: boolean }) {
  const { edition, enabled, t } = useI18n();
  const owner = usePreferenceOwner();
  const [open, setOpen] = useState(false);
  const id = useId(), frame = useRef<HTMLDivElement>(null), trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    frame.current?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus();
    const outside = (event: PointerEvent) => { if (!frame.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);
  if (enabled.length < 2) return null;
  const choose = (next: Edition) => {
    if (next === edition) { setOpen(false); trigger.current?.focus(); return; }
    chooseEdition(next, window, { owner });
  };
  const options = <div id={id} role="radiogroup" aria-label={t.shell.edition.choose} className={inline ? 'flex flex-wrap gap-2' : 'flex flex-col gap-1'}>
    {enabled.map((next, index) => <button key={next} type="button" role="radio" aria-checked={next === edition} lang={next} dir={EDITIONS[next].dir}
      tabIndex={next === edition ? 0 : -1} onClick={() => choose(next)}
      onKeyDown={event => {
        if (event.key === 'Escape') { setOpen(false); trigger.current?.focus(); }
        if (['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft', 'Home', 'End'].includes(event.key)) {
          event.preventDefault();
          // Le sens est celui du groupe (la page), pas celui de l'option : « العربية » porte son propre dir="rtl".
          const forward = event.key === 'ArrowDown' || horizontalStep(event.key, isRtl(event.currentTarget.parentElement)) === 1;
          const target = event.key === 'Home' ? 0 : event.key === 'End' ? enabled.length - 1 : (index + (forward ? 1 : enabled.length - 1)) % enabled.length;
          choose(enabled[target]);
        }
      }}
      className={`min-h-11 rounded-control border px-3 py-2 text-start text-sm font-semibold ${next === edition ? 'border-al-gold bg-al-gold/10 text-al-gold' : 'border-transparent text-text hover:bg-surface-2'}`}>
      {EDITIONS[next].label}
    </button>)}
  </div>;
  return <div ref={frame} className="relative shrink-0">
    {inline ? options : <>
      <button ref={trigger} type="button" aria-label={t.shell.edition.choose} aria-expanded={open} aria-controls={id}
        onClick={() => setOpen(value => !value)} className="flex size-11 items-center justify-center rounded-control border border-line bg-surface-2 text-text-muted hover:border-line-gold hover:text-text">
        <Globe2 size={18} aria-hidden="true" />
      </button>
      {open && <div className="absolute end-0 top-full z-50 mt-2 min-w-40 rounded-card border border-line-gold bg-surface-1 p-2 shadow-xl">{options}</div>}
    </>}
  </div>;
}

export function EditionLandingLine() {
  const { enabled, t } = useI18n();
  return enabled.length > 1 ? <p className="mt-4 text-sm text-text-muted">{t.shell.edition.landingLine}</p> : null;
}
