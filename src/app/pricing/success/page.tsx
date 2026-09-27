import { Suspense } from 'react';
import SuccessClient from './SuccessClient';
import { Loader2 } from 'lucide-react';
import BrandWatermark from '@/components/BrandWatermark';

export default function PricingSuccessPage() {
  return (
    <main className="relative min-h-screen bg-black px-5 py-20 text-zinc-100 flex flex-col items-center justify-center overflow-hidden">
      <BrandWatermark />
      <div className="relative z-10 w-full max-w-md">
        <Suspense fallback={<Loader2 className="mx-auto h-12 w-12 text-amber-400 animate-spin mb-6" />}>
          <SuccessClient />
        </Suspense>
      </div>
    </main>
  );
}
