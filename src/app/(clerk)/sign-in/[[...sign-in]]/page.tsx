import { SignIn } from '@clerk/nextjs';
import Link from 'next/link';
import BrandLogo from '@/components/BrandLogo';
import BrandBackdrop from '@/components/brand/BrandBackdrop';
import GoldRing from '@/components/brand/GoldRing';
import { isAnonymousE2EMode } from '@/lib/local-dev';

export default function SignInPage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center gap-6 bg-black px-4 py-10 overflow-hidden">
      <BrandBackdrop variant="hero" />
      <div className="relative z-10 flex flex-col items-center gap-6">
        <Link href="/" aria-label="Retour à l’accueil">
          <GoldRing className="size-20">
            <BrandLogo className="size-[4.5rem]" />
          </GoldRing>
        </Link>
        <h1 className="font-display text-center text-2xl font-bold text-text">Ravi de vous retrouver</h1>
        <div className="flex min-h-[34rem] w-full justify-center">{!isAnonymousE2EMode() && <SignIn routing="path" path="/sign-in" />}</div>
        <Link href="/" className="text-xs font-medium text-text-muted hover:text-text transition">
          Retour à l’accueil
        </Link>
      </div>
    </main>
  );
}
