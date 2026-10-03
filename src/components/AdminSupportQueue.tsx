'use client';

import { useCallback, useEffect, useState } from 'react';

type SupportEvent = {
  id: string;
  eventType: string;
  actorClerkUserId: string | null;
  note: string | null;
  affectedStreamIds: string[];
  createdAt: string;
};

type SupportRequest = {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  channelName: string | null;
  sourceUrl: string | null;
  status: string;
  resolutionNote: string | null;
  createdAt: string;
  events: SupportEvent[];
};

const subjectLabels: Record<string, string> = {
  playback: 'Lecture',
  billing: 'Facturation',
  channel: 'Catalogue',
  removal: 'Demande de retrait',
  partnership: 'Partenariat',
  other: 'Autre',
};

const statusLabels: Record<string, string> = {
  new: 'Nouvelle',
  in_review: 'En cours',
  sources_disabled: 'Sources désactivées',
  closed_no_action: 'Clôturée sans retrait',
};

export default function AdminSupportQueue() {
  const [requests, setRequests] = useState<SupportRequest[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const response = await fetch('/api/admin/contact-requests', { cache: 'no-store' });
      const payload = await response.json() as { requests?: SupportRequest[]; error?: string };
      if (!response.ok) throw new Error(payload.error ?? 'La file de demandes est indisponible.');
      setRequests(payload.requests ?? []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'La file de demandes est indisponible.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/admin/contact-requests', { cache: 'no-store' })
      .then(async (response) => {
        const payload = await response.json() as { requests?: SupportRequest[]; error?: string };
        if (!response.ok) throw new Error(payload.error ?? 'La file de demandes est indisponible.');
        if (!cancelled) setRequests(payload.requests ?? []);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'La file de demandes est indisponible.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  async function act(requestId: string, action: 'in_review' | 'disable_reported_sources' | 'close_no_action') {
    setBusyId(requestId);
    setError(null);
    try {
      const response = await fetch(`/api/admin/contact-requests/${encodeURIComponent(requestId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, note: notes[requestId] ?? '' }),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? 'La demande n’a pas pu être mise à jour.');
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'La demande n’a pas pu être mise à jour.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="mt-8 rounded-2xl border border-line bg-surface-1/80 p-5 shadow-xl shadow-black/40 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-al-gold">File interne</p>
          <h2 className="font-display mt-2 text-xl font-bold text-text">Demandes de support et de retrait</h2>
          <p className="mt-1 text-xs text-text-muted">Les 100 demandes les plus récentes et l’historique de traitement.</p>
        </div>
        <button type="button" onClick={() => void refresh()} className="rounded-lg border border-line px-3 py-2 text-xs font-semibold text-text hover:bg-white/5">Actualiser</button>
      </div>

      {error && <p role="alert" className="mt-4 rounded-lg border border-al-red/30 bg-al-red/10 p-3 text-xs text-text">{error}</p>}
      {loading ? <p className="mt-5 text-sm text-text-muted">Chargement…</p> : requests.length === 0 ? <p className="mt-5 text-sm text-text-muted">Aucune demande enregistrée.</p> : (
        <ul className="mt-5 space-y-4">
          {requests.map((item) => (
            <li key={item.id} className="rounded-xl border border-line bg-surface-1/80 p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-text">{subjectLabels[item.subject] ?? item.subject}</p>
                  <p className="mt-1 text-xs text-text">{item.name} · <a className="text-al-gold underline" href={`mailto:${item.email}`}>{item.email}</a></p>
                </div>
                <span className="rounded-full border border-al-gold/20 bg-al-gold/10 px-2.5 py-1 text-xs font-semibold text-text">{statusLabels[item.status] ?? item.status}</span>
              </div>
              {item.channelName && <p className="mt-3 text-xs text-text"><strong>Chaîne :</strong> {item.channelName}</p>}
              {item.sourceUrl && <p className="mt-1 break-all text-xs text-text-muted"><strong>Source signalée :</strong> {item.sourceUrl}</p>}
              <p className="mt-3 whitespace-pre-wrap text-xs leading-relaxed text-text">{item.message}</p>
              <p className="mt-3 text-xs text-text-muted">Reçue le {new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(item.createdAt))} · Réf. {item.id}</p>

              {item.events.length > 1 && (
                <details className="mt-3 text-xs text-text-muted">
                  <summary className="cursor-pointer">Historique ({item.events.length} événements)</summary>
                  <ol className="mt-2 space-y-2 pl-4">
                    {item.events.slice(1).map((event) => (
                      <li key={event.id}>
                        {new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(event.createdAt))} — {statusLabels[event.eventType] ?? event.eventType}
                        {event.affectedStreamIds.length > 0 && ` (${event.affectedStreamIds.length} source(s))`}
                        {event.note && ` : ${event.note}`}
                      </li>
                    ))}
                  </ol>
                </details>
              )}

              {item.status !== 'sources_disabled' && item.status !== 'closed_no_action' && (
                <div className="mt-4 space-y-3 border-t border-line pt-4">
                  <label className="block text-xs font-medium text-text-muted" htmlFor={`note-${item.id}`}>
                    Note interne (obligatoire pour clôturer ou désactiver)
                    <textarea id={`note-${item.id}`} rows={2} maxLength={1_000} value={notes[item.id] ?? item.resolutionNote ?? ''}
                      onChange={(event) => setNotes((current) => ({ ...current, [item.id]: event.target.value }))}
                      className="mt-1 block w-full rounded-lg border border-line bg-black/60 p-2.5 text-xs text-text focus:border-al-gold focus:outline-none" />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" disabled={busyId === item.id} onClick={() => void act(item.id, 'in_review')} className="rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-text disabled:opacity-50">Prendre en revue</button>
                    {item.subject === 'removal' && <button type="button" disabled={busyId === item.id} onClick={() => void act(item.id, 'disable_reported_sources')} className="rounded-lg border border-al-gold/40 bg-al-gold/10 px-3 py-2 text-xs font-semibold text-text disabled:opacity-50">Désactiver les sources signalées</button>}
                    <button type="button" disabled={busyId === item.id} onClick={() => void act(item.id, 'close_no_action')} className="rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-text disabled:opacity-50">Clôturer sans retrait</button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
