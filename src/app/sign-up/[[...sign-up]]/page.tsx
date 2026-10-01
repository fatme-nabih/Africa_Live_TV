import { SignUp } from '@clerk/nextjs';
import Link from 'next/link';
import BrandLogo from '@/components/BrandLogo';
import BrandWatermark from '@/components/BrandWatermark';
import { isAnonymousE2EMode } from '@/lib/local-dev';

export default function SignUpPage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center gap-6 bg-black px-4 py-10 overflow-hidden">
      <BrandWatermark />
      <div className="relative z-10 flex flex-col items-center gap-6">
        <Link href="/" aria-label="Retour à l’accueil">
          <BrandLogo className="h-20 w-20 drop-shadow-[0_2px_12px_rgba(250,204,21,0.25)]" />
        </Link>
        <h1 className="text-2xl font-black text-white">Votre regard sur l’Afrique commence ici</h1>
        {!isAnonymousE2EMode() && <SignUp routing="path" path="/sign-up" />}
        <Link href="/" className="text-xs font-medium text-zinc-400 hover:text-white transition">
          Retour à l’accueil
        </Link>
      </div>
    </main>
  );
}
