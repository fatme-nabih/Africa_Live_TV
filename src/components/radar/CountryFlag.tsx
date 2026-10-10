'use client';

import { lazy, Suspense } from 'react';

const BOX = 'inline-flex h-4 w-6 shrink-0 overflow-hidden rounded-[3px] ring-1 ring-white/15';

/** Code pays (SN, CI…) : repli pendant le chargement des drapeaux, ou pour un pays sans drapeau. */
function CountryCode({ code }: { code: string }) {
  return <span aria-hidden="true" className={`${BOX} items-center justify-center bg-surface-2 font-mono text-[9px] font-bold leading-none text-text-muted`}>{code}</span>;
}

// Les drapeaux (SVG intégrés) forment un petit module à part, téléchargé une seule fois, à la première grille affichée.
const Flag = lazy(async () => {
  const { default: flags } = await import('./country-flags');
  return {
    default: function Flag({ code }: { code: string }) {
      const Svg = flags[code];
      return Svg ? <Svg aria-hidden="true" focusable="false" data-flag={code} className={BOX} /> : <CountryCode code={code} />;
    },
  };
});

/** Drapeau décoratif du pays : le nom du pays reste écrit à côté, donc rien n'est annoncé en plus. */
export default function CountryFlag({ code }: { code: string }) {
  return (
    <Suspense fallback={<CountryCode code={code} />}>
      <Flag code={code} />
    </Suspense>
  );
}
