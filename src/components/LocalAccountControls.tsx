'use client';

import { UserButton } from '@clerk/nextjs';
import { useSyncExternalStore } from 'react';

const subscribeNothing = () => () => {};
const clientHydrated = () => true;
const serverHydrated = () => false;

function ClerkAccountControls() {
  // Clerk may already be loaded in the browser while its server instance is not.
  // Keep the first browser render identical to the HTML before mounting its UI.
  const hydrated = useSyncExternalStore(subscribeNothing, clientHydrated, serverHydrated);
  if (!hydrated) return <span aria-hidden="true" className="inline-block h-8 w-8" />;
  return <UserButton />;
}

export default function LocalAccountControls() {
  if (process.env.NEXT_PUBLIC_LOCAL_DEV_MODE === 'true' && process.env.NODE_ENV !== 'production') {
    return (
      <span className="rounded-lg border border-al-gold/30 bg-al-gold/10 px-2.5 py-1.5 text-xs font-medium text-text">
        <span className="lg:hidden">Local</span>
        <span className="hidden lg:inline">Version locale</span>
      </span>
    );
  }
  return <ClerkAccountControls />;
}
