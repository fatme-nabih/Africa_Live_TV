'use client';

import { useState } from 'react';
import { Play, Tv } from 'lucide-react';
import BrandBackdrop from '@/components/brand/BrandBackdrop';
import GoldRing from '@/components/brand/GoldRing';
import KenteBand from '@/components/brand/KenteBand';
import BrandLogo from '@/components/BrandLogo';
import AccessMeter from '@/components/account/AccessMeter';
import AccountActivity from '@/components/account/AccountActivity';
import PaymentMethods from '@/components/pricing/PaymentMethods';
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  Chip,
  EmptyState,
  ErrorState,
  SectionHeader,
  Skeleton,
  Tabs,
  tabPanelId,
} from '@/components/ui';

const SWATCHES = [
  { name: 'ink', className: 'bg-ink' },
  { name: 'surface-1', className: 'bg-surface-1' },
  { name: 'surface-2', className: 'bg-surface-2' },
  { name: 'surface-3', className: 'bg-surface-3' },
  { name: 'al-green', className: 'bg-al-green' },
  { name: 'al-yellow', className: 'bg-al-yellow' },
  { name: 'al-red', className: 'bg-al-red' },
  { name: 'al-gold', className: 'bg-al-gold' },
];

const TABS = [
  { id: 'all', label: 'Tout', count: 128 },
  { id: 'news', label: 'Info', count: 42 },
  { id: 'sport', label: 'Sport', count: 17 },
];

export default function UiKit() {
  const [tab, setTab] = useState('all');
  const [chips, setChips] = useState(['Sénégal', 'Français']);
  const [selected, setSelected] = useState(true);

  return (
    <div className="relative min-h-screen bg-ink text-text">
      <BrandBackdrop variant="app" />
      <div className="bg-tricolor-bar h-0.5 w-full" aria-hidden="true" />
      <main className="relative z-10 mx-auto flex max-w-5xl flex-col gap-10 px-4 py-10">
        <header className="flex items-center gap-4">
          <GoldRing className="size-16">
            <BrandLogo className="size-14" />
          </GoldRing>
          <div>
            <h1 className="font-display text-2xl font-bold sm:text-3xl">
              Africa <span className="text-al-yellow">Live</span>
            </h1>
            <p className="text-sm text-text-muted">Kit de design — Le live qui vient à vous</p>
          </div>
        </header>

        <section aria-labelledby="ui-couleurs" className="flex flex-col gap-4">
          <SectionHeader eyebrow="Jetons" title={<span id="ui-couleurs">Couleurs à rôles</span>} />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {SWATCHES.map(swatch => (
              <div key={swatch.name} className="overflow-hidden rounded-card border border-line">
                <div className={`h-14 ${swatch.className}`} />
                <p className="bg-surface-1 px-3 py-2 text-xs text-text-muted">{swatch.name}</p>
              </div>
            ))}
          </div>
          <p className="font-display text-lg font-bold">Unbounded — titres et chiffres : 14 505</p>
          <p className="text-sm text-text-muted">Manrope — texte courant et interface, accents français : éàçœ.</p>
        </section>

        <section aria-labelledby="ui-boutons" className="flex flex-col gap-4">
          <SectionHeader eyebrow="Actions" title={<span id="ui-boutons">Boutons</span>} />
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary" icon={<Play size={16} aria-hidden="true" />}>Regarder</Button>
            <Button variant="secondary">Secondaire</Button>
            <Button variant="ghost">Discret</Button>
            <Button variant="danger">Supprimer</Button>
            <Button variant="primary" size="sm">Petit</Button>
            <Button variant="primary" size="lg">Grand</Button>
            <Button variant="secondary" disabled>Désactivé</Button>
            <ButtonLink href="/app" variant="secondary" icon={<Tv size={16} aria-hidden="true" />}>Lien vers la TV</ButtonLink>
          </div>
        </section>

        <section aria-labelledby="ui-badges" className="flex flex-col gap-4">
          <SectionHeader eyebrow="États" title={<span id="ui-badges">Badges et pastilles</span>} />
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="live" />
            <Badge variant="vlc">Ouvre dans VLC</Badge>
            <Badge variant="info">Français</Badge>
            <Badge variant="warn">Alerte météo</Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Chip selected={selected} onClick={() => setSelected(value => !value)}>Favoris</Chip>
            {chips.map(chip => (
              <Chip key={chip} onRemove={() => setChips(list => list.filter(item => item !== chip))} removeLabel={`Retirer ${chip}`}>
                {chip}
              </Chip>
            ))}
          </div>
          <Tabs tabs={TABS} value={tab} onChange={setTab} idPrefix="demo" ariaLabel="Catégories de démonstration" />
          <div id={tabPanelId('demo', tab)} role="tabpanel" aria-labelledby={`demo-tab-${tab}`} className="text-sm text-text-muted">
            Panneau « {TABS.find(item => item.id === tab)?.label} ».
          </div>
        </section>

        <section aria-labelledby="ui-cartes" className="flex flex-col gap-4">
          <SectionHeader eyebrow="Surfaces" title={<span id="ui-cartes">Cartes</span>} />
          <div className="grid gap-3 sm:grid-cols-3">
            <Card><p className="text-sm text-text-muted">Carte standard (surface-1)</p></Card>
            <Card tone="raised" interactive><p className="text-sm text-text-muted">Carte surélevée, interactive</p></Card>
            <Card tone="gold"><p className="text-sm text-text-muted">Carte sélectionnée (bordure or)</p></Card>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        </section>

        <section aria-labelledby="ui-vides" className="flex flex-col gap-4">
          <SectionHeader eyebrow="Ton « hors antenne »" title={<span id="ui-vides">États vides et erreurs</span>} />
          <div className="grid gap-3 sm:grid-cols-3">
            <Card><EmptyState illustration="acacia" title="Rien à l’antenne" description="Aucune chaîne ne correspond à ces filtres." /></Card>
            <Card><EmptyState illustration="elephant" title="Pas encore de favori" description="Touchez le cœur d’une chaîne pour la retrouver ici." /></Card>
            <Card><EmptyState illustration="lion" title="Sélection vide" description="Choisissez un pays pour commencer." /></Card>
          </div>
          <ErrorState description="Les dépêches ne répondent pas pour le moment." onRetry={() => undefined} />
        </section>

        <section aria-labelledby="ui-compte" className="flex flex-col gap-4">
          <SectionHeader eyebrow="Compte (P4)" title={<span id="ui-compte">Jauge d’accès et activité</span>} description="Composants de /account, visibles ici sans session (données de l’appareil ; jauges d’exemple)." />
          <div className="grid gap-3 sm:grid-cols-2">
            <Card><AccessMeter gauge={{ daysLeft: 4, totalDays: 5, ratio: 0.8, label: '4 jours restants', endingSoon: false }} /></Card>
            <Card><AccessMeter gauge={{ daysLeft: 2, totalDays: 30, ratio: 2 / 30, label: '2 jours restants', endingSoon: true }} /></Card>
          </div>
          <AccountActivity favoritesCount={3} />
          <PaymentMethods />
        </section>

        <footer className="flex flex-col gap-3">
          <KenteBand />
          <p className="text-xs text-text-muted">Dalal ak jàmm — Bienvenue sur Africa Live.</p>
        </footer>
      </main>
    </div>
  );
}
