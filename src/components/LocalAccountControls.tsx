'use client';

import { UserButton } from '@clerk/nextjs';

function ClerkAccountControls() {
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
