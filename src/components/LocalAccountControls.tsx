'use client';

import { UserButton } from '@clerk/nextjs';

function ClerkAccountControls() {
  return <UserButton />;
}

export default function LocalAccountControls() {
  if (process.env.NEXT_PUBLIC_LOCAL_DEV_MODE === 'true' && process.env.NODE_ENV !== 'production') {
    return (
      <span className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-2.5 py-1.5 text-xs font-medium text-amber-200 backdrop-blur-md">
        <span className="sm:hidden">Local</span>
        <span className="hidden sm:inline">Version locale</span>
      </span>
    );
  }
  return <ClerkAccountControls />;
}
