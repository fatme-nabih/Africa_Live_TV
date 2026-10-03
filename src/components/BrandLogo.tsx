import Image from 'next/image';

/** `decorative` : le nom « Africa Live » est déjà écrit à côté (ou porté par le lien) : pas de texte alternatif en double. */
export default function BrandLogo({ className = 'h-20 w-20', decorative = false }: { className?: string; decorative?: boolean }) {
  return (
    <Image
      src="/africa-live-logo.webp"
      alt={decorative ? '' : 'Africa Live'}
      width={640}
      height={640}
      sizes="144px"
      className={`shrink-0 rounded-full object-contain ${className}`}
      preload
    />
  );
}
