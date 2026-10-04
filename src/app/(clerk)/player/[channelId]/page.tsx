import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import SeparatePlayerPage from '@/components/SeparatePlayerPage';

export const metadata: Metadata = {
  title: 'Lecteur — Africa Live',
  description: 'Fenêtre de lecture séparée Africa Live.',
  referrer: 'no-referrer',
};

export default async function PlayerPage({
  params,
}: {
  params: Promise<{ channelId: string }>;
}) {
  const { channelId } = await params;
  const normalizedChannelId = channelId.trim();
  if (!normalizedChannelId || normalizedChannelId.length > 200) notFound();

  return <SeparatePlayerPage channelId={normalizedChannelId} />;
}
