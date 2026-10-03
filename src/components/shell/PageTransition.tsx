import { ViewTransition, type ReactNode } from 'react';

/**
 * Fondu léger à l'arrivée et au départ d'une page (View Transitions API).
 * À placer dans chaque page, pas dans un layout (un layout persiste : enter/exit n'y jouent jamais).
 * Sans support navigateur ou avec prefers-reduced-motion, la page change simplement sans animation.
 */
export default function PageTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter="al-page-in" exit="al-page-out" default="none">
      {children}
    </ViewTransition>
  );
}
