/**
 * Fait défiler vers un bloc du Radar et y place le focus (clavier, lecteur d'écran).
 * Sans animation si l'utilisateur la refuse ou si le mode Éco data est actif.
 */
export function scrollToSection(id: string) {
  const element = document.getElementById(id);
  if (!element) return;
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.eco === 'true';
  element.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' });
  if (!element.hasAttribute('tabindex')) element.setAttribute('tabindex', '-1');
  element.focus({ preventScroll: true });
}
