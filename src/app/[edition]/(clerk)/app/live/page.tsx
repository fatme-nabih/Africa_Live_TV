import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentAccessDecision } from '@/lib/access-control';

import LiveRadarDashboard from './LiveRadarDashboard';

export const metadata: Metadata = {
  title: 'Radar Live | Africa Live',
  description: 'Veille médiatique panafricaine et météo en direct.',
};

export default async function LivePage() {
  const { user, decision } = await getCurrentAccessDecision();
  if (!user) redirect('/sign-in?redirect_url=/app/live');
  if (!decision.hasAccess) redirect('/account?access=required');

  return <LiveRadarDashboard />;
}
