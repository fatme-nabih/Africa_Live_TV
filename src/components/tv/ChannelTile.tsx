'use client';

import { Play, Share2, Star } from 'lucide-react';
import { useState, useSyncExternalStore } from 'react';
import { Badge } from '@/components/ui';
import { channelInitials, fallbackTone } from '@/lib/channel-fallback';
import { categoryLabels } from '@/lib/catalog-metadata';
import { formatCountryName } from '@/lib/format';
import { articleShare, channelShare } from '@/lib/share-links';
import type { Channel } from '@/types/channel';
import { useEcoMode } from './hooks';

const subscribeNothing = () => () => {};

/** Origine du site, connue seulement dans le navigateur (évite tout écart d'hydratation). */
function useOrigin() {
  return useSyncExternalStore(subscribeNothing, () => window.location.origin, () => '');
}

/** Logo du diffuseur, ou repli généré (initiales + teinte du pays) : aucune tuile n'est vide. Sans logo en mode Éco data. */
export function ChannelArt({ channel, className = '' }: { channel: Channel; className?: string }) {
  const eco = useEcoMode();
  const [failed, setFailed] = useState(false);
  const showLogo = Boolean(channel.logoUrl) && !failed && !eco;
  return (
    <div className={`relative flex size-full items-center justify-center overflow-hidden bg-gradient-to-br ${fallbackTone(channel.countryCode)} ${className}`}>
      {showLogo ? (
        // eslint-disable-next-line @next/next/no-img-element -- logos des diffuseurs : chargés directement par le navigateur, jamais relayés ni stockés
        <img
          src={channel.logoUrl!}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className="size-[68%] object-contain"
          onError={() => setFailed(true)}
        />
      ) : (
        <span aria-hidden="true" className="font-display text-2xl font-bold tracking-tight text-text/90">
          {channelInitials(channel.name)}
        </span>
      )}
    </div>
  );
}

/** Lien de partage WhatsApp : titre + adresse du lecteur Africa Live, jamais l'URL du flux. */
export function ShareChannelLink({ channel, label, className = '', tabIndex }: { channel: Channel; label?: string; className?: string; tabIndex?: number }) {
  const origin = useOrigin();
  if (!origin) return null;
  const share = channelShare({ name: channel.name, id: channel.id, origin });
  if (!share) return null;
  return (
    <a
      href={share.href}
      target="_blank"
      rel="noopener noreferrer"
      tabIndex={tabIndex}
      aria-label={`Partager ${label ?? channel.name} sur WhatsApp`}
      title="Partager sur WhatsApp"
      className={className}
    >
      <Share2 className="size-3.5" aria-hidden="true" />
    </a>
  );
}

/** Partage WhatsApp d'une dépêche : titre, rédaction, adresse de l'article chez l'éditeur. */
export function ShareArticleLink({ title, sourceName, url }: { title: string; sourceName?: string; url: string }) {
  const origin = useOrigin();
  if (!origin) return null;
  const share = articleShare({ title, sourceName, articleUrl: url, origin });
  if (!share) return null;
  return (
    <a
      href={share.href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Partager « ${title} » sur WhatsApp`}
      className="inline-flex min-h-9 items-center gap-1.5 rounded-control px-2 text-xs font-semibold text-text-muted transition-colors hover:text-al-green focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-al-gold"
    >
      <Share2 className="size-3.5" aria-hidden="true" />
      Partager
    </a>
  );
}

const ICON_BUTTON =
  'relative inline-flex size-9 items-center justify-center rounded-pill border border-line bg-black/85 text-text-muted transition-colors before:absolute before:-inset-1 before:content-[""] hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-al-gold';

export default function ChannelTile({
  channel,
  selected = false,
  favorite,
  onSelect,
  onToggleFavorite,
  tabbable = true,
  label,
  className = '',
}: {
  channel: Channel;
  /** Nom accessible distinct quand plusieurs chaînes portent le même nom dans la liste. */
  label?: string;
  selected?: boolean;
  favorite: boolean;
  onSelect: (channel: Channel) => void;
  onToggleFavorite: (id: string) => void;
  /** Faux pour les tuiles d'une rangée hors de l'élément actif (focus itinérant). */
  tabbable?: boolean;
  className?: string;
}) {
  const tabIndex = tabbable ? 0 : -1;
  const accessibleName = label ?? channel.name;
  return (
    <article
      className={`group relative overflow-hidden rounded-card border transition-colors duration-200 ${
        selected ? 'border-al-gold bg-al-gold/[0.06]' : 'border-line bg-surface-1 hover:border-line-gold'
      } ${className}`}
    >
      <button
        type="button"
        data-tile-main
        tabIndex={tabIndex}
        onClick={() => onSelect(channel)}
        aria-label={`Regarder ${accessibleName}`}
        aria-current={selected ? 'true' : undefined}
        className="absolute inset-0 z-0 rounded-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-al-gold"
      />
      <div className="pointer-events-none relative aspect-video overflow-hidden">
        <ChannelArt channel={channel} />
        {channel.playbackMode === 'EXTERNAL' && (
          <Badge variant="vlc" className="absolute left-2 top-2 bg-black/70" title="S'ouvre dans VLC">VLC</Badge>
        )}
        <div className="pointer-events-auto absolute right-2 top-2 z-10 flex gap-1.5">
          <button
            type="button"
            tabIndex={tabIndex}
            onClick={event => { event.stopPropagation(); onToggleFavorite(channel.id); }}
            aria-label={`${favorite ? 'Retirer' : 'Ajouter'} ${accessibleName} ${favorite ? 'des' : 'aux'} favoris`}
            aria-pressed={favorite}
            className={`${ICON_BUTTON} ${favorite ? 'border-al-gold/50 text-al-gold' : ''}`}
          >
            <Star className={`size-3.5 ${favorite ? 'fill-current' : ''}`} aria-hidden="true" />
          </button>
          <ShareChannelLink channel={channel} label={accessibleName} tabIndex={tabIndex} className={ICON_BUTTON} />
        </div>
        <span className="pointer-events-none absolute bottom-2 left-1/2 hidden -translate-x-1/2 translate-y-1 items-center gap-1 rounded-pill border border-line-gold bg-black/80 px-3 py-1 text-xs font-bold text-al-gold opacity-0 transition duration-200 group-hover:translate-y-0 group-hover:opacity-100 md:flex">
          <Play className="size-3 fill-current" aria-hidden="true" />
          Regarder
        </span>
      </div>
      <div className="pointer-events-none relative z-[1] p-3">
        <div className="flex items-start justify-between gap-1.5">
          <h3 className="min-w-0 truncate text-sm font-bold text-text">{channel.name}</h3>
          {selected && <span className="live-dot mt-1.5 shrink-0" role="img" aria-label="Chaîne sélectionnée" />}
        </div>
        <p className="mt-1 flex min-w-0 items-center gap-1.5 truncate text-xs text-text-muted">
          <span className="truncate">{formatCountryName(channel.countryCode, 'International')}</span>
          <span aria-hidden="true">·</span>
          <span className="truncate">{categoryLabels(channel.groupTitle)}</span>
        </p>
      </div>
    </article>
  );
}
