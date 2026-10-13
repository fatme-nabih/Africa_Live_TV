'use client';
import { useI18n } from '@/i18n/client';
import { format } from '@/i18n/message';

import { Play, Share2, Star } from 'lucide-react';
import { useState, useSyncExternalStore } from 'react';
import ShareMenu from '@/components/share/ShareMenu';
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
  const { t } = useI18n();
  const eco = useEcoMode();
  const [failed, setFailed] = useState(false);
  const showLogo = Boolean(channel.logoUrl) && !failed && !eco;
  return (
    <div className={`relative flex size-full items-center justify-center overflow-hidden bg-gradient-to-br ${fallbackTone(channel.countryCode)} ${className}`}>
      {showLogo ? (
        // eslint-disable-next-line @next/next/no-img-element -- logos des diffuseurs : chargés directement par le navigateur, jamais relayés ni stockés
        <img
          src={channel.logoUrl!}
          alt={t.tv.copy[""]}
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

/** Partage d'une chaîne (WhatsApp, Facebook, menu du téléphone, copie) : titre + adresse du lecteur Africa Live, jamais l'URL du flux. */
export function ShareChannelLink({ channel, label, className = '', tabIndex }: { channel: Channel; label?: string; className?: string; tabIndex?: number }) {
  const { t, edition } = useI18n();
  const origin = useOrigin();
  if (!origin) return null;
  const share = channelShare({ name: channel.name, id: channel.id, origin }, edition, t.share.messages);
  if (!share) return null;
  return (
    <ShareMenu share={share} label={format(t.tv.copy["Partager {v0}"], {v0: label ?? channel.name})} tabIndex={tabIndex} triggerClassName={className}>
      <Share2 className="size-3.5" aria-hidden="true" />
    </ShareMenu>
  );
}

/** Partage d'une dépêche : titre, rédaction, adresse de l'article chez l'éditeur. */
/** `compact` : icône seule (fil des dépêches), le nom accessible reste complet. */
export function ShareArticleLink({ title, sourceName, url, compact = false }: { title: string; sourceName?: string; url: string; compact?: boolean }) {
  const { t, edition } = useI18n();
  const origin = useOrigin();
  if (!origin) return null;
  const share = articleShare({ title, sourceName, articleUrl: url, origin }, edition, t.share.messages);
  if (!share) return null;
  return (
    <ShareMenu
      share={share}
      label={format(t.tv.copy["Partager « {v0} »"], {v0: title})}
      triggerClassName={compact
        ? 'inline-flex size-9 shrink-0 items-center justify-center rounded-control text-text-muted transition-colors hover:bg-surface-2 hover:text-al-green focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-al-gold aria-expanded:bg-surface-2 aria-expanded:text-al-green'
        : 'inline-flex min-h-9 items-center gap-1.5 rounded-control px-2 text-xs font-semibold text-text-muted transition-colors hover:text-al-green focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-al-gold aria-expanded:text-al-green'}
    >
      <Share2 className="size-3.5" aria-hidden="true" />
      {!compact && t.tv.copy["Partager"]}
    </ShareMenu>
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
  const { t, edition } = useI18n();
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
        aria-label={format(t.tv.copy["Regarder {v0}"], {v0: accessibleName})}
        aria-current={selected ? 'true' : undefined}
        className="absolute inset-0 z-0 rounded-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-al-gold"
      />
      <div className="pointer-events-none relative aspect-video overflow-hidden">
        <ChannelArt channel={channel} />
        {channel.playbackMode === 'EXTERNAL' && (
          <Badge variant="vlc" className="absolute start-2 top-2 bg-black/70" title={t.tv.copy["S'ouvre dans VLC"]}>{t.tv.copy["VLC"]}</Badge>
        )}
        <div className="pointer-events-auto absolute end-2 top-2 z-10 flex gap-1.5">
          <button
            type="button"
            tabIndex={tabIndex}
            onClick={event => {
              event.stopPropagation();
              // Petit « pop » de l'étoile quand la chaîne entre dans les favoris (CSS, coupé en Éco data et mouvement réduit).
              if (!favorite) event.currentTarget.dataset.pop = 'true';
              onToggleFavorite(channel.id);
            }}
            onAnimationEnd={event => { delete event.currentTarget.dataset.pop; }}
            aria-label={format(t.tv.copy["{v0} {v1} {v2} favoris"], {v0: favorite ? t.tv.copy["Retirer"] : t.tv.copy["Ajouter"], v1: accessibleName, v2: favorite ? t.tv.copy["des"] : t.tv.copy["aux"]})}
            aria-pressed={favorite}
            className={`${ICON_BUTTON} ${favorite ? 'border-al-gold/50 text-al-gold' : ''}`}
          >
            <Star className={`size-3.5 ${favorite ? 'fill-current' : ''}`} aria-hidden="true" />
          </button>
          <ShareChannelLink channel={channel} label={accessibleName} tabIndex={tabIndex} className={ICON_BUTTON} />
        </div>
        {/* Centrage horizontal (left-1/2 + translation) : symétrique, identique dans les deux sens. */}
        <span className="pointer-events-none absolute bottom-2 left-1/2 hidden -translate-x-1/2 translate-y-1 items-center gap-1 rounded-pill border border-line-gold bg-black/80 px-3 py-1 text-xs font-bold text-al-gold opacity-0 transition duration-200 group-hover:translate-y-0 group-hover:opacity-100 md:flex">
          <Play className="size-3 fill-current" aria-hidden="true" />
          {t.tv.copy["Regarder"]}</span>
      </div>
      <div className="pointer-events-none relative z-[1] p-3">
        <div className="flex items-start justify-between gap-1.5">
          <h3 className="min-w-0 truncate text-sm font-bold text-text"><bdi>{channel.name}</bdi></h3>
          {selected && <span className="live-dot mt-1.5 shrink-0" role="img" aria-label={t.tv.copy["Chaîne sélectionnée"]} />}
        </div>
        <p className="mt-1 flex min-w-0 items-center gap-1.5 truncate text-xs text-text-muted">
          <span className="truncate">{formatCountryName(channel.countryCode, t.tv.copy["International"], edition)}</span>
          <span aria-hidden="true">·</span>
          <span className="truncate">{categoryLabels(channel.groupTitle, edition, t.tv.categories)}</span>
        </p>
      </div>
    </article>
  );
}
