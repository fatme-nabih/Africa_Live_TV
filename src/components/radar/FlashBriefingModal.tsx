'use client';

import { useEffect, useState } from 'react';
import {
  Sparkles,
  X,
  RefreshCw,
  Copy,
  Check,
  Globe2,
  MapPin,
  TrendingUp,
  AlertTriangle,
  Tv,
  Newspaper,
  ShieldAlert,
  Calendar,
} from 'lucide-react';
import type { LiveBriefingSnapshot, BriefingSection } from '@/lib/live-briefing-types';

interface FlashBriefingModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCountryCode: string | null;
  onSelectCountryForChannels?: (code: string) => void;
}

export default function FlashBriefingModal({
  isOpen,
  onClose,
  selectedCountryCode,
  onSelectCountryForChannels,
}: FlashBriefingModalProps) {
  const [data, setData] = useState<LiveBriefingSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [scopeOverride, setScopeOverride] = useState<'continent' | 'country' | null>(null);
  const activeScope = scopeOverride ?? (selectedCountryCode ? 'country' : 'continent');
  const [copied, setCopied] = useState(false);

  const handleClose = () => {
    setScopeOverride(null);
    onClose();
  };

  // Chargement asynchrone lors du changement d'état ou d'ouverture
  useEffect(() => {
    if (!isOpen) return;

    let active = true;
    const controller = new AbortController();

    async function fetchBriefing() {
      try {
        const queryParams = new URLSearchParams();
        if (activeScope === 'country' && selectedCountryCode) {
          queryParams.set('code', selectedCountryCode);
        }
        const queryStr = queryParams.toString() ? `?${queryParams.toString()}` : '';
        const res = await fetch(`/api/live/briefing${queryStr}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json: LiveBriefingSnapshot = await res.json();
        if (active) setData(json);
      } catch {
        // Conserve le dernier état
      }
    }

    void fetchBriefing();

    return () => {
      active = false;
      controller.abort();
    };
  }, [isOpen, activeScope, selectedCountryCode]);

  const handleManualRefresh = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({ refresh: 'true' });
      if (activeScope === 'country' && selectedCountryCode) {
        queryParams.set('code', selectedCountryCode);
      }
      const res = await fetch(`/api/live/briefing?${queryParams.toString()}`);
      if (res.ok) {
        const json: LiveBriefingSnapshot = await res.json();
        setData(json);
      }
    } catch {
      // Ignorer
    } finally {
      setLoading(false);
    }
  };

  const handleCopyText = async () => {
    if (!data) return;
    const text = [
      `AFRICA LIVE — ${data.headline.toUpperCase()}`,
      `Période : ${data.periodCovered} · Généré le ${new Date(data.generatedAt).toLocaleString('fr-FR')}`,
      '',
      `RÉSUMÉ EXÉCUTIF :`,
      data.executiveSummary,
      '',
      ...data.sections.map((s) => [
        `--- ${s.title.toUpperCase()} ---`,
        s.summary,
        ...s.highlights.map((h) => `• ${h}`),
        '',
      ].join('\n')),
      `Source : Africa Live Radar OSINT (https://africatv.sn)`,
    ].join('\n');

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Échec silencieux presse-papier
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="briefing-title"
    >
      {/* Fond sombre translucide */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Conteneur principal de la modal */}
      <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-white/[0.12] bg-surface-1 text-text shadow-[0_25px_80px_-20px_rgba(0,0,0,0.95)]">
        {/* Barre tricolore décorative */}
        <div className="h-[2px] w-full bg-tricolor-bar opacity-90" />

        {/* En-tête de la modal */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface-2 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-al-gold/10 text-al-gold ring-1 ring-al-gold/20">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="briefing-title" className="text-base font-black tracking-tight text-text sm:text-lg">
                  Flash Briefing IA Panafricain
                </h2>
                <span className="rounded-full border border-al-green/30 bg-al-green/10 px-2 py-0.5 text-xs font-extrabold uppercase tracking-wider text-al-green">
                  12h en direct
                </span>
              </div>
              <p className="text-xs text-text-muted">
                Synthèse situationnelle multi-sources (Dépêches vérifiées, USGS/GDACS, Marchés, TV directe)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Bascule Continent / Pays */}
            {selectedCountryCode && (
              <div className="flex items-center rounded-lg border border-line bg-black/40 p-0.5 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setScopeOverride('country')}
                  className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 transition ${
                    activeScope === 'country'
                      ? 'bg-al-green/20 text-al-green'
                      : 'text-text-muted hover:text-text'
                  }`}
                >
                  <MapPin className="h-3 w-3" />
                  <span>{selectedCountryCode}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setScopeOverride('continent')}
                  className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 transition ${
                    activeScope === 'continent'
                      ? 'bg-al-green/20 text-al-green'
                      : 'text-text-muted hover:text-text'
                  }`}
                >
                  <Globe2 className="h-3 w-3" />
                  <span>Afrique</span>
                </button>
              </div>
            )}

            {/* Bouton Actualiser */}
            <button
              type="button"
              onClick={() => void handleManualRefresh()}
              disabled={loading}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-white/[0.04] text-text transition hover:bg-white/[0.08] hover:text-text disabled:opacity-50"
              title="Actualiser la synthèse"
              aria-label="Actualiser la synthèse"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {/* Bouton Copier */}
            <button
              type="button"
              onClick={() => void handleCopyText()}
              disabled={!data}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-white/[0.04] px-2.5 text-xs font-semibold text-text transition hover:bg-white/[0.08] hover:text-text"
              title="Copier le compte-rendu textuel"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-al-green" /> : <Copy className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">{copied ? 'Copié !' : 'Copier'}</span>
            </button>

            {/* Bouton Fermer */}
            <button
              type="button"
              onClick={handleClose}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-white/[0.04] text-text-muted transition hover:bg-white/[0.08] hover:text-text"
              title="Fermer"
              aria-label="Fermer le Flash Briefing"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Corps déroulant de la modal */}
        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          {!data && (
            <div className="flex h-64 flex-col items-center justify-center gap-3 text-text-muted">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-al-green border-t-transparent" />
              <p className="text-xs font-semibold">Génération de la synthèse en cours…</p>
            </div>
          )}

          {data && (
            <div className="space-y-6">
              {/* Carte Résumé Exécutif */}
              <div className="relative overflow-hidden rounded-2xl border border-line bg-surface-1/80 p-4 sm:p-5 shadow-2xl">
                <div className="h-[2px] w-full bg-tricolor-bar absolute top-0 left-0 right-0 opacity-80" />
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-al-green">
                    <Sparkles className="h-4 w-4" />
                    <span>RÉSUMÉ EXÉCUTIF · {data.targetName.toUpperCase()}</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono text-xs text-text-muted">
                    <Calendar className="h-3 w-3" />
                    <span>{data.periodCovered}</span>
                  </div>
                </div>
                <h3 className="font-display text-lg font-bold text-text sm:text-xl">
                  {data.headline}
                </h3>
                <p className="mt-2.5 text-xs leading-relaxed text-text sm:text-sm">
                  {data.executiveSummary}
                </p>
              </div>

              {/* Indicateurs clés */}
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
                <div className="rounded-lg border border-line bg-white/[0.02] p-3 text-center">
                  <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-text-muted">
                    <Newspaper className="h-3.5 w-3.5 text-al-green" />
                    <span>Dépêches</span>
                  </div>
                  <div className="mt-1 text-xl font-black text-text sm:text-2xl">
                    {data.metrics.articlesAnalyzed}
                  </div>
                </div>

                <div className="rounded-lg border border-line bg-white/[0.02] p-3 text-center">
                  <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-text-muted">
                    <AlertTriangle className="h-3.5 w-3.5 text-al-gold" />
                    <span>Alertes</span>
                  </div>
                  <div className="mt-1 text-xl font-black text-al-gold sm:text-2xl">
                    {data.metrics.alertsActive}
                  </div>
                </div>

                <div className="rounded-lg border border-line bg-white/[0.02] p-3 text-center">
                  <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-text-muted">
                    <Globe2 className="h-3.5 w-3.5 text-sky-400" />
                    <span>Pays couverts</span>
                  </div>
                  <div className="mt-1 text-xl font-black text-text sm:text-2xl">
                    {data.metrics.countriesCovered}
                  </div>
                </div>

                <div className="rounded-lg border border-line bg-white/[0.02] p-3 text-center">
                  <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-text-muted">
                    <Tv className="h-3.5 w-3.5 text-al-red-soft" />
                    <span>TV en direct</span>
                  </div>
                  <div className="mt-1 text-xl font-black text-text sm:text-2xl">
                    {data.metrics.channelsOnAir}
                  </div>
                </div>
              </div>

              {/* Les 4 Piliers Thématiques */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {data.sections.map((section: BriefingSection) => {
                  const isHazards = section.id === 'hazards';
                  const isEconomy = section.id === 'economy';
                  const isMedia = section.id === 'media';

                  return (
                    <div
                      key={section.id}
                      className="flex flex-col justify-between rounded-xl border border-line bg-surface-2 p-4 transition hover:border-white/[0.14]"
                    >
                      <div>
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {isHazards ? (
                              <ShieldAlert className="h-4 w-4 text-al-gold" />
                            ) : isEconomy ? (
                              <TrendingUp className="h-4 w-4 text-al-green" />
                            ) : isMedia ? (
                              <Tv className="h-4 w-4 text-al-red-soft" />
                            ) : (
                              <Newspaper className="h-4 w-4 text-sky-400" />
                            )}
                            <h4 className="text-sm font-bold text-text">
                              {section.title}
                            </h4>
                          </div>

                          {section.status !== 'normal' && (
                            <span
                              className={`rounded px-1.5 py-0.5 text-xs font-bold uppercase tracking-wider ${
                                section.status === 'critical'
                                  ? 'bg-al-red/20 text-al-red-soft'
                                  : 'bg-al-gold/20 text-al-gold'
                              }`}
                            >
                              {section.status === 'critical' ? 'Critique' : 'Vigilance'}
                            </span>
                          )}
                        </div>

                        <p className="text-xs leading-relaxed text-text-muted">
                          {section.summary}
                        </p>

                        <div className="mt-3 space-y-1.5 border-t border-white/[0.05] pt-2.5">
                          {section.highlights.map((h, i) => (
                            <div key={i} className="flex items-start gap-1.5 text-xs text-text">
                              <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-al-green" />
                              <span className="leading-tight">{h}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Action directe pour voir les chaînes du pays */}
                      {isMedia && data.targetCountryCode && onSelectCountryForChannels && (
                        <div className="mt-4 pt-2">
                          <button
                            type="button"
                            onClick={() => {
                              onSelectCountryForChannels(data.targetCountryCode!);
                              onClose();
                            }}
                            className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-al-gold/30 bg-al-gold/10 px-3 py-1.5 text-xs font-bold text-al-gold transition hover:bg-al-gold/20"
                          >
                            <Tv className="h-3.5 w-3.5" />
                            <span>Voir les chaînes TV de {data.targetName}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Mentions légales & Attribution */}
              <div className="rounded-lg border border-white/[0.05] bg-black/30 p-3 text-xs leading-relaxed text-text-muted">
                <span className="font-semibold text-text-muted">Attribution & Open Data : </span>
                {data.disclaimer}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
