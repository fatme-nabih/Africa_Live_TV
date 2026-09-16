'use client';

import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';

export default function LocalAccountControls() {
  if (process.env.NEXT_PUBLIC_LOCAL_DEV_MODE === 'true' && process.env.NODE_ENV !== 'production') {
    return <span className="rounded-lg border border-yellow-400/30 px-3 py-2 text-xs font-bold text-yellow-200">Version locale</span>;
  }
  return <><Link href="/account" className="text-xs font-bold text-zinc-300">Compte</Link><UserButton /></>;
}
