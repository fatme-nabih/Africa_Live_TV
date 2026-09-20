import { SignUp } from '@clerk/nextjs';
import Link from 'next/link';
import BrandLogo from '@/components/BrandLogo';

export default function SignUpPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#08090c] px-4 py-10">
      <Link href="/" aria-label="Retour à l’accueil"><BrandLogo className="h-24 w-24" /></Link>
      <h1 className="text-2xl font-black text-white">Votre direct commence ici</h1>
      <SignUp routing="path" path="/sign-up" />
      <Link href="/" className="text-sm text-zinc-400 hover:text-white">Retour à l’accueil</Link>
    </main>
  );
}
