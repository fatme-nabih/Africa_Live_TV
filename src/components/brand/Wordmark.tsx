/** Mot-symbole : « Africa » en blanc, « Live » en jaune, police display. Le logo image porte la marque complète. */
export default function Wordmark({ className = 'text-lg' }: { className?: string }) {
  return (
    <span className={`whitespace-nowrap font-display font-bold leading-none tracking-tight text-text ${className}`}>
      Africa <span className="text-al-yellow">Live</span>
    </span>
  );
}
