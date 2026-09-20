import { SignIn } from '@clerk/nextjs';
import Link from 'next/link';
import BrandLogo from '@/components/BrandLogo';

export default function SignInPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#08090c] px-4 py-10">
      <Link href="/" aria-label="Retour à l’accueil"><BrandLogo className="h-24 w-24" /></Link>
      <h1 className="text-2xl font-black text-white">Ravi de vous retrouver</h1>
      <SignIn routing="path" path="/sign-in" />
      <Link href="/" className="text-sm text-zinc-400 hover:text-white">Retour à l’accueil</Link>
    </main>
  );
}
