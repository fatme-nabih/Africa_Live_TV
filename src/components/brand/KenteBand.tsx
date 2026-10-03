/**
 * Bande « kente » : séparateur décoratif de 6 px (losanges et bandes vert / jaune / rouge / or).
 * Une seule occurrence par écran.
 */
export default function KenteBand({ className = 'w-full' }: { className?: string }) {
  return (
    <svg aria-hidden="true" focusable="false" className={`block h-1.5 ${className}`}>
      <defs>
        <pattern id="al-kente" width="44" height="6" patternUnits="userSpaceOnUse">
          <rect width="8" height="6" className="fill-al-green" />
          <polygon points="11,0 14,3 11,6 8,3" className="fill-al-gold" />
          <rect x="14" width="8" height="6" className="fill-al-yellow" />
          <polygon points="25,0 28,3 25,6 22,3" className="fill-al-gold" />
          <rect x="28" width="8" height="6" className="fill-al-red" />
          <polygon points="39,0 42,3 39,6 36,3" className="fill-al-gold" />
          <rect x="42" width="2" height="6" className="fill-ink" />
        </pattern>
      </defs>
      <rect width="100%" height="6" fill="url(#al-kente)" />
    </svg>
  );
}
