import Link from 'next/link';
import BrandLogo from '@/components/BrandLogo';
import GoldRing from './GoldRing';
import Wordmark from './Wordmark';

/** Logo cerclé d'or + mot-symbole, lien vers l'accueil. Un seul bloc de marque pour les pages publiques. */
export default function BrandMark({ href = '/' }: { href?: string }) {
  return (
    <Link href={href} className="group flex items-center gap-3 rounded-control">
      <GoldRing className="size-10">
        <BrandLogo className="size-9" decorative />
      </GoldRing>
      <Wordmark className="text-base transition-colors group-hover:text-al-gold" />
    </Link>
  );
}
