'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  MessageSquare,
  HelpCircle,
  Tv,
  CreditCard,
  Send,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import BrandBackdrop from '@/components/brand/BrandBackdrop';
import BrandMark from '@/components/brand/BrandMark';
import { Button } from '@/components/ui';

export default function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('playback');
  const [message, setMessage] = useState('');
  const [channelName, setChannelName] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [website, setWebsite] = useState('');
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) return;

    setLoading(true);
    setSubmitError(null);
    try {
      const response = await fetch('/api/contact-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, subject, message, channelName, sourceUrl, website }),
      });
      const result = await response.json() as { requestId?: string; error?: string };
      if (!response.ok) {
        setSubmitError(result.error ?? 'Votre demande n’a pas pu être enregistrée. Réessayez.');
        return;
      }
      setSubmitted(result.requestId ?? '');
    } catch {
      setSubmitError('Connexion interrompue. Vérifiez votre connexion puis réessayez.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen bg-black text-text selection:bg-al-yellow selection:text-black overflow-hidden">
      <BrandBackdrop variant="app" />

      <div className="relative z-10 mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Navigation Bar */}
        <nav className="mb-10 flex items-center justify-between border-b border-line pb-5">
          <BrandMark />

          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl border border-line bg-white/[0.04] px-3.5 py-1.5 text-xs font-semibold text-text transition hover:border-white/20 hover:bg-white/[0.08] hover:text-text"
          >
            <ArrowLeft size={14} />
            <span>Accueil</span>
          </Link>
        </nav>

        {/* Header */}
        <header className="mb-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-al-gold/30 bg-al-gold/10 px-3 py-1 text-xs font-semibold text-al-gold">
            <MessageSquare size={14} />
            <span>Assistance & Support Client</span>
          </div>
          <h1 className="font-display mt-4 text-3xl font-bold tracking-tight text-text sm:text-4xl">
            Comment pouvons-nous vous aider ?
          </h1>
          <p className="mt-3 text-xs sm:text-sm leading-relaxed text-text-muted">
            Une question, une correction de catalogue ou une demande de retrait ? Envoyez-la ici pour l&apos;enregistrer dans notre file de traitement.
          </p>
        </header>

        <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr]">
            {/* Intake route & Quick help */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-line bg-surface-1/80 p-6 shadow-xl shadow-black/40">
              <h2 className="text-base font-bold text-text flex items-center gap-2">
                <MessageSquare size={16} className="text-al-gold" /> Traitement des demandes
              </h2>
              <p className="mt-2 text-xs leading-relaxed text-text-muted">
                Les formulaires envoyés sont enregistrés dans un espace privé accessible aux administrateurs actifs. Pour un retrait, indiquez le nom exact de la chaîne et, si vous la connaissez, l&apos;adresse de la source. Les paramètres temporaires de l&apos;URL sont retirés avant l&apos;enregistrement.
              </p>
            </div>

            {/* Quick answers pills */}
            <div className="rounded-2xl border border-line bg-surface-1/80 p-6 shadow-xl shadow-black/40">
              <h2 className="text-base font-bold text-text flex items-center gap-2">
                <HelpCircle size={16} className="text-al-gold" /> Réponses rapides
              </h2>
              <div className="mt-4 space-y-3 text-xs text-text">
                <div className="flex items-start gap-3">
                  <Tv className="mt-0.5 h-4 w-4 shrink-0 text-al-gold" />
                  <div>
                    <p className="font-semibold text-text">Un flux ne démarre pas sur le Web ?</p>
                    <p className="mt-0.5 text-text-muted">
                      Certains flux utilisent des codecs vidéo non pris en charge nativement par les navigateurs.
                      Cliquez sur &quot;Relancer dans VLC&quot; pour ouvrir directement le flux dans VLC Media Player.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 pt-3 border-t border-line">
                  <CreditCard className="mt-0.5 h-4 w-4 shrink-0 text-al-gold" />
                  <div>
                    <p className="font-semibold text-text">Paiement validé mais accès en attente ?</p>
                    <p className="mt-0.5 text-text-muted">
                      La confirmation NabooPay est quasi instantanée. Si votre statut n&apos;est pas actualisé dans les 2 minutes,
                      rechargez la page ou vérifiez votre espace <Link href="/account" className="text-al-gold underline">Mon compte</Link>.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Contact form */}
          <div className="rounded-2xl border border-line bg-surface-1/80 p-6 sm:p-8 shadow-xl shadow-black/40">
            <h2 className="font-display text-lg font-bold text-text">Envoyez-nous un message</h2>
            <p className="mt-1 text-xs text-text-muted">
              Remplissez le formulaire ci-dessous et nous traiterons votre requête dans les meilleurs délais.
            </p>

            {submitted !== null ? (
              <div className="mt-8 rounded-xl border border-al-green/30 bg-al-green/10 p-6 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-al-green/20 text-al-green border border-al-green/30">
                  <CheckCircle2 size={24} />
                </div>
                <h3 className="mt-4 text-base font-bold text-text">Demande enregistrée</h3>
                <p className="mt-2 text-xs leading-relaxed text-text">
                  Merci <strong>{name}</strong>. Votre demande a été enregistrée dans notre file de traitement.
                  {submitted && <> Référence : <strong>{submitted}</strong>.</>}
                </p>
                <button
                  type="button"
                  onClick={() => { setSubmitted(null); setMessage(''); setChannelName(''); setSourceUrl(''); }}
                  className="mt-6 inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.05] hover:bg-white/[0.1] px-4 py-2 text-xs font-semibold text-text transition"
                >
                  Envoyer un autre message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-6 space-y-4 text-xs">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="name" className="block font-medium text-text">
                      Votre nom complet *
                    </label>
                    <input
                      id="name"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex: Fatou Diop"
                      className="mt-1.5 w-full rounded-xl border border-line bg-white/[0.03] px-3.5 py-2 text-xs text-text placeholder:text-text-muted focus:border-al-gold focus:outline-none focus:ring-1 focus:ring-al-gold transition"
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block font-medium text-text">
                      Votre adresse e-mail *
                    </label>
                    <input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Ex: fatou@example.com"
                      className="mt-1.5 w-full rounded-xl border border-line bg-white/[0.03] px-3.5 py-2 text-xs text-text placeholder:text-text-muted focus:border-al-gold focus:outline-none focus:ring-1 focus:ring-al-gold transition"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="subject" className="block font-medium text-text">
                    Sujet de votre demande *
                  </label>
                  <select
                    id="subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-line bg-black/60 px-3.5 py-2 text-xs text-text focus:border-al-gold focus:outline-none focus:ring-1 focus:ring-al-gold transition"
                  >
                    <option value="playback">Problème de lecture ou de lecteur VLC</option>
                    <option value="billing">Question sur un paiement NabooPay (Wave / Orange Money)</option>
                    <option value="channel">Suggestion d&apos;ajout ou de correction de chaîne</option>
                    <option value="removal">Demande de retrait d&apos;une chaîne ou d&apos;une source</option>
                    <option value="partnership">Partenariat diffuseur ou demande commerciale</option>
                    <option value="other">Autre demande</option>
                  </select>
                </div>

                {subject === 'removal' && (
                  <>
                    <div>
                      <label htmlFor="channelName" className="block font-medium text-text">Nom de la chaîne concernée *</label>
                      <input id="channelName" type="text" required maxLength={200} value={channelName}
                        onChange={(e) => setChannelName(e.target.value)} placeholder="Nom affiché dans Africa Live"
                        className="mt-1.5 w-full rounded-xl border border-line bg-white/[0.03] px-3.5 py-2 text-xs text-text placeholder:text-text-muted focus:border-al-gold focus:outline-none focus:ring-1 focus:ring-al-gold transition" />
                    </div>
                    <div>
                      <label htmlFor="sourceUrl" className="block font-medium text-text">Adresse de la source (facultatif)</label>
                      <input id="sourceUrl" type="url" maxLength={2048} value={sourceUrl}
                        onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://…"
                        className="mt-1.5 w-full rounded-xl border border-line bg-white/[0.03] px-3.5 py-2 text-xs text-text placeholder:text-text-muted focus:border-al-gold focus:outline-none focus:ring-1 focus:ring-al-gold transition" />
                      <p className="mt-1 text-xs text-text-muted">N&apos;incluez ni mot de passe ni code d&apos;accès. Les paramètres d&apos;URL sont supprimés avant stockage.</p>
                    </div>
                  </>
                )}

                <div>
                  <label htmlFor="message" className="block font-medium text-text">
                    Votre message *
                  </label>
                  <textarea
                    id="message"
                    required
                    rows={5}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Décrivez votre demande avec le maximum de détails (nom de la chaîne, type d'appareil, numéro de transaction éventuel)..."
                    className="mt-1.5 w-full rounded-xl border border-line bg-white/[0.03] px-3.5 py-2 text-xs text-text placeholder:text-text-muted focus:border-al-gold focus:outline-none focus:ring-1 focus:ring-al-gold transition"
                  />
                </div>

                <div className="hidden" aria-hidden="true">
                  <label htmlFor="website">Laisser vide</label>
                  <input id="website" type="text" autoComplete="off" tabIndex={-1} value={website} onChange={(e) => setWebsite(e.target.value)} />
                </div>

                <div className="flex items-center gap-2 text-xs text-text-muted">
                  <AlertCircle size={13} className="shrink-0" />
                  <span>Vos coordonnées et votre message sont enregistrés pour traiter cette demande.</span>
                </div>

                {submitError && <p role="alert" className="rounded-lg border border-al-red/30 bg-al-red/10 p-3 text-xs text-text">{submitError}</p>}

                <Button type="submit" variant="primary" block disabled={loading} icon={<Send size={14} aria-hidden="true" />}>
                  <span>{loading ? 'Envoi en cours...' : 'Envoyer mon message'}</span>
                </Button>
              </form>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 border-t border-line pt-6 text-center text-xs text-text-muted">
          <p>© {new Date().getFullYear()} Africa Live (africatv.sn) • Demandes enregistrées dans notre file de traitement.</p>
        </div>
      </div>
    </main>
  );
}
