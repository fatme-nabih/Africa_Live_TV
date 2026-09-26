import { Suspense } from 'react';
import SuccessClient from './SuccessClient';
import { Loader2 } from 'lucide-react';

export default function PricingSuccessPage() {
  return (
    <main className="min-h-screen bg-black px-5 py-20 text-zinc-100 flex flex-col items-center justify-center">
      <Suspense fallback={<Loader2 className="mx-auto h-16 w-16 text-yellow-400 animate-spin mb-6" />}>
        <SuccessClient />
      </Suspense>
    </main>
  );
}
