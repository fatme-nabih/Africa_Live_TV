import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getCurrentAccessDecision } from '@/lib/access-control';
import { TV_WALL_ENABLED } from '@/lib/tv-wall';
import TvWall from './TvWall';

export const metadata: Metadata = {
  title: 'Mur TV | Africa Live',
};

/** Mur TV 2×2 (UX-506) : derrière un drapeau ; mêmes règles d'accès que la lecture. */
export default async function TvWallPage() {
  if (!TV_WALL_ENABLED) notFound();
  const { user, decision } = await getCurrentAccessDecision();
  if (!user) redirect('/sign-in?redirect_url=/app/mur');
  if (!decision.hasAccess) redirect('/account?access=required');
  return <TvWall />;
}
