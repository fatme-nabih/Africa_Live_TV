'use client';

import Link from 'next/link';
import { UserButton, useAuth } from '@clerk/nextjs';

function ClerkAccountControls() {
  const { sessionClaims } = useAuth();
  return (
    <>
      {sessionClaims?.metadata?.role === 'admin' && (
        <Link href="/admin" className="text-xs font-bold text-yellow-300">Administration</Link>
      )}
      <Link href="/account" className="text-xs font-bold text-zinc-300">Compte</Link>
      <UserButton />
    </>
  );
}

export default function LocalAccountControls() {
  if (process.env.NEXT_PUBLIC_LOCAL_DEV_MODE === 'true' && process.env.NODE_ENV !== 'production') {
    return (
      <span className="rounded-lg border border-yellow-400/30 px-2.5 py-2 text-xs font-bold text-yellow-200 sm:px-3">
        <span className="sm:hidden">Local</span>
        <span className="hidden sm:inline">Version locale</span>
      </span>
    );
  }
  return <ClerkAccountControls />;
}
