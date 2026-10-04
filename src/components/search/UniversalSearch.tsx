'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { CloudSun, MapPin, Newspaper, Search, Tv, X } from 'lucide-react';
import { usePlayerDock } from '@/components/player/PlayerDock';
import { useNow } from '@/components/radar/useNow';
import { catalogResponseSchema, type CatalogRequest } from '@/lib/api-contracts';
import { flagEmoji } from '@/lib/country-picker';
import { formatCountryName } from '@/lib/format';
import { formatAgo } from '@/lib/relative-time';
import type { RadarRssArticle } from '@/lib/rss-collector-types';
import {
  catalogSearchHref, MIN_REMOTE_QUERY, OPEN_UNIVERSAL_SEARCH_EVENT, searchArticles, searchCities, searchCountries,
} from '@/lib/universal-search';
import type { Channel } from '@/types/channel';
import { searchArticlesCache, SEARCH_ARTICLES_TTL_MS } from '@/lib/search-articles-cache';

type Item = {
  id: string;
  group: 'Pays' | 'Météo' | 'Chaînes' | 'Dépêches' | 'Catalogue';
  label: string;
  hint?: string;
  icon: typeof Search;
  prefix?: string;
  run: () => void;
};

// Dépêches lues une fois par session de recherche (le Radar les rafraîchit de son côté) : 5 minutes de validité.

/**
 * Recherche universelle (UX-502) : Ctrl K ou Cmd K partout dans l'espace /app.
 * Pays et villes : correspondance locale immédiate ; chaînes : recherche serveur existante ; dépêches : flux déjà publié.
 */
export default function UniversalSearch() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen(true);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener(OPEN_UNIVERSAL_SEARCH_EVENT, onOpen);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener(OPEN_UNIVERSAL_SEARCH_EVENT, onOpen);
    };
  }, []);

  return open ? <Palette onClose={() => setOpen(false)} /> : null;
}

