import { Suspense } from 'react';
import SuccessClient from './SuccessClient';
import { Loader2 } from 'lucide-react';
import BrandBackdrop from '@/components/brand/BrandBackdrop';

export default function PricingSuccessPage() {
  return (
    <main className="relative min-h-screen bg-black px-5 py-20 text-text flex flex-col items-center justify-center overflow-hidden">
      <BrandBackdrop variant="app" />
      <div className="relative z-10 w-full max-w-md">
        <Suspense fallback={<Loader2 className="mx-auto h-12 w-12 text-al-gold animate-spin mb-6" />}>
          <SuccessClient />
        </Suspense>
      </div>
    </main>
  );
}
