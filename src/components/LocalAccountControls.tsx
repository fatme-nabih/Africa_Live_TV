'use client';

import Link from 'next/link';
import { UserButton, useAuth } from '@clerk/nextjs';

function ClerkAccountControls() {
  const { sessionClaims } = useAuth();
  return (
    <>
      {sessionClaims?.metadata?.role === 'admin' && (
        <Link href="/admin" className="text-xs font-semibold text-amber-300 hover:text-amber-200 transition">Administration</Link>
      )}
      <Link href="/account" className="text-xs font-semibold text-zinc-300 hover:text-white transition">Compte</Link>
      <UserButton />
    </>
  );
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