function Palette({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const dock = usePlayerDock();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [channels, setChannels] = useState<{ query: string; list: Channel[]; canPlay: boolean } | null>(null);
  const [channelsLoading, setChannelsLoading] = useState(false);
  const [articles, setArticles] = useState<RadarRssArticle[]>(() => searchArticlesCache.peek() ?? []);
  const now = useNow(60_000);
  const trimmed = query.trim();
  const remote = trimmed.length >= MIN_REMOTE_QUERY;

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    inputRef.current?.focus();
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, []);

  // Chaînes : recherche serveur après une courte pause de frappe (quotas de /api/channels), requête précédente annulée.
  useEffect(() => {
    if (!remote) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setChannelsLoading(true);
      try {
        const body: CatalogRequest = { search: trimmed, country: '', region: '', group: '', language: '', status: '', favoritesOnly: false, cursor: null, limit: 6 };
        const response = await fetch('/api/channels', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: controller.signal });
        const parsed = catalogResponseSchema.safeParse(await response.json());
        if (response.ok && parsed.success) setChannels({ query: trimmed, list: parsed.data.channels, canPlay: parsed.data.canPlay });
      } catch {
        // Recherche abandonnée ou réseau coupé : les autres groupes restent utilisables.
      } finally {
        if (!controller.signal.aborted) setChannelsLoading(false);
      }
    }, 250);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [remote, trimmed]);

  // Dépêches : une seule lecture du flux, au premier mot assez long.
  useEffect(() => {
    if (!remote) return;
    let stopped=false;
    const load=()=>void searchArticlesCache.load(async()=>{
      const response=await fetch('/api/live/rss',{signal:AbortSignal.timeout(15_000)});
      const body:unknown=await response.json();
      if(!response.ok||!body||typeof body!=='object'||!('articles' in body)||!Array.isArray(body.articles)) throw new Error('RSS_UNAVAILABLE');
      return body.articles as RadarRssArticle[];
    }).then(list=>{if(!stopped)setArticles(list);}).catch(()=>{});
    load();
    const timer=window.setInterval(load,Math.min(60_000,SEARCH_ARTICLES_TTL_MS));
    return ()=>{stopped=true;window.clearInterval(timer);};
  }, [remote]);

  const go = useCallback((href: string) => { onClose(); router.push(href); }, [onClose, router]);

  const items = useMemo<Item[]>(() => {
    const list: Item[] = [];
    for (const country of searchCountries(trimmed)) {
      list.push({ id: `country-${country.code}`, group: 'Pays', label: country.name, hint: 'Radar du pays', icon: MapPin, prefix: flagEmoji(country.code),
        run: () => go(`/app/live?country=${country.code}`) });
    }
    for (const city of searchCities(trimmed)) {
      list.push({ id: `city-${city.city}`, group: 'Météo', label: `Météo à ${city.city}`, hint: city.countryName, icon: CloudSun,
        run: () => go(`/app/live?country=${city.code}`) });
    }
    if (remote && channels?.query === trimmed) {
      for (const channel of channels.list) {
        list.push({ id: `channel-${channel.id}`, group: 'Chaînes', label: channel.name, hint: formatCountryName(channel.countryCode), icon: Tv,
          run: () => {
            onClose();
            if (channels.canPlay) dock.open({ channel, playlist: channels.list });
            else router.push(catalogSearchHref(trimmed));
          } });
      }
    }
    if (remote) {
      for (const article of searchArticles(articles, trimmed)) {
        list.push({ id: `article-${article.url}`, group: 'Dépêches', label: article.title,
          hint: [article.sourceName, formatAgo(article.publishedAt, now)].filter(Boolean).join(' · '), icon: Newspaper,
          run: () => { onClose(); window.open(article.url, '_blank', 'noopener,noreferrer'); } });
      }
      list.push({ id: 'catalog', group: 'Catalogue', label: `Chercher « ${trimmed} » dans la TV`, icon: Search, run: () => go(catalogSearchHref(trimmed)) });
    }
    return list;
  }, [trimmed, remote, channels, articles, go, onClose, dock, router, now]);

  const current = Math.min(active, Math.max(0, items.length - 1));
  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') { event.preventDefault(); onClose(); return; }
    if (!items.length) return;
    if (event.key === 'ArrowDown') { event.preventDefault(); setActive((current + 1) % items.length); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); setActive((current - 1 + items.length) % items.length); }
    else if (event.key === 'Enter') { event.preventDefault(); items[current]?.run(); }
  };

  const status = !trimmed ? 'Pays, villes, chaînes ou dépêches.'
    : items.length ? `${items.length} résultat${items.length > 1 ? 's' : ''}${channelsLoading ? ', chaînes en cours…' : ''}`
    : channelsLoading ? 'Recherche des chaînes…' : 'Aucun résultat.';

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center px-3 pt-[8vh] sm:pt-[12vh]">
      <div className="dock-fade absolute inset-0 bg-black/80" aria-hidden="true" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label="Recherche universelle" onKeyDown={onKeyDown}
        className="dock-rise relative w-full max-w-xl overflow-hidden rounded-card border border-line-gold bg-surface-1 shadow-2xl shadow-black/70">
        <div className="flex items-center gap-2 border-b border-line px-3">
          <Search size={18} aria-hidden="true" className="shrink-0 text-al-gold" />
          <input
            ref={inputRef}
            value={query}
            onChange={event => { setQuery(event.target.value); setActive(0); }}
            role="combobox"
            aria-expanded={items.length > 0}
            aria-controls={listId}
            aria-activedescendant={items[current] ? `${listId}-${current}` : undefined}
            aria-autocomplete="list"
            aria-label="Rechercher un pays, une ville, une chaîne ou une dépêche"
            placeholder="Pays, ville, chaîne, dépêche…"
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="go"
            className="h-14 min-w-0 flex-1 bg-transparent text-base text-text placeholder:text-text-muted focus:outline-none focus-visible:outline-none"
          />
          <button type="button" onClick={onClose} aria-label="Fermer la recherche" className="inline-flex size-9 shrink-0 items-center justify-center rounded-control text-text-muted hover:bg-surface-2 hover:text-text">
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <p role="status" className="px-4 pt-3 text-xs text-text-muted">{status}</p>
        <ul id={listId} role="listbox" aria-label="Résultats" className="max-h-[60vh] overflow-y-auto px-2 pt-1 pb-2">
          {items.map((item, index) => {
            const Icon = item.icon;
            const firstOfGroup = index === 0 || items[index - 1].group !== item.group;
            return (
              <li key={item.id} role="presentation">
                {firstOfGroup && <p aria-hidden="true" className="px-2 pt-3 pb-1 text-xs font-semibold uppercase tracking-[0.14em] text-al-gold">{item.group}</p>}
                <div
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={index === current}
                  onMouseMove={() => setActive(index)}
                  onClick={item.run}
                  className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-control px-2 py-2 text-sm ${index === current ? 'bg-surface-3 text-text' : 'text-text'}`}
                >
                  {item.prefix ? <span aria-hidden="true" className="w-5 shrink-0 text-center text-xs font-semibold text-text-muted">{item.prefix}</span>
                    : <Icon size={16} aria-hidden="true" className="shrink-0 text-text-muted" />}
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2">{item.label}</span>
                    {item.hint && <span className="block truncate text-xs text-text-muted">{item.hint}</span>}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
        <p className="hidden border-t border-line px-4 py-2 text-xs text-text-muted sm:block">↑ ↓ pour choisir · Entrée pour ouvrir · Échap pour fermer</p>
      </div>
    </div>
  );
}
