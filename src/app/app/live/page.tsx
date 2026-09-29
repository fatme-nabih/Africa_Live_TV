import type { Metadata } from 'next';

import LiveRadarDashboard from './LiveRadarDashboard';

export const metadata: Metadata = {
  title: 'Radar Live | Africa Live',
  description: 'Veille médiatique panafricaine et météo en direct.',
};

export default function LivePage() {
  return <LiveRadarDashboard />;
}
