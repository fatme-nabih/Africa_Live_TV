'use client';
import { useI18n } from '@/i18n/client';

import Player from '@/components/Player';
import type { Channel } from '@/types/channel';
import { useState } from 'react';

export default function AnchoredPlayer({ channel, channels, onSelect, onStop, onExternalHandoff }: {
  channel: Channel | null;
  channels: Channel[];
  onSelect: (channel: Channel) => void;
  onStop: () => void;
  onExternalHandoff: () => void;
}) {
  const { t } = useI18n();
  const [volume, setVolume] = useState(1);
  const index = channels.findIndex(item => item.id === channel?.id);
  const buttonStyle = 'rounded-lg border border-white/20 px-3 py-2 text-xs focus-visible:ring-2 focus-visible:ring-al-gold disabled:opacity-40';
  return (
    <section aria-label={t.player.copy["Lecteur ancré"]} className="min-w-0 rounded-2xl border border-al-gold/25 bg-black p-2 lg:sticky lg:top-24 lg:self-start">
      <div className="flex flex-wrap items-center justify-between gap-2 p-2">
        <h2 className="text-sm font-bold">{t.player.copy["Lecteur ancré · prototype local"]}</h2>
        <button type="button" className={buttonStyle} onClick={onStop} disabled={!channel}>{t.player.copy["Arrêter la lecture"]}</button>
      </div>
      {channel ? <Player key={channel.id} channelId={channel.id} channelName={channel.name} anchored onExternalHandoff={onExternalHandoff} initialVolume={volume} onVolumePreference={setVolume} />
        : <p role="status" className="p-4 text-sm text-text-muted">{t.player.copy["Choisissez une chaîne dans le catalogue, puis lancez la lecture."]}</p>}
      <div role="group" aria-label={t.player.copy["Zapping dans les résultats chargés"]} className="flex flex-wrap gap-2 p-2">
        <button type="button" className={buttonStyle} disabled={index <= 0} onClick={() => onSelect(channels[index - 1])}>{t.player.copy["Chaîne précédente"]}</button>
        <button type="button" className={buttonStyle} disabled={index < 0 || index >= channels.length - 1} onClick={() => onSelect(channels[index + 1])}>{t.player.copy["Chaîne suivante"]}</button>
      </div>
      <p className="px-2 pb-2 text-xs leading-5 text-text-muted">
        {t.player.copy["Zapping parmi les résultats chargés. Les filtres conservent la chaîne sélectionnée."]}{channel && index < 0 && t.player.copy[" Cette chaîne est hors des résultats actuels."]}
       {t.player.copy[" "]}{t.player.copy["VLC ouvre le lecteur existant et quitte ce prototype. Arrêtez VLC avant de revenir ici."]}</p>
    </section>
  );
}
